import test from 'node:test';
import assert from 'node:assert/strict';
import { Base62 } from '../src/services/base62.js';

test('Base62 - encode and decode 0', () => {
  const encoded = Base62.encode(0n, 1);
  assert.equal(encoded, '0');
  const decoded = Base62.decode(encoded);
  assert.equal(decoded, 0n);
});

test('Base62 - encode with padding', () => {
  const encoded = Base62.encode(125n, 6);
  assert.equal(encoded.length, 6);
  const decoded = Base62.decode(encoded);
  assert.equal(decoded, 125n);
});

test('Base62 - large BigInt roundtrip', () => {
  const numbers = [1n, 61n, 62n, 1000n, 56800235583n, 3521614606207n];
  for (const num of numbers) {
    const encoded = Base62.encode(num, 0);
    const decoded = Base62.decode(encoded);
    assert.equal(decoded, num, `Failed roundtrip for ${num}`);
  }
});

test('Base62 - alphabet consistency', () => {
  assert.equal(Base62.encode(0n, 0), '0');
  assert.equal(Base62.encode(10n, 0), 'a');
  assert.equal(Base62.encode(35n, 0), 'z');
  assert.equal(Base62.encode(36n, 0), 'A');
  assert.equal(Base62.encode(61n, 0), 'Z');
});
