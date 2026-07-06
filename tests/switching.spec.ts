import { expect, test } from '@playwright/test';

// Pixel thresholds assume the desktop canvas (~562x750). The mobile picker
// drives the same startGame path, so this desktop regression covers both.
test.skip(
  ({ viewport }) => Boolean(viewport && viewport.width < 900),
  'selector is intentionally hidden on mobile'
);

type Region = { x0: number; y0: number; x1: number; y1: number };

async function countColor(
  page: import('@playwright/test').Page,
  color: [number, number, number],
  region?: Region
): Promise<number> {
  return page.evaluate(
    ({ color, region }) => {
      const canvas = document.querySelector('#game-root canvas') as HTMLCanvasElement;
      const ctx = canvas.getContext('2d')!;
      const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const [r, g, b] = color;
      const x0 = Math.floor((region?.x0 ?? 0) * canvas.width);
      const x1 = Math.floor((region?.x1 ?? 1) * canvas.width);
      const y0 = Math.floor((region?.y0 ?? 0) * canvas.height);
      const y1 = Math.floor((region?.y1 ?? 1) * canvas.height);
      let count = 0;
      for (let y = y0; y < y1; y += 1) {
        for (let x = x0; x < x1; x += 1) {
          const i = (y * canvas.width + x) * 4;
          if (
            Math.abs(image.data[i]! - r) <= 6 &&
            Math.abs(image.data[i + 1]! - g) <= 6 &&
            Math.abs(image.data[i + 2]! - b) <= 6
          ) {
            count += 1;
          }
        }
      }
      return count;
    },
    { color, region }
  );
}

const ROAD: [number, number, number] = [13, 37, 43];
const GROUND: [number, number, number] = [18, 53, 60];
const CYAN: [number, number, number] = [77, 255, 225];
const MAGENTA: [number, number, number] = [255, 79, 216];
const GRID_STROKE: [number, number, number] = [41, 70, 76];

const games = [
  {
    id: 'neon-serpent',
    name: 'Neon Serpent',
    hint: 'Arrows steer · eating speeds up · Space restarts'
  },
  { id: 'bounce-circuit', name: 'Bounce Circuit', hint: '↑ jump · ← → shift · Space restarts' },
  { id: 'star-courier', name: 'Star Courier', hint: '← → move · Space fires' },
  { id: 'lane-rush', name: 'Lane Rush', hint: '← → change lanes' },
  { id: 'circuit-stack', name: 'Circuit Stack', hint: '← → move · ↑ rotate · ↓ drop' }
] as const;

type GameEntry = (typeof games)[number];

async function switchTo(page: import('@playwright/test').Page, game: GameEntry): Promise<void> {
  await page.getByRole('button', { name: new RegExp(game.name) }).click();
  await page.waitForFunction((key) => window.__ARCADE__?.activeScene === key, game.id);
  await expect(page.locator('.controls-hint')).toHaveText(game.hint);
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  );
}

async function expectRendered(
  page: import('@playwright/test').Page,
  id: GameEntry['id']
): Promise<void> {
  if (id === 'circuit-stack') {
    expect(
      await countColor(page, GRID_STROKE),
      'circuit-stack grid must be on screen'
    ).toBeGreaterThan(3000);
    return;
  }
  expect(
    await countColor(page, GRID_STROKE),
    `circuit-stack grid must be gone while ${id} plays`
  ).toBeLessThan(500);
  if (id === 'lane-rush') {
    expect(await countColor(page, ROAD), 'lane-rush road must fill the screen').toBeGreaterThan(
      200_000
    );
  } else if (id === 'bounce-circuit') {
    expect(
      await countColor(page, GROUND),
      'bounce-circuit ground strip must be visible'
    ).toBeGreaterThan(2500);
  } else if (id === 'star-courier') {
    expect(
      await countColor(page, CYAN, { x0: 0.35, y0: 0.8, x1: 0.65, y1: 0.95 }),
      'star-courier ship must sit at the bottom center'
    ).toBeGreaterThan(300);
    expect(await countColor(page, ROAD), 'no lane-rush road behind the ship').toBeLessThan(100_000);
  } else {
    expect(
      await countColor(page, MAGENTA),
      'neon-serpent food pellet must be visible'
    ).toBeGreaterThan(50);
    expect(
      await countColor(page, MAGENTA),
      'a magenta count this large means the circuit-stack piece is still on screen'
    ).toBeLessThan(3000);
  }
}

test('switching renders the selected game, including back out of Circuit Stack', async ({
  page
}) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__ARCADE__?.getState));

  for (const game of games.slice(1)) {
    await switchTo(page, game);
    await expectRendered(page, game.id);
  }

  const circuitStack = games[4];
  for (const target of games.slice(0, 4)) {
    await switchTo(page, target);
    await expectRendered(page, target.id);
    await switchTo(page, circuitStack);
    await expectRendered(page, circuitStack.id);
  }

  expect(errors).toEqual([]);
});
