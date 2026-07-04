import type Phaser from 'phaser';
import { BaseGameScene } from '../BaseGameScene';
import { createSparkEmitter, deathFeedback, smallShake } from '../effects';
import { StarCourierLogic, type StarCourierState } from './StarCourierLogic';

export class StarCourierScene extends BaseGameScene<StarCourierState> {
  protected logic = new StarCourierLogic();
  protected stepMs = 48;
  private sparks?: Phaser.GameObjects.Particles.ParticleEmitter;
  private lastScore = 0;
  private lastGameOver = false;
  private lastProjectileCount = 0;
  private lastEnemies: ReadonlyArray<{ readonly x: number; readonly y: number }> = [];

  constructor() {
    super('star-courier');
  }

  create(): void {
    super.create();
    this.sparks = createSparkEmitter(this, [0xff7557, 0xffd166]);
    const state = this.logic.getState();
    this.lastScore = state.score;
    this.lastGameOver = state.isGameOver;
    this.lastProjectileCount = state.projectiles.length;
    this.lastEnemies = state.enemies;
  }

  protected draw(state: StarCourierState, width: number, height: number): void {
    const lane = width / 11;
    const toX = (x: number) => (x + 0.5) * lane;
    const unitY = (height - 116) / 11.5;
    const toY = (y: number) => 44 + y * unitY;
    this.reactToTransitions(state, toX, toY);
    this.drawStarfield(width, height);
    const shipX = toX(state.playerX);
    const shipY = toY(11.5);
    this.graphics.fillStyle(0x4dffe1, 1);
    this.graphics.fillTriangle(shipX, shipY - 44, shipX - 22, shipY, shipX + 22, shipY);
    this.graphics.fillStyle(0xff4fd8, 1);
    for (const projectile of state.projectiles)
      this.graphics.fillRect(toX(projectile.x) - 2.5, toY(projectile.y) - 9, 5, 18);
    this.graphics.fillStyle(0xff7557, 1);
    for (const enemy of state.enemies) this.graphics.fillCircle(toX(enemy.x), toY(enemy.y), 13);
  }

  protected override hudExtra(state: StarCourierState): string {
    return `Wave ${state.wave}`;
  }

  private drawStarfield(width: number, height: number): void {
    this.graphics.fillStyle(0x1d4650, 0.9);
    const drift = this.reducedMotion ? 0 : this.time.now * 0.04;
    for (let i = 0; i < 28; i += 1) {
      const x = (i * 53 + 17) % width;
      const y = (i * 97 + drift) % height;
      const size = 1 + (i % 3);
      this.graphics.fillRect(x, y, size, size);
    }
  }

  private reactToTransitions(
    state: StarCourierState,
    toX: (x: number) => number,
    toY: (y: number) => number
  ): void {
    if (!this.reducedMotion) {
      if (state.score > this.lastScore && !state.isGameOver) {
        for (const previous of this.lastEnemies) {
          const survived = state.enemies.some(
            (enemy) => enemy.x === previous.x && enemy.y >= previous.y && enemy.y - previous.y < 0.3
          );
          if (!survived) this.sparks?.explode(14, toX(previous.x), toY(previous.y));
        }
        smallShake(this);
      }
      if (state.projectiles.length > this.lastProjectileCount) {
        this.sparks?.explode(4, toX(state.playerX), toY(11.5) - 48);
      }
      if (state.isGameOver && !this.lastGameOver) {
        deathFeedback(this);
      }
    }
    this.lastScore = state.score;
    this.lastGameOver = state.isGameOver;
    this.lastProjectileCount = state.projectiles.length;
    this.lastEnemies = state.enemies;
  }
}
