import type Phaser from 'phaser';
import { BaseGameScene } from '../BaseGameScene';
import { createSparkEmitter, deathFeedback, smallShake } from '../effects';
import { BounceCircuitLogic, type BounceCircuitState } from './BounceCircuitLogic';

export class BounceCircuitScene extends BaseGameScene<BounceCircuitState> {
  protected logic = new BounceCircuitLogic();
  private sparks?: Phaser.GameObjects.Particles.ParticleEmitter;
  private lastHasKey = false;
  private lastPhase: BounceCircuitState['phase'] = 'playing';
  private lastPlayerY = 0;
  private squashUntil = 0;

  constructor() {
    super('bounce-circuit');
  }

  create(): void {
    super.create();
    this.sparks = createSparkEmitter(this, [0xffd166, 0x4dffe1]);
    const state = this.logic.getState();
    this.lastHasKey = state.hasKey;
    this.lastPhase = state.phase;
    this.lastPlayerY = state.playerY;
    this.squashUntil = 0;
  }

  protected draw(state: BounceCircuitState, width: number, height: number): void {
    const sx = width / 10;
    const ground = height - 72;
    this.reactToTransitions(state, sx, ground);
    this.graphics.fillStyle(0x12353c, 1);
    this.graphics.fillRect(0, ground, width, 8);
    this.graphics.fillStyle(0xff7557, 1);
    this.graphics.fillTriangle(4 * sx - 18, ground, 4 * sx, ground - 32, 4 * sx + 18, ground);
    this.graphics.fillStyle(state.hasKey ? 0x31545a : 0xffd166, 1);
    this.graphics.fillCircle(6 * sx, ground - 44, 13);
    this.graphics.fillStyle(state.hasKey ? 0x4dffe1 : 0x31545a, 1);
    this.graphics.fillRect(8.4 * sx, ground - 72, 42, 72);
    let bodyWidth = 32;
    let bodyHeight = 32;
    if (!this.reducedMotion) {
      if (this.time.now < this.squashUntil) {
        bodyWidth = 40;
        bodyHeight = 24;
      } else if (state.velocityY > 1.2) {
        bodyWidth = 26;
        bodyHeight = 38;
      } else if (state.velocityY < -1.2 && state.playerY > 0) {
        bodyWidth = 28;
        bodyHeight = 36;
      }
    }
    this.graphics.fillStyle(0x4dffe1, 1);
    this.graphics.fillRoundedRect(
      state.playerX * sx - bodyWidth / 2,
      ground - state.playerY * 34 - bodyHeight,
      bodyWidth,
      bodyHeight,
      6
    );
  }

  private reactToTransitions(state: BounceCircuitState, sx: number, ground: number): void {
    if (!this.reducedMotion) {
      if (state.playerY === 0 && this.lastPlayerY > 0.4) {
        this.squashUntil = this.time.now + 130;
      }
      if (state.hasKey && !this.lastHasKey) {
        this.sparks?.explode(12, 6 * sx, ground - 44);
        smallShake(this);
      }
      if (state.phase === 'won' && this.lastPhase !== 'won') {
        this.sparks?.explode(28, 8.4 * sx + 21, ground - 36);
        this.cameras.main.flash(160, 120, 255, 225);
        smallShake(this);
      }
      if (state.isGameOver && this.lastPhase === 'playing') {
        deathFeedback(this);
      }
    }
    this.lastHasKey = state.hasKey;
    this.lastPhase = state.phase;
    this.lastPlayerY = state.playerY;
  }
}
