import { expect, test } from '@playwright/test';

async function shellMode(page: import('@playwright/test').Page): Promise<string | null> {
  return page.evaluate(
    () => document.querySelector('.arcade-shell')?.getAttribute('data-mode') ?? null
  );
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__ARCADE__?.activeScene === 'home');
});

test('boots to the home hub with no game running', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  expect(await shellMode(page)).toBe('home');
  await expect(page.locator('.home-card')).toHaveCount(5);
  // Phaser is constructed lazily: the home hub must not boot the engine.
  await expect(page.locator('#game-root canvas')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Pocket Arcade' })).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Back to games' })).toBeHidden();
  expect(errors).toEqual([]);
});

test('selecting a card enters the game, Back returns home, re-select works', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await page.locator('.home-card[data-game-id="lane-rush"]').click();
  await page.waitForFunction(() => window.__ARCADE__?.activeScene === 'lane-rush');
  expect(await shellMode(page)).toBe('game');
  await expect(page.locator('#game-root canvas')).toBeVisible();
  await page.waitForFunction(() => (window.__ARCADE__!.getState().tick as number) > 0);

  await page.getByRole('button', { name: 'Back to games' }).click();
  await page.waitForFunction(() => window.__ARCADE__?.activeScene === 'home');
  expect(await shellMode(page)).toBe('home');
  await expect(page.locator('.home-card')).toHaveCount(5);

  // Re-selecting a different game must start it cleanly (no stacked scenes,
  // fresh run).
  await page.locator('.home-card[data-game-id="circuit-stack"]').click();
  await page.waitForFunction(() => window.__ARCADE__?.activeScene === 'circuit-stack');
  await page.waitForFunction(() => (window.__ARCADE__!.getState().tick as number) > 0);
  expect(await shellMode(page)).toBe('game');
  expect(errors).toEqual([]);
});

test('?game deep links enter game mode; invalid ids fall back to home', async ({ page }) => {
  await page.goto('/?game=star-courier');
  await page.waitForFunction(() => window.__ARCADE__?.activeScene === 'star-courier');
  expect(await shellMode(page)).toBe('game');

  await page.goto('/?game=not-a-game');
  await page.waitForFunction(() => window.__ARCADE__?.activeScene === 'home');
  expect(await shellMode(page)).toBe('home');
});

test('home cards carry emblems, accessible names, and live high scores', async ({ page }) => {
  for (const name of [
    'Neon Serpent',
    'Bounce Circuit',
    'Star Courier',
    'Lane Rush',
    'Circuit Stack'
  ]) {
    await expect(page.getByRole('button', { name: new RegExp(name) })).toBeVisible();
  }
  // Every card renders its procedural emblem box.
  await expect(page.locator('.home-card .home-logo')).toHaveCount(5);

  // Persisted highs render on load; empty state elsewhere.
  await page.evaluate(() => window.localStorage.setItem('pocket-arcade:lane-rush:high', '4321'));
  await page.reload();
  await page.waitForFunction(() => window.__ARCADE__?.activeScene === 'home');
  await expect(page.locator('.home-card[data-game-id="lane-rush"] .home-card-high')).toHaveText(
    'High 4321'
  );
  await expect(page.locator('.home-card[data-game-id="neon-serpent"] .home-card-high')).toHaveText(
    'High —'
  );

  // Live update: the hub subscribes to arcade-high-score like the sidebar.
  await page.evaluate(() => {
    window.dispatchEvent(
      new CustomEvent('arcade-high-score', { detail: { gameId: 'neon-serpent', score: 88 } })
    );
  });
  await expect(page.locator('.home-card[data-game-id="neon-serpent"] .home-card-high')).toHaveText(
    'High 88'
  );
});

test('keyboard tab order on home walks the toggle then the cards', async ({ page }) => {
  const order: string[] = [];
  for (let i = 0; i < 6; i += 1) {
    await page.keyboard.press('Tab');
    order.push(
      await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        return el?.dataset.gameId ?? el?.className ?? 'none';
      })
    );
  }
  expect(order[0], 'the header theme toggle is the first tab stop').toContain('theme-toggle');
  expect(order.slice(1), 'cards follow in registry order').toEqual([
    'neon-serpent',
    'bounce-circuit',
    'star-courier',
    'lane-rush',
    'circuit-stack'
  ]);
});

test('the theme toggle works from the home screen', async ({ page }) => {
  const readTheme = () => page.evaluate(() => document.documentElement.dataset.theme ?? 'dark');
  const toggle = page.locator('.home-screen .theme-toggle');
  await expect(toggle).toHaveAccessibleName('Switch to light theme');
  await toggle.click();
  expect(await readTheme()).toBe('light');
  // The broadcast must resync the other (hidden) instance too, so entering a
  // game shows a correctly-labelled toggle.
  await page.locator('.home-card[data-game-id="neon-serpent"]').click();
  await page.waitForFunction(() => window.__ARCADE__?.activeScene === 'neon-serpent');
  await expect(page.locator('.topbar .theme-toggle')).toHaveAccessibleName('Switch to dark theme');
});

test('home fits without scroll on phone portrait and landscape', async ({ page, viewport }) => {
  test.skip(Boolean(viewport && viewport.width >= 900), 'mobile-only layout assertions');
  for (const [width, height] of [
    [375, 667],
    [667, 375]
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    await page.waitForFunction(() => window.__ARCADE__?.activeScene === 'home');
    const overflow = await page.evaluate(() => ({
      vertical: document.documentElement.scrollHeight - window.innerHeight,
      horizontal: document.documentElement.scrollWidth - window.innerWidth
    }));
    expect(overflow.vertical, `home must not scroll at ${width}x${height}`).toBeLessThanOrEqual(0);
    expect(overflow.horizontal, `no horizontal scroll at ${width}x${height}`).toBeLessThanOrEqual(
      0
    );
    for (const card of await page.locator('.home-card').all()) {
      await expect(card).toBeInViewport();
    }
  }
});

// --- Phase 5: home-card World score fragments ----------------------------

const TOPS_BODY = {
  tops: {
    'neon-serpent': { name: 'AAA', score: 12340 },
    'bounce-circuit': null,
    'star-courier': { name: 'ZZ', score: 5 },
    'lane-rush': { name: 'BBB', score: 999 },
    'circuit-stack': null
  }
};

async function forceLeaderboard(
  page: import('@playwright/test').Page,
  ttlMs?: number
): Promise<void> {
  await page.addInitScript((ttl) => {
    window.__ARCADE_LB_FORCE__ = true;
    if (typeof ttl === 'number') window.__ARCADE_LB_TOPS_TTL__ = ttl;
  }, ttlMs);
}

test('flag off: home shows no World fragment and makes no /api request', async ({ page }) => {
  const apiRequests: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/api/')) apiRequests.push(request.url());
  });
  await page.goto('/');
  await page.waitForFunction(() => window.__ARCADE__?.activeScene === 'home');
  await page.waitForTimeout(150); // let any deferred refresh run (it must not).

  expect(await page.locator('.hs-world:not(:empty)').count()).toBe(0);
  for (const high of await page.locator('.home-card-high').all()) {
    await expect(high).not.toContainText('World');
  }
  expect(apiRequests).toEqual([]);
});

test('flag on: home fetches world tops once and renders World fragments', async ({ page }) => {
  let allRequests = 0;
  await forceLeaderboard(page);
  await page.route(/\/api\/leaderboard/, async (route) => {
    if (new URL(route.request().url()).searchParams.get('game') === 'all') allRequests += 1;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(TOPS_BODY)
    });
  });
  await page.goto('/');
  await page.waitForFunction(() => window.__ARCADE__?.activeScene === 'home');

  await expect(
    page.locator('.home-card[data-game-id="neon-serpent"] .home-card-high')
  ).toContainText('World 12,340');
  await expect(page.locator('.home-card[data-game-id="lane-rush"] .home-card-high')).toContainText(
    'World 999'
  );
  // A game with no global score gets no fragment.
  await expect(
    page.locator('.home-card[data-game-id="bounce-circuit"] .home-card-high')
  ).not.toContainText('World');
  // Exactly one game=all fetch for the whole hub.
  expect(allRequests).toBe(1);
});

test('flag on: returning to home within the throttle does not refetch', async ({ page }) => {
  let allRequests = 0;
  await forceLeaderboard(page); // default 60s throttle.
  await page.route(/\/api\/leaderboard/, async (route) => {
    if (new URL(route.request().url()).searchParams.get('game') === 'all') allRequests += 1;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(TOPS_BODY)
    });
  });
  await page.goto('/');
  await page.waitForFunction(() => window.__ARCADE__?.activeScene === 'home');
  await expect(
    page.locator('.home-card[data-game-id="neon-serpent"] .home-card-high')
  ).toContainText('World 12,340');
  expect(allRequests).toBe(1);

  // Enter a game and Back — SPA navigation keeps the throttle state.
  await page.locator('.home-card[data-game-id="lane-rush"]').click();
  await page.waitForFunction(() => window.__ARCADE__?.activeScene === 'lane-rush');
  await page.getByRole('button', { name: 'Back to games' }).click();
  await page.waitForFunction(() => window.__ARCADE__?.activeScene === 'home');
  await page.waitForTimeout(150); // allow the deferred refresh to run (throttled).
  expect(allRequests).toBe(1);
});

test('flag on: home refetches world tops after the throttle window', async ({ page }) => {
  let allRequests = 0;
  await forceLeaderboard(page, 400); // short throttle for the test.
  await page.route(/\/api\/leaderboard/, async (route) => {
    if (new URL(route.request().url()).searchParams.get('game') === 'all') allRequests += 1;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(TOPS_BODY)
    });
  });
  await page.goto('/');
  await page.waitForFunction(() => window.__ARCADE__?.activeScene === 'home');
  await expect(
    page.locator('.home-card[data-game-id="neon-serpent"] .home-card-high')
  ).toContainText('World 12,340');
  expect(allRequests).toBe(1);

  await page.locator('.home-card[data-game-id="lane-rush"]').click();
  await page.waitForFunction(() => window.__ARCADE__?.activeScene === 'lane-rush');
  await page.waitForTimeout(500); // exceed the 400ms throttle.
  await page.getByRole('button', { name: 'Back to games' }).click();
  await page.waitForFunction(() => window.__ARCADE__?.activeScene === 'home');
  await expect.poll(() => allRequests).toBe(2);
});

test('flag on: home stays scroll-free with World fragments on mobile', async ({
  page,
  viewport
}) => {
  test.skip(Boolean(viewport && viewport.width >= 900), 'mobile-only layout assertions');
  await forceLeaderboard(page);
  await page.route(/\/api\/leaderboard/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(TOPS_BODY)
    });
  });
  for (const [width, height] of [
    [375, 667],
    [667, 375]
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    await page.waitForFunction(() => window.__ARCADE__?.activeScene === 'home');
    await expect(
      page.locator('.home-card[data-game-id="neon-serpent"] .home-card-high')
    ).toContainText('World 12,340');
    const overflow = await page.evaluate(() => ({
      vertical: document.documentElement.scrollHeight - window.innerHeight,
      horizontal: document.documentElement.scrollWidth - window.innerWidth
    }));
    expect(overflow.vertical, `home must not scroll at ${width}x${height}`).toBeLessThanOrEqual(0);
    expect(overflow.horizontal, `no horizontal scroll at ${width}x${height}`).toBeLessThanOrEqual(
      0
    );
  }
});
