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

test('touch buttons show pressed feedback and directions repeat while held', async ({
  page,
  viewport
}) => {
  test.skip(Boolean(viewport && viewport.width >= 900), 'mobile-only touch assertions');
  type CountingWindow = Window & { __INPUTS__: number };
  const inputCount = () => page.evaluate(() => (window as unknown as CountingWindow).__INPUTS__);
  await page.evaluate(() => {
    const w = window as unknown as CountingWindow;
    w.__INPUTS__ = 0;
    window.addEventListener('arcade-semantic-input', () => {
      w.__INPUTS__ += 1;
    });
  });

  // Pressed feedback must appear on pointerdown and clear on pointerup —
  // :active is suppressed by the preventDefault in the pointerdown handler.
  const left = page.locator('[data-arcade-input="LEFT"]');
  await left.dispatchEvent('pointerdown', { pointerId: 1 });
  await expect(left, 'pressing LEFT must show pressed feedback').toHaveClass(/is-pressed/);
  await page.waitForTimeout(700);
  await left.dispatchEvent('pointerup', { pointerId: 1 });
  await expect(left, 'releasing LEFT must clear pressed feedback').not.toHaveClass(/is-pressed/);

  // Holding a direction must auto-repeat (parity with OS key repeat)…
  const heldCount = await inputCount();
  expect(heldCount, 'holding LEFT for 700ms must auto-repeat').toBeGreaterThanOrEqual(3);
  // …and releasing must stop the repeat.
  await page.waitForTimeout(300);
  expect(await inputCount(), 'repeat must stop on release').toBe(heldCount);

  // A discrete tap still emits exactly one input.
  await page.evaluate(() => ((window as unknown as CountingWindow).__INPUTS__ = 0));
  await left.dispatchEvent('pointerdown', { pointerId: 2 });
  await left.dispatchEvent('pointerup', { pointerId: 2 });
  await page.waitForTimeout(500);
  expect(await inputCount(), 'a tap must emit exactly one input').toBe(1);

  // ACTION is deliberately single-shot even when held (no restart spam).
  await page.evaluate(() => ((window as unknown as CountingWindow).__INPUTS__ = 0));
  const action = page.locator('[data-arcade-input="ACTION"]');
  await action.dispatchEvent('pointerdown', { pointerId: 3 });
  await page.waitForTimeout(700);
  await action.dispatchEvent('pointerup', { pointerId: 3 });
  expect(await inputCount(), 'holding ACTION must stay single-shot').toBe(1);
});

test('mobile canvas and touch controls share the viewport without overlap', async ({
  page,
  viewport
}) => {
  test.skip(Boolean(viewport && viewport.width >= 900), 'mobile-only layout assertions');
  for (const [width, height] of [
    [375, 667],
    [390, 844],
    [412, 915],
    [430, 932]
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.__ARCADE__?.getState));

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

    const canvas = await page.locator('#game-root canvas').boundingBox();
    const controls = await page.locator('.touch-controls').boundingBox();
    expect(canvas, `canvas must render at ${width}x${height}`).not.toBeNull();
    expect(controls, `touch controls must render at ${width}x${height}`).not.toBeNull();
    expect(
      canvas!.y + canvas!.height,
      `canvas must end above the touch controls at ${width}x${height}`
    ).toBeLessThanOrEqual(controls!.y + 0.5);

    for (const button of await page.locator('.touch-button').all()) {
      const box = await button.boundingBox();
      expect(box, `every touch button must render at ${width}x${height}`).not.toBeNull();
      expect(box!.x, `button on screen (left) at ${width}x${height}`).toBeGreaterThanOrEqual(-0.5);
      expect(box!.y, `button on screen (top) at ${width}x${height}`).toBeGreaterThanOrEqual(-0.5);
      expect(
        box!.x + box!.width,
        `button on screen (right) at ${width}x${height}`
      ).toBeLessThanOrEqual(width + 0.5);
      expect(
        box!.y + box!.height,
        `button on screen (bottom) at ${width}x${height}`
      ).toBeLessThanOrEqual(height + 0.5);
    }
  }
});
