import React from 'react';
import type { CounterStatus } from '../types';
import { ZapIcon, RefreshCwIcon, ShieldCheckIcon, CpuIcon, LayersIcon } from './Icons';

interface CounterVisualizerProps {
  counter: CounterStatus | null;
  loading: boolean;
  onRefresh: () => void;
}

export const CounterVisualizer: React.FC<CounterVisualizerProps> = ({ counter, loading, onRefresh }) => {
  const batchSize = counter?.batchSize || 1000;
  const remaining = counter?.remainingInBatch ?? 0;
  const usedInBatch = Math.max(0, batchSize - remaining);
  const percentUsed = Math.min(100, Math.max(0, Math.round((usedInBatch / batchSize) * 100)));

  return (
    <div className="tab-pane-container">
      <div className="section-header-row">
        <div>
          <h2 className="section-title">Distributed Batch Counter (Deep Dive)</h2>
          <p className="section-subtitle">
            Decoupled atomic reservation using Redis <code>INCRBY</code> eliminates database write locking
          </p>
        </div>
        <button
          type="button"
          className="action-btn"
          onClick={onRefresh}
          disabled={loading}
        >
          <RefreshCwIcon size={16} className={loading ? 'spin' : ''} />
          <span>Refresh Allocation</span>
        </button>
      </div>

      {/* Real-time Telemetry Metrics Grid */}
      <div className="counter-metrics-grid">
        <div className="counter-stat-card">
          <div className="stat-card-header">
            <span className="card-label">Worker Instance ID</span>
            <CpuIcon size={18} className="text-cyan" />
          </div>
          <div className="card-value-lg text-cyan mono">
            {counter?.instanceId || 'write-worker-1'}
          </div>
          <p className="card-hint">Independent Node.js container node</p>
        </div>

        <div className="counter-stat-card">
          <div className="stat-card-header">
            <span className="card-label">Current Local Token</span>
            <ZapIcon size={18} className="text-amber" />
          </div>
          <div className="card-value-lg text-amber mono">
            {counter?.currentCounter ?? '...'}
          </div>
          <p className="card-hint">Next sequential ID to encode</p>
        </div>

        <div className="counter-stat-card">
          <div className="stat-card-header">
            <span className="card-label">Reserved Max Counter</span>
            <ShieldCheckIcon size={18} className="text-emerald" />
          </div>
          <div className="card-value-lg text-emerald mono">
            {counter?.maxCounter ?? '...'}
          </div>
          <p className="card-hint">Batch ceiling allocated from Redis</p>
        </div>

        <div className="counter-stat-card">
          <div className="stat-card-header">
            <span className="card-label">Tokens Left in Local Memory</span>
            <LayersIcon size={18} className="text-purple" />
          </div>
          <div className="card-value-lg text-purple mono">
            {counter?.remainingInBatch ?? '...'}
          </div>
          <p className="card-hint">Remaining before next atomic fetch</p>
        </div>
      </div>

      {/* Visual Batch Token Meter */}
      <div className="glass-card batch-meter-card">
        <div className="meter-header">
          <div className="meter-info">
            <h3 className="meter-title">Local In-Memory Batch Consumption</h3>
            <span className="meter-sub">
              {usedInBatch} of {batchSize} tokens consumed ({percentUsed}% allocated)
            </span>
          </div>
          <span className="meter-badge mono">Batch Size: {batchSize.toLocaleString()}</span>
        </div>

        <div className="meter-track">
          <div
            className="meter-fill"
            style={{ width: `${percentUsed}%` }}
          ></div>
        </div>

        <div className="meter-legend">
          <span>Range Start: {counter ? counter.maxCounter - batchSize + 1 : 0}</span>
          <span className="legend-center">Local In-Memory Increment (0ms overhead)</span>
          <span>Ceiling: {counter?.maxCounter || 0}</span>
        </div>
      </div>

      {/* System Design Technical Explainer */}
      <div className="architecture-grid">
        <div className="arch-card">
          <div className="arch-card-header">
            <span className="arch-step">Why Distributed Batching?</span>
            <h3>No Database Lock Contention</h3>
          </div>
          <p>
            At 100M URLs/day (1,200 write QPS peak), querying an auto-increment Postgres ID
            on every request would saturate database locks. Instead, each Node.js worker executes
            one atomic <code>INCRBY bitly:counter 1000</code> in Redis and dispenses sequential IDs locally.
          </p>
          <div className="arch-metrics">
            <span className="metric-tag">O(1) Redis Atomic</span>
            <span className="metric-tag">Sub-microsecond local dispatch</span>
          </div>
        </div>

        <div className="arch-card">
          <div className="arch-card-header">
            <span className="arch-step">Bijective Encoding</span>
            <h3>Base62 + Feistel Permutation</h3>
          </div>
          <p>
            Sequential IDs are passed through a pseudo-random Feistel cipher permutation before
            Base62 bijective encoding. This prevents competitors or crawlers from enumerating short codes
            while retaining a 100% collision-free mathematical guarantee without database checks.
          </p>
          <div className="arch-metrics">
            <span className="metric-tag">Zero Collisions</span>
            <span className="metric-tag">Non-predictable URLs</span>
          </div>
        </div>

        <div className="arch-card">
          <div className="arch-card-header">
            <span className="arch-step">Fault Resilience</span>
            <h3>Worker Crash Containment</h3>
          </div>
          <p>
            If a worker process restarts unexpectedly, only unused tokens within its batch of 1,000
            are skipped. The global counter in Redis persists safely, ensuring no duplicate shortcodes
            can ever be issued across instances or restarts.
          </p>
          <div className="arch-metrics">
            <span className="metric-tag">Redis AOF Persistence</span>
            <span className="metric-tag">Distributed Safety</span>
          </div>
        </div>
      </div>
    </div>
  );
};
