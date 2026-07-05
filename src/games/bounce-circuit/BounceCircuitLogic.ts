import {
  SeededRandom,
  type GameLogic,
  type GameSnapshot,
  type SemanticInput
} from '../../core/types';

export interface RunnerPlatform {
  x: number;
  width: number;
  height: number;
}

export interface RunnerOrb {
  x: number;
  y: number;
}

export const runnerGraceUnits = 32;
export const runnerChunkUnits = 16;
export const runnerCoyoteSteps = 4;
export const runnerBufferSteps = 5;
export const runnerJumpVelocity = 5.2;
export const runnerBaseSpeed = 0.22;
export const runnerMaxSpeed = 0.42;

const round2 = (value: number): number => Math.round(value * 100) / 100;

export interface BounceCircuitState extends GameSnapshot {
  cameraX: number;
  playerX: number;
  playerY: number;
  velocityY: number;
  grounded: boolean;
  speed: number;
  distance: number;
  orbsCollected: number;
  spikes: ReadonlyArray<{ readonly x: number }>;
  platforms: ReadonlyArray<{
    readonly x: number;
    readonly width: number;
    readonly height: number;
  }>;
  orbs: ReadonlyArray<{ readonly x: number; readonly y: number }>;
}

export class BounceCircuitLogic implements GameLogic<BounceCircuitState> {
  readonly id = 'bounce-circuit';
  spikes: { x: number }[] = [];
  platforms: RunnerPlatform[] = [];
  orbs: RunnerOrb[] = [];
  private seed = 11;
  private rng = new SeededRandom(11);
  private distanceRun = 0;
  private nudge = 0;
  private y = 0;
  private vy = 0;
  private grounded = true;
  private coyote = 0;
  private buffer = 0;
  private orbsCollected = 0;
  private score = 0;
  private tick = 0;
  private gameOver = false;
  private generatedUntil = runnerGraceUnits;
  private lastChunkHadSpike = true;

  constructor(seed = 11) {
    this.restart(seed);
  }

  restart(seed = this.seed): BounceCircuitState {
    this.seed = seed;
    this.rng = new SeededRandom(seed);
    this.spikes = [];
    this.platforms = [];
    this.orbs = [];
    this.distanceRun = 0;
    this.nudge = 0;
    this.y = 0;
    this.vy = 0;
    this.grounded = true;
    this.coyote = 0;
    this.buffer = 0;
    this.orbsCollected = 0;
    this.score = 0;
    this.tick = 0;
    this.gameOver = false;
    this.generatedUntil = runnerGraceUnits;
    this.lastChunkHadSpike = true;
    return this.getState();
  }

  handleInput(input: SemanticInput): void {
    if (input === 'ACTION' && this.gameOver) {
      this.restart();
      return;
    }
    if (this.gameOver) return;
    if (input === 'LEFT') this.nudge = Math.max(-1.5, this.nudge - 0.3);
    if (input === 'RIGHT') this.nudge = Math.min(1.5, this.nudge + 0.3);
    if (input === 'UP' || input === 'ACTION') this.tryJump();
  }

  step(): BounceCircuitState {
    if (this.gameOver) return this.getState();
    this.tick += 1;
    this.distanceRun += this.currentSpeed();
    this.generateAhead();
    const playerX = this.distanceRun + 3 + this.nudge;

    if (this.grounded) {
      const support = this.supportHeightAt(playerX, this.y);
      if (support < this.y - 0.01) {
        this.grounded = false;
        this.coyote = runnerCoyoteSteps;
        this.vy = 0;
      } else {
        this.y = support;
      }
    }
    if (!this.grounded) {
      this.vy -= 0.5;
      const support = this.supportHeightAt(playerX, this.y);
      const nextY = Math.max(0, this.y + this.vy * 0.15);
      if (this.vy <= 0 && this.y >= support && nextY <= support) {
        this.land(support);
      } else {
        this.y = nextY;
        if (this.y === 0 && this.vy <= 0) this.land(0);
      }
      if (this.coyote > 0) this.coyote -= 1;
      if (this.buffer > 0) this.buffer -= 1;
    }

    if (this.y < 0.55) {
      for (const spike of this.spikes) {
        if (Math.abs(spike.x - playerX) < 0.45) {
          this.gameOver = true;
          this.score += Math.floor(this.distanceRun);
          break;
        }
      }
    }
    if (!this.gameOver) {
      const before = this.orbs.length;
      this.orbs = this.orbs.filter(
        (orb) => !(Math.abs(orb.x - playerX) < 0.55 && Math.abs(orb.y - this.y) < 0.75)
      );
      const collected = before - this.orbs.length;
      if (collected > 0) {
        this.orbsCollected += collected;
        this.score += collected * 25;
      }
      this.prunePassed();
    }
    return this.getState();
  }

  getState(): BounceCircuitState {
    return {
      score: this.score,
      isGameOver: this.gameOver,
      tick: this.tick,
      phase: this.gameOver ? 'game-over' : 'playing',
      cameraX: round2(this.distanceRun),
      playerX: round2(this.distanceRun + 3 + this.nudge),
      playerY: round2(this.y),
      velocityY: round2(this.vy),
      grounded: this.grounded,
      speed: round2(this.currentSpeed()),
      distance: Math.floor(this.distanceRun),
      orbsCollected: this.orbsCollected,
      spikes: this.spikes.map((spike) => ({ x: round2(spike.x) })),
      platforms: this.platforms.map((platform) => ({
        x: round2(platform.x),
        width: platform.width,
        height: platform.height
      })),
      orbs: this.orbs.map((orb) => ({ x: round2(orb.x), y: orb.y }))
    };
  }

  private currentSpeed(): number {
    return Math.min(runnerMaxSpeed, runnerBaseSpeed + this.distanceRun * 0.0004);
  }

  private tryJump(): void {
    if (this.grounded || this.coyote > 0) {
      this.jump();
    } else {
      this.buffer = runnerBufferSteps;
    }
  }

  private jump(): void {
    this.vy = runnerJumpVelocity;
    this.grounded = false;
    this.coyote = 0;
  }

  private land(height: number): void {
    this.y = height;
    this.vy = 0;
    this.grounded = true;
    this.coyote = 0;
    if (this.buffer > 0) {
      this.buffer = 0;
      this.jump();
    }
  }

  private supportHeightAt(x: number, fromY: number): number {
    let support = 0;
    for (const platform of this.platforms) {
      if (
        x >= platform.x - 0.3 &&
        x <= platform.x + platform.width + 0.3 &&
        fromY >= platform.height - 0.35 &&
        platform.height > support
      ) {
        support = platform.height;
      }
    }
    return support;
  }

  private generateAhead(): void {
    while (this.generatedUntil < this.distanceRun + 24) {
      this.generateChunk(this.generatedUntil);
      this.generatedUntil += runnerChunkUnits;
    }
  }

  private generateChunk(cx: number): void {
    let roll = this.rng.integer(5);
    if (!this.lastChunkHadSpike && roll > 1) roll = this.rng.integer(2);
    if (roll === 0) {
      this.spikes.push({ x: cx + 4 + this.rng.integer(8) });
    } else if (roll === 1) {
      const base = cx + 4 + this.rng.integer(7);
      this.spikes.push({ x: base }, { x: base + 1.1 });
    } else if (roll === 2) {
      const x = cx + 3 + this.rng.integer(5);
      const width = 2 + this.rng.integer(3);
      const height = 1.7 + this.rng.integer(3) * 0.4;
      this.platforms.push({ x, width, height });
      this.orbs.push({ x: x + width / 2, y: height + 0.8 });
    } else if (roll === 3) {
      const base = cx + 4 + this.rng.integer(6);
      const arc = [0.7, 1.6, 0.7];
      arc.forEach((y, i) => this.orbs.push({ x: base + i * 1.3, y }));
    } else {
      this.orbs.push({ x: cx + 6 + this.rng.integer(6), y: 0.6 });
    }
    this.lastChunkHadSpike = roll <= 1;
  }

  private prunePassed(): void {
    const cutoff = this.distanceRun - 4;
    this.spikes = this.spikes.filter((spike) => spike.x > cutoff);
    this.platforms = this.platforms.filter((platform) => platform.x + platform.width > cutoff);
    this.orbs = this.orbs.filter((orb) => orb.x > cutoff);
  }
}
