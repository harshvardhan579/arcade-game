import { describe, expect, it } from 'vitest';
import { CircuitStackLogic } from './CircuitStackLogic';

describe('CircuitStackLogic', () => {
  it('scores simultaneous multi-row clears', () => {
    const logic = new CircuitStackLogic(1);
    logic.grid[12] = Array.from({ length: logic.width }, () => 1);
    logic.grid[13] = Array.from({ length: logic.width }, () => 1);
    logic.lockForTest();
    expect(logic.getState().score).toBeGreaterThanOrEqual(250);
  });

  it('rejects or kicks rotation against a wall', () => {
    const logic = new CircuitStackLogic(2);
    logic.handleInput('LEFT');
    logic.handleInput('LEFT');
    logic.handleInput('LEFT');
    logic.handleInput('LEFT');
    logic.handleInput('UP');
    expect(logic.getState().pieceX).toBeGreaterThanOrEqual(0);
  });

  it('marks game over when spawn is blocked', () => {
    const logic = new CircuitStackLogic(3);
    logic.grid[0][3] = 1;
    logic.grid[0][4] = 1;
    logic.lockForTest();
    expect(logic.getState().isGameOver).toBe(true);
  });
});
