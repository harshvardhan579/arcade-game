import {
  SeededRandom,
  type GameLogic,
  type GameSnapshot,
  type SemanticInput
} from '../../core/types';

interface Entity {
  x: number;
  y: number;
  active: boolean;
}

export interface StarCourierState extends GameSnapshot {
  playerX: number;
  projectiles: ReadonlyArray<{ readonly x: number; readonly y: number }>;
  enemies: ReadonlyArray<{ readonly x: number; readonly y: number }>;
  activeProjectiles: number;
  activeEnemies: number;
  poolSize: number;
  wave: number;
}

export class StarCourierLogic implements GameLogic<StarCourierState> {
  readonly id = 'star-courier';
  private rng = new SeededRandom(9);
  private playerX = 5;
  private projectiles: Entity[] = Array.from({ length: 8 }, () => ({ x: 0, y: 0, active: false }));
  private enemies: Entity[] = Array.from({ length: 10 }, () => ({ x: 0, y: 0, active: false }));
  private score = 0;
  private tick = 0;
  private wave = 1;
  private gameOver = false;

  restart(seed = 9): StarCourierState {
    this.rng = new SeededRandom(seed);
    this.playerX = 5;
    this.projectiles.forEach((p) => (p.active = false));
    this.enemies.forEach((e) => (e.active = false));
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
    if (input === 'LEFT') this.playerX = Math.max(0, this.playerX - 1);
    if (input === 'RIGHT') this.playerX = Math.min(10, this.playerX + 1);
    if (input === 'ACTION') this.fire();
  }

  step(): StarCourierState {
    if (this.gameOver) return this.getState();
    this.tick += 1;
    if (this.tick % Math.max(14, 34 - this.wave * 3) === 0) this.spawnEnemy();
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
        if (enemy.y > 11.5) this.gameOver = true;
      }
    }
    this.resolveCollisions();
    return this.getState();
  }

  getState(): StarCourierState {
    const projectiles = this.projectiles.filter((p) => p.active).map((p) => ({ x: p.x, y: p.y }));
    const enemies = this.enemies.filter((e) => e.active).map((e) => ({ x: e.x, y: e.y }));
    return {
      score: this.score,
      isGameOver: this.gameOver,
      tick: this.tick,
      phase: this.gameOver ? 'game-over' : 'playing',
      playerX: this.playerX,
      projectiles,
      enemies,
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
    enemy.x = this.rng.integer(11);
    enemy.y = 0;
    enemy.active = true;
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
}
