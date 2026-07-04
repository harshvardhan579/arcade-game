import { BaseGameScene } from '../BaseGameScene';
import { StarCourierLogic, type StarCourierState } from './StarCourierLogic';

export class StarCourierScene extends BaseGameScene<StarCourierState> {
  protected logic = new StarCourierLogic();
  protected stepMs = 48;

  constructor() {
    super('star-courier');
  }

  protected draw(state: StarCourierState, width: number, height: number): void {
    const lane = width / 11;
    if (!this.reducedMotion) {
      this.graphics.lineStyle(1, 0x1d4650, 0.5);
      for (let i = 0; i < 24; i += 1)
        this.graphics.lineBetween((i * 37) % width, 64, (i * 59) % width, height);
    }
    this.graphics.fillStyle(0x4dffe1, 1);
    this.graphics.fillTriangle(
      state.playerX * lane,
      height - 80,
      state.playerX * lane - 22,
      height - 36,
      state.playerX * lane + 22,
      height - 36
    );
    this.graphics.fillStyle(0xff4fd8, 1);
    for (let i = 0; i < state.activeProjectiles; i += 1)
      this.graphics.fillRect(24 + i * 18, height / 2, 5, 18);
    this.graphics.fillStyle(0xff7557, 1);
    for (let i = 0; i < state.activeEnemies; i += 1)
      this.graphics.fillCircle(35 + i * 30, 120 + (i % 4) * 40, 13);
    this.hud.setText(`Score ${state.score}  Wave ${state.wave}  Pool ${state.poolSize}`);
  }
}
