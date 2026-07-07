// Per-game score plausibility shared by client and server (plan §7). Every
// constant below was re-derived against the current *Logic.ts source on
// 2026-07-07 (Phase 0 — zero drift from the plan table). If gameplay scoring
// ever changes, these constants are part of that change's blast radius; the
// Vitest suite pins them.

import type { GameId } from './types.js';

// Field ranges (plan §4; DB CHECKs back-stop).
export const TICK_MAX = 1_000_000;
// Non-zero uint32, matching the seeds src/core/RunSeeds.ts deals.
export const RUN_SEED_MAX = 4_294_967_295;

// Rate bounds are generous by 25% so no honest run is ever rejected.
export const PLAUSIBILITY_SLACK = 1.25;

interface PlausibilityRule {
  // Upper bound on an honest score at a given tick, before slack (plan §7).
  rate: (tick: number) => number;
  // Extra cheap check where every scoring event shares a factor.
  divisor?: number;
  hardCap: number;
}

const RULES: Readonly<Record<GameId, PlausibilityRule>> = {
  // NeonSerpentLogic.ts:126-127 — score += 10 × multiplier, capped at 8 →
  // ≤ 80/food at ≤ 1 food/tick. The 18×24 grid (lines 45-46) caps foods at
  // ~429, so the theoretical max is ≈ 34,320.
  'neon-serpent': { rate: (tick) => 80 * tick, divisor: 10, hardCap: 35_000 },
  // BounceCircuitLogic.ts — distance ≤ runnerMaxSpeed (0.42/tick, line 36)
  // banked once (line 154); +25/orb (line 171) with ≤ 3 orbs per
  // runnerChunkUnits=16 chunk (line 20, the arc archetype) → ≤ ~2.4/tick
  // sustained; +200 covers early arcs before the average settles.
  'bounce-circuit': { rate: (tick) => 3 * tick + 200, hardCap: 150_000 },
  // StarCourierLogic.ts:121,217 — enemy spawn floor max(14, 34 − wave×3)
  // ticks, +15/kill, kills ≤ spawns.
  'star-courier': { rate: (tick) => 15 * (tick / 14 + 1), divisor: 15, hardCap: 120_000 },
  // LaneRushLogic.ts:108,118 — spawn attempt every 28 ticks, best +12/car
  // (near-miss lane), else +5.
  'lane-rush': { rate: (tick) => 12 * (tick / 28 + 1), hardCap: 50_000 },
  // CircuitStackLogic.ts:207 — line clears [100,250,450,700] are the only
  // score source; ≥ circuitMinDropTicks=10 ticks per lock at max gravity and
  // a 700-point tetris consumes 8 pieces → ≤ ~8.75/tick sustained (+1400 ≈
  // two early tetrises of headroom).
  'circuit-stack': { rate: (tick) => 9 * tick + 1400, divisor: 50, hardCap: 200_000 }
};

export function scoreHardCap(gameId: GameId): number {
  return RULES[gameId].hardCap;
}

export function scoreDivisor(gameId: GameId): number | undefined {
  return RULES[gameId].divisor;
}

export function plausibleMaxScore(gameId: GameId, tick: number): number {
  const rule = RULES[gameId];
  return Math.min(rule.hardCap, Math.floor(rule.rate(tick) * PLAUSIBILITY_SLACK));
}

// Range checks (plan §4 steps 3-5). Score 0 is never submitted — nothing to
// rank — so 1 is the floor everywhere.
export function isValidScore(gameId: GameId, score: unknown): score is number {
  return (
    typeof score === 'number' &&
    Number.isSafeInteger(score) &&
    score >= 1 &&
    score <= RULES[gameId].hardCap
  );
}

export function isValidTick(tick: unknown): tick is number {
  return typeof tick === 'number' && Number.isSafeInteger(tick) && tick >= 1 && tick <= TICK_MAX;
}

export function isValidRunSeed(seed: unknown): seed is number {
  return (
    typeof seed === 'number' && Number.isSafeInteger(seed) && seed >= 1 && seed <= RUN_SEED_MAX
  );
}

// Divisor + rate-bound check (plan §4 step 6). Assumes score and tick have
// already passed the range checks above.
export function isPlausibleScore(gameId: GameId, score: number, tick: number): boolean {
  const rule = RULES[gameId];
  if (rule.divisor !== undefined && score % rule.divisor !== 0) {
    return false;
  }
  return score <= plausibleMaxScore(gameId, tick);
}
