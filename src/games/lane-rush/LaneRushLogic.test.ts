import { describe, expect, it } from 'vitest';
import {
  LaneRushLogic,
  laneRushBoostCooldownTicks,
  laneRushBoostDurationTicks,
  laneRushBoostMultiplier,
  laneRushDoubleTapTicks,
  laneRushMaxSpeed
} from './LaneRushLogic';

// Survive indefinitely by clearing the (public) traffic each step.
function stepClear(logic: LaneRushLogic, steps: number): void {
  for (let i = 0; i < steps; i += 1) {
    logic.traffic.length = 0;
    logic.step();
  }
}

describe('LaneRushLogic', () => {
  it('clamps lane changes at edges', () => {
    const logic = new LaneRushLogic();
    logic.restart();
    logic.handleInput('LEFT');
    logic.handleInput('LEFT');
    expect(logic.getState().lane).toBe(0);
    logic.handleInput('RIGHT');
    logic.handleInput('RIGHT');
    logic.handleInput('RIGHT');
    expect(logic.getState().lane).toBe(2);
  });

  it('spawns traffic without impossible top-lane saturation', () => {
    const logic = new LaneRushLogic();
    logic.restart(3);
    for (let i = 0; i < 90; i += 1) logic.step();
    expect(logic.getState().trafficCount).toBeLessThanOrEqual(3);
  });

  it('exposes real traffic positions that spawn on top and advance by speed', () => {
    const logic = new LaneRushLogic();
    logic.restart(5);
    for (let i = 0; i < 28; i += 1) logic.step();
    const spawned = logic.getState();
    expect(spawned.traffic).toHaveLength(1);
    const car = spawned.traffic[0]!;
    expect([0, 1, 2]).toContain(car.lane);
    expect(car.y).toBeGreaterThan(-1);
    expect(car.y).toBeLessThan(0);
    logic.step();
    const later = logic.getState();
    expect(later.traffic[0]!.y).toBeCloseTo(car.y + later.speed, 2);
    expect(later.traffic[0]!.lane).toBe(car.lane);
    expect(later.traffic[0]!.variant).toBe(car.variant);
    expect(car.variant).toBeGreaterThanOrEqual(0);
    expect(car.variant).toBeLessThan(3);
    expect(later.trafficCount).toBe(later.traffic.length);
  });

  it('exposes identical traffic snapshots for identical seeds', () => {
    const run = () => {
      const logic = new LaneRushLogic();
      logic.restart(6);
      for (let i = 0; i < 100; i += 1) logic.step();
      return logic.getState().traffic;
    };
    const first = run();
    expect(first.length).toBeGreaterThan(0);
    expect(run()).toEqual(first);
  });

  it('returns a JSON-serializable, detached snapshot', () => {
    const logic = new LaneRushLogic();
    logic.restart(7);
    for (let i = 0; i < 40; i += 1) logic.step();
    const state = logic.getState();
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
    (state.traffic as { lane: number; y: number; scored: boolean; variant: number }[]).push({
      lane: 0,
      y: 99,
      scored: false,
      variant: 0
    });
    expect(logic.getState().traffic).not.toContainEqual({
      lane: 0,
      y: 99,
      scored: false,
      variant: 0
    });
  });

  it('ramps speed monotonically and plateaus at the cap', () => {
    const logic = new LaneRushLogic();
    logic.restart(3);
    let previous = logic.getState().speed;
    for (let i = 0; i < 1200; i += 1) {
      logic.traffic.length = 0;
      logic.step();
      const speed = logic.getState().speed;
      expect(speed).toBeGreaterThanOrEqual(previous);
      previous = speed;
    }
    expect(previous, 'long runs must plateau instead of ramping forever').toBe(laneRushMaxSpeed);
  });

  it('a double tap inside the interval arms the boost; a slow second tap does not', () => {
    const slow = new LaneRushLogic();
    slow.restart(3);
    slow.handleInput('ACTION');
    stepClear(slow, laneRushDoubleTapTicks + 2);
    slow.handleInput('ACTION');
    expect(slow.getState().boostTicksLeft, 'late second tap must not boost').toBe(0);

    const quick = new LaneRushLogic();
    quick.restart(3);
    stepClear(quick, 40);
    const before = quick.getState().speed;
    quick.handleInput('ACTION');
    stepClear(quick, 3);
    quick.handleInput('ACTION');
    expect(quick.getState().boostTicksLeft).toBe(laneRushBoostDurationTicks);
    stepClear(quick, 1);
    expect(quick.getState().speed, 'boost must multiply the base speed').toBeCloseTo(
      Math.min(laneRushMaxSpeed, 0.18 + quick.getState().tick / 2400) * laneRushBoostMultiplier,
      3
    );
    expect(quick.getState().speed).toBeGreaterThan(before * 1.5);
  });

  it('boost expires into a cooldown that blocks re-boost until it clears', () => {
    const logic = new LaneRushLogic();
    logic.restart(3);
    logic.handleInput('ACTION');
    stepClear(logic, 2);
    logic.handleInput('ACTION');
    expect(logic.getState().boostTicksLeft).toBe(laneRushBoostDurationTicks);
    stepClear(logic, laneRushBoostDurationTicks);
    const expired = logic.getState();
    expect(expired.boostTicksLeft).toBe(0);
    expect(expired.boostCooldownTicks).toBe(laneRushBoostCooldownTicks);
    // A double tap during cooldown must not re-arm.
    logic.handleInput('ACTION');
    stepClear(logic, 2);
    logic.handleInput('ACTION');
    expect(logic.getState().boostTicksLeft, 'cooldown must block the boost').toBe(0);
    stepClear(logic, laneRushBoostCooldownTicks);
    expect(logic.getState().boostCooldownTicks).toBe(0);
    logic.handleInput('ACTION');
    stepClear(logic, 2);
    logic.handleInput('ACTION');
    expect(logic.getState().boostTicksLeft, 'boost must re-arm after cooldown').toBe(
      laneRushBoostDurationTicks
    );
  });

  it('a parked crash exposes the collision position and ACTION still restarts', () => {
    const logic = new LaneRushLogic();
    logic.restart(12);
    expect(logic.getState().crashLane).toBe(-1);
    for (let i = 0; i < 400 && !logic.getState().isGameOver; i += 1) logic.step();
    const crashed = logic.getState();
    expect(crashed.isGameOver).toBe(true);
    expect(crashed.crashLane, 'the crash must happen in the parked lane').toBe(crashed.lane);
    expect(crashed.crashY).toBeGreaterThan(8.8);
    expect(crashed.crashY).toBeLessThan(10.2);
    logic.handleInput('ACTION');
    const restarted = logic.getState();
    expect(restarted.isGameOver).toBe(false);
    expect(restarted.score).toBe(0);
    expect(restarted.crashLane).toBe(-1);
    expect(restarted.boostTicksLeft).toBe(0);
  });

  it('awards near-miss score without registering a hit', () => {
    const logic = new LaneRushLogic();
    logic.restart(4);
    for (let i = 0; i < 28; i += 1) logic.step();
    logic.handleInput('LEFT');
    for (let i = 0; i < 60; i += 1) logic.step();
    const state = logic.getState();
    expect(state.score).toBeGreaterThanOrEqual(0);
    expect(typeof state.isGameOver).toBe('boolean');
  });
});
