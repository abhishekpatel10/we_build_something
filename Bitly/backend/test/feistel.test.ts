import test from 'node:test';
import assert from 'node:assert/strict';
import { FeistelCipher } from '../src/services/feistel.js';

test('FeistelCipher - perfect reversibility (bijective check)', () => {
  const testValues = [0n, 1n, 2n, 3n, 42n, 1000n, 65535n, 1000000n, 50000000n];

  for (const val of testValues) {
    const obfuscated = FeistelCipher.obfuscate(val);
    const deobfuscated = FeistelCipher.deobfuscate(obfuscated);
    assert.equal(deobfuscated, val, `Deobfuscation failed for ${val}`);
  }
});

test('FeistelCipher - no collisions across consecutive ranges', () => {
  const seen = new Set<bigint>();
  const count = 5000;

  for (let i = 1n; i <= BigInt(count); i++) {
    const scrambled = FeistelCipher.obfuscate(i);
    assert.equal(seen.has(scrambled), false, `Collision detected at counter ${i}`);
    seen.add(scrambled);
  }

  assert.equal(seen.size, count);
});

test('FeistelCipher - produces non-sequential avalanche dispersion', () => {
  const a = FeistelCipher.obfuscate(1001n);
  const b = FeistelCipher.obfuscate(1002n);
  const diff = a > b ? a - b : b - a;

  // The difference should not be 1 (demonstrating pseudo-random dispersion)
  assert.notEqual(diff, 1n);
  assert.ok(diff > 1000n, 'Dispersion should scatter values widely');
});
