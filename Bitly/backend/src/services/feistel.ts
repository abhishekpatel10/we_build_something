/**
 * Bijective Feistel Cipher for Integer Obfuscation
 *
 * Evan's Deep Dive 1 in Hello Interview:
 * "Sequential Counter + Base62 is 100% unique with zero collision checks.
 * Fix for predictability: Pass the counter through a bijective function /
 * Feistel cipher to obfuscate the integer into a pseudo-random, unique
 * output before encoding."
 *
 * This Feistel network scrambles a 40-bit counter value into a pseudo-random
 * 40-bit integer in a 1-to-1 bijective mapping:
 * - Guarantee: Never collides (bijective / reversible).
 * - Sequential inputs (1, 2, 3, 4...) produce non-sequential, unguessable values.
 * - Fits within 6-7 Base62 characters (40 bits = 1.099 Trillion values).
 */

export class FeistelCipher {
  // 40 bits total: 20 bits for left half, 20 bits for right half
  private static readonly BITS_PER_HALF = 20n;
  private static readonly HALF_MASK = (1n << 20n) - 1n; // 0xFFFFF (1,048,575)
  private static readonly TOTAL_MASK = (1n << 40n) - 1n; // ~1.1 Trillion space

  // Fixed pseudo-random subkeys for 4 rounds
  private static readonly ROUND_KEYS = [
    0x9e3779n,
    0x7f4a7cn,
    0x1a87e5n,
    0x5c3a21n,
  ];

  /**
   * Round function F(R, K) mixing right half and key
   */
  private static roundFunction(r: bigint, k: bigint): bigint {
    const mixed = ((r ^ k) * 0x5bd1e995n) & FeistelCipher.HALF_MASK;
    return (mixed ^ (mixed >> 10n)) & FeistelCipher.HALF_MASK;
  }

  /**
   * Bijectively obfuscates an integer counter.
   * Every distinct input produces a unique pseudo-random output.
   */
  public static obfuscate(counter: number | bigint): bigint {
    const val = BigInt(counter);
    const masked = val & FeistelCipher.TOTAL_MASK;

    let l = (masked >> FeistelCipher.BITS_PER_HALF) & FeistelCipher.HALF_MASK;
    let r = masked & FeistelCipher.HALF_MASK;

    // 4-round Feistel Network
    for (let round = 0; round < 4; round++) {
      const nextL = r;
      const f = FeistelCipher.roundFunction(r, FeistelCipher.ROUND_KEYS[round]);
      const nextR = l ^ f;
      l = nextL;
      r = nextR;
    }

    // Recombine (l, r) back into 40-bit integer
    const scrambled = (l << FeistelCipher.BITS_PER_HALF) | r;

    // If input had higher bits beyond 40 bits, preserve them
    const higherBits = val & ~FeistelCipher.TOTAL_MASK;
    return higherBits | scrambled;
  }

  /**
   * Reverse permutation: restores the original sequential counter.
   */
  public static deobfuscate(obfuscated: number | bigint): bigint {
    const val = BigInt(obfuscated);
    const masked = val & FeistelCipher.TOTAL_MASK;

    let l = (masked >> FeistelCipher.BITS_PER_HALF) & FeistelCipher.HALF_MASK;
    let r = masked & FeistelCipher.HALF_MASK;

    // Reverse the 4 rounds using keys in backwards order
    for (let round = 3; round >= 0; round--) {
      const prevR = l;
      const f = FeistelCipher.roundFunction(prevR, FeistelCipher.ROUND_KEYS[round]);
      const prevL = r ^ f;
      l = prevL;
      r = prevR;
    }

    const unscrambled = (l << FeistelCipher.BITS_PER_HALF) | r;
    const higherBits = val & ~FeistelCipher.TOTAL_MASK;
    return higherBits | unscrambled;
  }
}
