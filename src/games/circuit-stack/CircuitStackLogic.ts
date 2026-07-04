import {
  SeededRandom,
  type GameLogic,
  type GameSnapshot,
  type Point,
  type SemanticInput
} from '../../core/types';

type Piece = Point[];

const pieces: Piece[] = [
  [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 1 }
  ],
  [
    { x: -1, y: 0 },
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 0, y: 1 }
  ],
  [
    { x: -1, y: 0 },
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 }
  ]
];

export interface CircuitStackState extends GameSnapshot {
  occupied: number;
  pieceX: number;
  pieceY: number;
  nextPiece: number;
}

export class CircuitStackLogic implements GameLogic<CircuitStackState> {
  readonly id = 'circuit-stack';
  readonly width = 8;
  readonly height = 14;
  grid: number[][] = [];
  private rng = new SeededRandom(14);
  private piece: Piece = pieces[0] as Piece;
  private next = 1;
  private x = 4;
  private y = 0;
  private score = 0;
  private tick = 0;
  private gameOver = false;

  constructor(seed = 14) {
    this.restart(seed);
  }

  restart(seed = 14): CircuitStackState {
    this.rng = new SeededRandom(seed);
    this.grid = Array.from({ length: this.height }, () =>
      Array.from({ length: this.width }, () => 0)
    );
    this.next = this.rng.integer(pieces.length);
    this.score = 0;
    this.tick = 0;
    this.gameOver = false;
    this.spawnPiece();
    return this.getState();
  }

  handleInput(input: SemanticInput): void {
    if (input === 'ACTION' && this.gameOver) {
      this.restart();
      return;
    }
    if (input === 'LEFT') this.tryMove(-1, 0);
    if (input === 'RIGHT') this.tryMove(1, 0);
    if (input === 'DOWN') this.tryMove(0, 1);
    if (input === 'UP' || input === 'ACTION') this.rotate();
  }

  step(): CircuitStackState {
    if (this.gameOver) return this.getState();
    this.tick += 1;
    if (this.tick % 24 === 0 && !this.tryMove(0, 1)) this.lockPiece();
    return this.getState();
  }

  lockForTest(): CircuitStackState {
    this.lockPiece();
    return this.getState();
  }

  getState(): CircuitStackState {
    return {
      score: this.score,
      isGameOver: this.gameOver,
      tick: this.tick,
      phase: this.gameOver ? 'game-over' : 'playing',
      occupied: this.grid.flat().filter(Boolean).length,
      pieceX: this.x,
      pieceY: this.y,
      nextPiece: this.next
    };
  }

  private spawnPiece(): void {
    this.piece = (pieces[this.next] as Piece).map((p) => ({ ...p }));
    this.next = this.rng.integer(pieces.length);
    this.x = 4;
    this.y = 0;
    if (this.collides(this.piece, this.x, this.y)) this.gameOver = true;
  }

  private tryMove(dx: number, dy: number): boolean {
    if (this.collides(this.piece, this.x + dx, this.y + dy)) return false;
    this.x += dx;
    this.y += dy;
    return true;
  }

  private rotate(): void {
    const rotated = this.piece.map((p) => ({ x: -p.y, y: p.x }));
    for (const kick of [0, -1, 1]) {
      if (!this.collides(rotated, this.x + kick, this.y)) {
        this.piece = rotated;
        this.x += kick;
        return;
      }
    }
  }

  private lockPiece(): void {
    for (const cell of this.piece) {
      const x = this.x + cell.x;
      const y = this.y + cell.y;
      if (y >= 0 && y < this.height && x >= 0 && x < this.width) this.grid[y][x] = 1;
    }
    const before = this.grid.length;
    this.grid = this.grid.filter((row) => row.some((cell) => cell === 0));
    const cleared = before - this.grid.length;
    while (this.grid.length < this.height) {
      this.grid.unshift(Array.from({ length: this.width }, () => 0));
    }
    if (cleared > 0) this.score += [0, 100, 250, 450, 700][cleared] ?? cleared * 180;
    this.spawnPiece();
  }

  private collides(piece: Piece, px: number, py: number): boolean {
    return piece.some((cell) => {
      const x = px + cell.x;
      const y = py + cell.y;
      return x < 0 || x >= this.width || y >= this.height || (y >= 0 && this.grid[y][x] === 1);
    });
  }
}
