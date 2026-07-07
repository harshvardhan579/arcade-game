import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // The mobile game-over test waits on the seed-12 parked Lane Rush crash;
  // force the historical default seeds now that live runs vary per run.
  await page.addInitScript(() => {
    window.__ARCADE_FIXED_SEEDS__ = {
      'neon-serpent': 7,
      'bounce-circuit': 11,
      'star-courier': 9,
      'lane-rush': 12,
      'circuit-stack': 14
    };
  });
  await page.goto('/?game=neon-serpent');
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
  await expect(hint).toHaveText('← → change lanes · double-tap Space = boost');
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
    await page.goto('/?game=neon-serpent');
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
  for (let i = 0; i < 7; i += 1) {
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
  // Deliberate pin update (home-screen pass): Back sits between the cards
  // and Restart in the topbar.
  expect(order[5], 'Back must follow the cards in tab order').toContain('back-button');
  expect(order[6], 'restart must follow Back in tab order').toContain('restart-button');

  // Two hops back past Back to reach the last card (one hop would land on
  // Back and Enter would navigate home).
  await page.keyboard.press('Shift+Tab');
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
  // Coarse-pointer devices get touch wording, not keyboard wording.
  const hint = page.locator('.controls-hint');
  await expect(hint).toHaveText('D-pad steers · eating speeds up · ● restarts');
  await page.getByLabel('Choose game').selectOption('star-courier');
  await expect(hint).toHaveText('← → move · ● fires');
  await expect(page.locator('.touch-controls')).toBeInViewport();
  // The marketing eyebrow is desktop chrome; phones spend that space on play.
  await expect(page.locator('.eyebrow')).toBeHidden();
});

test('mobile game over shows a touch restart affordance and the picker carries high scores', async ({
  page,
  viewport
}) => {
  test.skip(Boolean(viewport && viewport.width >= 900), 'mobile-only assertions');
  test.setTimeout(60_000);

  // Picker options surface persisted per-game highs (cards are hidden on mobile).
  await page.evaluate(() => window.localStorage.setItem('pocket-arcade:neon-serpent:high', '777'));
  await page.reload();
  await page.waitForFunction(() => Boolean(window.__ARCADE__?.getState));
  await expect(page.locator('.mobile-game-select option[value="neon-serpent"]')).toHaveText(
    'Neon Serpent · High 777'
  );

  // Choosing a game must release focus from the select, like the cards do.
  await page.getByLabel('Choose game').selectOption('lane-rush');
  await page.waitForFunction(() => window.__ARCADE__?.activeScene === 'lane-rush');
  expect(
    await page.evaluate(() => document.activeElement?.className ?? ''),
    'the picker must blur after selection'
  ).not.toContain('mobile-game-select');

  // A parked Lane Rush run crashes on its own; the game-over overlay must
  // paint readable text (fill #d8fff9) in the canvas center — the one-line
  // HUD used to clip the restart instruction off entirely on mobile.
  // Polled because the 140ms death camera flash tints every pixel while it decays.
  await page.waitForFunction(() => window.__ARCADE__!.getState().isGameOver === true, undefined, {
    timeout: 30_000
  });
  await page.waitForFunction(
    () => {
      const canvas = document.querySelector('#game-root canvas') as HTMLCanvasElement;
      const ctx = canvas.getContext('2d')!;
      const y0 = Math.floor(canvas.height * 0.35);
      const image = ctx.getImageData(0, y0, canvas.width, Math.floor(canvas.height * 0.4));
      let count = 0;
      for (let i = 0; i < image.data.length; i += 4) {
        if (
          Math.abs(image.data[i]! - 216) <= 6 &&
          Math.abs(image.data[i + 1]! - 255) <= 6 &&
          Math.abs(image.data[i + 2]! - 249) <= 6
        ) {
          count += 1;
        }
      }
      return count > 150;
    },
    undefined,
    { timeout: 5_000 }
  );
});

test('coarse-pointer landscape phones keep the game playable', async ({ page, viewport }) => {
  test.skip(
    Boolean(viewport && viewport.width >= 900),
    'runs on the coarse-pointer mobile project only'
  );
  for (const [width, height] of [
    [667, 375],
    [844, 390],
    [932, 430]
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.goto('/?game=neon-serpent');
    await page.waitForFunction(() => Boolean(window.__ARCADE__?.getState));

    // A touch device must always have working inputs — including at 932px
    // wide, which used to fall into the keyboard-only desktop layout.
    await expect(
      page.locator('.touch-controls'),
      `touch controls visible at ${width}x${height}`
    ).toBeVisible();
    await expect(
      page.locator('.selector'),
      `desktop selector stays hidden at ${width}x${height}`
    ).toBeHidden();

    const overflow = await page.evaluate(() => ({
      vertical: document.documentElement.scrollHeight - window.innerHeight,
      horizontal: document.documentElement.scrollWidth - window.innerWidth
    }));
    expect(overflow.vertical, `no vertical scroll at ${width}x${height}`).toBeLessThanOrEqual(0);
    expect(overflow.horizontal, `no horizontal scroll at ${width}x${height}`).toBeLessThanOrEqual(
      0
    );

    const canvas = await page.locator('#game-root canvas').boundingBox();
    expect(canvas, `canvas must render at ${width}x${height}`).not.toBeNull();
    expect(
      canvas!.width,
      `canvas must be playable-sized at ${width}x${height}`
    ).toBeGreaterThanOrEqual(160);

    // The touch overlay sits above the topbar in z-order, so any overlap
    // steals taps from Restart/the picker/the theme toggle.
    const chrome = [];
    for (const selector of [
      '.restart-button',
      '.mobile-game-select',
      '.back-button',
      '.topbar .theme-toggle'
    ]) {
      const control = await page.locator(selector).boundingBox();
      if (control) chrome.push({ selector, control });
    }
    for (const button of await page.locator('.touch-button').all()) {
      const box = await button.boundingBox();
      expect(box, `every touch button must render at ${width}x${height}`).not.toBeNull();
      expect(box!.height, `44px touch targets at ${width}x${height}`).toBeGreaterThanOrEqual(44);
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
      const disjoint =
        box!.x >= canvas!.x + canvas!.width - 0.5 ||
        box!.x + box!.width <= canvas!.x + 0.5 ||
        box!.y >= canvas!.y + canvas!.height - 0.5 ||
        box!.y + box!.height <= canvas!.y + 0.5;
      expect(disjoint, `button clear of the canvas at ${width}x${height}`).toBe(true);
      for (const { selector, control } of chrome) {
        const clear =
          box!.x >= control.x + control.width - 0.5 ||
          box!.x + box!.width <= control.x + 0.5 ||
          box!.y >= control.y + control.height - 0.5 ||
          box!.y + box!.height <= control.y + 0.5;
        expect(clear, `button clear of ${selector} at ${width}x${height}`).toBe(true);
      }
    }
  }
});

test('touch buttons expose action labels and reduced motion stays playable', async ({
  page,
  viewport
}) => {
  test.skip(Boolean(viewport && viewport.width >= 900), 'mobile-only accessibility assertions');
  const labels: Array<[string, string]> = [
    ['UP', 'Move up'],
    ['DOWN', 'Move down'],
    ['LEFT', 'Move left'],
    ['RIGHT', 'Move right'],
    ['ACTION', 'Action']
  ];
  for (const [input, name] of labels) {
    await expect(page.locator(`[data-arcade-input="${input}"]`)).toHaveAccessibleName(name);
  }

  // Reduced motion must strip decoration, not playability, on touch too.
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await page.waitForFunction(() => Boolean(window.__ARCADE__?.getState));
  const before = await page.evaluate(() => window.__ARCADE__!.getState().tick as number);
  await page.locator('[data-arcade-input="DOWN"]').click();
  await page.waitForFunction(
    (tick) => (window.__ARCADE__!.getState().tick as number) > tick,
    before
  );
  expect(errors).toEqual([]);
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
  // The last two sizes are the small-viewport geometry of an iPhone SE and an
  // iPhone 14 with Safari's bottom toolbar visible — the layout must fit the
  // height Safari actually gives the page, not the toolbar-inclusive 100vh.
  for (const [width, height] of [
    [375, 667],
    [390, 844],
    [412, 915],
    [430, 932],
    [375, 553],
    [390, 664]
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.goto('/?game=neon-serpent');
    await page.waitForFunction(() => Boolean(window.__ARCADE__?.getState));

    // Root-cause pin for the real-device Safari toolbar bug: the base
    // min-height: 100vh must never win over the shell's svh height — on iOS
    // 100vh includes the toolbar band, pushing DOWN/ACTION underneath it.
    const shell = await page.evaluate(() => {
      const style = getComputedStyle(document.querySelector('.arcade-shell')!);
      return { minHeight: style.minHeight, height: style.height };
    });
    expect(
      shell.minHeight,
      `min-height must not reintroduce 100vh sizing at ${width}x${height}`
    ).toBe('0px');
    expect(
      Number.parseFloat(shell.height),
      `shell must lay out to the viewport height at ${width}x${height}`
    ).toBeLessThanOrEqual(height + 0.5);

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

test('theme toggle switches the shell theme by click and by keyboard', async ({ page }) => {
  const readTheme = () => page.evaluate(() => document.documentElement.dataset.theme ?? 'dark');
  const toggle = page.locator('.topbar .theme-toggle');
  await expect(toggle, 'toggle must expose an action-stating name').toHaveAccessibleName(
    'Switch to light theme'
  );
  expect(await readTheme()).toBe('dark');

  await toggle.click();
  expect(await readTheme(), 'click must flip to light').toBe('light');
  await expect(toggle).toHaveAccessibleName('Switch to dark theme');
  expect(
    await page.evaluate(() =>
      document.querySelector('meta[name="theme-color"]')?.getAttribute('content')
    ),
    'the browser-chrome color must follow the theme'
  ).toBe('#e9f1f1');

  // Keyboard: focus + Enter activates like any native button.
  await toggle.focus();
  await page.keyboard.press('Enter');
  expect(await readTheme(), 'keyboard activation must flip back to dark').toBe('dark');
  await expect(toggle).toHaveAccessibleName('Switch to light theme');
});

test('theme follows the system preference on a first visit', async ({ page }) => {
  // Fresh context = no stored choice; the inline head script must resolve
  // the system preference before first paint in both directions.
  await page.emulateMedia({ colorScheme: 'light' });
  await page.reload();
  await page.waitForFunction(() => Boolean(window.__ARCADE__?.getState));
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('light');

  await page.emulateMedia({ colorScheme: 'dark' });
  await page.reload();
  await page.waitForFunction(() => Boolean(window.__ARCADE__?.getState));
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('dark');
});

test('a chosen theme persists across reload and beats the system preference', async ({ page }) => {
  await page.locator('.topbar .theme-toggle').click();
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('light');

  await page.reload();
  await page.waitForFunction(() => Boolean(window.__ARCADE__?.getState));
  expect(
    await page.evaluate(() => document.documentElement.dataset.theme),
    'the choice must survive reload'
  ).toBe('light');

  // An explicit dark system preference must not override the stored choice.
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.reload();
  await page.waitForFunction(() => Boolean(window.__ARCADE__?.getState));
  expect(
    await page.evaluate(() => document.documentElement.dataset.theme),
    'the stored choice must beat the system preference'
  ).toBe('light');
  expect(await page.evaluate(() => window.localStorage.getItem('pocket-arcade:theme'))).toBe(
    'light'
  );
});

test('the shell boots dark and stays playable when storage is unavailable', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new Error('storage disabled');
      }
    });
  });
  await page.reload();
  await page.waitForFunction(() => Boolean(window.__ARCADE__?.getState));
  expect(
    await page.evaluate(() => document.documentElement.dataset.theme),
    'broken storage must fall back to the dark identity'
  ).toBe('dark');
  // The toggle still works in-session; persistence is simply best-effort.
  await page.locator('.topbar .theme-toggle').click();
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('light');
  expect(errors).toEqual([]);
});

test('theme toggle is touch-sized and shares the Restart row on mobile', async ({
  page,
  viewport
}) => {
  test.skip(Boolean(viewport && viewport.width >= 900), 'mobile-only sizing assertions');
  const toggle = await page.locator('.topbar .theme-toggle').boundingBox();
  expect(toggle, 'toggle must render on mobile').not.toBeNull();
  expect(toggle!.height, '44px touch floor').toBeGreaterThanOrEqual(44);
  expect(toggle!.width, '44px touch floor').toBeGreaterThanOrEqual(44);
  // The toggle must not grow the topbar: it sits beside Restart, not below it.
  const restart = await page.getByRole('button', { name: 'Restart' }).boundingBox();
  expect(
    Math.abs(toggle!.y - restart!.y),
    'toggle and Restart must share a row'
  ).toBeLessThanOrEqual(1);
});

test('page surfaces opt out of double-tap zoom so rapid taps cannot zoom mid-game', async ({
  page,
  viewport
}) => {
  test.skip(Boolean(viewport && viewport.width >= 900), 'mobile-only touch assertions');
  // Headless cannot reproduce iOS Safari's double-tap zoom itself; this pins
  // the computed touch-action contract that suppresses it. A gesture is only
  // allowed if the touched element AND its ancestors allow it, so html/body
  // carrying `manipulation` protects every off-control tap (topbar, shell
  // padding, grid gaps) while keeping pinch-zoom available for accessibility.
  const surfaces = await page.evaluate(() => {
    const read = (selector: string) => {
      const el = selector === 'html' ? document.documentElement : document.querySelector(selector);
      return el ? getComputedStyle(el).touchAction : 'missing';
    };
    return {
      html: read('html'),
      body: read('body'),
      restart: read('.restart-button'),
      select: read('.mobile-game-select'),
      gameRoot: read('.game-root'),
      touchControls: read('.touch-controls')
    };
  });
  expect(surfaces.html, 'html must opt out of double-tap zoom').toBe('manipulation');
  expect(surfaces.body, 'body must opt out of double-tap zoom').toBe('manipulation');
  expect(surfaces.restart, 'Restart keeps its tap-safe opt-out').toBe('manipulation');
  expect(surfaces.select, 'game picker keeps its tap-safe opt-out').toBe('manipulation');
  expect(surfaces.gameRoot, 'canvas keeps swallowing all gestures').toBe('none');
  expect(surfaces.touchControls, 'd-pad keeps swallowing all gestures').toBe('none');
});
