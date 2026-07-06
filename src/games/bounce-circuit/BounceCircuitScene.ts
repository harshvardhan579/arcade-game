import type Phaser from 'phaser';
import { BaseGameScene } from '../BaseGameScene';
import { createSparkEmitter, deathFeedback, popText, smallShake } from '../effects';
import { BounceCircuitLogic, type BounceCircuitState } from './BounceCircuitLogic';

const UNIT_Y = 46;

export class BounceCircuitScene extends BaseGameScene<BounceCircuitState> {
  protected logic = new BounceCircuitLogic();
  protected stepMs = 48;
  private sparks?: Phaser.GameObjects.Particles.ParticleEmitter;
  private lastGrounded = true;
  private lastOrbs = 0;
  private lastGameOver = false;
  private lastAirJumpUsed = false;
  private squashUntil = 0;

  constructor() {
    super('bounce-circuit');
  }

  create(): void {
    super.create();
    this.sparks = createSparkEmitter(this, [0xffd166, 0x4dffe1]);
    const state = this.logic.getState();
    this.lastGrounded = state.grounded;
    this.lastOrbs = state.orbsCollected;
    this.lastGameOver = state.isGameOver;
    this.lastAirJumpUsed = state.airJumpUsed;
    this.squashUntil = 0;
  }

  protected draw(state: BounceCircuitState, width: number, height: number): void {
    const sx = width / 10;
    const ground = height - 72;
    const toX = (worldX: number) => (worldX - state.cameraX) * sx;
    this.reactToTransitions(state, toX, ground);
    this.drawBackdrop(state, width, ground, sx);

    for (const platform of state.platforms) {
      const px = toX(platform.x);
      const pw = platform.width * sx;
      const py = ground - platform.height * UNIT_Y;
      this.graphics.fillStyle(0x123c46, 1);
      this.graphics.fillRect(px, py, pw, 12);
      this.graphics.fillStyle(0x4dffe1, 0.8);
      this.graphics.fillRect(px, py, pw, 3);
    }

    this.graphics.fillStyle(0xff7557, 1);
    for (const spike of state.spikes) {
      const cx = toX(spike.x);
      this.graphics.fillTriangle(cx - 14, ground, cx, ground - 30, cx + 14, ground);
    }

    const pulse = this.reducedMotion ? 0 : Math.sin(this.time.now / 140) * 2;
    this.graphics.fillStyle(0xffd166, 1);
    for (const orb of state.orbs) {
      this.graphics.fillCircle(toX(orb.x), ground - orb.y * UNIT_Y - 10, 9 + pulse);
    }

    let bodyWidth = 32;
    let bodyHeight = 32;
    if (!this.reducedMotion) {
      if (this.time.now < this.squashUntil) {
        bodyWidth = 40;
        bodyHeight = 24;
      } else if (state.velocityY > 1.2) {
        bodyWidth = 26;
        bodyHeight = 38;
      } else if (state.velocityY < -1.2 && !state.grounded) {
        bodyWidth = 28;
        bodyHeight = 36;
      }
    }
    const px = toX(state.playerX);
    this.graphics.fillStyle(0x4dffe1, 1);
    this.graphics.fillRoundedRect(
      px - bodyWidth / 2,
      ground - state.playerY * UNIT_Y - bodyHeight,
      bodyWidth,
      bodyHeight,
      6
    );
  }

  protected override hudExtra(state: BounceCircuitState): string {
    return `Dist ${state.distance}  Orbs ${state.orbsCollected}`;
  }

  private drawBackdrop(state: BounceCircuitState, width: number, ground: number, sx: number): void {
    this.graphics.fillStyle(0x0a1a20, 1);
    this.graphics.fillRect(0, ground - 210, width, 210);
    this.drawTowers(state.cameraX * sx * 0.2, 84, ground, width, 0x0d2229, 56, 90);
    this.drawTowers(state.cameraX * sx * 0.45, 120, ground, width, 0x113038, 40, 60);
    // Full-width ground strip; keep this exact color for the switching pixel signature.
    this.graphics.fillStyle(0x12353c, 1);
    this.graphics.fillRect(0, ground, width, 8);
    this.graphics.fillStyle(0x1f4a53, 1);
    const spacing = 64;
    const offset = state.cameraX * sx;
    const first = Math.floor(offset / spacing);
    for (let k = first; k < first + width / spacing + 2; k += 1) {
      this.graphics.fillRect(k * spacing - offset, ground + 12, 26, 4);
    }
  }

  private drawTowers(
    offset: number,
    spacing: number,
    ground: number,
    width: number,
    color: number,
    minHeight: number,
    heightRange: number
  ): void {
    this.graphics.fillStyle(color, 1);
    const first = Math.floor(offset / spacing);
    for (let k = first; k < first + width / spacing + 2; k += 1) {
      const towerHeight = minHeight + ((((k * 2654435761) >>> 0) % 97) / 97) * heightRange;
      this.graphics.fillRect(
        k * spacing - offset,
        ground - towerHeight,
        spacing * 0.55,
        towerHeight
      );
    }
  }

  private reactToTransitions(
    state: BounceCircuitState,
    toX: (worldX: number) => number,
    ground: number
  ): void {
    if (!this.reducedMotion) {
      if (state.grounded && !this.lastGrounded && !state.isGameOver) {
        this.squashUntil = this.time.now + 130;
        this.sparks?.explode(6, toX(state.playerX), ground - 4);
      }
      if (state.airJumpUsed && !this.lastAirJumpUsed && !state.isGameOver) {
        // Mid-air jump kick: a small puff under the player sells the impulse.
        this.sparks?.explode(8, toX(state.playerX), ground - state.playerY * UNIT_Y + 6);
      }
      if (state.orbsCollected > this.lastOrbs) {
        const px = toX(state.playerX);
        const py = ground - state.playerY * UNIT_Y - 16;
        this.sparks?.explode(12, px, py);
        popText(this, px, py - 18, `+${(state.orbsCollected - this.lastOrbs) * 25}`, '#ffd166');
        smallShake(this);
      }
      if (state.isGameOver && !this.lastGameOver) {
        deathFeedback(this);
      }
    }
    this.lastGrounded = state.grounded;
    this.lastOrbs = state.orbsCollected;
    this.lastGameOver = state.isGameOver;
    this.lastAirJumpUsed = state.airJumpUsed;
  }
}
