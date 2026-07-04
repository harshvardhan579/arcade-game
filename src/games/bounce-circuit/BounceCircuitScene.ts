import { BaseGameScene } from '../BaseGameScene';
import { BounceCircuitLogic, type BounceCircuitState } from './BounceCircuitLogic';

export class BounceCircuitScene extends BaseGameScene<BounceCircuitState> {
  protected logic = new BounceCircuitLogic();

  constructor() {
    super('bounce-circuit');
  }

  protected draw(state: BounceCircuitState, width: number, height: number): void {
    const sx = width / 10;
    const ground = height - 72;
    this.graphics.fillStyle(0x12353c, 1);
    this.graphics.fillRect(0, ground, width, 8);
    this.graphics.fillStyle(0xff7557, 1);
    this.graphics.fillTriangle(4 * sx - 18, ground, 4 * sx, ground - 32, 4 * sx + 18, ground);
    this.graphics.fillStyle(state.hasKey ? 0x31545a : 0xffd166, 1);
    this.graphics.fillCircle(6 * sx, ground - 44, 13);
    this.graphics.fillStyle(state.hasKey ? 0x4dffe1 : 0x31545a, 1);
    this.graphics.fillRect(8.4 * sx, ground - 72, 42, 72);
    this.graphics.fillStyle(0x4dffe1, 1);
    this.graphics.fillRoundedRect(
      state.playerX * sx - 16,
      ground - state.playerY * 34 - 34,
      32,
      32,
      6
    );
  }
}
