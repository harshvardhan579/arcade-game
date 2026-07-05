import type Phaser from 'phaser';
import { BaseGameScene } from '../BaseGameScene';
import { createSparkEmitter, deathFeedback, popText, smallShake } from '../effects';
import { LaneRushLogic, type LaneRushState } from './LaneRushLogic';

const TRAFFIC_COLORS = [0xff7557, 0xffd166, 0xff4fd8];

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
    const shoulder = width * 0.12;
    const roadWidth = width - shoulder * 2;
    const laneWidth = roadWidth / 3;
    const laneX = (lane: number) => shoulder + (lane + 0.5) * laneWidth;
    const unitY = (height - 66) / 9.6;
    const toY = (y: number) => y * unitY;
    this.reactToTransitions(state, laneX, toY, height);

    this.graphics.fillStyle(0x0d252b, 1);
    this.graphics.fillRect(0, 0, width, height);
    this.drawRoadside(state, width, height, shoulder);
    this.drawLaneLines(state, shoulder, laneWidth, height);
    this.drawSpeedStreaks(state, shoulder, roadWidth, height);

    for (const car of state.traffic) {
      this.drawTrafficCar(laneX(car.lane), toY(car.y), car.variant);
    }
    this.drawPlayerCar(laneX(state.lane), height);
    this.drawDepthHaze(width, height);
  }

  protected override hudExtra(state: LaneRushState): string {
    return `Spd ${state.speed.toFixed(2)}`;
  }

  private drawRoadside(
    state: LaneRushState,
    width: number,
    height: number,
    shoulder: number
  ): void {
    this.graphics.fillStyle(0x0a161b, 1);
    this.graphics.fillRect(0, 0, shoulder, height);
    this.graphics.fillRect(width - shoulder, 0, shoulder, height);
    this.graphics.fillStyle(0x4dffe1, 0.4);
    this.graphics.fillRect(shoulder - 3, 0, 3, height);
    this.graphics.fillRect(width - shoulder, 0, 3, height);

    const cycle = 96;
    const offset = this.reducedMotion ? 0 : (this.time.now * state.speed * 0.45) % cycle;
    this.graphics.fillStyle(0x2b636e, 1);
    for (let y = offset - cycle; y < height; y += cycle) {
      this.graphics.fillRect(shoulder / 2 - 2, y, 4, 18);
      this.graphics.fillRect(width - shoulder / 2 - 2, y, 4, 18);
    }
    this.graphics.fillStyle(0x4dffe1, 0.55);
    for (let y = offset - cycle; y < height; y += cycle) {
      this.graphics.fillCircle(shoulder / 2, y, 3);
      this.graphics.fillCircle(width - shoulder / 2, y, 3);
    }
  }

  private drawLaneLines(
    state: LaneRushState,
    shoulder: number,
    laneWidth: number,
    height: number
  ): void {
    const dash = 26;
    const cycle = dash + 22;
    const offset = this.reducedMotion ? 0 : (this.time.now * state.speed * 0.45) % cycle;
    for (const x of [shoulder + laneWidth, shoulder + laneWidth * 2]) {
      this.graphics.fillStyle(0x4dffe1, 0.12);
      for (let y = offset - cycle; y < height; y += cycle) {
        this.graphics.fillRect(x - 3.5, y - 2, 7, dash + 4);
      }
      this.graphics.fillStyle(0x4dffe1, 0.5);
      for (let y = offset - cycle; y < height; y += cycle) {
        this.graphics.fillRect(x - 1.5, y, 3, dash);
      }
    }
  }

  private drawSpeedStreaks(
    state: LaneRushState,
    shoulder: number,
    roadWidth: number,
    height: number
  ): void {
    if (this.reducedMotion || state.speed < 0.26) return;
    this.graphics.fillStyle(0xd8fff9, 0.1);
    for (let i = 0; i < 8; i += 1) {
      const x = shoulder + ((i * 149 + 61) % roadWidth);
      const y = (i * 173 + this.time.now * state.speed * 2.4) % height;
      this.graphics.fillRect(x, y, 2, 34);
    }
  }

  private drawTrafficCar(cx: number, cy: number, variant: number): void {
    const color = TRAFFIC_COLORS[variant % TRAFFIC_COLORS.length]!;
    this.graphics.fillStyle(color, 1);
    this.graphics.fillRoundedRect(cx - 28, cy - 42, 56, 84, 10);
    this.graphics.fillStyle(0x0a161b, 0.85);
    this.graphics.fillRoundedRect(cx - 20, cy - 24, 40, 30, 6);
    this.graphics.fillStyle(0xffd166, 0.9);
    this.graphics.fillRect(cx - 22, cy + 34, 10, 5);
    this.graphics.fillRect(cx + 12, cy + 34, 10, 5);
  }

  private drawPlayerCar(cx: number, height: number): void {
    const bob = this.reducedMotion ? 0 : Math.sin(this.time.now / 90) * 1.5;
    const top = height - 110 + bob;
    this.graphics.fillStyle(0x4dffe1, 1);
    this.graphics.fillRoundedRect(cx - 28, top, 56, 88, 10);
    this.graphics.fillStyle(0x0b2a30, 1);
    this.graphics.fillRoundedRect(cx - 20, top + 22, 40, 34, 6);
    this.graphics.fillStyle(0xd8fff9, 0.7);
    this.graphics.fillRect(cx - 18, top + 24, 36, 6);
    this.graphics.fillStyle(0xd8fff9, 1);
    this.graphics.fillRect(cx - 22, top + 2, 10, 5);
    this.graphics.fillRect(cx + 12, top + 2, 10, 5);
  }

  private drawDepthHaze(width: number, height: number): void {
    const bands: Array<[number, number]> = [
      [0, 0.26],
      [0.06, 0.18],
      [0.12, 0.1],
      [0.18, 0.05]
    ];
    for (const [start, alpha] of bands) {
      this.graphics.fillStyle(0x02080a, alpha);
      this.graphics.fillRect(0, start * height, width, height * 0.06);
    }
  }

  private reactToTransitions(
    state: LaneRushState,
    laneX: (lane: number) => number,
    toY: (y: number) => number,
    height: number
  ): void {
    if (!this.reducedMotion) {
      if (state.score > this.lastScore && !state.isGameOver) {
        for (const car of state.traffic) {
          if (!car.scored) continue;
          const wasScored = this.lastTraffic.some(
            (previous) =>
              previous.scored && previous.lane === car.lane && Math.abs(previous.y - car.y) < 0.5
          );
          if (!wasScored) {
            this.sparks?.explode(8, laneX(car.lane), toY(car.y));
            const amount = Math.abs(car.lane - state.lane) === 1 ? 12 : 5;
            popText(this, laneX(car.lane), toY(car.y) - 20, `+${amount}`, '#ffd166');
          }
        }
        smallShake(this);
      }
      if (state.isGameOver && !this.lastGameOver) {
        this.sparks?.explode(26, laneX(state.lane), height - 70);
        deathFeedback(this);
      }
    }
    this.lastScore = state.score;
    this.lastGameOver = state.isGameOver;
    this.lastTraffic = state.traffic;
  }
}
