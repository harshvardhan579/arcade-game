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

// Live runs draw a fresh seed per run; every seeded expectation below
// (seed-9 column-2 opener, seed-12 parked crash, seed-11 spike course, the
// seed-14 bag, seed-7 food) stays bit-identical by forcing the historical
// default seeds before the app boots.
const FORCED_DEFAULT_SEEDS = {
  'neon-serpent': 7,
  'bounce-circuit': 11,
  'star-courier': 9,
  'lane-rush': 12,
  'circuit-stack': 14
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript((seeds) => {
    window.__ARCADE_FIXED_SEEDS__ = seeds;
  }, FORCED_DEFAULT_SEEDS);
  await page.goto('/?game=neon-serpent');
  await page.waitForFunction(() => Boolean(window.__ARCADE__?.getState));
});

test('forced seeds reproduce the identical run across restarts', async ({ page }) => {
  await openGame(page, 'Circuit Stack', 'circuit-stack');
  // Capture atomically inside the poll: a separate snapshot round-trip can
  // land after the first piece locks (~720 ms under parallel-worker load),
  // by which point nextPiece has legitimately advanced to the next deal.
  const capture = async () => {
    const handle = await page.waitForFunction(() => {
      const state = window.__ARCADE__!.getState();
      return (state.tick as number) > 0
        ? JSON.stringify({ tick: state.tick, runSeed: state.runSeed, nextPiece: state.nextPiece })
        : false;
    });
    return JSON.parse((await handle.jsonValue()) as string) as {
      tick: number;
      runSeed: number;
      nextPiece: number;
    };
  };
  const first = await capture();
  expect(first.runSeed, 'bridge must expose the forced run seed').toBe(14);
  await page.getByRole('button', { name: 'Restart' }).click();
  await page.waitForFunction(
    (tick) => (window.__ARCADE__!.getState().tick as number) < tick,
    first.tick
  );
  const second = await capture();
  expect(second.runSeed, 'restart must reuse the forced seed').toBe(14);
  expect(second.nextPiece, 'the forced seed must redeal the same bag').toBe(first.nextPiece);
});

test('Circuit Stack: live restarts redeal the bag from fresh seeds', async ({ page }) => {
  await openGame(page, 'Circuit Stack', 'circuit-stack');
  expect((await snapshot(page)).runSeed, 'this spec forces seed 14 on load').toBe(14);
  // Drop the forced-seed map: every restart from here on is a live run
  // (nextRunSeed consults the override at each restart, not just at boot).
  await page.evaluate(() => {
    delete window.__ARCADE_FIXED_SEEDS__;
  });
  await page.getByRole('button', { name: 'Restart' }).click();
  await page.waitForFunction(() => window.__ARCADE__!.getState().runSeed !== 14);
  const first = await snapshot(page);
  await page.getByRole('button', { name: 'Restart' }).click();
  await page.waitForFunction(
    (seed) => window.__ARCADE__!.getState().runSeed !== seed,
    first.runSeed
  );
  const second = await snapshot(page);
  expect(second.runSeed, 'each live restart draws a fresh bag seed').not.toBe(first.runSeed);
  expect(second.isGameOver).toBe(false);
});

test('Bounce Circuit: auto-runs forward with working jump feel', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await openGame(page, 'Bounce Circuit', 'bounce-circuit');
  const start = await snapshot(page);
  await page.waitForFunction(
    (camera) => (window.__ARCADE__!.getState().cameraX as number) > camera + 2,
    start.cameraX as number,
    { timeout: 8_000 }
  );
  await page.waitForFunction(() => window.__ARCADE__!.getState().grounded === true);
  await page.keyboard.press('ArrowUp');
  await page.waitForFunction(() => (window.__ARCADE__!.getState().playerY as number) > 0);
  await page.waitForFunction(() => window.__ARCADE__!.getState().grounded === true, undefined, {
    timeout: 5_000
  });
  expect(errors).toEqual([]);
});

test('Bounce Circuit: an unguided run dies on a spike, banks distance, and restarts', async ({
  page
}) => {
  test.setTimeout(30_000);
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await openGame(page, 'Bounce Circuit', 'bounce-circuit');
  await page.waitForFunction(() => window.__ARCADE__!.getState().isGameOver === true, undefined, {
    timeout: 15_000
  });
  const over = await snapshot(page);
  expect(over.score as number, 'death must bank the distance run').toBeGreaterThanOrEqual(28);
  await page.keyboard.press(' ');
  await page.waitForFunction(() => {
    const state = window.__ARCADE__!.getState();
    return state.isGameOver === false && (state.cameraX as number) < 2 && state.score === 0;
  });
  expect(errors).toEqual([]);
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
  // Presses queue the clamped target; the ship glides there within a second.
  expect((await snapshot(page)).playerTargetX).toBe(0);
  await page.waitForFunction(() => window.__ARCADE__!.getState().playerX === 0);
  const state = await snapshot(page);
  expect(state.playerX).toBe(0);
  for (const projectile of state.projectiles as Cell[]) {
    expect(projectile.x).toBeGreaterThanOrEqual(0);
    expect(projectile.x).toBeLessThanOrEqual(10);
    expect(projectile.y).toBeGreaterThanOrEqual(0);
  }
});

test('Star Courier: killing the first enemy scores and an unchecked wave ends the run', async ({
  page
}) => {
  test.setTimeout(45_000);
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await openGame(page, 'Star Courier', 'star-courier');
  await page.waitForFunction(
    () => (window.__ARCADE__!.getState().enemies as Cell[]).length > 0,
    undefined,
    { timeout: 10_000 }
  );
  for (let i = 0; i < 3; i += 1) await page.keyboard.press('ArrowLeft');
  expect((await snapshot(page)).playerTargetX, 'seed 9 spawns the first enemy in column 2').toBe(2);
  await page.waitForFunction(() => window.__ARCADE__!.getState().playerX === 2);

  let scored = false;
  for (let i = 0; i < 6 && !scored; i += 1) {
    await page.keyboard.press(' ');
    scored = await page
      .waitForFunction(() => (window.__ARCADE__!.getState().score as number) >= 15, undefined, {
        timeout: 2_000
      })
      .then(() => true)
      .catch(() => false);
  }
  expect(scored, 'shooting down the lane must destroy the enemy for 15 points').toBe(true);

  await page.waitForFunction(() => window.__ARCADE__!.getState().isGameOver === true, undefined, {
    timeout: 25_000
  });
  await page.keyboard.press(' ');
  await page.waitForFunction(() => window.__ARCADE__!.getState().isGameOver === false);
  expect((await snapshot(page)).score).toBe(0);
  expect(errors).toEqual([]);
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

test('Lane Rush: double-tap ACTION triggers the boost', async ({ page }) => {
  await openGame(page, 'Lane Rush', 'lane-rush');
  const before = await snapshot(page);
  expect(before.boostTicksLeft).toBe(0);
  await page.keyboard.press(' ');
  await page.keyboard.press(' ');
  // handleInput arms the boost instantly; the multiplied speed lands on the
  // next fixed step, so wait on both together.
  await page.waitForFunction((baseline) => {
    const state = window.__ARCADE__!.getState();
    return (state.boostTicksLeft as number) > 0 && (state.speed as number) > baseline * 1.4;
  }, before.speed as number);
  const boosted = await snapshot(page);
  expect(boosted.boostTicksLeft as number).toBeGreaterThan(0);
});

test('Lane Rush: a parked player near-misses, then crashes, then restarts cleanly', async ({
  page
}) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await openGame(page, 'Lane Rush', 'lane-rush');
  await page.waitForFunction(() => (window.__ARCADE__!.getState().score as number) > 0, undefined, {
    timeout: 10_000
  });
  await page.waitForFunction(() => window.__ARCADE__!.getState().isGameOver === true, undefined, {
    timeout: 10_000
  });
  await page.keyboard.press(' ');
  await page.waitForFunction(() => {
    const state = window.__ARCADE__!.getState();
    return state.isGameOver === false && state.score === 0;
  });
  expect(errors).toEqual([]);
});

test('Circuit Stack: DOWN soft-drops, UP rotates the piece, and locking fills the grid', async ({
  page
}) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
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
  expect(errors).toEqual([]);
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
