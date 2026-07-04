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
    this.graphics.fillStyle(0x4dffe1, 1);
    this.graphics.fillRoundedRect(
      state.lane * laneWidth + laneWidth / 2 - 26,
      height - 105,
      52,
      78,
      8
    );
    this.graphics.fillStyle(0xff7557, 1);
    for (let i = 0; i < state.trafficCount; i += 1) {
      this.graphics.fillRoundedRect(((i % 3) + 0.5) * laneWidth - 24, 120 + i * 86, 48, 70, 8);
    }
    this.hud.setText(`Score ${state.score}  Speed ${state.speed}`);
  }
}
