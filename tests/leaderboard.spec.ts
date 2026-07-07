import { expect, test } from '@playwright/test';

// Phase 3 coverage: the flag-gated client service only. There is no
// leaderboard UI yet — the flag-forced spec drives the real module directly
// through Vite's dev-server module graph. All network is mocked via
// page.route; no spec here ever talks to a real backend.

test('flag-off build makes zero /api requests and renders no leaderboard DOM', async ({ page }) => {
  const apiRequests: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/api/')) {
      apiRequests.push(request.url());
    }
  });
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  // Game mode: boot a run and let it tick.
  await page.goto('/?game=neon-serpent');
  await page.waitForFunction(() => Boolean(window.__ARCADE__?.getState));
  await page.waitForFunction(() => window.__ARCADE__!.getState().tick > 5);
  expect(await page.locator('[class*="leaderboard" i]').count()).toBe(0);

  // Home mode too — Phase 5 adds World fragments here; flag-off must stay
  // network-silent in both modes.
  await page.goto('/');
  await expect(page.locator('.home-card')).toHaveCount(5);
  expect(await page.locator('[class*="leaderboard" i]').count()).toBe(0);

  expect(apiRequests).toEqual([]);
  expect(errors).toEqual([]);
});

test('flag-forced service fetches and parses through mocked /api routes', async ({ page }) => {
  await page.addInitScript(() => {
    window.__ARCADE_LB_FORCE__ = true;
  });

  const topBody = {
    game: 'lane-rush',
    entries: [{ rank: 1, name: 'AAA', score: 120, createdAt: '2026-07-07T00:00:00Z' }]
  };
  const topsBody = {
    tops: {
      'neon-serpent': { name: 'AAA', score: 900 },
      'bounce-circuit': null,
      'star-courier': null,
      'lane-rush': { name: 'AAA', score: 120 },
      'circuit-stack': null
    }
  };
  const submitBody = { accepted: true, improved: true, best: 24, rank: 1 };

  let mockedHits = 0;
  await page.route(/\/api\/leaderboard/, async (route) => {
    mockedHits += 1;
    const request = route.request();
    const url = new URL(request.url());
    const body =
      request.method() === 'POST'
        ? submitBody
        : url.searchParams.get('game') === 'all'
          ? topsBody
          : topBody;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body)
    });
  });

  await page.goto('/');
  await expect(page.locator('.home-card')).toHaveCount(5);

  // No UI consumes the service yet; import the real module through the Vite
  // dev server and exercise all three methods in the browser. The string
  // form keeps the root-relative dynamic import out of tsc's module graph.
  const results = (await page.evaluate(`
    import('/src/core/LeaderboardService.ts').then(async (mod) => {
      const service = mod.leaderboardService;
      return {
        enabled: service.isEnabled(),
        top: await service.fetchTop('lane-rush'),
        tops: await service.fetchTops(),
        submit: await service.submit({ gameId: 'lane-rush', name: 'AAA', score: 24, tick: 100, runSeed: 42 })
      };
    })
  `)) as {
    enabled: boolean;
    top: unknown;
    tops: unknown;
    submit: unknown;
  };

  expect(results.enabled).toBe(true);
  expect(results.top).toEqual({ ok: true, data: topBody });
  expect(results.tops).toEqual({ ok: true, data: topsBody.tops });
  expect(results.submit).toEqual({ ok: true, data: submitBody });
  expect(mockedHits).toBe(3);
});

test('flag-forced service resolves typed failures from mocked errors without throwing', async ({
  page
}) => {
  // Chromium logs failed HTTP responses as console errors, so this spec
  // deliberately does not assert console cleanliness (headless caveat).
  await page.addInitScript(() => {
    window.__ARCADE_LB_FORCE__ = true;
  });
  await page.route(/\/api\/leaderboard/, async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({ error: { code: 'rate_limited' } })
      });
      return;
    }
    await route.abort('connectionrefused');
  });

  await page.goto('/');
  await expect(page.locator('.home-card')).toHaveCount(5);

  const results = (await page.evaluate(`
    import('/src/core/LeaderboardService.ts').then(async (mod) => {
      const service = mod.leaderboardService;
      return {
        top: await service.fetchTop('lane-rush'),
        submit: await service.submit({ gameId: 'lane-rush', name: 'AAA', score: 24, tick: 100, runSeed: 42 })
      };
    })
  `)) as { top: unknown; submit: unknown };

  expect(results.top).toEqual({ ok: false, reason: 'offline' });
  expect(results.submit).toEqual({ ok: false, reason: 'http', status: 429, code: 'rate_limited' });
});
