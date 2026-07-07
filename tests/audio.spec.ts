import { expect, test } from '@playwright/test';

declare global {
  interface Window {
    __LISTENER_COUNTS__?: Record<string, number>;
    __AUDIO_CONTEXT_COUNT__?: number;
  }
}

test('cycling all games does not accumulate audio unlock listeners or throw', async ({
  page,
  viewport
}) => {
  test.skip(
    Boolean(viewport && viewport.width < 900),
    'selector is intentionally hidden on mobile'
  );
  await page.addInitScript(() => {
    window.__AUDIO_CONTEXT_COUNT__ = 0;
    const OriginalAudioContext = window.AudioContext;
    window.AudioContext = class extends OriginalAudioContext {
      constructor(options?: AudioContextOptions) {
        super(options);
        window.__AUDIO_CONTEXT_COUNT__ = (window.__AUDIO_CONTEXT_COUNT__ ?? 0) + 1;
      }
    };
    const counts: Record<string, number> = {};
    window.__LISTENER_COUNTS__ = counts;
    const originalAdd = window.addEventListener.bind(window);
    const originalRemove = window.removeEventListener.bind(window);
    window.addEventListener = ((type: string, ...rest: unknown[]) => {
      counts[type] = (counts[type] ?? 0) + 1;
      return (originalAdd as (...args: unknown[]) => void)(type, ...rest);
    }) as typeof window.addEventListener;
    window.removeEventListener = ((type: string, ...rest: unknown[]) => {
      counts[type] = (counts[type] ?? 0) - 1;
      return (originalRemove as (...args: unknown[]) => void)(type, ...rest);
    }) as typeof window.removeEventListener;
  });

  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto('/?game=neon-serpent');
  await page.waitForFunction(() => Boolean(window.__ARCADE__?.getState));
  const baseline = await page.evaluate(() => ({ ...window.__LISTENER_COUNTS__ }));

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
  await page.waitForFunction(() => window.__ARCADE__!.activeScene === 'neon-serpent');

  const after = await page.evaluate(() => ({ ...window.__LISTENER_COUNTS__ }));
  for (const type of ['pointerdown', 'keydown', 'touchstart']) {
    expect(after[type] ?? 0, `active ${type} listeners must not grow`).toBeLessThanOrEqual(
      baseline[type] ?? 0
    );
  }
  const contexts = await page.evaluate(() => window.__AUDIO_CONTEXT_COUNT__);
  expect(contexts, 'the arcade must share a single AudioContext').toBeLessThanOrEqual(1);
  expect(errors).toEqual([]);
});
