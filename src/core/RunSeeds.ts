/**
 * Run-seed source for live gameplay variation.
 *
 * Logic engines stay deterministic for a given seed; variation comes from the
 * scene layer drawing a fresh seed here for every new run (scene create, the
 * Restart button, ACTION after game over). Tests force exact seeds instead:
 * Playwright sets `window.__ARCADE_FIXED_SEEDS__` (keyed by game id) via
 * addInitScript before the app boots, and `?seed=N` forces a single seed for
 * every game when debugging by hand.
 */

let runCounter = 0;

/** Pure 32-bit mixer, exported separately so it can be unit-tested. */
export function mixSeed(a: number, b: number, c: number): number {
  let mixed = ((a >>> 0) ^ Math.imul(b >>> 0, 2654435761) ^ Math.imul(c >>> 0, 40503)) >>> 0;
  mixed ^= mixed >>> 16;
  mixed = Math.imul(mixed, 2246822519) >>> 0;
  mixed ^= mixed >>> 13;
  mixed = Math.imul(mixed, 3266489917) >>> 0;
  mixed ^= mixed >>> 16;
  // SeededRandom aliases 0 to 1; avoid 0 so the bridge reports the real seed.
  return mixed >>> 0 || 1;
}

function forcedSeedFor(gameId: string): number | undefined {
  const fromMap = window.__ARCADE_FIXED_SEEDS__?.[gameId];
  if (typeof fromMap === 'number' && Number.isFinite(fromMap)) return fromMap;
  const param = new URLSearchParams(window.location.search).get('seed');
  if (param !== null) {
    const parsed = Number(param);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

/**
 * The seed for the next run of `gameId`: the forced test seed when one is
 * set, otherwise a fresh clock mix (the counter keeps restarts within the
 * same millisecond distinct).
 */
export function nextRunSeed(gameId: string): number {
  const forced = forcedSeedFor(gameId);
  if (forced !== undefined) return forced;
  runCounter += 1;
  return mixSeed(Date.now(), performance.now() * 1e6, runCounter);
}

declare global {
  interface Window {
    /** Per-game forced run seeds for tests (keyed by scene key / game id). */
    __ARCADE_FIXED_SEEDS__?: Record<string, number>;
  }
}
