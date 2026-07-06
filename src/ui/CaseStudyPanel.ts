export function createCaseStudyPanel(): HTMLElement {
  const panel = document.createElement('aside');
  panel.className = 'panel case-study';
  panel.innerHTML = `
    <h2>Engineering Case Study</h2>
    <p class="panel-label">Zero assets</p>
    <p>Every visual is drawn at runtime with Phaser Graphics primitives and generated textures; every sound is synthesized with WebAudio oscillators after the first user gesture. System font stacks only — nothing is downloaded.</p>
    <p class="panel-label">Pure logic</p>
    <p>Each game is a deterministic, framework-free engine with seeded randomness. Phaser scenes translate semantic input and render the engine's snapshot, and a tiny TestBridge exposes that snapshot so end-to-end tests can assert real gameplay.</p>
    <p class="panel-label">The games</p>
    <p>A portal snake with a visible speed ramp, a scrolling procedural auto-runner, a shooter with telegraphed hazards, a neon three-lane racer, and a seven-piece stacker with a ghost landing preview.</p>
    <p class="panel-label">Validation</p>
    <p>Strict TypeScript, 66 deterministic logic and contract tests, an import boundary that keeps engines framework-free, and Playwright suites that read canvas pixels to prove the selected game is truly on screen — across desktop and mobile viewports.</p>
  `;
  return panel;
}
