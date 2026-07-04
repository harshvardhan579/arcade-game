# Next Run

## Last iteration (2026-07-04, iteration 12)

**Slice: Star Courier player–enemy collision (fairness). Phase 5 complete.**

- `src/games/star-courier/StarCourierLogic.ts`: enemies now end the run on contact with the ship (`|enemy.x − playerX| < 0.8 && enemy.y > 10.3`, the ship's world-space zone) in addition to bottom-crossing at `y > 11.5`. The ship is no longer a ghost.
- `src/games/star-courier/StarCourierLogic.test.ts`: two deterministic tests — seed 9's first enemy (column 2) collides with a ship parked in column 2 strictly between y 10.3 and 11.5 (proving collision, not bottom-crossing, ended the run), and a ship one full column away (column 3) survives until that enemy passes y 11.2. Existing determinism tests unaffected (verified by full suite).
- Scene needed no change — death feedback already keys off `isGameOver` flipping.

**Validation:** build + tsc ✓, 34 vitest ✓, lint ✓, e2e 18 passed / 14 intentionally skipped ✓ (the deep Star Courier e2e still passes; its run can now end by collision or bottom-crossing, both covered by its `isGameOver` wait).

**Bundle baseline:** ~1,220 kB raw / ~326 kB gzip single chunk (Phase 7 debt, unchanged).

## Phase status

- Phases 1–5 ✅ complete. Phase 5 commits: `aca742c`, `1d55ac6`, `dfa8099`, `21b3883`, `6177e6b`, plus this fairness commit.
- **Phase 6 ⬜ (next):** UI shell. Phase 7 ⬜ after that.

## Next highest-leverage task

**Phase 6.1 — UI shell audit + first slice.** Read `index.html`, `src/style.css`, and `src/ui/` (ArcadeShell, GameSelector, TouchControls, CaseStudyPanel) end to end before changing anything (none have been read by the loop yet except in passing). Constraints to preserve: desktop three-column selector/stage/case-study layout; mobile portrait keeps canvas + touch controls in the first viewport with page scrolling disabled; zero external assets (system fonts, CSS-only decoration); compact cards, small radii; `prefers-reduced-motion` respected. Highest-leverage candidates, pick the smallest first slice after the audit:

1. **Per-game high scores on the selector cards / a leaderboard strip** — Phase 2 persisted `pocket-arcade:<gameId>:high` but the shell never shows them; needs a safe read (SafeStorage) + refresh on `arcade-select-game` / game-over. Playwright-assertable via DOM.
2. **Instructions/onboarding** — per-game controls line (e.g. "← → move · Space fire") shown near the stage; content lives in the game registry in `main.ts`.
3. **Arcade cabinet identity** — scanline/glow treatment around the stage, consistent hover/active/focus states on cards and d-pad (CSS only).

Validate each with existing e2e plus a new DOM assertion where applicable (e.g. high-score text appears after seeding localStorage). The ux-polish-auditor agent can produce the audit if custom agents are registered in the session; otherwise audit inline.
