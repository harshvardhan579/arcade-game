import { type GameLogic, type GameSnapshot, type SemanticInput } from '../../core/types';

export interface BounceCircuitState extends GameSnapshot {
  playerX: number;
  playerY: number;
  velocityY: number;
  hasKey: boolean;
}

export class BounceCircuitLogic implements GameLogic<BounceCircuitState> {
  readonly id = 'bounce-circuit';
  private x = 1;
  private y = 0;
  private vy = 0;
  private hasKey = false;
  private score = 0;
  private tick = 0;
  private phase: BounceCircuitState['phase'] = 'playing';
  private leftHeld = false;
  private rightHeld = false;

  restart(): BounceCircuitState {
    this.x = 1;
    this.y = 0;
    this.vy = 0;
    this.hasKey = false;
    this.score = 0;
    this.tick = 0;
    this.phase = 'playing';
    this.leftHeld = false;
    this.rightHeld = false;
    return this.getState();
  }

  handleInput(input: SemanticInput): void {
    if (input === 'ACTION' && this.phase !== 'playing') {
      this.restart();
      return;
    }
    if (input === 'LEFT') this.leftHeld = true;
    if (input === 'RIGHT') this.rightHeld = true;
    if ((input === 'UP' || input === 'ACTION') && this.y === 0) this.vy = 4.8;
  }

  step(): BounceCircuitState {
    if (this.phase !== 'playing') return this.getState();
    this.tick += 1;
    if (this.leftHeld) this.x -= 0.35;
    if (this.rightHeld) this.x += 0.35;
    this.leftHeld = false;
    this.rightHeld = false;
    this.x = Math.max(0, Math.min(9, this.x));
    this.vy -= 0.45;
    this.y = Math.max(0, this.y + this.vy * 0.15);
    if (this.y === 0 && this.vy < 0) this.vy = 0;
    if (Math.abs(this.x - 4) < 0.45 && this.y < 0.55) this.phase = 'game-over';
    if (Math.abs(this.x - 6) < 0.5 && this.y < 1) {
      this.hasKey = true;
      this.score = Math.max(this.score, 25);
    }
    if (this.x > 8.25 && this.y < 1 && this.hasKey) {
      this.phase = 'won';
      this.score += 75;
    }
    return this.getState();
  }

  getState(): BounceCircuitState {
    return {
      score: this.score,
      isGameOver: this.phase === 'game-over',
      tick: this.tick,
      phase: this.phase,
      playerX: Number(this.x.toFixed(2)),
      playerY: Number(this.y.toFixed(2)),
      velocityY: Number(this.vy.toFixed(2)),
      hasKey: this.hasKey
    };
  }
}
