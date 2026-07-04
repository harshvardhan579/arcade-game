import { expect, test } from '@playwright/test';

type Cell = { x: number; y: number };

test.skip(
  ({ viewport }) => Boolean(viewport && viewport.width < 900),
  'selector is intentionally hidden on mobile'
);

async function openGame(
  page: import('@playwright/test').Page,
  name: string,
  sceneKey: string
): Promise<void> {
  await page.getByRole('button', { name: new RegExp(name) }).click();
  await page.waitForFunction((key) => window.__ARCADE__?.activeScene === key, sceneKey);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur?.());
}

async function snapshot(page: import('@playwright/test').Page): Promise<Record<string, unknown>> {
  return page.evaluate(() => window.__ARCADE__!.getState() as Record<string, unknown>);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__ARCADE__?.getState));
});

test('Bounce Circuit: jump rises and lands, spike ends the run, ACTION restarts', async ({
  page
}) => {
  await openGame(page, 'Bounce Circuit', 'bounce-circuit');
  await page.waitForFunction(() => window.__ARCADE__!.getState().playerY === 0);
  await page.keyboard.press('ArrowUp');
  await page.waitForFunction(() => (window.__ARCADE__!.getState().playerY as number) > 0);
  await page.waitForFunction(() => window.__ARCADE__!.getState().playerY === 0);

  let over = false;
  for (let i = 0; i < 30 && !over; i += 1) {
    const before = (await snapshot(page)).tick as number;
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(
      (tick) => (window.__ARCADE__!.getState().tick as number) > tick,
      before
    );
    over = (await snapshot(page)).isGameOver as boolean;
  }
  expect(over, 'walking into the spike at x=4 must end the run').toBe(true);

  await page.keyboard.press(' ');
  await page.waitForFunction(() => window.__ARCADE__!.getState().isGameOver === false);
  const restarted = await snapshot(page);
  expect(restarted.playerX).toBe(1);
  expect(restarted.score).toBe(0);
});

test('Star Courier: ACTION fires a projectile and playerX clamps at the left edge', async ({
  page
}) => {
  await openGame(page, 'Star Courier', 'star-courier');
  await page.keyboard.press(' ');
  await page.waitForFunction(
    () => (window.__ARCADE__!.getState().projectiles as Cell[]).length > 0
  );
  for (let i = 0; i < 8; i += 1) await page.keyboard.press('ArrowLeft');
  const state = await snapshot(page);
  expect(state.playerX).toBe(0);
  for (const projectile of state.projectiles as Cell[]) {
    expect(projectile.x).toBeGreaterThanOrEqual(0);
    expect(projectile.x).toBeLessThanOrEqual(10);
    expect(projectile.y).toBeGreaterThanOrEqual(0);
  }
});

test('Lane Rush: lane clamps at both edges and traffic stays within world bounds', async ({
  page
}) => {
  await openGame(page, 'Lane Rush', 'lane-rush');
  for (let i = 0; i < 3; i += 1) await page.keyboard.press('ArrowLeft');
  expect((await snapshot(page)).lane).toBe(0);
  for (let i = 0; i < 5; i += 1) await page.keyboard.press('ArrowRight');
  expect((await snapshot(page)).lane).toBe(2);

  await page.waitForFunction(
    () => (window.__ARCADE__!.getState().traffic as Cell[]).length > 0,
    undefined,
    { timeout: 10_000 }
  );
  const cars = (await snapshot(page)).traffic as { lane: number; y: number }[];
  for (const car of cars) {
    expect([0, 1, 2]).toContain(car.lane);
    expect(car.y).toBeLessThan(12);
  }
});

test('Circuit Stack: DOWN soft-drops, UP rotates the piece, and locking fills the grid', async ({
  page
}) => {
  await openGame(page, 'Circuit Stack', 'circuit-stack');
  const before = await snapshot(page);
  await page.keyboard.press('ArrowDown');
  await page.waitForFunction(
    (y) => (window.__ARCADE__!.getState().pieceY as number) > y,
    before.pieceY as number
  );

  const preRotate = await snapshot(page);
  const offsets = (cells: Cell[], px: number, py: number) =>
    cells
      .map((cell) => `${cell.x - px},${cell.y - py}`)
      .sort()
      .join(' ');
  const beforeOffsets = offsets(
    preRotate.pieceCells as Cell[],
    preRotate.pieceX as number,
    preRotate.pieceY as number
  );
  await page.keyboard.press('ArrowUp');
  await page.waitForFunction(
    ({ px, base }) => {
      const state = window.__ARCADE__!.getState();
      const cells = state.pieceCells as { x: number; y: number }[];
      const current = cells
        .map((cell) => `${cell.x - (state.pieceX as number)},${cell.y - (state.pieceY as number)}`)
        .sort()
        .join(' ');
      return current !== base || (state.pieceX as number) !== px;
    },
    { px: preRotate.pieceX as number, base: beforeOffsets }
  );

  for (let i = 0; i < 16; i += 1) await page.keyboard.press('ArrowDown');
  await page.waitForFunction(
    () => (window.__ARCADE__!.getState().occupied as number) >= 4,
    undefined,
    { timeout: 5_000 }
  );
  expect((await snapshot(page)).occupied as number).toBeGreaterThanOrEqual(4);
});

test('Neon Serpent: obstacle collision ends the run without errors and Space restarts', async ({
  page
}) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await openGame(page, 'Neon Serpent', 'neon-serpent');
  await page.getByRole('button', { name: 'Restart' }).click();
  await page.waitForFunction(() => {
    const state = window.__ARCADE__!.getState();
    return state.score === 0 && state.headY === 12 && state.isGameOver === false;
  });
  await page.keyboard.press('ArrowUp');

  let over = false;
  for (let attempt = 0; attempt < 4 && !over; attempt += 1) {
    await page.waitForFunction(
      () => {
        const state = window.__ARCADE__!.getState();
        return state.headY === 6 || state.isGameOver === true;
      },
      undefined,
      { timeout: 10_000 }
    );
    await page.keyboard.press('ArrowLeft');
    over = await page
      .waitForFunction(() => window.__ARCADE__!.getState().isGameOver === true, undefined, {
        timeout: 4_000
      })
      .then(() => true)
      .catch(() => false);
    if (!over) await page.keyboard.press('ArrowUp');
  }
  expect(over, 'steering left along row 6 must hit the obstacle at (4,6)').toBe(true);

  await page.keyboard.press(' ');
  await page.waitForFunction(() => window.__ARCADE__!.getState().isGameOver === false);
  expect(errors).toEqual([]);
});

test('Neon Serpent honors reduced motion without breaking play', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await page.waitForFunction(() => Boolean(window.__ARCADE__?.getState));
  const before = await snapshot(page);
  await page.keyboard.press('ArrowDown');
  await page.waitForFunction(
    (tick) => (window.__ARCADE__!.getState().tick as number) > tick,
    before.tick as number
  );
  expect(errors).toEqual([]);
});

test('Neon Serpent: heading up wraps the head through the top portal', async ({ page }) => {
  await openGame(page, 'Neon Serpent', 'neon-serpent');
  await page.getByRole('button', { name: 'Restart' }).click();
  await page.waitForFunction(() => {
    const state = window.__ARCADE__!.getState();
    return state.score === 0 && state.headY === 12;
  });
  await page.keyboard.press('ArrowUp');
  await page.waitForFunction(() => window.__ARCADE__!.getState().headY === 23, undefined, {
    timeout: 10_000
  });
  expect((await snapshot(page)).isGameOver).toBe(false);
});
