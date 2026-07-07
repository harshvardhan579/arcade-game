// Testable core of the /api/leaderboard function (plan §4). The Vercel
// adapter in api/leaderboard.ts is glue only: it translates the platform
// request into a CoreRequest, injects the real PostgREST transport, and
// writes the CoreResponse back. Everything decision-shaped lives here, pure
// and Node-safe, so Vitest covers every status code without a network.

import { validateName } from './names.js';
import { isPlausibleScore, isValidRunSeed, isValidScore, isValidTick } from './plausibility.js';
import type { GameId, LeaderboardErrorCode, TopsByGame } from './types.js';
import { GAME_IDS, isGameId } from './types.js';

export interface TransportTopRow {
  name: string;
  score: number;
  createdAt: string;
}

export interface TransportTopsRow {
  gameId: string;
  name: string;
  score: number;
}

export interface SubmitArgs {
  gameId: GameId;
  name: string;
  nameKey: string;
  score: number;
  tick: number;
  runSeed: number;
  ipHash: string;
}

// Mirrors the submit_score RPC's jsonb result (plan §2).
export interface SubmitOutcome {
  accepted: boolean;
  reason?: string;
  improved?: boolean;
  best?: number;
  rank?: number;
}

export interface LeaderboardTransport {
  fetchTop(gameId: GameId, limit: number): Promise<TransportTopRow[]>;
  fetchTops(): Promise<TransportTopsRow[]>;
  submitScore(args: SubmitArgs): Promise<SubmitOutcome>;
}

export interface CoreRequest {
  method: string;
  // Raw Origin and Host headers; null when absent.
  origin: string | null;
  host: string | null;
  contentType: string | null;
  contentLength: number | null;
  // Body already parsed from JSON by the platform; the adapter flags a parse
  // failure instead of throwing so the core owns the error mapping.
  body: unknown;
  bodyIsInvalidJson: boolean;
  query: Record<string, string | string[] | undefined>;
  ipHash: string;
}

export interface CoreResponse {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
}

// The Vercel CDN absorbs read traffic (Phase 0 decision).
export const GET_CACHE_CONTROL = 'public, s-maxage=30, stale-while-revalidate=120';

export const BODY_MAX_BYTES = 1024;
const LIMIT_DEFAULT = 10;
const LIMIT_MIN = 1;
const LIMIT_MAX = 50;

function errorResponse(status: number, code: LeaderboardErrorCode): CoreResponse {
  return { status, body: { error: { code } } };
}

// Same-origin policy: browsers send Origin on cross-origin requests (and on
// same-origin POSTs). Absent Origin passes; present Origin must match the
// deployment host exactly.
function originAllowed(origin: string | null, host: string | null): boolean {
  if (origin === null) {
    return true;
  }
  if (host === null) {
    return false;
  }
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

// null means invalid (non-integer); out-of-range integers clamp (Phase 0
// decision on the plan's "clamped" wording).
function parseLimit(raw: string | string[] | undefined): number | null {
  if (raw === undefined) {
    return LIMIT_DEFAULT;
  }
  if (typeof raw !== 'string' || raw.trim() === '' || !Number.isInteger(Number(raw))) {
    return null;
  }
  return Math.min(LIMIT_MAX, Math.max(LIMIT_MIN, Number(raw)));
}

async function handleGet(req: CoreRequest, transport: LeaderboardTransport): Promise<CoreResponse> {
  const game = req.query.game;
  if (typeof game !== 'string' || (game !== 'all' && !isGameId(game))) {
    return errorResponse(400, 'invalid_game');
  }
  const limit = parseLimit(req.query.limit);
  if (limit === null) {
    return errorResponse(400, 'invalid_limit');
  }
  if (game === 'all') {
    const rows = await transport.fetchTops();
    const tops = {} as Record<GameId, { name: string; score: number } | null>;
    for (const id of GAME_IDS) {
      tops[id] = null;
    }
    for (const row of rows) {
      if (isGameId(row.gameId)) {
        tops[row.gameId] = { name: row.name, score: row.score };
      }
    }
    const body: { tops: TopsByGame } = { tops };
    return { status: 200, body, headers: { 'Cache-Control': GET_CACHE_CONTROL } };
  }
  const rows = await transport.fetchTop(game, limit);
  const entries = rows.map((row, index) => ({
    rank: index + 1,
    name: row.name,
    score: row.score,
    createdAt: row.createdAt
  }));
  return { status: 200, body: { game, entries }, headers: { 'Cache-Control': GET_CACHE_CONTROL } };
}

async function handlePost(
  req: CoreRequest,
  transport: LeaderboardTransport
): Promise<CoreResponse> {
  if (req.contentType === null || !req.contentType.toLowerCase().includes('application/json')) {
    return errorResponse(415, 'unsupported_media_type');
  }
  if (req.contentLength !== null && req.contentLength > BODY_MAX_BYTES) {
    return errorResponse(413, 'body_too_large');
  }
  if (req.bodyIsInvalidJson) {
    return errorResponse(400, 'invalid_body');
  }
  const body = req.body;
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return errorResponse(400, 'invalid_body');
  }
  const { gameId, name, score, tick, runSeed } = body as Record<string, unknown>;

  // Plan §4 validation order — first failure wins. The server re-runs the
  // exact shared modules the client uses for friendly pre-validation.
  if (!isGameId(gameId)) {
    return errorResponse(400, 'invalid_game');
  }
  const nameResult = validateName(name);
  if (!nameResult.ok) {
    return errorResponse(400, nameResult.code);
  }
  if (!isValidScore(gameId, score)) {
    return errorResponse(400, 'invalid_score');
  }
  if (!isValidTick(tick)) {
    return errorResponse(400, 'invalid_tick');
  }
  if (!isValidRunSeed(runSeed)) {
    return errorResponse(400, 'invalid_seed');
  }
  if (!isPlausibleScore(gameId, score, tick)) {
    return errorResponse(400, 'implausible_score');
  }

  const outcome = await transport.submitScore({
    gameId,
    name: nameResult.name,
    nameKey: nameResult.nameKey,
    score,
    tick,
    runSeed,
    ipHash: req.ipHash
  });
  if (!outcome.accepted) {
    if (outcome.reason === 'rate_limited') {
      return errorResponse(429, 'rate_limited');
    }
    return errorResponse(502, 'upstream_error');
  }
  if (typeof outcome.best !== 'number' || typeof outcome.rank !== 'number') {
    // A malformed upstream payload is an upstream failure, not a 200.
    return errorResponse(502, 'upstream_error');
  }
  return {
    status: 200,
    body: {
      accepted: true,
      improved: outcome.improved === true,
      best: outcome.best,
      rank: outcome.rank
    }
  };
}

export async function handleLeaderboardRequest(
  req: CoreRequest,
  transport: LeaderboardTransport
): Promise<CoreResponse> {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return errorResponse(405, 'method_not_allowed');
  }
  if (!originAllowed(req.origin, req.host)) {
    return errorResponse(403, 'forbidden_origin');
  }
  try {
    return req.method === 'GET'
      ? await handleGet(req, transport)
      : await handlePost(req, transport);
  } catch {
    // Upstream detail (Supabase URLs, error bodies) must never reach the
    // client; every transport failure maps to one generic response.
    return errorResponse(502, 'upstream_error');
  }
}
