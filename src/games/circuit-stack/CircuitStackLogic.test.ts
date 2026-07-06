import { describe, expect, it } from 'vitest';
import { SeededRandom } from '../../core/types';
import {
  CircuitStackLogic,
  circuitBaseDropTicks,
  circuitDropTicks,
  circuitDropTicksPerLevel,
  circuitLinesPerLevel,
  circuitMinDropTicks,
  circuitPieces,
  shuffledBag,
  type CircuitStackState
} from './CircuitStackLogic';

const byPosition = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  a.x - b.x || a.y - b.y;

function identifySpawnedPiece(state: CircuitStackState): number {
  const offsets = state.pieceCells
    .map((cell) => ({ x: cell.x - state.pieceX, y: cell.y - state.pieceY }))
    .sort(byPosition);
  return circuitPieces.findIndex((shape) => {
    const sorted = [...shape].sort(byPosition);
    return sorted.every((cell, i) => cell.x === offsets[i]!.x && cell.y === offsets[i]!.y);
  });
}

function dropLockAndClear(logic: CircuitStackLogic): void {
  let previousY = -1;
  while (logic.getState().pieceY !== previousY) {
    previousY = logic.getState().pieceY;
    logic.handleInput('DOWN');
  }
  logic.lockForTest();
  logic.grid.forEach((row) => row.fill(0));
}

describe('CircuitStackLogic', () => {
  it('ships the full seven-piece set including the long I piece', () => {
    expect(circuitPieces).toHaveLength(7);
    for (const shape of circuitPieces) expect(shape).toHaveLength(4);
    const hasLine = circuitPieces.some((shape) => {
      const xs = shape.map((cell) => cell.x).sort((a, b) => a - b);
      return new Set(shape.map((cell) => cell.y)).size === 1 && xs[3]! - xs[0]! === 3;
    });
    expect(hasLine, 'the four-wide I piece must exist').toBe(true);
  });

  it('shuffles a deterministic bag containing each piece exactly once', () => {
    const first = shuffledBag(new SeededRandom(5), 7);
    expect([...first].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(shuffledBag(new SeededRandom(5), 7)).toEqual(first);
  });

  it('deals different piece orders for different seeds, identically for the same seed', () => {
    // The bag itself: distinct seeds shuffle distinct orders (live runs draw
    // fresh seeds per Phase 1, so live restarts redeal), same seed re-deals.
    expect(shuffledBag(new SeededRandom(21), 7)).not.toEqual(shuffledBag(new SeededRandom(9), 7));
    expect(shuffledBag(new SeededRandom(21), 7)).toEqual(shuffledBag(new SeededRandom(21), 7));
    // And through the whole engine: the first-two-bags spawn sequence.
    const sequence = (seed: number) => {
      const logic = new CircuitStackLogic(seed);
      const spawned: number[] = [identifySpawnedPiece(logic.getState())];
      while (spawned.length < 14) {
        dropLockAndClear(logic);
        spawned.push(identifySpawnedPiece(logic.getState()));
      }
      return spawned;
    };
    expect(sequence(21)).not.toEqual(sequence(9));
    expect(sequence(21)).toEqual(sequence(21));
  });

  it('ACTION after a blocked spawn restarts with a clean board and level', () => {
    const logic = new CircuitStackLogic(3);
    logic.grid[12] = Array.from({ length: logic.width }, () => 1);
    logic.lockForTest();
    expect(logic.getState().linesCleared).toBeGreaterThanOrEqual(1);
    logic.grid[0][3] = 1;
    logic.grid[0][4] = 1;
    logic.lockForTest();
    expect(logic.getState().isGameOver).toBe(true);
    logic.handleInput('ACTION');
    const restarted = logic.getState();
    expect(restarted.isGameOver).toBe(false);
    expect(restarted.score).toBe(0);
    expect(restarted.occupied).toBe(0);
    expect(restarted.linesCleared).toBe(0);
    expect(restarted.level).toBe(0);
  });

  it('drops faster as lines clear, floored above frantic', () => {
    // The pure curve.
    expect(circuitDropTicks(0)).toBe(circuitBaseDropTicks);
    expect(circuitDropTicks(circuitLinesPerLevel - 1)).toBe(circuitBaseDropTicks);
    expect(circuitDropTicks(circuitLinesPerLevel)).toBe(
      circuitBaseDropTicks - circuitDropTicksPerLevel
    );
    expect(circuitDropTicks(1000)).toBe(circuitMinDropTicks);

    // Through the engine: clear three rows at once (level 1) and the piece
    // must fall on the shorter interval, not the base one.
    const logic = new CircuitStackLogic(1);
    for (const row of [11, 12, 13]) {
      logic.grid[row] = Array.from({ length: logic.width }, () => 1);
    }
    logic.lockForTest();
    const leveled = logic.getState();
    expect(leveled.linesCleared).toBeGreaterThanOrEqual(circuitLinesPerLevel);
    expect(leveled.level).toBeGreaterThanOrEqual(1);
    const interval = circuitDropTicks(leveled.linesCleared);
    expect(interval).toBeLessThan(circuitBaseDropTicks);
    const startY = logic.getState().pieceY;
    for (let i = 0; i < interval; i += 1) logic.step();
    expect(logic.getState().pieceY, 'the piece must fall on the leveled interval').toBeGreaterThan(
      startY
    );
  });

  it('deals every piece exactly twice across the first two bags', () => {
    const logic = new CircuitStackLogic(21);
    const spawned: number[] = [identifySpawnedPiece(logic.getState())];
    while (spawned.length < 14) {
      dropLockAndClear(logic);
      expect(logic.getState().isGameOver).toBe(false);
      spawned.push(identifySpawnedPiece(logic.getState()));
    }
    const counts = new Map<number, number>();
    for (const id of spawned) {
      expect(id).toBeGreaterThanOrEqual(0);
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    expect([...counts.keys()].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    for (const count of counts.values()) expect(count).toBe(2);
  });

  it('spawns the I piece within one bag and rotates it in bounds, kicking off the wall', () => {
    const logic = new CircuitStackLogic(21);
    let spawns = 1;
    while (identifySpawnedPiece(logic.getState()) !== 0 && spawns <= 7) {
      dropLockAndClear(logic);
      spawns += 1;
    }
    expect(
      identifySpawnedPiece(logic.getState()),
      'the bag must deal the I piece within its first seven spawns'
    ).toBe(0);
    const spawn = logic.getState();
    expect(new Set(spawn.pieceCells.map((cell) => cell.y)).size).toBe(1);
    logic.handleInput('DOWN');
    logic.handleInput('UP');
    const vertical = logic.getState();
    expect(new Set(vertical.pieceCells.map((cell) => cell.x)).size).toBe(1);
    for (let i = 0; i < 6; i += 1) logic.handleInput('LEFT');
    logic.handleInput('UP');
    for (const cell of logic.getState().pieceCells) {
      expect(cell.x).toBeGreaterThanOrEqual(0);
      expect(cell.x).toBeLessThan(logic.width);
      expect(cell.y).toBeLessThan(logic.height);
    }
    expect(new Set(logic.getState().pieceCells.map((cell) => cell.y)).size).toBe(1);
  });

  it('exposes four-cell piece shapes and a valid nextPiece index for previews', () => {
    expect(circuitPieces.length).toBeGreaterThan(0);
    for (const shape of circuitPieces) expect(shape).toHaveLength(4);
    const logic = new CircuitStackLogic(9);
    const state = logic.getState();
    expect(state.nextPiece).toBeGreaterThanOrEqual(0);
    expect(state.nextPiece).toBeLessThan(circuitPieces.length);
  });

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
