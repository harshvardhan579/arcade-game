import {
  SeededRandom,
  type GameLogic,
  type GameSnapshot,
  type SemanticInput
} from '../../core/types';

interface Traffic {
  lane: number;
  y: number;
  scored: boolean;
  variant: number;
}

// The base speed ramp plateaus here (~tick 480) so long runs stay fair;
// the boost is the only way past it, briefly, at the player's own risk.
export const laneRushMaxSpeed = 0.38;
// Two ACTION taps within this many ticks (~340 ms at the 42 ms step) arm the
// boost; slower taps just re-arm the first-tap marker. ACTION-while-dead
// still restarts before any of this is consulted.
export const laneRushDoubleTapTicks = 8;
export const laneRushBoostDurationTicks = 90;
export const laneRushBoostCooldownTicks = 240;
export const laneRushBoostMultiplier = 1.6;

export interface LaneRushState extends GameSnapshot {
  lane: number;
  traffic: ReadonlyArray<{
    readonly lane: number;
    readonly y: number;
    readonly scored: boolean;
    readonly variant: number;
  }>;
  trafficCount: number;
  speed: number;
  boostTicksLeft: number;
  boostCooldownTicks: number;
  /** Lane/depth of the car that ended the run; -1 while alive. */
  crashLane: number;
  crashY: number;
}

export class LaneRushLogic implements GameLogic<LaneRushState> {
  readonly id = 'lane-rush';
  private rng = new SeededRandom(12);
  private lane = 1;
  traffic: Traffic[] = [];
  private score = 0;
  private tick = 0;
  private speed = 0.18;
  private gameOver = false;
  private boostTicks = 0;
  private cooldownTicks = 0;
  private lastActionTick = -999;
  private crashLane = -1;
  private crashY = -1;

  restart(seed = 12): LaneRushState {
    this.rng = new SeededRandom(seed);
    this.lane = 1;
    this.traffic = [];
    this.score = 0;
    this.tick = 0;
    this.speed = 0.18;
    this.gameOver = false;
    this.boostTicks = 0;
    this.cooldownTicks = 0;
    this.lastActionTick = -999;
    this.crashLane = -1;
    this.crashY = -1;
    return this.getState();
  }

  handleInput(input: SemanticInput): void {
    if (input === 'ACTION') {
      if (this.gameOver) {
        this.restart();
        return;
      }
      if (
        this.boostTicks === 0 &&
        this.cooldownTicks === 0 &&
        this.lastActionTick >= 0 &&
        this.tick - this.lastActionTick <= laneRushDoubleTapTicks
      ) {
        this.boostTicks = laneRushBoostDurationTicks;
        this.lastActionTick = -999;
      } else {
        this.lastActionTick = this.tick;
      }
      return;
    }
    if (input === 'LEFT') this.lane = Math.max(0, this.lane - 1);
    if (input === 'RIGHT') this.lane = Math.min(2, this.lane + 1);
  }

  step(): LaneRushState {
    if (this.gameOver) return this.getState();
    this.tick += 1;
    if (this.boostTicks > 0) {
      this.boostTicks -= 1;
      if (this.boostTicks === 0) this.cooldownTicks = laneRushBoostCooldownTicks;
    } else if (this.cooldownTicks > 0) {
      this.cooldownTicks -= 1;
    }
    const base = Math.min(laneRushMaxSpeed, 0.18 + this.tick / 2400);
    this.speed = this.boostTicks > 0 ? base * laneRushBoostMultiplier : base;
    if (this.tick % 28 === 0) this.spawnTraffic();
    for (const car of this.traffic) car.y += this.speed;
    for (const car of this.traffic) {
      if (car.lane === this.lane && car.y > 8.8 && car.y < 10.2) {
        this.gameOver = true;
        this.crashLane = car.lane;
        this.crashY = Number(car.y.toFixed(3));
      }
      if (!car.scored && car.lane !== this.lane && car.y > 9.1 && car.y < 10.4) {
        car.scored = true;
        this.score += Math.abs(car.lane - this.lane) === 1 ? 12 : 5;
      }
    }
    this.traffic = this.traffic.filter((car) => car.y < 12);
    return this.getState();
  }

  getState(): LaneRushState {
    const traffic = this.traffic.map((car) => ({
      lane: car.lane,
      y: car.y,
      scored: car.scored,
      variant: car.variant
    }));
    return {
      score: this.score,
      isGameOver: this.gameOver,
      tick: this.tick,
      phase: this.gameOver ? 'game-over' : 'playing',
      lane: this.lane,
      traffic,
      trafficCount: traffic.length,
      speed: Number(this.speed.toFixed(3)),
      boostTicksLeft: this.boostTicks,
      boostCooldownTicks: this.cooldownTicks,
      crashLane: this.crashLane,
      crashY: this.crashY
    };
  }

  private spawnTraffic(): void {
    const occupiedTop = new Set(this.traffic.filter((car) => car.y < 2).map((car) => car.lane));
    const lanes = [0, 1, 2].filter((lane) => !occupiedTop.has(lane));
    if (lanes.length <= 1) return;
    const lane = lanes[this.rng.integer(lanes.length)] as number;
    // Visual variant derives from the spawn tick, not the rng, so adding it
    // cannot shift the deterministic traffic sequence.
    this.traffic.push({ lane, y: -1, scored: false, variant: this.tick % 3 });
  }
}
