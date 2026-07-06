import type Phaser from 'phaser';
import { BaseGameScene } from '../BaseGameScene';
import { createSparkEmitter, deathFeedback, popText } from '../effects';
import { LaneRushLogic, type LaneRushState } from './LaneRushLogic';

const TRAFFIC_COLORS = [0xff7557, 0xffd166, 0xff4fd8];
// The road surface keeps this exact fill: it is the switching-spec pixel
// signature for Lane Rush (re-measured for the pseudo-3D trapezoid).
const ROAD_COLOR = 0x0d252b;
const PLAYER_WORLD_Y = 9.5;
const CRASH_FLASH_MS = 460;

export class LaneRushScene extends BaseGameScene<LaneRushState> {
  protected logic = new LaneRushLogic();
  protected stepMs = 42;
  private sparks?: Phaser.GameObjects.Particles.ParticleEmitter;
  private lastScore = 0;
  private lastGameOver = false;
  private lastBoosting = false;
  private lastTraffic: ReadonlyArray<{
    readonly lane: number;
    readonly y: number;
    readonly scored: boolean;
  }> = [];
  private displayX = -1;
  private nearMissFlashUntil = 0;
  private crashUntil = 0;
  private crashPoint = { x: 0, y: 0, scale: 1 };

  constructor() {
    super('lane-rush');
  }

  create(): void {
    super.create();
    this.sparks = createSparkEmitter(this, [0xffd166, 0x4dffe1]);
    const state = this.logic.getState();
    this.lastScore = state.score;
    this.lastGameOver = state.isGameOver;
    this.lastBoosting = state.boostTicksLeft > 0;
    this.lastTraffic = state.traffic;
    this.displayX = -1;
    this.nearMissFlashUntil = 0;
    this.crashUntil = 0;
  }

  // --- perspective mapping -------------------------------------------------
  // World y runs -1 (spawn) .. 12 (past the player). Depth 0 is the horizon,
  // 1 the bottom apron; the ^1.7 easing compresses the far road so spacing
  // reads as distance while road edges stay straight lines.

  private horizonY(height: number): number {
    return height * 0.3;
  }

  private depthOf(worldY: number): number {
    const t = Math.max(0, Math.min(1, (worldY + 1) / 12.5));
    return Math.pow(t, 1.7);
  }

  private screenY(depth: number, height: number): number {
    const hy = this.horizonY(height);
    return hy + (height - hy - 12) * depth;
  }

  private roadHalf(depth: number, width: number): number {
    return width * (0.055 + 0.365 * depth);
  }

  private laneCenter(lane: number, depth: number, width: number): number {
    return width / 2 + ((lane - 1) * (this.roadHalf(depth, width) * 2)) / 3;
  }

  private carScale(depth: number): number {
    return 0.2 + 0.85 * depth;
  }

  protected draw(state: LaneRushState, width: number, height: number): void {
    this.reactToTransitions(state, width, height);
    this.drawSkyAndGround(state, width, height);
    this.drawLaneDashes(state, width, height);
    this.drawRoadsidePosts(state, width, height);
    this.drawNearMissZone(state, width, height);
    this.drawSpeedStreaks(state, width, height);
    this.drawTraffic(state, width, height);
    this.drawPlayerCar(state, width, height);
    this.drawCrashImpact();
    this.drawFarHaze(width, height);
  }

  protected override hudExtra(state: LaneRushState): string {
    const spd = `Spd ${state.speed.toFixed(2)}`;
    if (state.boostTicksLeft > 0) return `${spd} BOOST`;
    if (state.boostCooldownTicks > 0) {
      return `${spd} boost ${Math.ceil(state.boostCooldownTicks * 0.042)}s`;
    }
    return `${spd} boost ●●`;
  }

  private drawSkyAndGround(state: LaneRushState, width: number, height: number): void {
    const hy = this.horizonY(height);
    // Night sky bands above the horizon.
    this.graphics.fillStyle(0x05090b, 1);
    this.graphics.fillRect(0, 0, width, hy);
    this.graphics.fillStyle(0x081418, 1);
    this.graphics.fillRect(0, hy * 0.55, width, hy * 0.45);
    // Horizon glow, brighter while boosting.
    const glow = state.boostTicksLeft > 0 ? 0.5 : 0.28;
    this.graphics.fillStyle(0x4dffe1, glow * 0.35);
    this.graphics.fillRect(0, hy - 4, width, 4);
    this.graphics.fillStyle(0x4dffe1, glow);
    this.graphics.fillRect(0, hy - 1, width, 2);
    // Ground shoulders, then the road trapezoid on top (signature color).
    this.graphics.fillStyle(0x0a161b, 1);
    this.graphics.fillRect(0, hy, width, height - hy);
    const topHalf = this.roadHalf(0, width);
    const bottomHalf = this.roadHalf(1, width);
    this.graphics.fillStyle(ROAD_COLOR, 1);
    this.graphics.fillPoints(
      [
        { x: width / 2 - topHalf, y: hy },
        { x: width / 2 + topHalf, y: hy },
        { x: width / 2 + bottomHalf, y: height },
        { x: width / 2 - bottomHalf, y: height }
      ],
      true
    );
    // Bright road edges.
    this.graphics.lineStyle(2, 0x4dffe1, 0.4);
    this.graphics.lineBetween(width / 2 - topHalf, hy, width / 2 - bottomHalf, height);
    this.graphics.lineBetween(width / 2 + topHalf, hy, width / 2 + bottomHalf, height);
  }

  private worldScroll(state: LaneRushState, cycle: number): number {
    return this.reducedMotion ? 0 : (this.time.now * state.speed * 0.004) % cycle;
  }

  private drawLaneDashes(state: LaneRushState, width: number, height: number): void {
    const cycle = 1.6;
    const dash = 0.8;
    const phase = this.worldScroll(state, cycle);
    this.graphics.fillStyle(0x4dffe1, 0.45);
    for (let wy = -1 - cycle + phase; wy < 12.5; wy += cycle) {
      const d1 = this.depthOf(wy);
      const d2 = this.depthOf(wy + dash);
      if (d2 <= 0.005) continue;
      const y1 = this.screenY(d1, height);
      const y2 = this.screenY(d2, height);
      const w1 = 1 + 2.6 * d1;
      const w2 = 1 + 2.6 * d2;
      for (const side of [-1, 1]) {
        const x1 = width / 2 + (side * this.roadHalf(d1, width)) / 3;
        const x2 = width / 2 + (side * this.roadHalf(d2, width)) / 3;
        this.graphics.fillPoints(
          [
            { x: x1 - w1, y: y1 },
            { x: x1 + w1, y: y1 },
            { x: x2 + w2, y: y2 },
            { x: x2 - w2, y: y2 }
          ],
          true
        );
      }
    }
  }

  private drawRoadsidePosts(state: LaneRushState, width: number, height: number): void {
    const cycle = 2.4;
    const phase = this.worldScroll(state, cycle);
    for (let wy = -1 - cycle + phase; wy < 12.5; wy += cycle) {
      const d = this.depthOf(wy);
      if (d <= 0.01) continue;
      const y = this.screenY(d, height);
      const postH = 5 + 20 * d;
      const inset = this.roadHalf(d, width) + 8 + 14 * d;
      for (const side of [-1, 1]) {
        const x = width / 2 + side * inset;
        this.graphics.fillStyle(0x2b636e, 1);
        this.graphics.fillRect(x - 1.5 - d, y - postH, 3 + 2 * d, postH);
        this.graphics.fillStyle(0x4dffe1, 0.55);
        this.graphics.fillCircle(x, y - postH, 1.5 + 2 * d);
      }
    }
  }

  private drawNearMissZone(state: LaneRushState, width: number, height: number): void {
    // The scoring band (world y 9.1..10.4) is visible on the asphalt so the
    // player can read where near-misses count; it flashes when one lands.
    const d1 = this.depthOf(9.1);
    const d2 = this.depthOf(10.4);
    const flash = this.time.now < this.nearMissFlashUntil;
    this.graphics.fillStyle(0x4dffe1, flash ? 0.16 : 0.05);
    this.graphics.fillPoints(
      [
        { x: width / 2 - this.roadHalf(d1, width), y: this.screenY(d1, height) },
        { x: width / 2 + this.roadHalf(d1, width), y: this.screenY(d1, height) },
        { x: width / 2 + this.roadHalf(d2, width), y: this.screenY(d2, height) },
        { x: width / 2 - this.roadHalf(d2, width), y: this.screenY(d2, height) }
      ],
      true
    );
  }

  private drawSpeedStreaks(state: LaneRushState, width: number, height: number): void {
    if (this.reducedMotion || state.speed < 0.24) return;
    const boosting = state.boostTicksLeft > 0;
    this.graphics.fillStyle(0xd8fff9, boosting ? 0.18 : 0.09);
    const count = boosting ? 12 : 8;
    for (let i = 0; i < count; i += 1) {
      const d = 0.35 + ((i * 37) % 60) / 100;
      const side = i % 2 === 0 ? -1 : 1;
      const x = width / 2 + side * (this.roadHalf(d, width) - 8 - ((i * 53) % 30));
      const streak = 16 + state.speed * (boosting ? 160 : 90) * d;
      const y = (i * 173 + this.time.now * state.speed * 2.6) % (height * 0.7);
      this.graphics.fillRect(x, this.horizonY(height) + y, 2, streak);
    }
  }

  private drawTraffic(state: LaneRushState, width: number, height: number): void {
    const cars = [...state.traffic].sort((a, b) => a.y - b.y);
    const crashActive = this.time.now < this.crashUntil;
    const decay = crashActive ? (this.crashUntil - this.time.now) / CRASH_FLASH_MS : 0;
    for (const car of cars) {
      const d = this.depthOf(car.y);
      const scale = this.carScale(d);
      let cx = this.laneCenter(car.lane, d, width);
      let cy = this.screenY(d, height);
      const crashed =
        state.crashLane === car.lane && Math.abs(car.y - state.crashY) < 0.6 && state.isGameOver;
      if (crashed && crashActive && !this.reducedMotion) {
        // The struck car is shoved forward and sideways as the impact decays.
        cx += Math.sin(this.time.now / 16) * 3 * decay;
        cy -= 9 * decay;
      }
      // Danger cue: a car bearing down in the player's lane glows red.
      if (!state.isGameOver && car.lane === state.lane && car.y > 7 && car.y < 8.8) {
        this.graphics.fillStyle(0xff7557, 0.22);
        this.graphics.fillRoundedRect(
          cx - 34 * scale,
          cy - 48 * scale,
          68 * scale,
          96 * scale,
          10 * scale
        );
      }
      this.drawCarShape(cx, cy, scale, TRAFFIC_COLORS[car.variant % TRAFFIC_COLORS.length]!);
      if (crashed && this.reducedMotion) {
        this.graphics.lineStyle(3, 0xff7557, 0.9);
        this.graphics.strokeRoundedRect(
          cx - 30 * scale,
          cy - 44 * scale,
          60 * scale,
          88 * scale,
          10 * scale
        );
      }
    }
  }

  private drawCarShape(cx: number, cy: number, scale: number, color: number): void {
    this.graphics.fillStyle(color, 1);
    this.graphics.fillRoundedRect(
      cx - 28 * scale,
      cy - 42 * scale,
      56 * scale,
      84 * scale,
      10 * scale
    );
    this.graphics.fillStyle(0x0a161b, 0.85);
    this.graphics.fillRoundedRect(
      cx - 20 * scale,
      cy - 24 * scale,
      40 * scale,
      30 * scale,
      6 * scale
    );
    this.graphics.fillStyle(0xffd166, 0.9);
    this.graphics.fillRect(cx - 22 * scale, cy + 34 * scale, 10 * scale, 5 * scale);
    this.graphics.fillRect(cx + 12 * scale, cy + 34 * scale, 10 * scale, 5 * scale);
  }

  private drawPlayerCar(state: LaneRushState, width: number, height: number): void {
    const depth = this.depthOf(PLAYER_WORLD_Y);
    const scale = this.carScale(depth);
    const target = this.laneCenter(state.lane, depth, width);
    if (this.displayX < 0 || this.reducedMotion) this.displayX = target;
    else this.displayX += (target - this.displayX) * 0.35;
    const crashActive = this.time.now < this.crashUntil;
    const decay = crashActive ? (this.crashUntil - this.time.now) / CRASH_FLASH_MS : 0;
    const jitter =
      crashActive && !this.reducedMotion ? Math.sin(this.time.now / 14) * 5 * decay : 0;
    const bob = this.reducedMotion || state.isGameOver ? 0 : Math.sin(this.time.now / 90) * 1.5;
    const cx = this.displayX + jitter;
    const cy = this.screenY(depth, height) + bob;

    // Boost exhaust flames trail behind (toward the viewer).
    if (state.boostTicksLeft > 0 && !this.reducedMotion) {
      const flick = 10 + Math.sin(this.time.now / 45) * 6;
      this.graphics.fillStyle(0xffd166, 0.85);
      this.graphics.fillTriangle(
        cx - 14 * scale,
        cy + 42 * scale,
        cx - 6 * scale,
        cy + 42 * scale,
        cx - 10 * scale,
        cy + 42 * scale + flick
      );
      this.graphics.fillTriangle(
        cx + 6 * scale,
        cy + 42 * scale,
        cx + 14 * scale,
        cy + 42 * scale,
        cx + 10 * scale,
        cy + 42 * scale + flick
      );
    }

    this.graphics.fillStyle(0x4dffe1, 1);
    this.graphics.fillRoundedRect(
      cx - 28 * scale,
      cy - 44 * scale,
      56 * scale,
      88 * scale,
      10 * scale
    );
    this.graphics.fillStyle(0x0b2a30, 1);
    this.graphics.fillRoundedRect(
      cx - 20 * scale,
      cy - 22 * scale,
      40 * scale,
      34 * scale,
      6 * scale
    );
    this.graphics.fillStyle(0xd8fff9, 0.7);
    this.graphics.fillRect(cx - 18 * scale, cy - 20 * scale, 36 * scale, 6 * scale);
    this.graphics.fillStyle(0xd8fff9, 1);
    this.graphics.fillRect(cx - 22 * scale, cy - 42 * scale, 10 * scale, 5 * scale);
    this.graphics.fillRect(cx + 12 * scale, cy - 42 * scale, 10 * scale, 5 * scale);
    if (crashActive && this.reducedMotion) {
      this.graphics.lineStyle(3, 0xff7557, 0.9);
      this.graphics.strokeRoundedRect(
        cx - 30 * scale,
        cy - 46 * scale,
        60 * scale,
        92 * scale,
        10 * scale
      );
    }
  }

  private drawCrashImpact(): void {
    if (this.reducedMotion || this.time.now >= this.crashUntil) return;
    // Expanding shockwave rings sell the hit at the true collision point.
    const decay = (this.crashUntil - this.time.now) / CRASH_FLASH_MS;
    const grow = 1 - decay;
    const radius = (10 + 52 * grow) * this.crashPoint.scale;
    this.graphics.lineStyle(3 + 3 * decay, 0xffd166, 0.75 * decay);
    this.graphics.strokeCircle(this.crashPoint.x, this.crashPoint.y, radius);
    this.graphics.lineStyle(2, 0xd8fff9, 0.5 * decay);
    this.graphics.strokeCircle(this.crashPoint.x, this.crashPoint.y, radius * 0.62);
  }

  private drawFarHaze(width: number, height: number): void {
    // Distance haze just under the horizon pushes the far road back.
    const hy = this.horizonY(height);
    const bands: Array<[number, number]> = [
      [0, 0.3],
      [0.035, 0.18],
      [0.075, 0.08]
    ];
    for (const [offset, alpha] of bands) {
      this.graphics.fillStyle(0x02080a, alpha);
      this.graphics.fillRect(0, hy + offset * height, width, height * 0.045);
    }
  }

  private reactToTransitions(state: LaneRushState, width: number, height: number): void {
    const boosting = state.boostTicksLeft > 0;
    if (!this.reducedMotion) {
      if (state.score > this.lastScore && !state.isGameOver) {
        for (const car of state.traffic) {
          if (!car.scored) continue;
          const wasScored = this.lastTraffic.some(
            (previous) =>
              previous.scored && previous.lane === car.lane && Math.abs(previous.y - car.y) < 0.7
          );
          if (!wasScored) {
            const d = this.depthOf(car.y);
            const cx = this.laneCenter(car.lane, d, width);
            const cy = this.screenY(d, height);
            this.sparks?.explode(8, cx, cy);
            const amount = Math.abs(car.lane - state.lane) === 1 ? 12 : 5;
            popText(this, cx, cy - 46 * this.carScale(d), `+${amount}`, '#ffd166', 15);
            this.nearMissFlashUntil = this.time.now + 200;
          }
        }
      }
      if (boosting && !this.lastBoosting) {
        popText(this, width / 2, this.screenY(this.depthOf(7), height), 'BOOST!', '#ffd166', 20);
      }
    }
    if (state.isGameOver && !this.lastGameOver) {
      // Impact at the true collision lane/depth (fallback: the player).
      const crashY = state.crashY >= 0 ? state.crashY : PLAYER_WORLD_Y;
      const crashLane = state.crashLane >= 0 ? state.crashLane : state.lane;
      const d = this.depthOf(crashY);
      this.crashPoint = {
        x: this.laneCenter(crashLane, d, width),
        y: this.screenY(d, height),
        scale: this.carScale(d)
      };
      this.crashUntil = this.time.now + CRASH_FLASH_MS;
      if (!this.reducedMotion) {
        this.sparks?.explode(26, this.crashPoint.x, this.crashPoint.y);
        deathFeedback(this);
      }
    }
    this.lastScore = state.score;
    this.lastGameOver = state.isGameOver;
    this.lastBoosting = boosting;
    this.lastTraffic = state.traffic;
  }
}
