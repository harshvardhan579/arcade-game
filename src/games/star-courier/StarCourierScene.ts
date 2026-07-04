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
    const toX = (x: number) => (x + 0.5) * lane;
    const unitY = (height - 116) / 11.5;
    const toY = (y: number) => 44 + y * unitY;
    if (!this.reducedMotion) {
      this.graphics.lineStyle(1, 0x1d4650, 0.5);
      for (let i = 0; i < 24; i += 1)
        this.graphics.lineBetween((i * 37) % width, 64, (i * 59) % width, height);
    }
    const shipX = toX(state.playerX);
    const shipY = toY(11.5);
    this.graphics.fillStyle(0x4dffe1, 1);
    this.graphics.fillTriangle(shipX, shipY - 44, shipX - 22, shipY, shipX + 22, shipY);
    this.graphics.fillStyle(0xff4fd8, 1);
    for (const projectile of state.projectiles)
      this.graphics.fillRect(toX(projectile.x) - 2.5, toY(projectile.y) - 9, 5, 18);
    this.graphics.fillStyle(0xff7557, 1);
    for (const enemy of state.enemies) this.graphics.fillCircle(toX(enemy.x), toY(enemy.y), 13);
    this.hud.setText(`Score ${state.score}  Wave ${state.wave}  Pool ${state.poolSize}`);
  }
}
