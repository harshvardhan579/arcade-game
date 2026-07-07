// Vercel serverless function for the global leaderboard (plan §4). Thin
// adapter by design: every decision lives in the unit-tested core in
// src/leaderboard/serverCore.ts; this file only translates the platform
// request, injects the real Supabase PostgREST transport, and writes the
// response. Secrets stay in process.env — nothing here is ever bundled into
// the static client build.

import { createHash } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import type {
  CoreRequest,
  LeaderboardTransport,
  SubmitOutcome
} from '../src/leaderboard/serverCore';
import { handleLeaderboardRequest } from '../src/leaderboard/serverCore';

function headerValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}

function clientIp(req: VercelRequest): string {
  const forwarded = headerValue(req.headers['x-forwarded-for']);
  if (forwarded !== null && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress ?? 'unknown';
}

// Rate limiting without storing raw IPs (plan §3).
function hashIp(ip: string, salt: string): string {
  return createHash('sha256').update(`${ip}${salt}`).digest('hex');
}

function parseContentLength(value: string | null): number | null {
  if (value === null) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function createSupabaseTransport(baseUrl: string, serviceKey: string): LeaderboardTransport {
  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json'
  };
  async function request(path: string, init?: RequestInit): Promise<unknown> {
    const response = await fetch(`${baseUrl}${path}`, { ...init, headers });
    if (!response.ok) {
      // The status is enough for the core's generic 502; response bodies may
      // contain upstream detail and are deliberately never read.
      throw new Error(`upstream status ${response.status}`);
    }
    return response.json();
  }
  return {
    async fetchTop(gameId, limit) {
      // gameId is allowlist-validated and limit is a clamped integer before
      // the transport is ever called.
      const rows = (await request(
        `/rest/v1/leaderboard_scores?game_id=eq.${gameId}` +
          `&select=name,score,created_at&order=score.desc,updated_at.asc&limit=${limit}`
      )) as Array<{ name: string; score: number; created_at: string }>;
      return rows.map((row) => ({ name: row.name, score: row.score, createdAt: row.created_at }));
    },
    async fetchTops() {
      const rows = (await request('/rest/v1/leaderboard_tops?select=game_id,name,score')) as Array<{
        game_id: string;
        name: string;
        score: number;
      }>;
      return rows.map((row) => ({ gameId: row.game_id, name: row.name, score: row.score }));
    },
    async submitScore(args) {
      const outcome = await request('/rest/v1/rpc/submit_score', {
        method: 'POST',
        body: JSON.stringify({
          p_game_id: args.gameId,
          p_name: args.name,
          p_name_key: args.nameKey,
          p_score: args.score,
          p_tick: args.tick,
          p_run_seed: args.runSeed,
          p_ip_hash: args.ipHash
        })
      });
      return outcome as SubmitOutcome;
    }
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const ipSalt = process.env.LEADERBOARD_IP_SALT;
  if (!supabaseUrl || !serviceKey || !ipSalt) {
    res.status(502).json({ error: { code: 'upstream_error' } });
    return;
  }

  // Vercel parses JSON bodies lazily and throws on malformed input; the core
  // owns the 400 mapping, so translate the throw into a flag.
  let body: unknown;
  let bodyIsInvalidJson = false;
  try {
    body = req.body;
  } catch {
    bodyIsInvalidJson = true;
  }

  const coreRequest: CoreRequest = {
    method: req.method ?? 'GET',
    origin: headerValue(req.headers.origin),
    host: headerValue(req.headers.host),
    contentType: headerValue(req.headers['content-type']),
    contentLength: parseContentLength(headerValue(req.headers['content-length'])),
    body,
    bodyIsInvalidJson,
    query: req.query,
    ipHash: hashIp(clientIp(req), ipSalt)
  };

  const response = await handleLeaderboardRequest(
    coreRequest,
    createSupabaseTransport(supabaseUrl, serviceKey)
  );
  for (const [name, value] of Object.entries(response.headers ?? {})) {
    res.setHeader(name, value);
  }
  res.status(response.status).json(response.body);
}
