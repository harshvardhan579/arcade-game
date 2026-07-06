import type Phaser from 'phaser';
import { BaseGameScene } from '../BaseGameScene';
import { createSparkEmitter, deathFeedback, popText, smallShake } from '../effects';
import { NeonSerpentLogic, type NeonSerpentState } from './NeonSerpentLogic';

export class NeonSerpentScene extends BaseGameScene<NeonSerpentState> {
  protected logic = new NeonSerpentLogic(7);
  private sparks?: Phaser.GameObjects.Particles.ParticleEmitter;
  private lastScore = 0;
  private lastGameOver = false;

  constructor() {
    super('neon-serpent');
  }

  create(): void {
    super.create();
    this.sparks = createSparkEmitter(this, [0xff4fd8, 0x4dffe1]);
    const state = this.logic.getState();
    this.lastScore = state.score;
    this.lastGameOver = state.isGameOver;
  }

  protected draw(state: NeonSerpentState, width: number, height: number): void {
    const cell = Math.min(width / this.logic.width, height / this.logic.height);
    const ox = (width - this.logic.width * cell) / 2;
    const oy = (height - this.logic.height * cell) / 2 + 8;
    this.reactToTransitions(state, cell, ox, oy);
    this.graphics.lineStyle(1, 0x12353c, 0.65);
    for (let x = 0; x <= this.logic.width; x += 1) {
      this.graphics.lineBetween(ox + x * cell, oy, ox + x * cell, oy + this.logic.height * cell);
    }
    for (let y = 0; y <= this.logic.height; y += 1) {
      this.graphics.lineBetween(ox, oy + y * cell, ox + this.logic.width * cell, oy + y * cell);
    }
    const foodX = ox + (state.foodX + 0.5) * cell;
    const foodY = oy + (state.foodY + 0.5) * cell;
    const foodRadius = this.reducedMotion
      ? cell * 0.32
      : cell * (0.29 + 0.05 * Math.sin(this.time.now / 150));
    this.graphics.lineStyle(2, 0xff4fd8, 0.3);
    this.graphics.strokeCircle(foodX, foodY, foodRadius + 6);
    this.graphics.fillStyle(0xff4fd8, 1);
    this.graphics.fillCircle(foodX, foodY, foodRadius);
    for (const obstacle of this.logic.obstacles) {
      const obX = ox + obstacle.x * cell;
      const obY = oy + obstacle.y * cell;
      this.graphics.fillStyle(0xff7557, 1);
      this.graphics.fillRect(obX + 3, obY + 3, cell - 6, cell - 6);
      this.graphics.lineStyle(1.5, 0xff7557, 0.5);
      this.graphics.strokeRect(obX + 1, obY + 1, cell - 2, cell - 2);
      this.graphics.fillStyle(0x071114, 1);
      this.graphics.fillCircle(obX + cell / 2, obY + cell / 2, 3);
    }
    this.graphics.fillStyle(0x4dffe1, 0.14);
    for (const part of this.logic.snake) {
      this.graphics.fillRoundedRect(
        ox + part.x * cell - 1,
        oy + part.y * cell - 1,
        cell + 2,
        cell + 2,
        7
      );
    }
    this.logic.snake.forEach((part, index) => {
      const inset = index === 0 ? 2 : 4;
      this.graphics.fillStyle(0x4dffe1, Math.max(0.55, 1 - index * 0.03));
      this.graphics.fillRoundedRect(
        ox + part.x * cell + inset,
        oy + part.y * cell + inset,
        cell - inset * 2,
        cell - inset * 2,
        5
      );
    });
    const head = this.logic.snake[0];
    if (head && !this.reducedMotion) {
      this.graphics.lineStyle(2, 0xd8fff9, 0.55);
      this.graphics.strokeRoundedRect(ox + head.x * cell, oy + head.y * cell, cell, cell, 6);
    }
    if (!this.reducedMotion) {
      this.graphics.lineStyle(3, 0x4dffe1, 0.14 + state.speedLevel * 0.012);
      this.graphics.strokeRect(
        ox - 6,
        oy - 6,
        this.logic.width * cell + 12,
        this.logic.height * cell + 12
      );
    }
  }

  protected override hudExtra(state: NeonSerpentState): string {
    return `Len ${state.snakeLength}  x${state.multiplier}  Spd ${state.speedLevel}`;
  }

  private reactToTransitions(state: NeonSerpentState, cell: number, ox: number, oy: number): void {
    const ate = state.score > this.lastScore && !state.isGameOver;
    const died = state.isGameOver && !this.lastGameOver;
    if (ate && !this.reducedMotion) {
      const headX = ox + (state.headX + 0.5) * cell;
      const headY = oy + (state.headY + 0.5) * cell;
      this.sparks?.explode(12, headX, headY);
      popText(this, headX, headY - 18, `+${state.score - this.lastScore}`, '#ffd166');
      smallShake(this);
    }
    if (died && !this.reducedMotion) {
      deathFeedback(this);
    }
    this.lastScore = state.score;
    this.lastGameOver = state.isGameOver;
  }
}
