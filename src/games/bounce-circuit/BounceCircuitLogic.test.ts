import { describe, expect, it } from 'vitest';
import { BounceCircuitLogic } from './BounceCircuitLogic';

describe('BounceCircuitLogic', () => {
  it('jumps upward then returns to ground contact', () => {
    const logic = new BounceCircuitLogic();
    logic.restart();
    logic.handleInput('ACTION');
    expect(logic.step().playerY).toBeGreaterThan(0);
    for (let i = 0; i < 35; i += 1) logic.step();
    expect(logic.getState().playerY).toBe(0);
  });

  it('collides with spikes', () => {
    const logic = new BounceCircuitLogic();
    logic.restart();
    for (let i = 0; i < 9; i += 1) {
      logic.handleInput('RIGHT');
      logic.step();
    }
    expect(logic.getState().isGameOver).toBe(true);
  });

  it('keeps the door locked until the key is collected', () => {
    const logic = new BounceCircuitLogic();
    logic.restart();
    for (let i = 0; i < 22; i += 1) {
      logic.handleInput('RIGHT');
      logic.step();
    }
    expect(logic.getState().phase).not.toBe('won');
  });
});
