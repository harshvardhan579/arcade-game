import { expect, test } from '@playwright/test';

type BridgeState = {
  score: number;
  isGameOver: boolean;
  tick: number;
  snakeLength?: number;
  headX?: number;
  headY?: number;
};

async function bridgeState(page: import('@playwright/test').Page): Promise<BridgeState> {
  return page.evaluate(() => window.__ARCADE__!.getState() as BridgeState);
}

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__ARCADE__?.getState));
  expect(errors).toEqual([]);
});

test('loads shell and Neon Serpent responds to keyboard', async ({ page }) => {
  await expect(page.locator('h1')).toHaveText('Pocket Arcade');
  await expect(page.locator('.game-card')).toHaveCount(5);
  await expect(page.locator('#game-root canvas')).toBeVisible();
  expect(await page.evaluate(() => window.__ARCADE__!.activeScene)).toBe('neon-serpent');

  const before = await bridgeState(page);
  await page.keyboard.press('ArrowDown');
  await page.waitForFunction((tick) => window.__ARCADE__!.getState().tick > tick, before.tick);
  const after = await bridgeState(page);
  expect(after.tick).toBeGreaterThan(before.tick);
  expect(after.headY).not.toBe(before.headY);

  await page.getByRole('button', { name: 'Restart' }).click();
  await page.waitForFunction(() => window.__ARCADE__!.getState().score === 0);
  const restarted = await bridgeState(page);
  expect(restarted.isGameOver).toBe(false);
  expect(restarted.snakeLength).toBe(3);
});

test('desktop selector can open every MVP game', async ({ page, viewport }) => {
  test.skip(
    Boolean(viewport && viewport.width < 900),
    'selector is intentionally hidden on mobile'
  );
  for (const name of [
    'Bounce Circuit',
    'Star Courier',
    'Lane Rush',
    'Circuit Stack',
    'Neon Serpent'
  ]) {
    await page.getByRole('button', { name: new RegExp(name) }).click();
    await expect(page.locator('#game-root canvas')).toBeVisible();
  }
});

test('mobile viewport exposes virtual d-pad', async ({ page, viewport }) => {
  test.skip(Boolean(viewport && viewport.width >= 900), 'mobile-only control assertion');
  await expect(page.locator('.touch-controls')).toBeVisible();
  await page.getByLabel('Choose game').selectOption('star-courier');
  await page.waitForFunction(() => window.__ARCADE__!.activeScene === 'star-courier');
  await page.getByLabel('Choose game').selectOption('neon-serpent');
  await page.waitForFunction(() => window.__ARCADE__!.activeScene === 'neon-serpent');
  const before = await bridgeState(page);
  await page.locator('[data-arcade-input="DOWN"]').click();
  await page.waitForFunction((tick) => window.__ARCADE__!.getState().tick > tick, before.tick);
  const after = await bridgeState(page);
  expect(after.tick).toBeGreaterThan(before.tick);
});
