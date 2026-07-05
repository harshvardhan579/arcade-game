import type Phaser from 'phaser';
import { BaseGameScene } from '../BaseGameScene';
import { createSparkEmitter, deathFeedback, popText, smallShake } from '../effects';
import { StarCourierLogic, type StarCourierState } from './StarCourierLogic';

export class StarCourierScene extends BaseGameScene<StarCourierState> {
  protected logic = new StarCourierLogic();
  protected stepMs = 48;
  private sparks?: Phaser.GameObjects.Particles.ParticleEmitter;
  private lastScore = 0;
  private lastGameOver = false;
  private lastProjectileCount = 0;
  private lastWave = 1;
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
    this.lastWave = state.wave;
    this.lastEnemies = state.enemies;
  }

  protected draw(state: StarCourierState, width: number, height: number): void {
    const lane = width / 11;
    const toX = (x: number) => (x + 0.5) * lane;
    const unitY = (height - 116) / 11.5;
    const toY = (y: number) => 44 + y * unitY;
    this.reactToTransitions(state, toX, toY, width);
    this.drawStarfield(width, height);
    this.drawDefenseLine(width, toY(11.5));

    for (const rock of state.debris) {
      if (rock.warning) {
        this.drawDebrisWarning(toX(rock.x));
      } else {
        this.drawDebris(toX(rock.x), toY(rock.y));
      }
    }

    for (const enemy of state.enemies) {
      if (enemy.kind === 1) this.drawWeaver(toX(enemy.x), toY(enemy.y));
      else this.drawDrone(toX(enemy.x), toY(enemy.y));
      if (enemy.y > 8.5) {
        this.graphics.lineStyle(2, 0xff7557, 0.85);
        this.graphics.strokeCircle(toX(enemy.x), toY(enemy.y), 19);
      }
    }

    for (const projectile of state.projectiles) {
      const px = toX(projectile.x);
      const py = toY(projectile.y);
      if (!this.reducedMotion) {
        this.graphics.fillStyle(0xd8fff9, 0.4);
        this.graphics.fillRect(px - 2, py + 10, 4, 12);
        this.graphics.fillStyle(0xd8fff9, 0.16);
        this.graphics.fillRect(px - 1.5, py + 24, 3, 12);
      }
      this.graphics.fillStyle(0xd8fff9, 1);
      this.graphics.fillRect(px - 2.5, py - 9, 5, 18);
    }

    this.drawShip(toX(state.playerX), toY(11.5));
  }

  protected override hudExtra(state: StarCourierState): string {
    return `Wave ${state.wave}`;
  }

  private drawShip(shipX: number, shipY: number): void {
    if (!this.reducedMotion) {
      const flicker = 6 + Math.sin(this.time.now / 55) * 3;
      this.graphics.fillStyle(0xffd166, 0.85);
      this.graphics.fillRect(shipX - 4, shipY - 4, 8, flicker);
    }
    this.graphics.fillStyle(0x4dffe1, 1);
    this.graphics.fillTriangle(shipX, shipY - 44, shipX - 22, shipY, shipX + 22, shipY);
    this.graphics.fillStyle(0x0b2a30, 1);
    this.graphics.fillTriangle(shipX, shipY - 30, shipX - 7, shipY - 12, shipX + 7, shipY - 12);
    this.graphics.fillStyle(0xd8fff9, 1);
    this.graphics.fillTriangle(shipX, shipY - 26, shipX - 4, shipY - 16, shipX + 4, shipY - 16);
  }

  private drawDrone(cx: number, cy: number): void {
    this.graphics.fillStyle(0xff7557, 1);
    this.graphics.fillTriangle(cx - 12, cy - 8, cx + 12, cy - 8, cx, cy + 12);
    this.graphics.fillRect(cx - 17, cy - 11, 6, 9);
    this.graphics.fillRect(cx + 11, cy - 11, 6, 9);
    this.graphics.fillStyle(0x071114, 1);
    this.graphics.fillCircle(cx, cy - 2, 3);
  }

  private drawWeaver(cx: number, cy: number): void {
    this.graphics.fillStyle(0xff4fd8, 1);
    this.graphics.fillTriangle(cx, cy - 13, cx - 11, cy, cx + 11, cy);
    this.graphics.fillTriangle(cx - 11, cy, cx + 11, cy, cx, cy + 13);
    this.graphics.fillStyle(0x071114, 1);
    this.graphics.fillCircle(cx, cy, 3);
  }

  private drawDebris(cx: number, cy: number): void {
    this.graphics.fillStyle(0x89a3a8, 1);
    this.graphics.fillTriangle(cx - 13, cy + 6, cx + 13, cy + 6, cx, cy - 14);
    this.graphics.fillTriangle(cx - 13, cy - 6, cx + 13, cy - 6, cx, cy + 14);
    this.graphics.fillStyle(0x5f7a80, 1);
    this.graphics.fillCircle(cx - 3, cy - 2, 3);
    this.graphics.fillCircle(cx + 5, cy + 3, 2);
  }

  private drawDebrisWarning(cx: number): void {
    const alpha = this.reducedMotion ? 0.9 : 0.45 + 0.45 * Math.abs(Math.sin(this.time.now / 90));
    this.graphics.fillStyle(0xff7557, alpha);
    this.graphics.fillTriangle(cx - 9, 26, cx + 9, 26, cx, 40);
  }

  private drawDefenseLine(width: number, lineY: number): void {
    this.graphics.fillStyle(0xff7557, 0.35);
    for (let x = 0; x < width; x += 26) {
      this.graphics.fillRect(x, lineY, 13, 2);
    }
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
    toY: (y: number) => number,
    width: number
  ): void {
    if (!this.reducedMotion) {
      if (state.score > this.lastScore && !state.isGameOver) {
        for (const previous of this.lastEnemies) {
          const survived = state.enemies.some(
            (enemy) =>
              Math.abs(enemy.x - previous.x) < 0.4 &&
              enemy.y >= previous.y &&
              enemy.y - previous.y < 0.3
          );
          if (!survived) {
            this.sparks?.explode(14, toX(previous.x), toY(previous.y));
            popText(this, toX(previous.x), toY(previous.y) - 14, '+15', '#d8fff9');
          }
        }
        smallShake(this);
      }
      if (state.projectiles.length > this.lastProjectileCount) {
        this.sparks?.explode(4, toX(state.playerX), toY(11.5) - 48);
      }
      if (state.wave > this.lastWave && !state.isGameOver) {
        popText(this, width / 2, 96, `WAVE ${state.wave}`, '#4dffe1', 20);
        this.cameras.main.flash(110, 40, 140, 125);
      }
      if (state.isGameOver && !this.lastGameOver) {
        deathFeedback(this);
      }
    }
    this.lastScore = state.score;
    this.lastGameOver = state.isGameOver;
    this.lastProjectileCount = state.projectiles.length;
    this.lastWave = state.wave;
    this.lastEnemies = state.enemies;
  }
}
