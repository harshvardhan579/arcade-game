# Next Run

## Last iteration (2026-07-04, iteration 13)

**Slice: Phase 6.1 — high scores in the shell + focus states (after a full shell audit).**

- `src/core/ScoreManager.ts`: `record()` now dispatches an `arcade-high-score` CustomEvent (`{ gameId, score }`) when a new high is persisted — event-driven UI updates, no polling.
- `src/ui/GameSelector.ts`: each selector card shows the persisted high (`High 777` / `High —` empty state) read via SafeStorage at build time and updated live from the event. Replaced the dev-noise `portrait / 0.75:1` line on cards.
- `src/style.css`: `.card-high` styling (yellow accent) and `:focus-visible` outlines for game cards, touch buttons, Restart, and the mobile select — cards previously had no visible keyboard focus.
- `tests/highscore.spec.ts`: two new DOM assertions — seeded 777 appears on the Neon Serpent card after reload (empty state `High —` asserted first; safe because seed 7's food spawns at (11,5), unreachable without input, so no score can race the assertion), and the Lane Rush card updates live during the real-gameplay run.

**Shell audit findings (remaining, in priority order):** (1) no per-game instructions/controls hint anywhere; (2) mobile shows no high score (selector hidden; the HUD shows it in-canvas, so lower priority); (3) arcade-cabinet identity is minimal — stage has no scanline/glow treatment, cards/topbar are functional but flat; (4) CaseStudyPanel unreviewed in depth.

**Validation:** build + tsc ✓, 34 vitest ✓, lint ✓, e2e 19 passed / 15 intentionally skipped ✓.

**Bundle baseline:** ~1,220 kB raw / ~326 kB gzip single chunk (Phase 7 debt, unchanged).

## Phase status

- Phases 1–5 ✅ · Phase 6 in progress: high scores in shell + focus states ✅ (this commit)
- **Phase 6 remaining:** instructions, cabinet identity, mobile polish. Phase 7 ⬜.

## Next highest-leverage task

**Phase 6.2 — per-game instructions.** Add a `controls` string to `GameDefinition` in `src/core/types.ts` and to each entry in the `main.ts` registry (e.g. Neon Serpent: "Arrows steer · Space restarts"; Star Courier: "← → move · Space fires"; Lane Rush: "← → change lane"; Circuit Stack: "← → move · ↑ rotate · ↓ drop"; Bounce Circuit: "← → move · ↑ jump"). Render it in the stage topbar (desktop + mobile — one compact line under the title or above the canvas), updating on `arcade-select-game`. Playwright: assert the line changes when switching games. Keep mobile first-viewport constraint intact (one short line; verify with the mobile e2e). Then Phase 6.3: cabinet identity (CSS-only scanline/vignette on `.game-root`, hover polish), then Phase 7 (bundle) — dynamic-import scenes, `manualChunks` for Phaser, before/after gzip numbers.
