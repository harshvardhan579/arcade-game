# NEXT_RUN — Theme Pass 1: COMPLETE

Branch `theme-pass-1` is **done and ready for review** — all six phases of
`.claude/theme-pass-loop.md` executed in green, committed slices. Pocket Arcade now has
a polished, accessible dark/light theme system for the shell: dark remains the primary
retro-neon identity (verified byte-identical through the token refactor), light is a
"daylight cabinet" with WCAG-checked contrast, and the game canvases stay dark/neon in
both themes — pixel signatures were untouched by construction and re-verified.

## Commit table (this pass)

| Commit    | Phase | What                                                                    |
| --------- | ----- | ----------------------------------------------------------------------- |
| `b955d66` | prep  | Theme pass execution loop                                               |
| `84eb4f5` | 0     | Audit + palette design (contrast math, token map, risk gate)            |
| `81cfee1` | 1     | Token foundation + light override; dark proven byte-identical           |
| `9039eb2` | 2     | ◐ toggle after Restart; zero mobile topbar height via `1fr auto` grid   |
| `fab516e` | 3     | Persistence + system preference + no-FOUC inline script; Playwright pin |
| `3c3a58d` | 4     | Landscape overlay/topbar overlap fix (fail-first); themed meta          |
| (HEAD)    | 5     | Close-out: docs, flake pass, final validation                           |

## Final validation (2026-07-06)

- **Fresh full `npm run validate`:** green — build + strict tsc, **73 Vitest**, ESLint +
  import boundary + Prettier, Playwright **44 passed / 30 intentionally skipped**
  (both projects; suite baseline pinned to `colorScheme: 'dark'`, theme tests emulate
  both directions).
- **Flake pass** (`shell + smoke`, `--repeat-each=2`, both projects): **50 passed /
  26 intentionally skipped, 0 failures** — theme/storage state introduces no flake.
- **Dark identity:** element screenshots byte-identical through the token refactor;
  every pre-existing assertion ran unchanged.
- **Docs refreshed:** README Themes section; CLAUDE.md theme invariant (token
  mechanism, `.theme-toggle` protected hook, the **never-remove `colorScheme: 'dark'`
  Playwright pin**, theme CSS must not touch `touch-action`/focus-ring/layout);
  CURRENT_APP_STATE.md header + test-coverage section.

## Manual QA on a real phone (~3 min, cannot be proven headless)

1. Toggle ◐ with a thumb on portrait and landscape: theme flips instantly, Restart and
   the picker stay tappable (landscape ACTION button clears them — the Phase 4 fix).
2. Kill and relaunch the browser: the chosen theme comes back with no flash of the
   wrong theme; the status-bar/tab chrome matches (`theme-color`).
3. With no stored choice (clear site data), the app follows the OS appearance setting.
4. Light theme outdoors-legibility spot check: cards, picker, HUD-over-canvas,
   game-over overlay; iOS select popup renders light (via `color-scheme`).
5. Reduced motion on: theme switch is instant (no transition churn), everything still
   readable in both themes.

## Known remaining ideas (not blocking)

- Optional: a `?theme=` debug param mirroring `?seed=`; per-theme screenshots in CI;
  the pre-theme backlog items (iPad landscape, designed audio, pause/win meta) are
  unchanged and still tracked in `RESEARCH_BACKLOG.md`.

## Merge recommendation

**Ready to push and PR** (`theme-pass-1` → `main`): 7 commits — loop + audit docs, four
green implementation slices, this close-out — each independently validated, with the
full suite and a doubled flake pass green at HEAD. Suggested PR title: "Theme pass:
dark/light shell themes with persistence and system preference". The phone QA list
above is the only outstanding verification and is non-blocking.
