import { describe, expect, it } from 'vitest';
import { mixSeed } from './RunSeeds';

describe('mixSeed', () => {
  it('is deterministic for identical inputs', () => {
    expect(mixSeed(1751700000000, 123456, 1)).toBe(mixSeed(1751700000000, 123456, 1));
    expect(mixSeed(42, 7, 3)).toBe(mixSeed(42, 7, 3));
  });

  it('stays a non-zero unsigned 32-bit integer, even for degenerate inputs', () => {
    for (const [a, b, c] of [
      [0, 0, 0],
      [1, 0, 0],
      [0xffffffff, 0xffffffff, 0xffffffff],
      [1751700000000, 0.5, 2]
    ] as const) {
      const seed = mixSeed(a, b, c);
      expect(Number.isInteger(seed), `integer for ${a},${b},${c}`).toBe(true);
      expect(seed, `non-zero for ${a},${b},${c}`).toBeGreaterThan(0);
      expect(seed, `32-bit for ${a},${b},${c}`).toBeLessThanOrEqual(0xffffffff);
    }
  });

  it('produces distinct seeds across consecutive counters under a frozen clock', () => {
    const seen = new Set<number>();
    for (let counter = 1; counter <= 500; counter += 1) {
      seen.add(mixSeed(1751700000000, 987654, counter));
    }
    expect(seen.size).toBe(500);
  });
});
