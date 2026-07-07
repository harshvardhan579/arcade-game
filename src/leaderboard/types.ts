// Shared leaderboard contracts, importable from the browser client and the
// future api/ function alike. Pure data and guards: no DOM, no fetch, no
// storage, no Phaser (import-boundary safe by construction).

// The single allowlist every layer derives from (client, API, SQL CHECK).
// Must stay in sync with the registry ids in src/main.ts.
export const GAME_IDS = [
  'neon-serpent',
  'bounce-circuit',
  'star-courier',
  'lane-rush',
  'circuit-stack'
] as const;

export type GameId = (typeof GAME_IDS)[number];

export function isGameId(value: unknown): value is GameId {
  return typeof value === 'string' && (GAME_IDS as readonly string[]).includes(value);
}

// Full error-code union decided in Phase 0 (see NEXT_RUN.md for the
// code-to-status table the API will use).
export type LeaderboardErrorCode =
  | 'invalid_body'
  | 'invalid_game'
  | 'invalid_limit'
  | 'name_length'
  | 'name_charset'
  | 'name_not_allowed'
  | 'invalid_score'
  | 'invalid_tick'
  | 'invalid_seed'
  | 'implausible_score'
  | 'forbidden_origin'
  | 'method_not_allowed'
  | 'body_too_large'
  | 'unsupported_media_type'
  | 'rate_limited'
  | 'upstream_error';

export interface SubmitRequest {
  gameId: GameId;
  name: string;
  score: number;
  tick: number;
  runSeed: number;
}

export interface SubmitResponse {
  accepted: true;
  improved: boolean;
  best: number;
  rank: number;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  createdAt: string;
}

export interface TopResponse {
  game: GameId;
  entries: LeaderboardEntry[];
}

export interface TopEntry {
  name: string;
  score: number;
}

export type TopsByGame = Record<GameId, TopEntry | null>;

export interface TopsResponse {
  tops: TopsByGame;
}

export interface LeaderboardErrorResponse {
  error: { code: LeaderboardErrorCode };
}
