// Client leaderboard service (plan §5). Module singleton like audioEngine.
// Talks to the same-origin /api/leaderboard function only — no Supabase URL
// or key of any kind exists in client code. Feature-flagged off by default:
// without VITE_LEADERBOARD_ENABLED=1 (a Vercel-only build var) or the
// test-only runtime override, every method resolves { ok: false, reason:
// 'disabled' } without touching the network. Methods never throw and never
// log — every outcome is a typed result the UI can render quietly.

import type {
  GameId,
  LeaderboardErrorCode,
  SubmitRequest,
  SubmitResponse,
  TopResponse,
  TopsByGame
} from '../leaderboard/types';
import { GAME_IDS, isGameId } from '../leaderboard/types';

declare global {
  interface Window {
    // Test-only override (Playwright addInitScript), mirroring the
    // __ARCADE_FIXED_SEEDS__ pattern. Never set by app code.
    __ARCADE_LB_FORCE__?: boolean;
  }
}

export interface LeaderboardFailure {
  ok: false;
  reason: 'disabled' | 'offline' | 'http' | 'invalid';
  // Set for 'http' failures so the UI can distinguish 429 from the rest.
  status?: number;
  code?: LeaderboardErrorCode;
}

export type LeaderboardResult<T> = { ok: true; data: T } | LeaderboardFailure;

export interface LeaderboardService {
  isEnabled(): boolean;
  fetchTop(gameId: GameId, limit?: number): Promise<LeaderboardResult<TopResponse>>;
  fetchTops(): Promise<LeaderboardResult<TopsByGame>>;
  submit(entry: SubmitRequest): Promise<LeaderboardResult<SubmitResponse>>;
}

export interface LeaderboardServiceDeps {
  isEnabled(): boolean;
  fetchFn: typeof fetch;
  // Overridable so unit tests exercise the timeout in milliseconds, not five
  // real seconds.
  timeoutMs?: number;
}

const REQUEST_TIMEOUT_MS = 5000;
// Same-origin by construction: a rooted path, never an absolute URL.
const API_PATH = '/api/leaderboard';
const DEFAULT_LIMIT = 10;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseTop(body: unknown): TopResponse | null {
  if (!isRecord(body) || !isGameId(body.game) || !Array.isArray(body.entries)) {
    return null;
  }
  const entries = [];
  for (const raw of body.entries) {
    if (
      !isRecord(raw) ||
      typeof raw.rank !== 'number' ||
      typeof raw.name !== 'string' ||
      typeof raw.score !== 'number' ||
      typeof raw.createdAt !== 'string'
    ) {
      return null;
    }
    entries.push({ rank: raw.rank, name: raw.name, score: raw.score, createdAt: raw.createdAt });
  }
  return { game: body.game, entries };
}

function parseTops(body: unknown): TopsByGame | null {
  if (!isRecord(body) || !isRecord(body.tops)) {
    return null;
  }
  const tops = {} as Record<GameId, { name: string; score: number } | null>;
  for (const id of GAME_IDS) {
    const raw = body.tops[id];
    if (raw === null || raw === undefined) {
      tops[id] = null;
    } else if (isRecord(raw) && typeof raw.name === 'string' && typeof raw.score === 'number') {
      tops[id] = { name: raw.name, score: raw.score };
    } else {
      return null;
    }
  }
  return tops;
}

function parseSubmit(body: unknown): SubmitResponse | null {
  if (
    !isRecord(body) ||
    body.accepted !== true ||
    typeof body.improved !== 'boolean' ||
    typeof body.best !== 'number' ||
    typeof body.rank !== 'number'
  ) {
    return null;
  }
  return { accepted: true, improved: body.improved, best: body.best, rank: body.rank };
}

async function readErrorCode(response: Response): Promise<LeaderboardErrorCode | undefined> {
  try {
    const body: unknown = await response.json();
    if (isRecord(body) && isRecord(body.error) && typeof body.error.code === 'string') {
      return body.error.code as LeaderboardErrorCode;
    }
  } catch {
    // Non-JSON error bodies carry no code; the status alone is the signal.
  }
  return undefined;
}

export function createLeaderboardService(deps: LeaderboardServiceDeps): LeaderboardService {
  const timeoutMs = deps.timeoutMs ?? REQUEST_TIMEOUT_MS;

  async function request<T>(
    path: string,
    init: RequestInit | undefined,
    parse: (body: unknown) => T | null
  ): Promise<LeaderboardResult<T>> {
    if (!deps.isEnabled()) {
      return { ok: false, reason: 'disabled' };
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      let response: Response;
      try {
        response = await deps.fetchFn(path, { ...init, signal: controller.signal });
      } catch {
        // Timeout abort, DNS failure, connection refused — all offline-like.
        return { ok: false, reason: 'offline' };
      }
      if (!response.ok) {
        return {
          ok: false,
          reason: 'http',
          status: response.status,
          code: await readErrorCode(response)
        };
      }
      let body: unknown;
      try {
        body = await response.json();
      } catch {
        return { ok: false, reason: controller.signal.aborted ? 'offline' : 'invalid' };
      }
      const data = parse(body);
      if (data === null) {
        return { ok: false, reason: 'invalid' };
      }
      return { ok: true, data };
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    isEnabled: () => deps.isEnabled(),
    fetchTop(gameId, limit = DEFAULT_LIMIT) {
      return request(`${API_PATH}?game=${gameId}&limit=${limit}`, undefined, parseTop);
    },
    fetchTops() {
      return request(`${API_PATH}?game=all`, undefined, parseTops);
    },
    submit(entry) {
      return request(
        API_PATH,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry)
        },
        parseSubmit
      );
    }
  };
}

function flagEnabled(): boolean {
  if (import.meta.env.VITE_LEADERBOARD_ENABLED === '1') {
    return true;
  }
  return typeof window !== 'undefined' && window.__ARCADE_LB_FORCE__ === true;
}

export const leaderboardService: LeaderboardService = createLeaderboardService({
  isEnabled: flagEnabled,
  // Arrow wrapper: calling an unbound fetch reference throws in browsers.
  fetchFn: (input, init) => fetch(input, init)
});
