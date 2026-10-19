import { config } from '../config/index.js';
import { cacheService } from '../cache/redis.js';
import { FeistelCipher } from './feistel.js';
import { Base62 } from './base62.js';

export interface BatchInfo {
  instanceId: string;
  currentCounter: string;
  maxCounter: string;
  remainingInBatch: number;
  batchSize: number;
  totalGenerated: number;
  lastReservedAt: string | null;
}

export class DistributedCounterService {
  private instanceId: string;
  private batchSize: number;
  private counterKey: string;

  private currentCounter: bigint = 0n;
  private maxCounter: bigint = 0n;
  private totalGenerated: number = 0;
  private lastReservedAt: Date | null = null;
  private reservingPromise: Promise<void> | null = null;

  constructor() {
    this.instanceId = config.instanceId;
    this.batchSize = config.counter.batchSize;
    this.counterKey = config.counter.key;
  }

  /**
   * Researves a batch of IDs atomically from Redis using INCRBY
   */
  private async reserveBatch(): Promise<void> {
    if (this.reservingPromise) {
      return this.reservingPromise;
    }

    this.reservingPromise = (async () => {
      try {
        const newMax = await cacheService.incrBy(this.counterKey, this.batchSize);
        this.maxCounter = newMax;
        this.currentCounter = newMax - BigInt(this.batchSize) + 1n;
        this.lastReservedAt = new Date();

        console.log(
          `[DistributedCounter] Worker "${this.instanceId}" allocated batch range: [${this.currentCounter} .. ${this.maxCounter}]`
        );
      } finally {
        this.reservingPromise = null;
      }
    })();

    return this.reservingPromise;
  }

  /**
   * Returns the next sequential ID from the locally reserved batch.
   */
  public async getNextId(): Promise<bigint> {
    while (this.reservingPromise) {
      await this.reservingPromise;
    }

    if (this.currentCounter === 0n || this.currentCounter > this.maxCounter) {
      await this.reserveBatch();
    }

    const id = this.currentCounter;
    this.currentCounter += 1n;
    this.totalGenerated += 1;
    return id;
  }

  /**
   * Generates a 100% collision-free, unguessable Base62 short code
   * Pipeline: Sequential Counter -> Feistel Bijective Obfuscation -> Base62 Encode
   */
  public async generateShortCode(): Promise<{ shortCode: string; counterId: bigint; obfuscatedId: bigint }> {
    const counterId = await this.getNextId();
    const obfuscatedId = FeistelCipher.obfuscate(counterId);
    const shortCode = Base62.encode(obfuscatedId, 6);

    return {
      shortCode,
      counterId,
      obfuscatedId,
    };
  }

  /**
   * Status information for system design introspection & monitoring
   */
  public getBatchInfo(): BatchInfo {
    const remaining = this.maxCounter >= this.currentCounter 
      ? Number(this.maxCounter - this.currentCounter + 1n) 
      : 0;

    return {
      instanceId: this.instanceId,
      currentCounter: this.currentCounter.toString(),
      maxCounter: this.maxCounter.toString(),
      remainingInBatch: remaining,
      batchSize: this.batchSize,
      totalGenerated: this.totalGenerated,
      lastReservedAt: this.lastReservedAt ? this.lastReservedAt.toISOString() : null,
    };
  }
}

export const counterService = new DistributedCounterService();
