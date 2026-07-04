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

  it('exposes the four real piece cells anchored to pieceX/pieceY', () => {
    const logic = new CircuitStackLogic(5);
    const state = logic.getState();
    expect(state.pieceCells).toHaveLength(4);
    for (const block of state.pieceCells) {
      expect(block.x).toBeGreaterThanOrEqual(0);
      expect(block.x).toBeLessThan(logic.width);
      expect(block.y).toBeGreaterThanOrEqual(0);
      expect(block.y).toBeLessThan(logic.height);
    }
    logic.handleInput('LEFT');
    const moved = logic.getState();
    const shifted = state.pieceCells.map((block) => ({ x: block.x - 1, y: block.y }));
    expect(moved.pieceCells).toEqual(shifted);
  });

  it('rotates exposed cells around the piece anchor', () => {
    const logic = new CircuitStackLogic(6);
    const before = logic.getState();
    const offsets = before.pieceCells.map((block) => ({
      x: block.x - before.pieceX,
      y: block.y - before.pieceY
    }));
    logic.handleInput('UP');
    const after = logic.getState();
    const expected = offsets.map((offset) => ({
      x: after.pieceX - offset.y,
      y: after.pieceY + offset.x
    }));
    const byPosition = (a: { x: number; y: number }, b: { x: number; y: number }) =>
      a.x - b.x || a.y - b.y;
    expect([...after.pieceCells].sort(byPosition)).toEqual(expected.sort(byPosition));
  });

  it('returns a JSON-serializable, detached snapshot', () => {
    const logic = new CircuitStackLogic(7);
    for (let i = 0; i < 30; i += 1) logic.step();
    const state = logic.getState();
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
    (state.pieceCells as { x: number; y: number }[]).push({ x: 99, y: 99 });
    expect(logic.getState().pieceCells).not.toContainEqual({ x: 99, y: 99 });
  });

  it('marks game over when spawn is blocked', () => {
    const logic = new CircuitStackLogic(3);
    logic.grid[0][3] = 1;
    logic.grid[0][4] = 1;
    logic.lockForTest();
    expect(logic.getState().isGameOver).toBe(true);
  });
});
