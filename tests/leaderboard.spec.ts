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

// --- Phase 4: game-over submission panel ---------------------------------
// Neon Serpent (portal snake) never auto-dies with no input, so it is the
// stable host for synthetic `arcade-game-over` dispatches: the panel opens for
// the crafted run and no background game-over ever disrupts it. Bounce Circuit
// auto-dies fast with a positive score, so it exercises the real
// BaseGameScene → event → panel path. Every network call is mocked; no spec
// here touches a real backend.

const FIXED_SEEDS = {
  'neon-serpent': 7,
  'bounce-circuit': 11,
  'star-courier': 9,
  'lane-rush': 12,
  'circuit-stack': 14
};

// The crafted run a synthetic game-over carries (score is a rankable positive).
const RUN = { gameId: 'neon-serpent', score: 1280, tick: 128, runSeed: 7 };

type SubmitBody = {
  gameId: string;
  name: string;
  score: number;
  tick: number;
  runSeed: number;
};

async function forceLeaderboard(page: import('@playwright/test').Page): Promise<void> {
  await page.addInitScript((seeds) => {
    window.__ARCADE_LB_FORCE__ = true;
    window.__ARCADE_FIXED_SEEDS__ = seeds;
  }, FIXED_SEEDS);
}

async function bootNeon(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/?game=neon-serpent');
  await page.waitForFunction(() => Boolean(window.__ARCADE__?.getState));
}

async function dispatchGameOver(
  page: import('@playwright/test').Page,
  detail: typeof RUN | { gameId: string; score: number; tick: number; runSeed: number } = RUN
): Promise<void> {
  await page.evaluate((d) => {
    window.dispatchEvent(new CustomEvent('arcade-game-over', { detail: d }));
  }, detail);
}

test('flag off: a real game over renders no panel, makes no /api request, and still restarts', async ({
  page
}) => {
  const apiRequests: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/api/')) apiRequests.push(request.url());
  });
  // Deterministic auto-death, but NO force flag: the panel must never mount.
  await page.addInitScript((seeds) => {
    window.__ARCADE_FIXED_SEEDS__ = seeds;
  }, FIXED_SEEDS);
  await page.goto('/?game=bounce-circuit');
  await page.waitForFunction(() => Boolean(window.__ARCADE__?.getState));
  await page.waitForFunction(() => window.__ARCADE__!.getState().isGameOver === true, undefined, {
    timeout: 20_000
  });

  expect(await page.locator('.leaderboard-panel').count()).toBe(0);

  // The new arcade-game-over/run-start wiring must not break ACTION restart.
  await page.keyboard.press(' ');
  await page.waitForFunction(() => window.__ARCADE__!.getState().isGameOver === false);
  expect(apiRequests).toEqual([]);
});

test('flag on: a real game over emits exactly one event, shows the panel, and keeps the local high score', async ({
  page
}) => {
  await forceLeaderboard(page);
  await page.route(/\/api\/leaderboard/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ accepted: true, improved: true, best: 1, rank: 1 })
    });
  });
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.addInitScript(() => {
    const w = window as unknown as { __GO__: unknown[] };
    w.__GO__ = [];
    window.addEventListener('arcade-game-over', (event) => {
      w.__GO__.push((event as CustomEvent).detail);
    });
  });
  await page.goto('/?game=bounce-circuit');
  await page.waitForFunction(() => Boolean(window.__ARCADE__?.getState));
  await page.waitForFunction(() => window.__ARCADE__!.getState().isGameOver === true, undefined, {
    timeout: 20_000
  });
  // Let extra frames run: the transition guard must not re-emit per frame.
  await page.waitForTimeout(600);

  const captured = (await page.evaluate(
    () => (window as unknown as { __GO__: SubmitBody[] }).__GO__
  )) as Array<{ gameId: string; score: number; tick: number; runSeed: number }>;
  expect(captured.length, 'exactly one arcade-game-over per run').toBe(1);
  expect(captured[0]!.gameId).toBe('bounce-circuit');
  expect(captured[0]!.score).toBeGreaterThan(0);
  expect(captured[0]!.tick).toBeGreaterThan(0);
  expect(captured[0]!.runSeed).toBeGreaterThan(0);

  await expect(page.locator('.leaderboard-panel.is-open')).toBeVisible();

  // Local high score still persists through the normal path.
  const observed = await page.evaluate(() => ({
    bridgeHigh: window.__ARCADE__!.getState().highScore,
    stored: Number(window.localStorage.getItem('pocket-arcade:bounce-circuit:high'))
  }));
  expect(observed.bridgeHigh).toBeGreaterThan(0);
  expect(observed.stored).toBeGreaterThan(0);

  // ACTION (Space) restarts the real run and dismisses the panel.
  await page.keyboard.press(' ');
  await page.waitForFunction(() => window.__ARCADE__!.getState().isGameOver === false);
  await expect(page.locator('.leaderboard-panel.is-open')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('valid submit sends the exact payload, shows rank/best, and persists the name across reload', async ({
  page
}) => {
  await forceLeaderboard(page);
  let lastPost: SubmitBody | null = null;
  await page.route(/\/api\/leaderboard/, async (route) => {
    const request = route.request();
    if (request.method() === 'POST') {
      lastPost = request.postDataJSON() as SubmitBody;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ accepted: true, improved: true, best: 1280, rank: 2 })
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ game: 'neon-serpent', entries: [] })
    });
  });

  await bootNeon(page);
  await dispatchGameOver(page);
  await expect(page.locator('.leaderboard-panel.is-open')).toBeVisible();

  await page.locator('.lb-name').fill('TESTER');
  await expect(page.locator('.lb-submit')).toBeEnabled();
  await page.locator('.lb-submit').click();

  await expect(page.locator('.lb-message')).toContainText('Ranked #2');
  await expect(page.locator('.lb-message')).toContainText('Best 1280');
  expect(lastPost).toEqual({
    gameId: 'neon-serpent',
    name: 'TESTER',
    score: 1280,
    tick: 128,
    runSeed: 7
  });
  expect(await page.evaluate(() => window.localStorage.getItem('pocket-arcade:player-name'))).toBe(
    'TESTER'
  );

  // Persist across reload: the next game over greets the saved name.
  await page.reload();
  await page.waitForFunction(() => Boolean(window.__ARCADE__?.getState));
  await dispatchGameOver(page);
  await expect(page.locator('.leaderboard-panel.is-open')).toBeVisible();
  await expect(page.locator('.lb-saved-name')).toHaveText('TESTER');
  await expect(page.locator('.lb-name')).toBeHidden();
});

test('a saved name shows with an Edit affordance that changes the submitted name', async ({
  page
}) => {
  await forceLeaderboard(page);
  let lastPost: SubmitBody | null = null;
  await page.route(/\/api\/leaderboard/, async (route) => {
    const request = route.request();
    if (request.method() === 'POST') {
      lastPost = request.postDataJSON() as SubmitBody;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ accepted: true, improved: true, best: 1280, rank: 1 })
      });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });

  await bootNeon(page);
  await page.evaluate(() => window.localStorage.setItem('pocket-arcade:player-name', 'SAVEDNAME'));
  await dispatchGameOver(page);
  await expect(page.locator('.leaderboard-panel.is-open')).toBeVisible();

  // Saved mode: name shown, raw input hidden.
  await expect(page.locator('.lb-saved-name')).toHaveText('SAVEDNAME');
  await expect(page.locator('.lb-name')).toBeHidden();

  // Edit reveals the input prefilled with the saved name.
  await page.locator('.lb-edit').click();
  await expect(page.locator('.lb-name')).toBeVisible();
  await expect(page.locator('.lb-name')).toHaveValue('SAVEDNAME');

  await page.locator('.lb-name').fill('NEWNAME');
  await page.locator('.lb-submit').click();
  await expect(page.locator('.lb-message')).toContainText('Ranked #1');
  expect(lastPost!.name).toBe('NEWNAME');
  expect(await page.evaluate(() => window.localStorage.getItem('pocket-arcade:player-name'))).toBe(
    'NEWNAME'
  );
});

test('an unimproved accept shows the existing best', async ({ page }) => {
  await forceLeaderboard(page);
  await page.route(/\/api\/leaderboard/, async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ accepted: true, improved: false, best: 900, rank: 5 })
      });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });

  await bootNeon(page);
  await dispatchGameOver(page);
  await page.locator('.lb-name').fill('TESTER');
  await page.locator('.lb-submit').click();
  await expect(page.locator('.lb-message')).toContainText('Best for TESTER is 900');
});

test('a 429 shows a friendly cooldown message with Retry', async ({ page }) => {
  // Error path: Chromium logs the failed HTTP as a console error (headless
  // caveat, trap 2), so this spec does not assert console cleanliness.
  await forceLeaderboard(page);
  await page.route(/\/api\/leaderboard/, async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({ error: { code: 'rate_limited' } })
      });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });

  await bootNeon(page);
  await dispatchGameOver(page);
  await page.locator('.lb-name').fill('TESTER');
  await page.locator('.lb-submit').click();
  await expect(page.locator('.lb-message')).toContainText('Too many submissions');
  await expect(page.locator('.lb-retry')).toBeVisible();
});

test('an offline failure shows a retry state and Retry sends another request', async ({ page }) => {
  // Error path (first attempt aborts): no console-cleanliness assertion.
  await forceLeaderboard(page);
  let posts = 0;
  await page.route(/\/api\/leaderboard/, async (route) => {
    if (route.request().method() === 'POST') {
      posts += 1;
      if (posts === 1) {
        await route.abort('connectionrefused');
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ accepted: true, improved: true, best: 1280, rank: 3 })
      });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });

  await bootNeon(page);
  await dispatchGameOver(page);
  await page.locator('.lb-name').fill('TESTER');
  await page.locator('.lb-submit').click();
  await expect(page.locator('.lb-message')).toContainText('reach the leaderboard');
  await expect(page.locator('.lb-retry')).toBeVisible();

  await page.locator('.lb-retry').click();
  await expect(page.locator('.lb-message')).toContainText('Ranked #3');
  expect(posts, 'Retry must resend after a failure').toBe(2);
});

test('an invalid name blocks Submit and sends zero requests', async ({ page }) => {
  await forceLeaderboard(page);
  const apiRequests: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/api/')) apiRequests.push(request.url());
  });
  await page.route(/\/api\/leaderboard/, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });

  await bootNeon(page);
  await dispatchGameOver(page);
  const submit = page.locator('.lb-submit');

  // Too short.
  await page.locator('.lb-name').fill('a');
  await expect(submit).toBeDisabled();
  await expect(page.locator('.lb-message')).toContainText('Use 2');

  // Illegal characters.
  await page.locator('.lb-name').fill('a!!!');
  await expect(submit).toBeDisabled();

  // Banned word.
  await page.locator('.lb-name').fill('ass');
  await expect(submit).toBeDisabled();
  await expect(page.locator('.lb-message')).toContainText("isn't allowed");

  expect(apiRequests).toEqual([]);
});

test('a zero score neither shows the panel nor submits', async ({ page }) => {
  await forceLeaderboard(page);
  const apiRequests: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/api/')) apiRequests.push(request.url());
  });
  await page.route(/\/api\/leaderboard/, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });

  await bootNeon(page);
  await dispatchGameOver(page, { gameId: 'neon-serpent', score: 0, tick: 40, runSeed: 7 });
  // Give the handler a moment; the panel must stay closed.
  await page.waitForTimeout(200);
  expect(await page.locator('.leaderboard-panel.is-open').count()).toBe(0);
  expect(apiRequests).toEqual([]);
});

test('the Restart button and Back both dismiss the panel', async ({ page }) => {
  await forceLeaderboard(page);
  await page.route(/\/api\/leaderboard/, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });

  await bootNeon(page);
  await dispatchGameOver(page);
  await expect(page.locator('.leaderboard-panel.is-open')).toBeVisible();

  await page.getByRole('button', { name: 'Restart' }).click();
  await expect(page.locator('.leaderboard-panel.is-open')).toHaveCount(0);

  // Reopen, then Back to home clears it too.
  await dispatchGameOver(page);
  await expect(page.locator('.leaderboard-panel.is-open')).toBeVisible();
  await page.getByRole('button', { name: 'Back to games' }).click();
  await page.waitForFunction(() => window.__ARCADE__?.activeScene === 'home');
  await expect(page.locator('.leaderboard-panel.is-open')).toHaveCount(0);
});

test('the name input is keyboard operable and gameplay keys do not leak while typing', async ({
  page
}) => {
  await forceLeaderboard(page);
  await page.route(/\/api\/leaderboard/, async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ accepted: true, improved: true, best: 1280, rank: 4 })
      });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });

  await bootNeon(page);
  await dispatchGameOver(page);

  // Focused input must swallow gameplay keys (InputManager exemption): no
  // semantic input events while typing w/a/s/d and space into the field.
  await page.evaluate(() => {
    (window as unknown as { __SEM__: number }).__SEM__ = 0;
    window.addEventListener('arcade-semantic-input', () => {
      (window as unknown as { __SEM__: number }).__SEM__ += 1;
    });
  });
  const input = page.locator('.lb-name');
  await input.focus();
  await page.keyboard.type('wasd');
  await page.keyboard.press(' ');
  expect(await page.evaluate(() => (window as unknown as { __SEM__: number }).__SEM__)).toBe(0);

  // Clear and enter a valid name, then Tab to Submit and activate by keyboard.
  await input.fill('TESTER');
  await expect(page.locator('.lb-submit')).toBeEnabled();
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => document.activeElement?.className ?? '')).toContain('lb-submit');
  await page.keyboard.press('Enter');
  await expect(page.locator('.lb-message')).toContainText('Ranked #4');
});

test('the open panel keeps the mobile layout scroll-free', async ({ page, viewport }) => {
  test.skip(Boolean(viewport && viewport.width >= 900), 'mobile-only layout assertion');
  await forceLeaderboard(page);
  await page.route(/\/api\/leaderboard/, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });

  await bootNeon(page);
  await dispatchGameOver(page);
  await expect(page.locator('.leaderboard-panel.is-open')).toBeVisible();
  await expect(page.locator('.touch-controls')).toBeVisible();

  const overflow = await page.evaluate(() => ({
    vertical: document.documentElement.scrollHeight - window.innerHeight,
    horizontal: document.documentElement.scrollWidth - window.innerWidth
  }));
  expect(overflow.vertical, 'no vertical scroll with the panel open').toBeLessThanOrEqual(0);
  expect(overflow.horizontal, 'no horizontal scroll with the panel open').toBeLessThanOrEqual(0);
});
