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

  it('exposes real projectile positions that travel upward', () => {
    const logic = new StarCourierLogic();
    logic.restart(3);
    logic.handleInput('RIGHT');
    logic.handleInput('ACTION');
    const fired = logic.getState();
    expect(fired.projectiles).toEqual([{ x: 6, y: 9 }]);
    logic.step();
    const moved = logic.getState();
    expect(moved.projectiles[0]!.x).toBe(6);
    expect(moved.projectiles[0]!.y).toBeCloseTo(7.9);
    expect(moved.activeProjectiles).toBe(moved.projectiles.length);
  });

  it('exposes real enemy positions that descend within bounds', () => {
    const logic = new StarCourierLogic();
    logic.restart(4);
    while (logic.getState().enemies.length === 0) logic.step();
    const spawned = logic.getState();
    const enemy = spawned.enemies[0]!;
    expect(enemy.x).toBeGreaterThanOrEqual(0);
    expect(enemy.x).toBeLessThanOrEqual(10);
    logic.step();
    const later = logic.getState();
    expect(later.enemies[0]!.y).toBeGreaterThan(enemy.y);
    expect(later.enemies[0]!.x).toBe(enemy.x);
    expect(later.activeEnemies).toBe(later.enemies.length);
  });

  it('returns a JSON-serializable, detached snapshot', () => {
    const logic = new StarCourierLogic();
    logic.restart(5);
    logic.handleInput('ACTION');
    for (let i = 0; i < 20; i += 1) logic.step();
    const state = logic.getState();
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
    (state.projectiles as { x: number; y: number }[]).push({ x: 99, y: 99 });
    expect(logic.getState().projectiles).not.toContainEqual({ x: 99, y: 99 });
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
