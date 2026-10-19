/**
 * Base62 Bijective Encoder/Decoder
 * Character set: 0-9, a-z, A-Z (62 characters)
 * 62^6 = 56,800,235,584 (56.8 Billion possible 6-char strings)
 * 62^7 = 3,521,614,606,208 (3.5 Trillion possible 7-char strings)
 */

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const BASE = BigInt(62);

const CHAR_TO_INDEX: { [key: string]: bigint } = {};
for (let i = 0; i < ALPHABET.length; i++) {
  CHAR_TO_INDEX[ALPHABET[i]] = BigInt(i);
}

export class Base62 {
  /**
   * Encodes a positive integer into a Base62 string.
   * @param num Positive integer or BigInt
   * @param minLength Minimum length to pad with leading '0'
   */
  public static encode(num: number | bigint, minLength = 6): string {
    let n = BigInt(num);
    if (n < 0n) {
      throw new Error('Base62 encoding requires a non-negative number');
    }
    if (n === 0n) {
      return '0'.repeat(minLength > 0 ? minLength : 1);
    }

    let result = '';
    while (n > 0n) {
      const remainder = Number(n % BASE);
      result = ALPHABET[remainder] + result;
      n = n / BASE;
    }

    if (minLength > 0 && result.length < minLength) {
      result = '0'.repeat(minLength - result.length) + result;
    }

    return result;
  }

  /**
   * Decodes a Base62 string back into a BigInt.
   * @param str Base62 encoded string
   */
  public static decode(str: string): bigint {
    if (!str || str.length === 0) {
      throw new Error('Cannot decode empty Base62 string');
    }

    let result = 0n;
    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      const val = CHAR_TO_INDEX[char];
      if (val === undefined) {
        throw new Error(`Invalid Base62 character: '${char}'`);
      }
      result = result * BASE + val;
    }

    return result;
  }
}
