import { describe, expect, it } from 'vitest';
import {
  StarCourierLogic,
  courierDebrisWarnTicks,
  courierMoveStep,
  courierWeaverWave
} from './StarCourierLogic';

// Queue the target column, then glide there. The internal steps disarm all
// enemies so mid-scenario alignment can never be ended by an unshot invader.
function alignPlayer(logic: StarCourierLogic, column: number): void {
  let guard = 0;
  while (logic.getState().playerTargetX !== column && guard < 20) {
    logic.handleInput(logic.getState().playerTargetX > column ? 'LEFT' : 'RIGHT');
    guard += 1;
  }
  guard = 0;
  while (logic.getState().playerX !== column && guard < 40) {
    disarmEnemies(logic, true);
    logic.step();
    guard += 1;
  }
}

// Deactivate enemies before they can reach the defense line, so debris-focused
// tests are not ended early by an unshot invader.
function disarmEnemies(logic: StarCourierLogic, fully = false): void {
  logic.enemies.forEach((enemy) => {
    if (fully || enemy.y > 9) enemy.active = false;
  });
}

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
    // Movement is a glide now: settle on the column before firing.
    while (logic.getState().playerX !== 6) logic.step();
    logic.handleInput('ACTION');
    const fired = logic.getState();
    expect(fired.projectiles).toEqual([{ x: 6, y: 9 }]);
    logic.step();
    const moved = logic.getState();
    expect(moved.projectiles[0]!.x).toBe(6);
    expect(moved.projectiles[0]!.y).toBeCloseTo(7.9);
    expect(moved.activeProjectiles).toBe(moved.projectiles.length);
  });

  it('queued presses glide the ship at the exported rate and settle exactly', () => {
    const logic = new StarCourierLogic();
    logic.restart(1);
    for (let i = 0; i < 5; i += 1) logic.handleInput('LEFT');
    const queued = logic.getState();
    expect(queued.playerTargetX, 'presses must queue instantly').toBe(0);
    expect(queued.playerX, 'the glide happens in step(), not in the press').toBe(5);
    let steps = 0;
    while (logic.getState().playerX !== 0 && steps < 30) {
      logic.step();
      steps += 1;
    }
    expect(logic.getState().playerX, 'the glide must settle exactly on the column').toBe(0);
    expect(steps, 'crossing five columns must be fast').toBe(Math.ceil(5 / courierMoveStep));
    // Full-board responsiveness pin: 10 columns in under a second of steps.
    for (let i = 0; i < 10; i += 1) logic.handleInput('RIGHT');
    let across = 0;
    while (logic.getState().playerX !== 10 && across < 30) {
      logic.step();
      across += 1;
    }
    expect(across).toBe(Math.ceil(10 / courierMoveStep));
  });

  it('kills the seed-9 opener after gliding to its column', () => {
    const logic = new StarCourierLogic();
    logic.restart(9);
    while (logic.getState().enemies.length === 0) logic.step();
    for (let i = 0; i < 3; i += 1) logic.handleInput('LEFT');
    expect(logic.getState().playerTargetX, 'seed 9 opener sits in column 2').toBe(2);
    let guard = 0;
    while (logic.getState().playerX !== 2 && guard < 15) {
      logic.step();
      guard += 1;
    }
    expect(logic.getState().playerX).toBe(2);
    guard = 0;
    while (logic.getState().score < 15 && guard < 60) {
      if (logic.getState().activeProjectiles === 0) logic.handleInput('ACTION');
      logic.step();
      guard += 1;
    }
    expect(logic.getState().score, 'the settled ship must be able to kill').toBeGreaterThanOrEqual(
      15
    );
    expect(logic.getState().isGameOver).toBe(false);
  });

  it('a single shot fired mid-glide within half a column still connects', () => {
    const logic = new StarCourierLogic();
    logic.restart(9);
    while (logic.getState().enemies.length === 0) logic.step();
    for (let i = 0; i < 3; i += 1) logic.handleInput('LEFT');
    // Step until the ship is inside the hit reach of column 2 but not settled.
    let guard = 0;
    while (Math.abs(logic.getState().playerX - 2) >= 0.6 && guard < 15) {
      logic.step();
      guard += 1;
    }
    const glidingX = logic.getState().playerX;
    expect(glidingX).not.toBe(2);
    logic.handleInput('ACTION');
    expect(logic.getState().projectiles[0]!.x, 'the shot leaves from the gliding x').toBe(glidingX);
    // Only this one projectile is in flight; it alone must make the kill.
    guard = 0;
    while (logic.getState().activeProjectiles > 0 && guard < 15) {
      logic.step();
      guard += 1;
    }
    expect(logic.getState().score, 'the near-column shot must connect').toBe(15);
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
    // Seed 9's first enemy spawns in column 2; queue the ship there (the
    // glide settles within the long survival loop below).
    logic.handleInput('LEFT');
    logic.handleInput('LEFT');
    logic.handleInput('LEFT');
    expect(logic.getState().playerTargetX).toBe(2);
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
    expect(logic.getState().playerTargetX).toBe(3);
    while (logic.getState().playerX !== 3) logic.step();
    for (let i = 0; i < 400; i += 1) {
      const state = logic.getState();
      const first = state.enemies[0];
      if (first && first.y > 11.2) break;
      if (state.isGameOver) break;
      logic.step();
    }
    expect(logic.getState().isGameOver).toBe(false);
  });

  it('spawns drifting weavers from wave two, deterministically', () => {
    const findWeaverDrift = () => {
      const logic = new StarCourierLogic();
      logic.restart(9);
      const drift: number[] = [];
      for (let i = 0; i < 400 && drift.length < 12; i += 1) {
        disarmEnemies(logic);
        logic.step();
        const state = logic.getState();
        const weaver = state.enemies.find((enemy) => enemy.kind === 1);
        if (weaver) {
          expect(state.wave).toBeGreaterThanOrEqual(courierWeaverWave);
          drift.push(weaver.x);
        }
      }
      return drift;
    };
    const drift = findWeaverDrift();
    expect(drift.length, 'a weaver must appear within 400 ticks').toBe(12);
    expect(new Set(drift).size, 'weavers must drift horizontally').toBeGreaterThan(1);
    for (const x of drift) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(10);
    }
    expect(findWeaverDrift()).toEqual(drift);
  });

  it('telegraphs debris with a warning before it falls', () => {
    const logic = new StarCourierLogic();
    logic.restart(9);
    let guard = 0;
    while (logic.getState().debris.length === 0 && guard < 600) {
      disarmEnemies(logic);
      logic.step();
      guard += 1;
    }
    const warned = logic.getState().debris[0]!;
    expect(warned.warning).toBe(true);
    expect(warned.y).toBe(0);
    for (let i = 0; i <= courierDebrisWarnTicks; i += 1) {
      disarmEnemies(logic);
      logic.step();
    }
    const falling = logic.getState().debris[0]!;
    expect(falling.warning).toBe(false);
    expect(falling.y).toBeGreaterThan(0);
  });

  it('debris blocks projectiles but cannot be destroyed', () => {
    const logic = new StarCourierLogic();
    logic.restart(9);
    let guard = 0;
    while (
      (logic.getState().debris.length === 0 || logic.getState().debris[0]!.warning) &&
      guard < 700
    ) {
      disarmEnemies(logic, true);
      logic.step();
      guard += 1;
    }
    const rock = logic.getState().debris[0]!;
    alignPlayer(logic, Math.round(rock.x));
    logic.handleInput('ACTION');
    expect(logic.getState().activeProjectiles).toBe(1);
    let steps = 0;
    while (logic.getState().activeProjectiles > 0 && steps < 30) {
      disarmEnemies(logic, true);
      logic.step();
      steps += 1;
    }
    const state = logic.getState();
    expect(state.activeProjectiles, 'the shot must be absorbed').toBe(0);
    expect(steps, 'absorption must happen before the shot leaves the screen').toBeLessThan(12);
    expect(state.debris.length, 'the rock must survive the hit').toBeGreaterThan(0);
    expect(state.score).toBe(0);
  });

  it('debris kills on contact but passes the bottom harmlessly', () => {
    const collide = new StarCourierLogic();
    collide.restart(9);
    let guard = 0;
    while (collide.getState().debris.length === 0 && guard < 600) {
      disarmEnemies(collide);
      collide.step();
      guard += 1;
    }
    const rockX = Math.round(collide.getState().debris[0]!.x);
    alignPlayer(collide, rockX);
    guard = 0;
    while (!collide.getState().isGameOver && collide.getState().debris.length > 0 && guard < 200) {
      disarmEnemies(collide);
      collide.step();
      guard += 1;
    }
    expect(collide.getState().isGameOver, 'parking under the rock must be fatal').toBe(true);

    const dodge = new StarCourierLogic();
    dodge.restart(9);
    guard = 0;
    while (dodge.getState().debris.length === 0 && guard < 600) {
      disarmEnemies(dodge);
      dodge.step();
      guard += 1;
    }
    const dodgeRockX = dodge.getState().debris[0]!.x;
    alignPlayer(dodge, dodgeRockX < 5 ? 10 : 0);
    guard = 0;
    while (dodge.getState().debris.length > 0 && !dodge.getState().isGameOver && guard < 200) {
      disarmEnemies(dodge);
      dodge.step();
      guard += 1;
    }
    expect(dodge.getState().debris.length, 'the rock must fall off the bottom').toBe(0);
    expect(dodge.getState().isGameOver).toBe(false);
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
