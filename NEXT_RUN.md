# NEXT_RUN — UI Revamp Pass (branch `ui-revamp-pass-1`)

Loop: `.claude/ui-revamp-loop.md`. Spec: `UI_REVAMP_SPEC.md` (design contract;
§4/§7/§10 carry Phase 1/2/4 implementation notes). System map:
`CURRENT_APP_STATE.md`.

## Phase status

| Phase | Scope                                      | Status              |
| ----- | ------------------------------------------ | ------------------- |
| 0     | UI audit + design spec (no implementation) | done (`bd0fbbc`)    |
| 1     | Design tokens + base shell polish          | done (`6665cc3`)    |
| 2     | Home screen revamp                         | done (`d2c844c`)    |
| 3     | Game mode shell revamp                     | done (`ef37a58`)    |
| 4     | Game-over + leaderboard panel revamp       | **done** (this run) |
| 5     | Motion and polish                          | next                |
| 6     | Cross-viewport validation + docs           | pending             |

## Phase 4 (this run) — game-over + leaderboard score terminal

**Files changed:** `src/style.css`, `src/ui/LeaderboardPanel.ts` (additive
run-readout row + two tiny presentation tweaks), plus this file and spec §10
notes. No service/API/logic changes; submit semantics, dismissal events,
copy pins, TOP 10/5 limits, and `textContent` rendering all untouched.

**What changed (per spec §10 + user direction for a bolder result):**

- **Panel body** is now a raised score terminal: solid `--panel-2` +
  top sheen, chamfered like the shell panels (inset trim/edge depth — outer
  shadows are clipped by clip-path), `--trim` rule under the
  `GLOBAL LEADERBOARD` heading.
- **Run-result readout (new, additive DOM)**: `RUN SCORE` label + the run's
  score in large amber mono with a single `--glow-amber` text-shadow +
  `Local best N` (read from `pocket-arcade:<id>:high` — already recorded by
  ScoreManager before the panel opens). Populated in `open()` via
  `textContent`; zero behavior involvement. This gives the panel the
  final-score / local-high / name-entry / list hierarchy the user asked for.
- **Form**: mono terminal input (typed text 0.9rem; placeholder-only
  0.78rem — `YOUR NAME` no longer clips on the ~100px portrait input,
  audit §0.5); Submit gets the Restart-style on-accent bevel; Retry/Edit get
  quiet-button bevels; transitions tokenized.
- **Status messages**: error/success now carry a colored left-edge tick
  (shape cue + color, never color alone; the `aria-live` text is untouched).
  The helper-tone micro-tweak shipped: an untouched empty name field shows
  "Use 2–16 characters" in muted tone (error tone still appears the moment a
  typed value is invalid — text identical, tone only).
- **Top list**: `TOP N` heading centered between terminal rules (empty-
  content pseudos); hairline row separators; mono ranks/scores; the `#1` row
  gets a quiet amber edge tick + amber rank; loading/empty/unavailable render
  as dashed "empty slot" terminal chips instead of bare text.

**Validation results (all green):**

- `npx playwright test leaderboard --project=desktop --project=mobile`
  → **37 passed / 1 skipped** (flag-off zero-network, submit flow, invalid
  name blocks POST, 429/offline + Retry, saved-name/Edit, list states,
  dismissal via Restart/Back/ACTION, keyboard focus, panel no-scroll).
- `npx playwright test shell smoke home switching games` (both projects)
  → 61 passed / 29 skipped (pixel signatures included — canvas untouched).
- Full `npm run validate` → build + api tsc + Vitest 154 + lint/boundary/
  prettier + Playwright **103 passed / 33 skipped** (baseline counts).
- `tsc --noEmit` clean after the LeaderboardPanel additions.

**Screenshots:** `output/ui-revamp/phase4/*.png` — desktop dark entry +
success states, desktop light entry, mobile portrait entry (placeholder
fixed) + empty state.

**Manual QA checklist (behaviors are e2e-pinned; worth one human pass):**

- [ ] Desktop flag-on: die with a positive score → terminal panel with RUN
      SCORE readout; submit a name; Restart/Back clear it.
- [ ] Mobile: panel fits above the d-pad/ACTION; input tappable; keyboard
      doesn't leak gameplay keys; ACTION restart with panel open.
- [ ] Themes: dark terminal premium; light panel white + readable ticks.

## Next task (Phase 5) — start cold here

Implement **motion and polish** per `UI_REVAMP_SPEC.md` §6 (motion rules):

1. `src/style.css` only: a one-shot entrance keyframe on
   `.leaderboard-panel.is-open` (opacity 0→1 + translateY(6px)→0, `--dur-3`,
   ends at resting state — keyframes fire on display flip and the global
   reduced-motion block zeroes them); the optional `.is-active` card inset-
   bar breathe (3s opacity 0.75→1, dark only — drop it if it reads noisy);
   verify hover/pressed transitions all run on tokens (done in 1–4; audit
   for stragglers).
2. Rules: transform/opacity/border-color/background-color/box-shadow/filter
   only; no JS animation; no transition on `.arcade-shell` mode switches
   (tests flip modes and assert immediately); every keyframe must have a
   legible 0.001ms static end-state.
3. Optional test: a reduced-motion computed-duration pin if it adds value.
4. Verify: full `npm run validate` + flake sweep
   `npx playwright test home shell leaderboard smoke --repeat-each=2` (both
   projects — Phase 6 will repeat it, but motion is the flake-prone layer);
   `performance-guardian` review of the effect budget is suggested by the
   loop; screenshots optional (motion won't show) — a manual dev-server pass
   with reduced-motion emulation instead.

## Known constraints carried forward

- Home 375×667 slack +4px; mobile home height frozen.
- `.game-root` box-neutral rule; desktop topbar height frozen since Phase 3
  (re-run `switching` if anything near the stage changes).
- Chamfer = inset shadows only; unstroked cut diagonals accepted (spec §4).
- Panel: `.lb-run` is additive DOM — never let future phases move/rename the
  frozen `.lb-*` hooks around it.
