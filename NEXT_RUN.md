# NEXT_RUN — UI Revamp Pass (branch `ui-revamp-pass-1`)

Loop: `.claude/ui-revamp-loop.md`. Spec: `UI_REVAMP_SPEC.md` (design contract;
§4/§6/§7/§10 carry implementation notes). System map: `CURRENT_APP_STATE.md`.

## Phase status

| Phase | Scope                                      | Status              |
| ----- | ------------------------------------------ | ------------------- |
| 0     | UI audit + design spec (no implementation) | done (`bd0fbbc`)    |
| 1     | Design tokens + base shell polish          | done (`6665cc3`)    |
| 2     | Home screen revamp                         | done (`d2c844c`)    |
| 3     | Game mode shell revamp                     | done (`ef37a58`)    |
| 4     | Game-over + leaderboard score terminal     | done (`77161b9`)    |
| 5     | Motion and polish                          | **done** (this run) |
| 6     | Cross-viewport validation + docs           | next                |

## Phase 5 (this run) — motion and interaction polish

**Files changed:** `src/style.css` only, plus this file and a spec §6 note.
CSS-only; no TS, no selectors, no copy, no canvas, no geometry.

**What changed (all opacity/transform, no delays, from-only keyframes):**

- **Panel reveal**: `.leaderboard-panel.is-open` plays a one-shot `lb-reveal`
  (fade + 6px rise, `--dur-3`) on every open; the `RUN SCORE` readout plays a
  `score-pop` (fade + scale 0.92→1) with it — terminal power-on.
- **Selected-game energy**: the active sidebar card gains an opacity-breathing
  3px bar (`::before` overlay on the static inset bar, 2.6s alternate).
  Explicitly `animation: none` under reduced motion (a zeroed-duration
  infinite loop is still a loop); the static bar underneath keeps the state
  legible. `.game-card` gained `position: relative` (no z-index — no new
  stacking context).
- **Tactile micro-interactions**: the theme toggle now rotates 180° with the
  theme (paint-only; `:active` press nudge corrected for the rotated frame);
  home emblems lift/scale slightly with card hover; sidebar cards lift 1px on
  hover like home cards; touch keys add a `scale(0.985)` squish to the
  pressed sink.
- **Cabinet glass**: one static diagonal glare gradient joined the scanline
  layer on `.game-root::after` (near-subliminal alpha, DOM-side — canvas
  pixel reads use `getImageData` and are unaffected).

**Motion verification (computed-style probe, both modes):** normal —
`lb-reveal 0.24s`, `score-pop 0.24s`, breathe `bar-breathe 2.6s infinite`,
toggle `rotate(180deg)` in light; reduced — one-shots at `1e-06s` (instant
resting frame), breathe `none`, rotation instant. Static feedback (bar, tick,
pressed fill) fully legible without motion.

**Validation results (all green):**

- `npx playwright test home shell leaderboard switching games smoke
--project=desktop --project=mobile` → **98 passed / 30 skipped** (pixel
  signatures included).
- Flake sweep `npx playwright test home shell leaderboard smoke
--repeat-each=2` (both projects) → **168 passed / 32 skipped**, zero flakes
  (panel-reveal motion did not destabilize actionability).
- Full `npm run validate` → build + api tsc + Vitest 154 + lint/boundary/
  prettier + Playwright **103 passed / 33 skipped** (baseline counts).

**Manual QA checklist:**

- [ ] Desktop: hover cards/buttons (lift + glow), watch the active-card bar
      breathe, flip the theme (toggle rotates), die flag-on (panel reveal +
      score pop).
- [ ] Mobile: press d-pad/ACTION (squish + glow), panel reveal on game over,
      no zoom/scroll.
- [ ] Reduced motion (OS setting): everything appears instantly, breathe bar
      static, app fully legible.

## Next task (Phase 6) — start cold here

**Cross-viewport validation and docs** per the loop file:

1. Fresh full `npm run validate`; flake sweep
   `npx playwright test home shell leaderboard smoke --repeat-each=2` (both
   projects) — both were green in Phase 5; re-run fresh.
2. Confirm: `grep -ri supabase dist/` empty after build; no asset files added
   anywhere (`git diff --stat main...` shows only css/ts/md); record bundle
   sizes before/after (`vite build` output — app chunk was ≈19 kB gzip
   pre-pass; CSS grew across phases 1–5, quantify it).
3. Screenshot the after-matrix (desktop/portrait/landscape × dark/light ×
   home/game/game-over+panel — reuse the phase-0 script pattern from the
   spec) to `output/ui-revamp/after/`; compare against
   `output/ui-revamp/before/`.
4. Docs: `README.md` (visual identity blurb if warranted),
   `CURRENT_APP_STATE.md` (UI sections §5/§6 rewritten to match the revamped
   reality; test counts unchanged), `UI_REVAMP_SPEC.md` marked
   implemented-with-deviations (§4/§6/§7/§10 notes already exist),
   `CLAUDE.md` only if an invariant genuinely moved (none did — the pixel
   signatures, geometry contracts, and copy pins all held), this file's final
   summary.
5. Stop with push/PR instructions (`git push -u origin ui-revamp-pass-1`,
   suggested PR title `UI revamp: premium neon cabinet shell (phases 0–6)`,
   review checklist: before/after screenshots, flag-on manual smoke on a
   Vercel preview, both themes, reduced-motion pass) — do not push or open
   the PR yourself.

## Known constraints carried forward

- Home 375×667 slack +4px; mobile home height frozen; desktop topbar height
  frozen since Phase 3; `.game-root` box-neutral rule stands.
- Chamfer = inset shadows only; unstroked cut diagonals accepted (spec §4).
- Any future infinite animation needs its own reduced-motion `animation:
none` override (the global block only zeroes durations).
