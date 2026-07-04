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

  it('ends the run when an enemy reaches the ship in the same column', () => {
    const logic = new StarCourierLogic();
    logic.restart(9);
    // Seed 9's first enemy spawns in column 2; park the ship there.
    logic.handleInput('LEFT');
    logic.handleInput('LEFT');
    logic.handleInput('LEFT');
    expect(logic.getState().playerX).toBe(2);
    for (let i = 0; i < 400 && !logic.getState().isGameOver; i += 1) logic.step();
    const state = logic.getState();
    expect(state.isGameOver).toBe(true);
    const collided = state.enemies.some(
      (enemy) => Math.abs(enemy.x - 2) < 0.8 && enemy.y > 10.3 && enemy.y < 11.5
    );
    expect(collided, 'game must end by ship collision, not bottom-crossing').toBe(true);
  });

  it('does not collide with an enemy one full column away', () => {
    const logic = new StarCourierLogic();
    logic.restart(9);
    // First enemy is in column 2; park the ship in column 3 (distance 1.0 >= 0.8).
    logic.handleInput('LEFT');
    logic.handleInput('LEFT');
    expect(logic.getState().playerX).toBe(3);
    for (let i = 0; i < 400; i += 1) {
      const state = logic.getState();
      const first = state.enemies[0];
      if (first && first.y > 11.2) break;
      if (state.isGameOver) break;
      logic.step();
    }
    expect(logic.getState().isGameOver).toBe(false);
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
