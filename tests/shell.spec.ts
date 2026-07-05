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
