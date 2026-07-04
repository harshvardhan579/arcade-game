import { expect, test } from '@playwright/test';

async function waitForBridge(page: import('@playwright/test').Page): Promise<void> {
  await page.waitForFunction(() => Boolean(window.__ARCADE__?.getState));
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await waitForBridge(page);
  await page.evaluate(() => {
    Object.keys(window.localStorage)
      .filter((key) => key.startsWith('pocket-arcade:'))
      .forEach((key) => window.localStorage.removeItem(key));
  });
});

test('high score starts at zero, persists across reload, and survives restart', async ({
  page
}) => {
  await page.reload();
  await waitForBridge(page);
  expect(await page.evaluate(() => window.__ARCADE__!.getState().highScore)).toBe(0);

  await page.evaluate(() => window.localStorage.setItem('pocket-arcade:neon-serpent:high', '777'));
  await page.reload();
  await waitForBridge(page);
  expect(await page.evaluate(() => window.__ARCADE__!.getState().highScore)).toBe(777);

  await page.getByRole('button', { name: 'Restart' }).click();
  await page.waitForFunction(() => window.__ARCADE__!.getState().score === 0);
  const restarted = await page.evaluate(() => window.__ARCADE__!.getState());
  expect(restarted.isGameOver).toBe(false);
  expect(restarted.highScore).toBe(777);
});

test('real Lane Rush gameplay persists a high score to storage', async ({ page, viewport }) => {
  test.skip(
    Boolean(viewport && viewport.width < 900),
    'selector is intentionally hidden on mobile'
  );
  await page.getByRole('button', { name: /Lane Rush/ }).click();
  await page.waitForFunction(() => window.__ARCADE__!.activeScene === 'lane-rush');
  await page.waitForFunction(() => window.__ARCADE__!.getState().score > 0, undefined, {
    timeout: 15_000
  });
  const observed = await page.evaluate(() => ({
    score: window.__ARCADE__!.getState().score,
    bridgeHigh: window.__ARCADE__!.getState().highScore,
    stored: Number(window.localStorage.getItem('pocket-arcade:lane-rush:high'))
  }));
  expect(observed.bridgeHigh).toBeGreaterThan(0);
  expect(observed.stored).toBeGreaterThan(0);
  expect(observed.stored).toBeGreaterThanOrEqual(Number(observed.score));
});
