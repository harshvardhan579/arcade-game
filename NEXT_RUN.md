# Next Run

## Last iteration (2026-07-04, iteration 14)

**Slice: Phase 6.2 — per-game control instructions.**

- `src/core/types.ts`: `GameDefinition` gains a required `controls` string.
- `src/main.ts`: controls line per game (e.g. Star Courier "← → move · Space fires", Circuit Stack "← → move · ↑ rotate · ↓ drop").
- `src/ui/ArcadeShell.ts`: a compact `.controls-hint` line under the title shows the active game's controls, initialized to the boot game and updated on every `arcade-select-game` (fires from both desktop cards and the mobile picker).
- `src/style.css`: muted, small hint styling.
- `tests/shell.spec.ts` (new): desktop — hint follows card clicks across three games; mobile — hint follows the picker AND `.touch-controls` remains in the first viewport (guards the no-scroll constraint against the extra topbar line).

**Validation:** build + tsc ✓, 34 vitest ✓, lint ✓, e2e 21 passed / 17 intentionally skipped ✓.

**Bundle baseline:** ~1,220 kB raw / ~326 kB gzip single chunk (Phase 7 debt, unchanged).

## Phase status

- Phases 1–5 ✅ · Phase 6: high scores in shell ✅ (`b90966e`), instructions ✅ (this commit)
- **Phase 6 remaining:** cabinet identity polish (CSS-only). Phase 7 ⬜ after that.

## Next highest-leverage task

**Phase 6.3 — arcade cabinet identity (CSS-only, final Phase 6 slice).** Scoped, reversible, zero-asset:

1. `.game-root` bezel treatment: layered `box-shadow` glow (cyan at low alpha) + a subtle CSS scanline overlay via `repeating-linear-gradient` on a `::after` pseudo-element (`pointer-events: none`); gate any animation (e.g. slow flicker) behind `@media (prefers-reduced-motion: no-preference)` — static overlay is fine for reduced motion.
2. Card/topbar polish: consistent `:active` states (slight translateY), Restart button hover, `.eyebrow` letter-spacing bump.
3. Keep radii small and cards compact per design constraints; do not add nested cards.

Validation: visual change only — rely on the full e2e suite (no console errors, mobile first-viewport test from `tests/shell.spec.ts`, `toBeInViewport` guard) and describe what to check by eye in NEXT_RUN. After that: **Phase 7 — bundle/perf**: dynamic-import game scenes from `main.ts` (scene registry becomes lazy), `build.rolldownOptions` `manualChunks` (note: Vite 8 uses rolldown — check the exact option name) to keep Phaser in a vendor chunk, re-run `npm run validate`, and record before/after gzip (baseline: 1,220.31 kB raw / 326.46 kB gzip single chunk).
