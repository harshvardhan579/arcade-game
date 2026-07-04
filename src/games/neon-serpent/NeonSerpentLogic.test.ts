import { describe, expect, it } from 'vitest';
import { NeonSerpentLogic } from './NeonSerpentLogic';

describe('NeonSerpentLogic', () => {
  it('moves on each step', () => {
    const logic = new NeonSerpentLogic(1);
    const before = logic.getState();
    const after = logic.step();
    expect(after.headX).toBe(before.headX + 1);
    expect(after.tick).toBe(1);
  });

  it('wraps through edge portals', () => {
    const logic = new NeonSerpentLogic(1);
    logic.snake = [
      { x: 17, y: 12 },
      { x: 16, y: 12 },
      { x: 15, y: 12 }
    ];
    expect(logic.step().headX).toBe(0);
  });

  it('food increases score and length', () => {
    const logic = new NeonSerpentLogic(1);
    logic.food = { x: 8, y: 12 };
    const state = logic.step();
    expect(state.score).toBe(10);
    expect(state.snakeLength).toBe(4);
  });

  it('obstacle collision ends the game', () => {
    const logic = new NeonSerpentLogic(1);
    logic.obstacles = [{ x: 8, y: 12 }];
    expect(logic.step().isGameOver).toBe(true);
  });

  it('restart resets state', () => {
    const logic = new NeonSerpentLogic(1);
    logic.food = { x: 8, y: 12 };
    logic.step();
    const state = logic.restart(1);
    expect(state.score).toBe(0);
    expect(state.snakeLength).toBe(3);
    expect(state.isGameOver).toBe(false);
  });

  it('rejects direct reversal into itself', () => {
    const logic = new NeonSerpentLogic(1);
    logic.handleInput('LEFT');
    const state = logic.step();
    expect(state.headX).toBe(8);
    expect(state.isGameOver).toBe(false);
  });

  it('never spawns food on occupied cells', () => {
    const logic = new NeonSerpentLogic(2);
    const occupied = new Set(
      [...logic.snake, ...logic.obstacles].map((point) => `${point.x},${point.y}`)
    );
    expect(occupied.has(`${logic.food.x},${logic.food.y}`)).toBe(false);
  });

  it('portal wrapping onto an obstacle is fatal', () => {
    const logic = new NeonSerpentLogic(3);
    logic.snake = [
      { x: 17, y: 12 },
      { x: 16, y: 12 },
      { x: 15, y: 12 }
    ];
    logic.obstacles = [{ x: 0, y: 12 }];
    expect(logic.step().isGameOver).toBe(true);
  });

  it('combo timer expiry resets multiplier', () => {
    const logic = new NeonSerpentLogic(4);
    logic.food = { x: 8, y: 12 };
    expect(logic.step().multiplier).toBe(2);
    for (let i = 0; i < 8; i += 1) logic.step();
    expect(logic.getState().multiplier).toBe(1);
  });

  it('speed ramp is monotonic and deterministic', () => {
    const collect = () => {
      const logic = new NeonSerpentLogic(5);
      const speeds: number[] = [];
      for (let i = 0; i < 5; i += 1) {
        const head = logic.snake[0]!;
        logic.food = { x: (head.x + 1) % logic.width, y: head.y };
        speeds.push(logic.step().speedMs);
      }
      return speeds;
    };
    const speeds = collect();
    expect(speeds).toEqual(collect());
    expect([...speeds].sort((a, b) => b - a)).toEqual(speeds);
  });
});
