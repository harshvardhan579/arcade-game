# NEXT_RUN — UI Revamp Pass (branch `ui-revamp-pass-1`)

Loop: `.claude/ui-revamp-loop.md`. Spec: `UI_REVAMP_SPEC.md` (marked
**IMPLEMENTED**, deviations recorded inline in §4/§6/§7/§10). System map:
`CURRENT_APP_STATE.md` (header note added for this pass). **Pass complete —
phases 0–6 done, all green, ready to push + PR.**

## Phase status

| Phase | Scope                                      | Status              |
| ----- | ------------------------------------------ | ------------------- |
| 0     | UI audit + design spec (no implementation) | done (`bd0fbbc`)    |
| 1     | Design tokens + base shell polish          | done (`6665cc3`)    |
| 2     | Home screen revamp                         | done (`d2c844c`)    |
| 3     | Game mode shell revamp                     | done (`ef37a58`)    |
| 4     | Game-over + leaderboard score terminal     | done (`77161b9`)    |
| 5     | Motion and interaction polish              | done (`de9f045`)    |
| 6     | Final validation + docs + PR prep          | **done** (this run) |

## Phase 6 (this run) — closeout

**What changed:** docs + evidence only — `CURRENT_APP_STATE.md` (revamp
header note, three stale statements corrected), `UI_REVAMP_SPEC.md`
(IMPLEMENTED banner), this file. `README.md` deliberately untouched: every
claim was re-checked against the final build and none became stale (app chunk
19.28 kB gzip vs the documented ≈19; theme/layout descriptions still exact).

**Branch hygiene (verified):** `main..HEAD` = 7 commits touching only
`src/style.css`, `src/ui/{CaseStudyPanel,GameSelector,HomeScreen,LeaderboardPanel}.ts`,
docs, and the loop file. No `.env`/secret files tracked; zero image/font/
audio files added anywhere; screenshots live untracked under
`output/ui-revamp/` (prettier-ignored evidence, never in `src/`/`public/`).

**Final validation (all green, fresh):**

- `npm run validate` → build (tsc root + api + vite) OK · **Vitest 154**
  (11 files) · eslint + **import-boundary (16 files)** + prettier OK ·
  Playwright **103 passed / 33 skipped** (desktop + mobile), pixel signatures
  included.
- Flake sweep `npx playwright test home shell leaderboard smoke
--repeat-each=2` (both projects) → **168 passed / 32 skipped, zero flakes**.
- `grep -riE 'supabase|service_role|LEADERBOARD_IP_SALT' dist/` → empty.
- Bundle after the pass: app JS **19.28 kB gzip** (baseline ≈19 — no code
  growth), CSS **5.73 kB gzip** (grew with the token/motion layers;
  `src/style.css` 1,339 → 1,851 lines), Phaser vendor 319.10 kB gzip
  (untouched).

**After-screenshots:** full 12-shot matrix at `output/ui-revamp/after/`
(same viewports/themes/states as `before/` — desktop/mobile/landscape ×
dark/light × home/game/game-over-with-forced-panel; the two panel shots were
retaken after the 240 ms reveal animation settles). Nothing skipped.

## Final manual QA checklist (human, on a real device/browser)

- [ ] Desktop home: hover/focus cards, emblem lift, footer, both themes.
- [ ] Desktop: start each of the five games; watch the active-card bar
      breathe; canvas frame/bezel reads well.
- [ ] Back returns home; Restart restarts; theme toggle flips (and rotates).
- [ ] Mobile portrait: d-pad/ACTION feel, game-over ACTION restart, no
      scroll, no double-tap zoom.
- [ ] Mobile landscape: controls clear of chrome, all five home cards fit.
- [ ] Game-over score terminal (flag-on): RUN SCORE readout, submit, list.
- [ ] Global leaderboard against a Vercel **preview**, then production,
      after merge (CI never touches the real API).
- [ ] Reduced-motion OS setting: instant states, static selected bar.

## Push + PR (run when ready — not executed by the loop)

```bash
git push -u origin ui-revamp-pass-1
gh pr create --base main --head ui-revamp-pass-1 \
  --title "UI revamp: premium neon arcade cabinet shell (phases 0–6)" \
  --body-file .github/PR_BODY.md   # or paste the suggested body from the phase summary
```

Review guide for the PR: read `UI_REVAMP_SPEC.md` first (design contract +
inline deviations), then diff `src/style.css` phase by phase (commits are
per-phase), compare `output/ui-revamp/before/` vs `after/`, and run the
manual QA checklist above on the preview deployment.

## Carried-forward invariants for future passes

- The canvas, `.game-root` client box, pixel-signature thresholds, copy pins,
  tab orders, and `touch-action` map were never touched — keep it that way.
- Home 375×667 has +4px slack; mobile home height is effectively frozen.
- Any future infinite animation needs its own reduced-motion
  `animation: none` override (the global block only zeroes durations).
- `.lb-run` is additive DOM inside the leaderboard panel — the frozen `.lb-*`
  hooks around it must not move.
