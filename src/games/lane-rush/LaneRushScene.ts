import type Phaser from 'phaser';
import { BaseGameScene } from '../BaseGameScene';
import { createSparkEmitter, deathFeedback, smallShake } from '../effects';
import { LaneRushLogic, type LaneRushState } from './LaneRushLogic';

export class LaneRushScene extends BaseGameScene<LaneRushState> {
  protected logic = new LaneRushLogic();
  protected stepMs = 42;
  private sparks?: Phaser.GameObjects.Particles.ParticleEmitter;
  private lastScore = 0;
  private lastGameOver = false;
  private lastTraffic: ReadonlyArray<{
    readonly lane: number;
    readonly y: number;
    readonly scored: boolean;
  }> = [];

  constructor() {
    super('lane-rush');
  }

  create(): void {
    super.create();
    this.sparks = createSparkEmitter(this, [0xffd166, 0x4dffe1]);
    const state = this.logic.getState();
    this.lastScore = state.score;
    this.lastGameOver = state.isGameOver;
    this.lastTraffic = state.traffic;
  }

  protected draw(state: LaneRushState, width: number, height: number): void {
    const laneWidth = width / 3;
    const laneX = (lane: number) => (lane + 0.5) * laneWidth;
    const unitY = (height - 66) / 9.6;
    const toY = (y: number) => y * unitY;
    this.reactToTransitions(state, laneX, toY);
    this.graphics.fillStyle(0x0d252b, 1);
    this.graphics.fillRect(0, 0, width, height);
    this.drawLaneLines(state, laneWidth, height);
    const bob = this.reducedMotion ? 0 : Math.sin(this.time.now / 90) * 1.5;
    this.graphics.fillStyle(0x4dffe1, 1);
    this.graphics.fillRoundedRect(laneX(state.lane) - 26, height - 105 + bob, 52, 78, 8);
    this.graphics.fillStyle(0xff7557, 1);
    for (const car of state.traffic) {
      this.graphics.fillRoundedRect(laneX(car.lane) - 24, toY(car.y) - 35, 48, 70, 8);
    }
  }

  protected override hudExtra(state: LaneRushState): string {
    return `Speed ${state.speed}`;
  }

  private drawLaneLines(state: LaneRushState, laneWidth: number, height: number): void {
    const dash = 26;
    const cycle = dash + 22;
    const offset = this.reducedMotion ? 0 : (this.time.now * state.speed * 0.45) % cycle;
    this.graphics.fillStyle(0x4dffe1, 0.35);
    for (const x of [laneWidth, laneWidth * 2]) {
      for (let y = offset - cycle; y < height; y += cycle) {
        this.graphics.fillRect(x - 1.5, y, 3, dash);
      }
    }
  }

  private reactToTransitions(
    state: LaneRushState,
    laneX: (lane: number) => number,
    toY: (y: number) => number
  ): void {
    if (!this.reducedMotion) {
      if (state.score > this.lastScore && !state.isGameOver) {
        for (const car of state.traffic) {
          if (!car.scored) continue;
          const wasScored = this.lastTraffic.some(
            (previous) =>
              previous.scored && previous.lane === car.lane && Math.abs(previous.y - car.y) < 0.5
          );
          if (!wasScored) this.sparks?.explode(8, laneX(car.lane), toY(car.y));
        }
        smallShake(this);
      }
      if (state.isGameOver && !this.lastGameOver) {
        deathFeedback(this);
      }
    }
    this.lastScore = state.score;
    this.lastGameOver = state.isGameOver;
    this.lastTraffic = state.traffic;
  }
}
