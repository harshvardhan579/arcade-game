import {
  SeededRandom,
  type GameLogic,
  type GameSnapshot,
  type SemanticInput
} from '../../core/types';

interface Projectile {
  x: number;
  y: number;
  active: boolean;
}

export interface CourierEnemy {
  x: number;
  y: number;
  active: boolean;
  kind: 0 | 1;
  baseX: number;
  spawnTick: number;
}

export interface CourierDebris {
  x: number;
  y: number;
  active: boolean;
  armTick: number;
}

export const courierWeaverWave = 2;
export const courierWeaverChance = 0.35;
export const courierDebrisWave = 2;
export const courierDebrisIntervalTicks = 130;
export const courierDebrisWarnTicks = 24;
// Ship glide per step (~11.5 columns/sec at the 48 ms scene step). Presses
// queue whole columns onto the target; the glide converges exactly onto the
// integer column, so a settled ship is always column-aligned for firing.
export const courierMoveStep = 0.55;

const round2 = (value: number): number => Math.round(value * 100) / 100;

export interface StarCourierState extends GameSnapshot {
  playerX: number;
  playerTargetX: number;
  projectiles: ReadonlyArray<{ readonly x: number; readonly y: number }>;
  enemies: ReadonlyArray<{ readonly x: number; readonly y: number; readonly kind: number }>;
  debris: ReadonlyArray<{ readonly x: number; readonly y: number; readonly warning: boolean }>;
  activeProjectiles: number;
  activeEnemies: number;
  poolSize: number;
  wave: number;
}

export class StarCourierLogic implements GameLogic<StarCourierState> {
  readonly id = 'star-courier';
  private rng = new SeededRandom(9);
  private playerX = 5;
  private targetX = 5;
  private projectiles: Projectile[] = Array.from({ length: 8 }, () => ({
    x: 0,
    y: 0,
    active: false
  }));
  enemies: CourierEnemy[] = Array.from({ length: 10 }, () => ({
    x: 0,
    y: 0,
    active: false,
    kind: 0,
    baseX: 0,
    spawnTick: 0
  }));
  debris: CourierDebris[] = Array.from({ length: 4 }, () => ({
    x: 0,
    y: 0,
    active: false,
    armTick: 0
  }));
  private score = 0;
  private tick = 0;
  private wave = 1;
  private gameOver = false;

  restart(seed = 9): StarCourierState {
    this.rng = new SeededRandom(seed);
    this.playerX = 5;
    this.targetX = 5;
    this.projectiles.forEach((p) => (p.active = false));
    this.enemies.forEach((e) => (e.active = false));
    this.debris.forEach((d) => (d.active = false));
    this.score = 0;
    this.tick = 0;
    this.wave = 1;
    this.gameOver = false;
    return this.getState();
  }

  handleInput(input: SemanticInput): void {
    if (input === 'ACTION' && this.gameOver) {
      this.restart();
      return;
    }
    // Presses queue whole columns; rapid taps stack so the ship glides the
    // full distance in one smooth motion instead of demanding a tap per step.
    if (input === 'LEFT') this.targetX = Math.max(0, this.targetX - 1);
    if (input === 'RIGHT') this.targetX = Math.min(10, this.targetX + 1);
    if (input === 'ACTION') this.fire();
  }

  step(): StarCourierState {
    if (this.gameOver) return this.getState();
    this.tick += 1;
    // Glide toward the queued column (pure arithmetic — no rng draws, so the
    // seeded spawn order is untouched by movement).
    if (this.playerX !== this.targetX) {
      const delta = Math.max(
        -courierMoveStep,
        Math.min(courierMoveStep, this.targetX - this.playerX)
      );
      this.playerX = round2(this.playerX + delta);
    }
    if (this.tick % Math.max(14, 34 - this.wave * 3) === 0) this.spawnEnemy();
    if (this.wave >= courierDebrisWave && this.tick % courierDebrisIntervalTicks === 0) {
      this.spawnDebris();
    }
    if (this.tick % 80 === 0) this.wave += 1;
    for (const projectile of this.projectiles) {
      if (projectile.active) {
        projectile.y -= 1.1;
        if (projectile.y < 0) projectile.active = false;
      }
    }
    for (const enemy of this.enemies) {
      if (enemy.active) {
        enemy.y += 0.08 + this.wave * 0.015;
        if (enemy.kind === 1) {
          enemy.x = Math.min(
            10,
            Math.max(0, enemy.baseX + 1.8 * Math.sin((this.tick - enemy.spawnTick) * 0.075))
          );
        }
        if (enemy.y > 11.5) this.gameOver = true;
        if (Math.abs(enemy.x - this.playerX) < 0.8 && enemy.y > 10.3) this.gameOver = true;
      }
    }
    for (const rock of this.debris) {
      if (rock.active && this.tick >= rock.armTick) {
        rock.y += 0.24;
        if (rock.y > 12.5) rock.active = false;
        else if (Math.abs(rock.x - this.playerX) < 0.75 && rock.y > 10.3) this.gameOver = true;
      }
    }
    this.resolveCollisions();
    this.resolveDebrisShields();
    return this.getState();
  }

  getState(): StarCourierState {
    const projectiles = this.projectiles.filter((p) => p.active).map((p) => ({ x: p.x, y: p.y }));
    const enemies = this.enemies
      .filter((e) => e.active)
      .map((e) => ({ x: e.x, y: e.y, kind: e.kind }));
    return {
      score: this.score,
      isGameOver: this.gameOver,
      tick: this.tick,
      phase: this.gameOver ? 'game-over' : 'playing',
      playerX: this.playerX,
      playerTargetX: this.targetX,
      projectiles,
      enemies,
      debris: this.debris
        .filter((d) => d.active)
        .map((d) => ({ x: d.x, y: d.y, warning: this.tick < d.armTick })),
      activeProjectiles: projectiles.length,
      activeEnemies: enemies.length,
      poolSize: this.projectiles.length + this.enemies.length,
      wave: this.wave
    };
  }

  private fire(): void {
    const projectile = this.projectiles.find((p) => !p.active);
    if (!projectile) return;
    projectile.x = this.playerX;
    projectile.y = 9;
    projectile.active = true;
  }

  private spawnEnemy(): void {
    const enemy = this.enemies.find((e) => !e.active);
    if (!enemy) return;
    const column = this.rng.integer(11);
    const roll = this.rng.next();
    enemy.kind = this.wave >= courierWeaverWave && roll < courierWeaverChance ? 1 : 0;
    enemy.x = column;
    enemy.baseX = column;
    enemy.spawnTick = this.tick;
    enemy.y = 0;
    enemy.active = true;
  }

  private spawnDebris(): void {
    const rock = this.debris.find((d) => !d.active);
    if (!rock) return;
    rock.x = this.rng.integer(11);
    rock.y = 0;
    rock.armTick = this.tick + courierDebrisWarnTicks;
    rock.active = true;
  }

  private resolveCollisions(): void {
    for (const projectile of this.projectiles.filter((p) => p.active)) {
      for (const enemy of this.enemies.filter((e) => e.active)) {
        if (Math.abs(projectile.x - enemy.x) < 0.65 && Math.abs(projectile.y - enemy.y) < 0.85) {
          projectile.active = false;
          enemy.active = false;
          this.score += 15;
        }
      }
    }
  }

  private resolveDebrisShields(): void {
    for (const projectile of this.projectiles.filter((p) => p.active)) {
      for (const rock of this.debris.filter((d) => d.active && this.tick >= d.armTick)) {
        if (Math.abs(projectile.x - rock.x) < 0.7 && Math.abs(projectile.y - rock.y) < 0.9) {
          projectile.active = false;
        }
      }
    }
  }
}
