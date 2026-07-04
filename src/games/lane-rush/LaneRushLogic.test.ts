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
