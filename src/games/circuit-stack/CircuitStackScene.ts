import type Phaser from 'phaser';
import { BaseGameScene } from '../BaseGameScene';
import { createSparkEmitter, deathFeedback, smallShake } from '../effects';
import { CircuitStackLogic, circuitPieces, type CircuitStackState } from './CircuitStackLogic';

export class CircuitStackScene extends BaseGameScene<CircuitStackState> {
  protected logic = new CircuitStackLogic();
  protected stepMs = 30;
  private sparks?: Phaser.GameObjects.Particles.ParticleEmitter;
  private lastScore = 0;
  private lastOccupied = 0;
  private lastGameOver = false;
  private lastTick = 0;
  private lastPieceCells: ReadonlyArray<{ readonly x: number; readonly y: number }> = [];

  constructor() {
    super('circuit-stack');
  }

  create(): void {
    super.create();
    this.sparks = createSparkEmitter(this, [0x4dffe1, 0xff4fd8]);
    const state = this.logic.getState();
    this.lastScore = state.score;
    this.lastOccupied = state.occupied;
    this.lastGameOver = state.isGameOver;
    this.lastTick = state.tick;
    this.lastPieceCells = state.pieceCells;
  }

  protected draw(state: CircuitStackState, width: number, height: number): void {
    const cell = Math.min(width / 9, height / 16);
    const ox = (width - this.logic.width * cell) / 2;
    const oy = height - this.logic.height * cell - 28;
    this.reactToTransitions(state, cell, ox, oy);
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
    this.drawNextPreview(state, width);
  }

  private drawNextPreview(state: CircuitStackState, width: number): void {
    const shape = circuitPieces[state.nextPiece];
    if (!shape) return;
    const size = 11;
    const px = width - 64;
    const py = 18;
    const xs = shape.map((offset) => offset.x);
    const ys = shape.map((offset) => offset.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const cols = Math.max(...xs) - minX + 1;
    const rows = Math.max(...ys) - minY + 1;
    this.graphics.lineStyle(1, 0x31545a, 0.9);
    this.graphics.strokeRect(
      px + minX * size - 5,
      py + minY * size - 5,
      cols * size + 8,
      rows * size + 8
    );
    this.graphics.fillStyle(0xff4fd8, 0.9);
    for (const offset of shape) {
      this.graphics.fillRect(px + offset.x * size, py + offset.y * size, size - 2, size - 2);
    }
  }

  private reactToTransitions(state: CircuitStackState, cell: number, ox: number, oy: number): void {
    const restarted = state.tick < this.lastTick;
    if (!restarted && !this.reducedMotion) {
      if (state.score > this.lastScore && !state.isGameOver) {
        const rowY = this.lastPieceCells[0]?.y ?? 0;
        this.sparks?.explode(26, ox + (this.logic.width / 2) * cell, oy + rowY * cell);
        smallShake(this);
      } else if (state.occupied > this.lastOccupied) {
        for (const block of this.lastPieceCells) {
          if (block.y >= 0)
            this.sparks?.explode(3, ox + (block.x + 0.5) * cell, oy + (block.y + 0.5) * cell);
        }
        smallShake(this);
      }
      if (state.isGameOver && !this.lastGameOver) {
        deathFeedback(this);
      }
    }
    this.lastScore = state.score;
    this.lastOccupied = state.occupied;
    this.lastGameOver = state.isGameOver;
    this.lastTick = state.tick;
    this.lastPieceCells = state.pieceCells;
  }
}
