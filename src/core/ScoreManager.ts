import { SafeStorage } from './Storage';

export class ScoreManager {
  private readonly storage = new SafeStorage();
  private score = 0;
  private streak = 0;

  constructor(private readonly gameId: string) {}

  add(points: number): number {
    this.streak += 1;
    this.score += points * this.multiplier;
    this.saveHighScore();
    return this.score;
  }

  reset(): void {
    this.score = 0;
    this.streak = 0;
  }

  breakStreak(): void {
    this.streak = 0;
  }

  get current(): number {
    return this.score;
  }

  get multiplier(): number {
    return Math.max(1, Math.min(8, Math.floor(this.streak / 3) + 1));
  }

  get highScore(): number {
    return this.storage.getNumber(`pocket-arcade:${this.gameId}:high`, 0);
  }

  private saveHighScore(): void {
    if (this.score > this.highScore) {
      this.storage.setNumber(`pocket-arcade:${this.gameId}:high`, this.score);
    }
  }
}
