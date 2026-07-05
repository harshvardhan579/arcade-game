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
