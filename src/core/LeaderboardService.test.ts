import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLeaderboardService, leaderboardService } from './LeaderboardService';
import type { SubmitRequest } from '../leaderboard/types';

interface RecordedCall {
  url: string;
  init?: RequestInit;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

function makeService(overrides: {
  enabled?: boolean;
  timeoutMs?: number;
  respond?: (url: string, init?: RequestInit) => Response | Promise<Response>;
}) {
  const calls: RecordedCall[] = [];
  const service = createLeaderboardService({
    isEnabled: () => overrides.enabled ?? true,
    timeoutMs: overrides.timeoutMs,
    fetchFn: (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, init });
      if (overrides.respond) {
        return overrides.respond(url, init);
      }
      return jsonResponse({});
    }) as typeof fetch
  });
  return { service, calls };
}

const submitEntry: SubmitRequest = {
  gameId: 'lane-rush',
  name: 'AAA',
  score: 24,
  tick: 100,
  runSeed: 42
};

const topBody = {
  game: 'lane-rush',
  entries: [{ rank: 1, name: 'AAA', score: 120, createdAt: '2026-07-07T00:00:00Z' }]
};

const topsBody = {
  tops: {
    'neon-serpent': { name: 'AAA', score: 900 },
    'bounce-circuit': null,
    'star-courier': null,
    'lane-rush': null,
    'circuit-stack': null
  }
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('disabled behavior', () => {
  it('resolves disabled from every method with zero fetch calls', async () => {
    const { service, calls } = makeService({ enabled: false });
    expect(service.isEnabled()).toBe(false);
    expect(await service.fetchTop('lane-rush')).toEqual({ ok: false, reason: 'disabled' });
    expect(await service.fetchTops()).toEqual({ ok: false, reason: 'disabled' });
    expect(await service.submit(submitEntry)).toEqual({ ok: false, reason: 'disabled' });
    expect(calls).toEqual([]);
  });

  it('the real singleton is disabled under tests and never touches fetch', async () => {
    // No VITE_LEADERBOARD_ENABLED in this environment and no override set.
    const spy = vi.fn();
    vi.stubGlobal('fetch', spy);
    expect(leaderboardService.isEnabled()).toBe(false);
    expect(await leaderboardService.fetchTop('lane-rush')).toEqual({
      ok: false,
      reason: 'disabled'
    });
    expect(await leaderboardService.fetchTops()).toEqual({ ok: false, reason: 'disabled' });
    expect(await leaderboardService.submit(submitEntry)).toEqual({
      ok: false,
      reason: 'disabled'
    });
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('request targets', () => {
  it('only ever requests the same-origin /api/leaderboard path', async () => {
    const { service, calls } = makeService({
      respond: (url) => jsonResponse(url.includes('game=all') ? topsBody : topBody)
    });
    await service.fetchTop('neon-serpent', 5);
    await service.fetchTops();
    await service.submit(submitEntry);
    expect(calls.length).toBe(3);
    for (const call of calls) {
      // A rooted path with no scheme or host: same-origin by construction.
      expect(call.url).toMatch(/^\/api\/leaderboard(\?|$)/);
    }
  });

  it('builds the single-game GET with game and limit params', async () => {
    const { service, calls } = makeService({ respond: () => jsonResponse(topBody) });
    await service.fetchTop('lane-rush');
    await service.fetchTop('lane-rush', 5);
    expect(calls[0].url).toBe('/api/leaderboard?game=lane-rush&limit=10');
    expect(calls[1].url).toBe('/api/leaderboard?game=lane-rush&limit=5');
    expect(calls[0].init?.method).toBeUndefined();
  });

  it('builds the tops GET with game=all', async () => {
    const { service, calls } = makeService({ respond: () => jsonResponse(topsBody) });
    await service.fetchTops();
    expect(calls[0].url).toBe('/api/leaderboard?game=all');
  });

  it('submits a POST with the exact JSON shape and content type', async () => {
    const { service, calls } = makeService({
      respond: () => jsonResponse({ accepted: true, improved: true, best: 24, rank: 1 })
    });
    await service.submit(submitEntry);
    expect(calls[0].url).toBe('/api/leaderboard');
    expect(calls[0].init?.method).toBe('POST');
    expect(calls[0].init?.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({
      gameId: 'lane-rush',
      name: 'AAA',
      score: 24,
      tick: 100,
      runSeed: 42
    });
  });
});

describe('successful parsing', () => {
  it('parses a single-game GET response', async () => {
    const { service } = makeService({ respond: () => jsonResponse(topBody) });
    expect(await service.fetchTop('lane-rush')).toEqual({ ok: true, data: topBody });
  });

  it('parses tops with entries and nulls', async () => {
    const { service } = makeService({ respond: () => jsonResponse(topsBody) });
    expect(await service.fetchTops()).toEqual({ ok: true, data: topsBody.tops });
  });

  it('parses a submit response including improved: false', async () => {
    const { service } = makeService({
      respond: () => jsonResponse({ accepted: true, improved: false, best: 2000, rank: 5 })
    });
    expect(await service.submit(submitEntry)).toEqual({
      ok: true,
      data: { accepted: true, improved: false, best: 2000, rank: 5 }
    });
  });
});

describe('typed failures (never throws, never logs)', () => {
  it('maps 400/429/502 to http failures with status and code', async () => {
    const cases = [
      [400, 'name_not_allowed'],
      [429, 'rate_limited'],
      [502, 'upstream_error']
    ] as const;
    for (const [status, code] of cases) {
      const { service } = makeService({
        respond: () => jsonResponse({ error: { code } }, status)
      });
      expect(await service.submit(submitEntry)).toEqual({
        ok: false,
        reason: 'http',
        status,
        code
      });
    }
  });

  it('handles an error status with a non-JSON body: status without a code', async () => {
    const { service } = makeService({
      respond: () => new Response('Bad Gateway', { status: 502 })
    });
    expect(await service.fetchTops()).toEqual({
      ok: false,
      reason: 'http',
      status: 502,
      code: undefined
    });
  });

  it('maps a rejecting fetch to offline', async () => {
    const { service } = makeService({
      respond: () => Promise.reject(new TypeError('network down'))
    });
    expect(await service.fetchTop('lane-rush')).toEqual({ ok: false, reason: 'offline' });
  });

  it('aborts via the timeout and resolves offline', async () => {
    const { service } = makeService({
      timeoutMs: 20,
      respond: (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('aborted', 'AbortError'))
          );
        })
    });
    expect(await service.fetchTops()).toEqual({ ok: false, reason: 'offline' });
  });

  it('maps a non-JSON 200 body to invalid', async () => {
    const { service } = makeService({
      respond: () => new Response('<html>not json</html>', { status: 200 })
    });
    expect(await service.fetchTop('lane-rush')).toEqual({ ok: false, reason: 'invalid' });
  });

  it('maps well-formed JSON with the wrong shape to invalid', async () => {
    const { service } = makeService({ respond: () => jsonResponse({ unexpected: true }) });
    expect(await service.fetchTop('lane-rush')).toEqual({ ok: false, reason: 'invalid' });
    expect(await service.fetchTops()).toEqual({ ok: false, reason: 'invalid' });
    expect(await service.submit(submitEntry)).toEqual({ ok: false, reason: 'invalid' });
  });

  it('rejects tops rows with malformed entries rather than passing them through', async () => {
    const { service } = makeService({
      respond: () => jsonResponse({ tops: { 'neon-serpent': { name: 7, score: 'high' } } })
    });
    expect(await service.fetchTops()).toEqual({ ok: false, reason: 'invalid' });
  });
});
