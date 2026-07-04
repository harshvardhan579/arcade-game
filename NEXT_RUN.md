# Next Run

## Last iteration (2026-07-04, iteration 15)

**Slice: Phase 6.3 — cabinet identity (CSS-only). Phase 6 complete.**

- `src/style.css`: `.game-root` now reads as a cabinet screen — cyan outer glow + inner vignette (`box-shadow` pair) and a static CRT scanline overlay (`::after` with `repeating-linear-gradient`, `pointer-events: none`, `z-index` above the canvas). No animation added, so nothing new to gate for reduced motion (static decoration, no churn). Interaction polish: `:active` translateY on cards/touch buttons/Restart, touch-button pressed background, Restart hover brightness, eyebrow letter-spacing.
- **Visually verified via screenshots** (desktop 1440×900 + mobile 390×844, captured with a temporary Playwright spec, since deleted): scanlines and glow render subtly; three-column desktop layout intact; mobile keeps canvas + full d-pad in the first viewport; cards show high scores; controls hint present. Screenshots were session-scratchpad artifacts (ephemeral) — rerun `npm run dev` to eyeball.

**Validation:** build + tsc ✓, 34 vitest ✓, lint ✓, e2e 21 passed / 17 intentionally skipped ✓ (includes the mobile `toBeInViewport` guard and all no-console-error assertions with the overlay active).

**Bundle baseline:** ~1,220 kB raw / ~326 kB gzip single chunk — Phase 7 starts now.

## Phase status

- Phases 1–6 ✅ complete. Phase 6 commits: `b90966e`, `1ea0c26`, this commit.
- **Phase 7 ⬜ (next, final phase):** bundle/performance.

## Next highest-leverage task

**Phase 7 — bundle split.** Current: one 1,220 kB raw / 326 kB gzip chunk (Phaser + app together). Plan:

1. In `vite.config.ts`, configure manual chunks to isolate Phaser into a vendor chunk. Vite 8 is rolldown-based — the build warning earlier mentioned `build.rolldownOptions.output.codeSplitting`; check whether `build.rollupOptions.output.manualChunks` still works (compat) or the rolldown equivalent is needed. Verify against the actual Vite 8 config surface before committing to an approach.
2. Dynamic-import the five scene classes in `src/main.ts` (`await Promise.all([...import(...)])` before `new Phaser.Game`, or register scenes lazily via `game.scene.add`) so each game's scene+logic code splits per game. Phaser's `scene:` config array needs classes up front — the simplest correct split is: keep scenes eagerly imported but split _Phaser itself_ into a vendor chunk (browser caches it separately); per-scene lazy loading is a stretch goal only if the scene registry can be made async without breaking `startGame`/TestBridge timing (smoke test waits for the bridge — would still pass if boot completes async).
3. Re-run `npm run validate` and record before/after raw+gzip in NEXT_RUN.md. Success = no behavior change, all 21 e2e still green, and the main app chunk drops to a few kB with Phaser cached separately. Do not chase further perf work beyond this without measurements; per-frame allocation audit was kept in check throughout Phase 5 (fresh arrays per getState are bounded by entity counts ≤ ~30).

After Phase 7: all seven phases complete — do a final wrap-up iteration (full validate, update README "Current Limitations" which still claims games are untuned MVPs and the bundle is unsplit, close out NEXT_RUN.md with a session summary, and stop the loop).
