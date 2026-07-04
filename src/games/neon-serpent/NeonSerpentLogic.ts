import {
  SeededRandom,
  type GameLogic,
  type GameSnapshot,
  type Point,
  type SemanticInput
} from '../../core/types';

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export interface NeonSerpentState extends GameSnapshot {
  snakeLength: number;
  headX: number;
  headY: number;
  foodX: number;
  foodY: number;
  obstacleCount: number;
  multiplier: number;
  speedMs: number;
}

const opposite: Record<Direction, Direction> = {
  UP: 'DOWN',
  DOWN: 'UP',
  LEFT: 'RIGHT',
  RIGHT: 'LEFT'
};

const vectors: Record<Direction, Point> = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 }
};

export class NeonSerpentLogic implements GameLogic<NeonSerpentState> {
  readonly id = 'neon-serpent';
  readonly width = 18;
  readonly height = 24;
  snake: Point[] = [];
  obstacles: Point[] = [];
  food: Point = { x: 10, y: 12 };
  private direction: Direction = 'RIGHT';
  private queuedDirection: Direction = 'RIGHT';
  private rng = new SeededRandom(7);
  private score = 0;
  private multiplier = 1;
  private comboTimer = 0;
  private gameOver = false;
  private tick = 0;
  private foodsEaten = 0;
  private speedMs = 145;

  constructor(seed = 7) {
    this.restart(seed);
  }

  restart(seed = 7): NeonSerpentState {
    this.rng = new SeededRandom(seed);
    this.snake = [
      { x: 7, y: 12 },
      { x: 6, y: 12 },
      { x: 5, y: 12 }
    ];
    this.obstacles = [
      { x: 4, y: 6 },
      { x: 13, y: 17 }
    ];
    this.direction = 'RIGHT';
    this.queuedDirection = 'RIGHT';
    this.score = 0;
    this.multiplier = 1;
    this.comboTimer = 0;
    this.gameOver = false;
    this.tick = 0;
    this.foodsEaten = 0;
    this.speedMs = 145;
    this.food = this.spawnFood();
    return this.getState();
  }

  handleInput(input: SemanticInput): void {
    if (input === 'ACTION' && this.gameOver) {
      this.restart();
      return;
    }
    if (!this.isDirection(input)) return;
    if (opposite[input] === this.direction) return;
    this.queuedDirection = input;
  }

  step(): NeonSerpentState {
    if (this.gameOver) return this.getState();
    this.tick += 1;
    this.comboTimer = Math.max(0, this.comboTimer - 1);
    if (this.comboTimer === 0) this.multiplier = 1;
    this.direction = this.queuedDirection;

    const head = this.snake[0] as Point;
    const vector = vectors[this.direction];
    const next = {
      x: (head.x + vector.x + this.width) % this.width,
      y: (head.y + vector.y + this.height) % this.height
    };

    const willEat = this.same(next, this.food);
    const bodyToCheck = willEat ? this.snake : this.snake.slice(0, -1);
    if (
      bodyToCheck.some((part) => this.same(part, next)) ||
      this.obstacles.some((part) => this.same(part, next))
    ) {
      this.gameOver = true;
      return this.getState();
    }

    this.snake.unshift(next);
    if (willEat) {
      this.foodsEaten += 1;
      this.score += 10 * this.multiplier;
      this.multiplier = Math.min(8, this.multiplier + 1);
      this.comboTimer = 8;
      this.speedMs = Math.max(68, 145 - this.foodsEaten * 5);
      if (this.foodsEaten % 3 === 0) this.addObstacle();
      this.food = this.spawnFood();
    } else {
      this.snake.pop();
    }

    return this.getState();
  }

  getState(): NeonSerpentState {
    const head = this.snake[0] ?? { x: 0, y: 0 };
    return {
      score: this.score,
      isGameOver: this.gameOver,
      tick: this.tick,
      phase: this.gameOver ? 'game-over' : 'playing',
      snakeLength: this.snake.length,
      headX: head.x,
      headY: head.y,
      foodX: this.food.x,
      foodY: this.food.y,
      obstacleCount: this.obstacles.length,
      multiplier: this.multiplier,
      speedMs: this.speedMs
    };
  }

  private spawnFood(): Point {
    const occupied = new Set([...this.snake, ...this.obstacles].map((p) => `${p.x},${p.y}`));
    const candidates: Point[] = [];
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        if (!occupied.has(`${x},${y}`)) candidates.push({ x, y });
      }
    }
    return this.rng.choice(candidates);
  }

  private addObstacle(): void {
    const obstacle = this.spawnFood();
    this.obstacles.push(obstacle);
  }

  private same(a: Point, b: Point): boolean {
    return a.x === b.x && a.y === b.y;
  }

  private isDirection(input: SemanticInput): input is Direction {
    return input === 'UP' || input === 'DOWN' || input === 'LEFT' || input === 'RIGHT';
  }
}
