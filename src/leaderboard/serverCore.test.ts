import { describe, expect, it } from 'vitest';
import type { CoreRequest, LeaderboardTransport, SubmitArgs } from './serverCore';
import { BODY_MAX_BYTES, GET_CACHE_CONTROL, handleLeaderboardRequest } from './serverCore';
import { GAME_IDS } from './types';

function transport(overrides: Partial<LeaderboardTransport> = {}): LeaderboardTransport {
  return {
    fetchTop: async () => [],
    fetchTops: async () => [],
    submitScore: async () => ({ accepted: true, improved: true, best: 24, rank: 1 }),
    ...overrides
  };
}

function getRequest(
  query: CoreRequest['query'] = {},
  overrides: Partial<CoreRequest> = {}
): CoreRequest {
  return {
    method: 'GET',
    origin: null,
    host: 'arcade.example',
    contentType: null,
    contentLength: null,
    body: undefined,
    bodyIsInvalidJson: false,
    query,
    ipHash: 'hash',
    ...overrides
  };
}

function postRequest(body: unknown, overrides: Partial<CoreRequest> = {}): CoreRequest {
  return {
    method: 'POST',
    origin: null,
    host: 'arcade.example',
    contentType: 'application/json',
    contentLength: 128,
    body,
    bodyIsInvalidJson: false,
    query: {},
    ipHash: 'hash',
    ...overrides
  };
}

// lane-rush at tick 100: bound = floor(12 × (100/28 + 1) × 1.25) = 68.
const validSubmit = { gameId: 'lane-rush', name: 'AAA', score: 24, tick: 100, runSeed: 42 };

function expectError(
  response: { status: number; body: unknown },
  status: number,
  code: string
): void {
  expect(response.status).toBe(status);
  expect(response.body).toEqual({ error: { code } });
}

describe('method and origin guards', () => {
  it('rejects non-GET/POST methods with 405', async () => {
    for (const method of ['DELETE', 'PUT', 'PATCH', 'OPTIONS', 'HEAD']) {
      const response = await handleLeaderboardRequest(getRequest({}, { method }), transport());
      expectError(response, 405, 'method_not_allowed');
    }
  });

  it('rejects a mismatched Origin with 403', async () => {
    const response = await handleLeaderboardRequest(
      getRequest({ game: 'lane-rush' }, { origin: 'https://evil.example' }),
      transport()
    );
    expectError(response, 403, 'forbidden_origin');
  });

  it('rejects an unparseable Origin and a missing Host', async () => {
    const bad = await handleLeaderboardRequest(
      getRequest({ game: 'lane-rush' }, { origin: 'not a url' }),
      transport()
    );
    expectError(bad, 403, 'forbidden_origin');
    const noHost = await handleLeaderboardRequest(
      getRequest({ game: 'lane-rush' }, { origin: 'https://arcade.example', host: null }),
      transport()
    );
    expectError(noHost, 403, 'forbidden_origin');
  });

  it('accepts a matching Origin and an absent Origin', async () => {
    const matching = await handleLeaderboardRequest(
      getRequest({ game: 'lane-rush' }, { origin: 'https://arcade.example' }),
      transport()
    );
    expect(matching.status).toBe(200);
    const absent = await handleLeaderboardRequest(getRequest({ game: 'lane-rush' }), transport());
    expect(absent.status).toBe(200);
  });
});

describe('GET single game', () => {
  it('returns ranked entries with the CDN cache header', async () => {
    const rows = [
      { name: 'AAA', score: 120, createdAt: '2026-07-07T00:00:00Z' },
      { name: 'BBB', score: 80, createdAt: '2026-07-06T00:00:00Z' }
    ];
    const response = await handleLeaderboardRequest(
      getRequest({ game: 'lane-rush' }),
      transport({ fetchTop: async () => rows })
    );
    expect(response.status).toBe(200);
    expect(response.headers).toEqual({ 'Cache-Control': GET_CACHE_CONTROL });
    expect(response.body).toEqual({
      game: 'lane-rush',
      entries: [
        { rank: 1, name: 'AAA', score: 120, createdAt: '2026-07-07T00:00:00Z' },
        { rank: 2, name: 'BBB', score: 80, createdAt: '2026-07-06T00:00:00Z' }
      ]
    });
  });

  it('defaults the limit to 10 and clamps out-of-range integers to 1..50', async () => {
    const seen: number[] = [];
    const spy = transport({
      fetchTop: async (_gameId, limit) => {
        seen.push(limit);
        return [];
      }
    });
    await handleLeaderboardRequest(getRequest({ game: 'lane-rush' }), spy);
    await handleLeaderboardRequest(getRequest({ game: 'lane-rush', limit: '999' }), spy);
    await handleLeaderboardRequest(getRequest({ game: 'lane-rush', limit: '0' }), spy);
    await handleLeaderboardRequest(getRequest({ game: 'lane-rush', limit: '7' }), spy);
    expect(seen).toEqual([10, 50, 1, 7]);
  });

  it('rejects unknown, missing, and repeated game params', async () => {
    for (const game of ['tetris', 'LANE-RUSH', undefined, ['lane-rush', 'all']]) {
      const response = await handleLeaderboardRequest(getRequest({ game }), transport());
      expectError(response, 400, 'invalid_game');
    }
  });

  it('rejects non-integer limits', async () => {
    for (const limit of ['abc', '1.5', '', ['5']]) {
      const response = await handleLeaderboardRequest(
        getRequest({ game: 'lane-rush', limit }),
        transport()
      );
      expectError(response, 400, 'invalid_limit');
    }
  });

  it('maps transport failure to a generic 502', async () => {
    const response = await handleLeaderboardRequest(
      getRequest({ game: 'lane-rush' }),
      transport({
        fetchTop: async () => {
          throw new Error('secret upstream detail');
        }
      })
    );
    expectError(response, 502, 'upstream_error');
  });
});

describe('GET all tops', () => {
  it('returns one entry per game with nulls for games without scores', async () => {
    const response = await handleLeaderboardRequest(
      getRequest({ game: 'all' }),
      transport({
        fetchTops: async () => [
          { gameId: 'lane-rush', name: 'AAA', score: 120 },
          { gameId: 'not-a-game', name: 'X X', score: 1 }
        ]
      })
    );
    expect(response.status).toBe(200);
    expect(response.headers).toEqual({ 'Cache-Control': GET_CACHE_CONTROL });
    const tops = (response.body as { tops: Record<string, unknown> }).tops;
    expect(Object.keys(tops).sort()).toEqual([...GAME_IDS].sort());
    expect(tops['lane-rush']).toEqual({ name: 'AAA', score: 120 });
    expect(tops['neon-serpent']).toBeNull();
    expect(tops['circuit-stack']).toBeNull();
  });

  it('maps tops transport failure to a generic 502', async () => {
    const response = await handleLeaderboardRequest(
      getRequest({ game: 'all' }),
      transport({
        fetchTops: async () => {
          throw new Error('boom');
        }
      })
    );
    expectError(response, 502, 'upstream_error');
  });
});

describe('POST request guards', () => {
  it('rejects missing or non-JSON content types with 415', async () => {
    const missing = await handleLeaderboardRequest(
      postRequest(validSubmit, { contentType: null }),
      transport()
    );
    expectError(missing, 415, 'unsupported_media_type');
    const text = await handleLeaderboardRequest(
      postRequest(validSubmit, { contentType: 'text/plain' }),
      transport()
    );
    expectError(text, 415, 'unsupported_media_type');
  });

  it('accepts a JSON content type with a charset suffix', async () => {
    const response = await handleLeaderboardRequest(
      postRequest(validSubmit, { contentType: 'application/json; charset=utf-8' }),
      transport()
    );
    expect(response.status).toBe(200);
  });

  it('rejects bodies over the byte cap with 413', async () => {
    const response = await handleLeaderboardRequest(
      postRequest(validSubmit, { contentLength: BODY_MAX_BYTES + 1 }),
      transport()
    );
    expectError(response, 413, 'body_too_large');
  });

  it('rejects malformed JSON and non-object bodies with 400', async () => {
    const malformed = await handleLeaderboardRequest(
      postRequest(undefined, { bodyIsInvalidJson: true }),
      transport()
    );
    expectError(malformed, 400, 'invalid_body');
    for (const body of ['a string', null, [1, 2], 42]) {
      const response = await handleLeaderboardRequest(postRequest(body), transport());
      expectError(response, 400, 'invalid_body');
    }
  });
});

describe('POST field validation in plan §4 order', () => {
  it('rejects an unknown gameId before looking at anything else', async () => {
    const response = await handleLeaderboardRequest(
      postRequest({ ...validSubmit, gameId: 'tetris', name: '!', score: -1 }),
      transport()
    );
    expectError(response, 400, 'invalid_game');
  });

  it('maps each name failure to its own code', async () => {
    const tooShort = await handleLeaderboardRequest(
      postRequest({ ...validSubmit, name: 'A' }),
      transport()
    );
    expectError(tooShort, 400, 'name_length');
    const badCharset = await handleLeaderboardRequest(
      postRequest({ ...validSubmit, name: 'A!' }),
      transport()
    );
    expectError(badCharset, 400, 'name_charset');
    const banned = await handleLeaderboardRequest(
      postRequest({ ...validSubmit, name: 'fuck' }),
      transport()
    );
    expectError(banned, 400, 'name_not_allowed');
  });

  it('rejects out-of-range or non-integer scores before tick', async () => {
    for (const score of [0, -5, 1.5, '24', 1_000_000_000]) {
      const response = await handleLeaderboardRequest(
        postRequest({ ...validSubmit, score, tick: 0 }),
        transport()
      );
      expectError(response, 400, 'invalid_score');
    }
  });

  it('rejects invalid ticks and seeds', async () => {
    const badTick = await handleLeaderboardRequest(
      postRequest({ ...validSubmit, tick: 0 }),
      transport()
    );
    expectError(badTick, 400, 'invalid_tick');
    const badSeed = await handleLeaderboardRequest(
      postRequest({ ...validSubmit, runSeed: 0 }),
      transport()
    );
    expectError(badSeed, 400, 'invalid_seed');
    const fractionalSeed = await handleLeaderboardRequest(
      postRequest({ ...validSubmit, runSeed: 1.5 }),
      transport()
    );
    expectError(fractionalSeed, 400, 'invalid_seed');
  });

  it('rejects implausible scores: rate bound and divisor', async () => {
    // Within lane-rush's 50k cap but far above the tick-100 bound of 68.
    const tooFast = await handleLeaderboardRequest(
      postRequest({ ...validSubmit, score: 45_000 }),
      transport()
    );
    expectError(tooFast, 400, 'implausible_score');
    // neon-serpent scores are always multiples of 10.
    const badDivisor = await handleLeaderboardRequest(
      postRequest({ gameId: 'neon-serpent', name: 'AAA', score: 10_005, tick: 1000, runSeed: 42 }),
      transport()
    );
    expectError(badDivisor, 400, 'implausible_score');
  });
});

describe('POST submit outcomes', () => {
  it('passes canonical name, key, and ip hash to the transport and returns 200', async () => {
    let seen: SubmitArgs | null = null;
    const response = await handleLeaderboardRequest(
      postRequest({ ...validSubmit, name: '  Neo   Runner ' }, { ipHash: 'abc123' }),
      transport({
        submitScore: async (args) => {
          seen = args;
          return { accepted: true, improved: true, best: 24, rank: 3 };
        }
      })
    );
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ accepted: true, improved: true, best: 24, rank: 3 });
    expect(seen).not.toBeNull();
    expect(seen!).toMatchObject({
      gameId: 'lane-rush',
      name: 'Neo Runner',
      nameKey: 'neo runner',
      score: 24,
      tick: 100,
      runSeed: 42,
      ipHash: 'abc123'
    });
  });

  it('passes improved: false through untouched', async () => {
    const response = await handleLeaderboardRequest(
      postRequest(validSubmit),
      transport({
        submitScore: async () => ({ accepted: true, improved: false, best: 2000, rank: 5 })
      })
    );
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ accepted: true, improved: false, best: 2000, rank: 5 });
  });

  it('maps the RPC rate-limit verdict to 429', async () => {
    const response = await handleLeaderboardRequest(
      postRequest(validSubmit),
      transport({ submitScore: async () => ({ accepted: false, reason: 'rate_limited' }) })
    );
    expectError(response, 429, 'rate_limited');
  });

  it('maps unknown rejections, malformed outcomes, and throws to a generic 502', async () => {
    const unknownReason = await handleLeaderboardRequest(
      postRequest(validSubmit),
      transport({ submitScore: async () => ({ accepted: false, reason: 'mystery' }) })
    );
    expectError(unknownReason, 502, 'upstream_error');
    const malformed = await handleLeaderboardRequest(
      postRequest(validSubmit),
      transport({ submitScore: async () => ({ accepted: true }) })
    );
    expectError(malformed, 502, 'upstream_error');
    const thrown = await handleLeaderboardRequest(
      postRequest(validSubmit),
      transport({
        submitScore: async () => {
          throw new Error('connection refused to db.supabase.co');
        }
      })
    );
    expectError(thrown, 502, 'upstream_error');
  });
});
