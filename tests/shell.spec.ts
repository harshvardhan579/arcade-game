import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__ARCADE__?.getState));
});

test('desktop controls hint follows the selected game', async ({ page, viewport }) => {
  test.skip(
    Boolean(viewport && viewport.width < 900),
    'selector is intentionally hidden on mobile'
  );
  const hint = page.locator('.controls-hint');
  await expect(hint).toHaveText('Arrows steer · eating speeds up · Space restarts');
  await page.getByRole('button', { name: /Lane Rush/ }).click();
  await expect(hint).toHaveText('← → change lanes');
  await page.getByRole('button', { name: /Circuit Stack/ }).click();
  await expect(hint).toHaveText('← → move · ↑ rotate · ↓ drop');
});

test('desktop fits without scrolling, hides touch controls, and brands once', async ({
  page,
  viewport
}) => {
  test.skip(Boolean(viewport && viewport.width < 900), 'desktop-only layout assertions');
  for (const [width, height] of [
    [1440, 900],
    [1280, 800],
    [1512, 982],
    [1366, 768]
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.__ARCADE__?.getState));
    await expect(page.locator('.touch-controls')).toBeHidden();
    const overflow = await page.evaluate(() => ({
      vertical: document.documentElement.scrollHeight - window.innerHeight,
      horizontal: document.documentElement.scrollWidth - window.innerWidth
    }));
    expect(
      overflow.vertical,
      `page must not scroll vertically at ${width}x${height}`
    ).toBeLessThanOrEqual(0);
    expect(
      overflow.horizontal,
      `page must not scroll horizontally at ${width}x${height}`
    ).toBeLessThanOrEqual(0);
    await expect(page.getByRole('heading', { name: 'Pocket Arcade' })).toHaveCount(1);
  }
});

test('keyboard reaches, sees, and activates the shell controls', async ({ page, viewport }) => {
  test.skip(Boolean(viewport && viewport.width < 900), 'desktop-only keyboard assertions');
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
  expect(order.slice(0, 5), 'tab order must walk the game cards in list order').toEqual([
    'neon-serpent',
    'bounce-circuit',
    'star-courier',
    'lane-rush',
    'circuit-stack'
  ]);
  expect(order[5], 'restart must follow the cards in tab order').toContain('restart-button');

  await page.keyboard.press('Shift+Tab');
  const outline = await page.evaluate(() => {
    const style = getComputedStyle(document.activeElement as HTMLElement);
    return { width: style.outlineWidth, lineStyle: style.outlineStyle };
  });
  expect(outline.lineStyle, 'keyboard focus must show the focus-visible ring').toBe('solid');
  expect(outline.width).toBe('2px');

  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__ARCADE__?.activeScene === 'circuit-stack');
  await expect(page.locator('.controls-hint')).toHaveText('← → move · ↑ rotate · ↓ drop');

  const before = await page.evaluate(() => window.__ARCADE__!.getState().pieceY as number);
  await page.keyboard.press('ArrowDown');
  await page.waitForFunction(
    (y) => (window.__ARCADE__!.getState().pieceY as number) > y,
    before as number
  );
});

test('mobile controls hint follows the picker and keeps controls in view', async ({
  page,
  viewport
}) => {
  test.skip(Boolean(viewport && viewport.width >= 900), 'mobile-only assertion');
  const hint = page.locator('.controls-hint');
  await expect(hint).toHaveText('Arrows steer · eating speeds up · Space restarts');
  await page.getByLabel('Choose game').selectOption('star-courier');
  await expect(hint).toHaveText('← → move · Space fires');
  await expect(page.locator('.touch-controls')).toBeInViewport();
});
