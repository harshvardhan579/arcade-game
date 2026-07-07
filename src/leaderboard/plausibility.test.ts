import { describe, expect, it } from 'vitest';
import { runnerChunkUnits, runnerMaxSpeed } from '../games/bounce-circuit/BounceCircuitLogic';
import { circuitMinDropTicks } from '../games/circuit-stack/CircuitStackLogic';
import {
  isPlausibleScore,
  isValidRunSeed,
  isValidScore,
  isValidTick,
  plausibleMaxScore,
  RUN_SEED_MAX,
  scoreDivisor,
  scoreHardCap,
  TICK_MAX
} from './plausibility';
import { GAME_IDS } from './types';

describe('score range rules', () => {
  it('rejects zero, negatives, fractions, and non-numbers', () => {
    expect(isValidScore('neon-serpent', 0)).toBe(false);
    expect(isValidScore('neon-serpent', -10)).toBe(false);
    expect(isValidScore('neon-serpent', 1.5)).toBe(false);
    expect(isValidScore('neon-serpent', Number.NaN)).toBe(false);
    expect(isValidScore('neon-serpent', Number.POSITIVE_INFINITY)).toBe(false);
    expect(isValidScore('neon-serpent', '100')).toBe(false);
    expect(isValidScore('neon-serpent', null)).toBe(false);
  });

  it('accepts 1 through each per-game hard cap, rejects cap + 1', () => {
    for (const id of GAME_IDS) {
      expect(isValidScore(id, 1)).toBe(true);
      expect(isValidScore(id, scoreHardCap(id))).toBe(true);
      expect(isValidScore(id, scoreHardCap(id) + 1)).toBe(false);
    }
  });

  it('pins the per-game hard caps and divisors from the plan §7 table', () => {
    expect(scoreHardCap('neon-serpent')).toBe(35_000);
    expect(scoreHardCap('bounce-circuit')).toBe(150_000);
    expect(scoreHardCap('star-courier')).toBe(120_000);
    expect(scoreHardCap('lane-rush')).toBe(50_000);
    expect(scoreHardCap('circuit-stack')).toBe(200_000);
    expect(scoreDivisor('neon-serpent')).toBe(10);
    expect(scoreDivisor('bounce-circuit')).toBeUndefined();
    expect(scoreDivisor('star-courier')).toBe(15);
    expect(scoreDivisor('lane-rush')).toBeUndefined();
    expect(scoreDivisor('circuit-stack')).toBe(50);
  });
});

describe('tick and run-seed range rules', () => {
  it('bounds tick to 1..TICK_MAX integers', () => {
    expect(isValidTick(0)).toBe(false);
    expect(isValidTick(1)).toBe(true);
    expect(isValidTick(TICK_MAX)).toBe(true);
    expect(isValidTick(TICK_MAX + 1)).toBe(false);
    expect(isValidTick(2.5)).toBe(false);
    expect(isValidTick('7')).toBe(false);
  });

  it('bounds run seed to non-zero uint32', () => {
    expect(isValidRunSeed(0)).toBe(false);
    expect(isValidRunSeed(1)).toBe(true);
    expect(isValidRunSeed(RUN_SEED_MAX)).toBe(true);
    expect(isValidRunSeed(RUN_SEED_MAX + 1)).toBe(false);
    expect(isValidRunSeed(-1)).toBe(false);
    expect(isValidRunSeed(1.5)).toBe(false);
  });
});

describe('per-game plausibility boundaries', () => {
  it('neon-serpent: 80/tick rate with divisor 10', () => {
    // floor(80 × 100 × 1.25) = 10,000
    expect(plausibleMaxScore('neon-serpent', 100)).toBe(10_000);
    expect(isPlausibleScore('neon-serpent', 10_000, 100)).toBe(true);
    expect(isPlausibleScore('neon-serpent', 10_010, 100)).toBe(false);
    expect(isPlausibleScore('neon-serpent', 9_995, 100)).toBe(false); // divisor
    // The rate meets the cap exactly at tick 350: 80 × 350 × 1.25 = 35,000.
    expect(plausibleMaxScore('neon-serpent', 350)).toBe(35_000);
  });

  it('bounce-circuit: 3/tick + 200 rate, no divisor', () => {
    // floor((3 × 100 + 200) × 1.25) = 625
    expect(plausibleMaxScore('bounce-circuit', 100)).toBe(625);
    expect(isPlausibleScore('bounce-circuit', 625, 100)).toBe(true);
    expect(isPlausibleScore('bounce-circuit', 626, 100)).toBe(false);
  });

  it('star-courier: 15 × (tick/14 + 1) rate with divisor 15', () => {
    // floor(15 × (14/14 + 1) × 1.25) = 37 → best multiple of 15 is 30.
    expect(plausibleMaxScore('star-courier', 14)).toBe(37);
    expect(isPlausibleScore('star-courier', 30, 14)).toBe(true);
    expect(isPlausibleScore('star-courier', 45, 14)).toBe(false);
    expect(isPlausibleScore('star-courier', 37, 14)).toBe(false); // divisor
    // floor(15 × (140/14 + 1) × 1.25) = 206 → best multiple of 15 is 195.
    expect(isPlausibleScore('star-courier', 195, 140)).toBe(true);
    expect(isPlausibleScore('star-courier', 210, 140)).toBe(false);
  });

  it('lane-rush: 12 × (tick/28 + 1) rate, no divisor', () => {
    // 12 × (28/28 + 1) × 1.25 = 30
    expect(plausibleMaxScore('lane-rush', 28)).toBe(30);
    expect(isPlausibleScore('lane-rush', 30, 28)).toBe(true);
    expect(isPlausibleScore('lane-rush', 31, 28)).toBe(false);
    // 12 × (280/28 + 1) × 1.25 = 165
    expect(isPlausibleScore('lane-rush', 165, 280)).toBe(true);
    expect(isPlausibleScore('lane-rush', 166, 280)).toBe(false);
  });

  it('circuit-stack: 9/tick + 1400 rate with divisor 50', () => {
    // (9 × 100 + 1400) × 1.25 = 2,875 → best multiple of 50 is 2,850.
    expect(plausibleMaxScore('circuit-stack', 100)).toBe(2_875);
    expect(isPlausibleScore('circuit-stack', 2_850, 100)).toBe(true);
    expect(isPlausibleScore('circuit-stack', 2_900, 100)).toBe(false);
    expect(isPlausibleScore('circuit-stack', 2_875, 100)).toBe(false); // divisor
  });

  it('caps every game at its hard cap for arbitrarily long runs', () => {
    for (const id of GAME_IDS) {
      expect(plausibleMaxScore(id, TICK_MAX)).toBe(scoreHardCap(id));
    }
  });
});

describe('derivation sync pins against exported logic constants', () => {
  it('bounce-circuit rate coefficient dominates the honest per-tick ceiling', () => {
    // Distance banks runnerMaxSpeed per tick; an orb-arc chunk adds 3 × 25
    // over the ticks needed to traverse one chunk. If either logic constant
    // moves, this pin fails and the §7 table must be re-derived.
    const chunkTraversalTicks = runnerChunkUnits / runnerMaxSpeed;
    const honestCeiling = runnerMaxSpeed + (3 * 25) / chunkTraversalTicks;
    expect(honestCeiling).toBeLessThanOrEqual(3);
  });

  it('circuit-stack rate coefficient dominates the max-gravity tetris pace', () => {
    // A 700-point tetris consumes 8 pieces, each locking no faster than
    // circuitMinDropTicks at max gravity.
    const honestCeiling = 700 / (8 * circuitMinDropTicks);
    expect(honestCeiling).toBeLessThanOrEqual(9);
  });
});
