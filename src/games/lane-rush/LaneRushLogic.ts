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
}

export interface LaneRushState extends GameSnapshot {
  lane: number;
  traffic: ReadonlyArray<{ readonly lane: number; readonly y: number; readonly scored: boolean }>;
  trafficCount: number;
  speed: number;
}

export class LaneRushLogic implements GameLogic<LaneRushState> {
  readonly id = 'lane-rush';
  private rng = new SeededRandom(12);
  private lane = 1;
  private traffic: Traffic[] = [];
  private score = 0;
  private tick = 0;
  private speed = 0.18;
  private gameOver = false;

  restart(seed = 12): LaneRushState {
    this.rng = new SeededRandom(seed);
    this.lane = 1;
    this.traffic = [];
    this.score = 0;
    this.tick = 0;
    this.speed = 0.18;
    this.gameOver = false;
    return this.getState();
  }

  handleInput(input: SemanticInput): void {
    if (input === 'ACTION' && this.gameOver) {
      this.restart();
      return;
    }
    if (input === 'LEFT') this.lane = Math.max(0, this.lane - 1);
    if (input === 'RIGHT') this.lane = Math.min(2, this.lane + 1);
  }

  step(): LaneRushState {
    if (this.gameOver) return this.getState();
    this.tick += 1;
    this.speed = 0.18 + this.tick / 2400;
    if (this.tick % 28 === 0) this.spawnTraffic();
    for (const car of this.traffic) car.y += this.speed;
    for (const car of this.traffic) {
      if (car.lane === this.lane && car.y > 8.8 && car.y < 10.2) this.gameOver = true;
      if (!car.scored && car.lane !== this.lane && car.y > 9.1 && car.y < 10.4) {
        car.scored = true;
        this.score += Math.abs(car.lane - this.lane) === 1 ? 12 : 5;
      }
    }
    this.traffic = this.traffic.filter((car) => car.y < 12);
    return this.getState();
  }

  getState(): LaneRushState {
    const traffic = this.traffic.map((car) => ({ lane: car.lane, y: car.y, scored: car.scored }));
    return {
      score: this.score,
      isGameOver: this.gameOver,
      tick: this.tick,
      phase: this.gameOver ? 'game-over' : 'playing',
      lane: this.lane,
      traffic,
      trafficCount: traffic.length,
      speed: Number(this.speed.toFixed(3))
    };
  }

  private spawnTraffic(): void {
    const occupiedTop = new Set(this.traffic.filter((car) => car.y < 2).map((car) => car.lane));
    const lanes = [0, 1, 2].filter((lane) => !occupiedTop.has(lane));
    if (lanes.length <= 1) return;
    const lane = lanes[this.rng.integer(lanes.length)] as number;
    this.traffic.push({ lane, y: -1, scored: false });
  }
}
