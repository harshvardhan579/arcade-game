# Future Agent Guide

This repo is a zero-asset Phaser 3 arcade. Preserve the architecture before adding features.

## Hard Rules

- Keep all `*Logic.ts` files framework-independent.
- Do not import `phaser`, `AudioEngine`, DOM APIs, `window`, `document`, or `localStorage` from logic files or Vitest logic tests.
- Use deterministic `SeededRandom` for any gameplay randomness that tests may need to verify.
- Keep Phaser scenes responsible for rendering, input translation, synthesized audio cues, and TestBridge publishing only.
- Do not add external image, audio, SVG, font, or sprite assets.
- Do not assert audio output in Playwright; only ensure audio initialization paths do not throw.

## TestBridge Contract

Scenes publish:

```ts
window.__ARCADE__ = {
  activeScene: string,
  getState(): {
    score: number;
    isGameOver: boolean;
    tick: number;
  }
};
```

Playwright reads this bridge with `page.evaluate`. Keep snapshots JSON-serializable and avoid exposing Phaser objects.

## Validation

Run the full loop before claiming completion:

```bash
npm run validate
```

The lint script includes ESLint, the custom import-boundary guard, and Prettier. If the boundary fails, fix the architecture rather than weakening the guard.

## Console And Headless Caveats

The smoke suite asserts `console.error` only. Phaser or browsers may emit harmless logs or warnings in headless mode; do not fail tests on general `console.log`, `console.info`, or warning output unless it indicates a real regression.

## Design Constraints

- Mobile portrait should keep gameplay and virtual controls visible without scrolling.
- Desktop should preserve the selector / stage / engineering case-study layout.
- Honor `prefers-reduced-motion` by avoiding decorative churn while keeping gameplay intact.
- Cards should stay compact with small radii and no nested card stacks.

## Version Notes

The project intentionally pins Phaser `3.90.0` even though npm latest may be Phaser 4. Do not migrate to Phaser 4 unless the architecture and scene APIs are deliberately updated together.
