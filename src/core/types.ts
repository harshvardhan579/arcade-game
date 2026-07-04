export type SemanticInput = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'ACTION' | 'PAUSE';

export type GamePhase = 'ready' | 'playing' | 'won' | 'game-over';

export type SnapshotValue =
  | number
  | string
  | boolean
  | undefined
  | readonly SnapshotValue[]
  | { readonly [key: string]: SnapshotValue };

export interface GameSnapshot {
  score: number;
  isGameOver: boolean;
  tick: number;
  phase?: GamePhase;
  [key: string]: SnapshotValue;
}

export interface GameLogic<TState extends GameSnapshot = GameSnapshot> {
  readonly id: string;
  getState(): TState;
  handleInput(input: SemanticInput): void;
  step(deltaMs?: number): TState;
  restart(seed?: number): TState;
}

export interface Point {
  x: number;
  y: number;
}

export interface GameDefinition {
  id: string;
  title: string;
  subtitle: string;
  controls: string;
  sceneKey: string;
  aspectRatio: number;
  orientation: 'portrait' | 'landscape' | 'square';
}

export class SeededRandom {
  private state: number;

  constructor(seed = 1) {
    this.state = seed >>> 0 || 1;
  }

  next(): number {
    this.state = (this.state * 1664525 + 1013904223) >>> 0;
    return this.state / 0x100000000;
  }

  integer(maxExclusive: number): number {
    return Math.floor(this.next() * maxExclusive);
  }

  choice<T>(items: readonly T[]): T {
    return items[this.integer(items.length)] as T;
  }
}
