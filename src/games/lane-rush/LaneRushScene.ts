import { BaseGameScene } from '../BaseGameScene';
import { LaneRushLogic, type LaneRushState } from './LaneRushLogic';

export class LaneRushScene extends BaseGameScene<LaneRushState> {
  protected logic = new LaneRushLogic();
  protected stepMs = 42;

  constructor() {
    super('lane-rush');
  }

  protected draw(state: LaneRushState, width: number, height: number): void {
    const laneWidth = width / 3;
    this.graphics.fillStyle(0x0d252b, 1);
    this.graphics.fillRect(0, 0, width, height);
    this.graphics.lineStyle(3, 0x4dffe1, 0.35);
    this.graphics.lineBetween(laneWidth, 0, laneWidth, height);
    this.graphics.lineBetween(laneWidth * 2, 0, laneWidth * 2, height);
    const laneX = (lane: number) => (lane + 0.5) * laneWidth;
    const unitY = (height - 66) / 9.6;
    const toY = (y: number) => y * unitY;
    this.graphics.fillStyle(0x4dffe1, 1);
    this.graphics.fillRoundedRect(laneX(state.lane) - 26, height - 105, 52, 78, 8);
    this.graphics.fillStyle(0xff7557, 1);
    for (const car of state.traffic) {
      this.graphics.fillRoundedRect(laneX(car.lane) - 24, toY(car.y) - 35, 48, 70, 8);
    }
    this.hud.setText(`Score ${state.score}  Speed ${state.speed}`);
  }
}
