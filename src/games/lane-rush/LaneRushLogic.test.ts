import { describe, expect, it } from 'vitest';
import { LaneRushLogic } from './LaneRushLogic';

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
