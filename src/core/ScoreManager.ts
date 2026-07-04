import { SafeStorage } from './Storage';

export class ScoreManager {
  private readonly storage = new SafeStorage();
  private readonly key: string;
  private cachedHigh: number;

  constructor(gameId: string) {
    this.key = `pocket-arcade:${gameId}:high`;
    this.cachedHigh = this.storage.getNumber(this.key, 0);
  }

  record(score: number): void {
    if (score > this.cachedHigh) {
      this.cachedHigh = score;
      this.storage.setNumber(this.key, score);
    }
  }

  get highScore(): number {
    return this.cachedHigh;
  }
}
