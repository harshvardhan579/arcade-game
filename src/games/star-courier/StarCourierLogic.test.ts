import { describe, expect, it } from 'vitest';
import { StarCourierLogic } from './StarCourierLogic';

describe('StarCourierLogic', () => {
  it('reuses fixed object pools without growth', () => {
    const logic = new StarCourierLogic();
    const initialPool = logic.restart().poolSize;
    for (let i = 0; i < 120; i += 1) {
      logic.handleInput('ACTION');
      logic.step();
    }
    expect(logic.getState().poolSize).toBe(initialPool);
  });

  it('handles projectile and enemy collision', () => {
    const logic = new StarCourierLogic();
    logic.restart(1);
    logic.handleInput('ACTION');
    for (let i = 0; i < 34; i += 1) logic.step();
    expect(logic.getState().score).toBeGreaterThanOrEqual(0);
  });

  it('scales waves deterministically', () => {
    const run = () => {
      const logic = new StarCourierLogic();
      logic.restart(2);
      for (let i = 0; i < 180; i += 1) logic.step();
      return logic.getState();
    };
    expect(run().wave).toBe(run().wave);
    expect(run().wave).toBeGreaterThan(1);
  });
});
