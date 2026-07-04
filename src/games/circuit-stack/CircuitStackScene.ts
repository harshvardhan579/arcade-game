import { BaseGameScene } from '../BaseGameScene';
import { CircuitStackLogic, type CircuitStackState } from './CircuitStackLogic';

export class CircuitStackScene extends BaseGameScene<CircuitStackState> {
  protected logic = new CircuitStackLogic();
  protected stepMs = 30;

  constructor() {
    super('circuit-stack');
  }

  protected draw(state: CircuitStackState, width: number, height: number): void {
    const cell = Math.min(width / 9, height / 16);
    const ox = (width - this.logic.width * cell) / 2;
    const oy = height - this.logic.height * cell - 28;
    this.graphics.lineStyle(1, 0x31545a, 0.8);
    for (let y = 0; y < this.logic.height; y += 1) {
      for (let x = 0; x < this.logic.width; x += 1) {
        this.graphics.strokeRect(ox + x * cell, oy + y * cell, cell, cell);
        if (this.logic.grid[y][x]) {
          this.graphics.fillStyle(0x4dffe1, 1);
          this.graphics.fillRect(ox + x * cell + 2, oy + y * cell + 2, cell - 4, cell - 4);
        }
      }
    }
    this.graphics.fillStyle(0xff4fd8, 1);
    for (const block of state.pieceCells) {
      if (block.y >= 0) {
        this.graphics.fillRect(
          ox + block.x * cell + 2,
          oy + block.y * cell + 2,
          cell - 4,
          cell - 4
        );
      }
    }
    this.hud.setText(`Score ${state.score}  Cells ${state.occupied}  Next ${state.nextPiece}`);
  }
}
