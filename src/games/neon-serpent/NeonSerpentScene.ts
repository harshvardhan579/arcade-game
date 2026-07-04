import { BaseGameScene } from '../BaseGameScene';
import { NeonSerpentLogic, type NeonSerpentState } from './NeonSerpentLogic';

export class NeonSerpentScene extends BaseGameScene<NeonSerpentState> {
  protected logic = new NeonSerpentLogic(7);

  constructor() {
    super('neon-serpent');
  }

  protected draw(state: NeonSerpentState, width: number, height: number): void {
    const cell = Math.min(width / this.logic.width, height / this.logic.height);
    const ox = (width - this.logic.width * cell) / 2;
    const oy = (height - this.logic.height * cell) / 2 + 8;
    this.graphics.lineStyle(1, 0x12353c, 0.65);
    for (let x = 0; x <= this.logic.width; x += 1) {
      this.graphics.lineBetween(ox + x * cell, oy, ox + x * cell, oy + this.logic.height * cell);
    }
    for (let y = 0; y <= this.logic.height; y += 1) {
      this.graphics.lineBetween(ox, oy + y * cell, ox + this.logic.width * cell, oy + y * cell);
    }
    this.graphics.fillStyle(0xff4fd8, 1);
    this.graphics.fillCircle(
      ox + (state.foodX + 0.5) * cell,
      oy + (state.foodY + 0.5) * cell,
      cell * 0.32
    );
    this.graphics.fillStyle(0xff7557, 1);
    for (const obstacle of this.logic.obstacles) {
      this.graphics.fillRect(
        ox + obstacle.x * cell + 3,
        oy + obstacle.y * cell + 3,
        cell - 6,
        cell - 6
      );
    }
    this.graphics.fillStyle(0x4dffe1, 1);
    this.logic.snake.forEach((part, index) => {
      const inset = index === 0 ? 2 : 4;
      this.graphics.fillRoundedRect(
        ox + part.x * cell + inset,
        oy + part.y * cell + inset,
        cell - inset * 2,
        cell - inset * 2,
        5
      );
    });
    if (!this.reducedMotion) {
      this.graphics.lineStyle(3, 0x4dffe1, 0.18);
      this.graphics.strokeRect(
        ox - 6,
        oy - 6,
        this.logic.width * cell + 12,
        this.logic.height * cell + 12
      );
    }
    this.hud.setText(
      `Score ${state.score}  Length ${state.snakeLength}  x${state.multiplier}${state.isGameOver ? '  GAME OVER - Space' : ''}`
    );
  }
}
