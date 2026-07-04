export function createCaseStudyPanel(): HTMLElement {
  const panel = document.createElement('aside');
  panel.className = 'panel case-study';
  panel.innerHTML = `
    <h2>Engineering Case Study: AI-Assisted Build</h2>
    <p>Zero external assets: visuals are Phaser Graphics primitives and audio is synthesized after the first user gesture with WebAudio oscillators.</p>
    <p>Each game keeps deterministic, framework-free logic in a dedicated engine. Phaser scenes translate semantic input, render state, play cues, and publish a tiny TestBridge snapshot for canvas E2E tests.</p>
    <p>The shell supports per-game aspect hints: Neon Serpent, Star Courier, Lane Rush, and Circuit Stack favor portrait play, while Bounce Circuit uses a compact single-screen portrait layout.</p>
    <p>Validation is chained through build, Vitest logic tests, ESLint/import-boundary checks, Prettier, and Playwright smoke tests across desktop and mobile viewports.</p>
  `;
  return panel;
}
