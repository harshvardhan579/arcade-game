# Pocket Arcade — Global Leaderboard Loop (pass 1)

You are executing a focused pass implementing the global leaderboard designed in
`LEADERBOARD_PLAN.md` (branch `leaderboard-pass-1`, created from `main` after the plan
merges — orient with `git status` first). Read `CLAUDE.md` first and obey every hard
rule. `CURRENT_APP_STATE.md` is the system map; `NEXT_RUN.md` carries this pass's
state; `LEADERBOARD_PLAN.md` is the spec — deviations from it must be recorded there
with a reason.

**Mission:** per-game global leaderboards — Vercel function `api/leaderboard.ts` →
Supabase Postgres (service-role key server-side only), shared pure validation
(name/profanity/plausibility) in `src/leaderboard/`, a game-over submit + top-10
panel, and a home-card `World` best line. Feature-flagged off outside production.
Local high scores, gameplay, scoring rules, and every logic file stay untouched.

## Hard rules for this pass

- Never break local high scores (`ScoreManager`/`SafeStorage`/`arcade-high-score`).
- Never ship any Supabase key to the browser; only `VITE_LEADERBOARD_ENABLED` may be
  `VITE_`-prefixed. `grep -ri supabase dist/` after build must return nothing.
- Never trust client-side validation — the API re-validates everything.
- No login/auth, no payments, no new runtime npm dependencies (server uses Node 22
  global `fetch` + the `submit_score` RPC; `@vercel/node` types are the only new
  devDependency).
- Never weaken existing tests or the import boundary; never break the static Vite
  deploy (the app must build and run with no `api/` runtime present).
- No `*Logic.ts` changes, no scoring-rule changes, no new `SeededRandom` draws.

## Execution contract

- **One phase per invocation.** Orient (git status, `NEXT_RUN.md`,
  `LEADERBOARD_PLAN.md`), execute the next incomplete phase, verify, commit if green,
  update `NEXT_RUN.md`, stop with a summary. Phases run 0 → 6. Phase 0 stops the pass
  if setup is incomplete.
- Per phase: inspect → smallest coherent change → targeted tests → affected
  Playwright suites (both projects for any shell/CSS change) → full
  `npm run validate` when `src/main.ts`, `src/ui/*`, `src/core/*`, `src/style.css`,
  `index.html`, `package.json`, or specs change → commit only if green → update
  `NEXT_RUN.md` → stop.

## Ground truth and traps (verified 2026-07-07, plan pass)

1. **Flag-off is the compatibility story.** `npm run dev` and every existing
   Playwright suite run without `VITE_LEADERBOARD_ENABLED` → the client must make
   **zero** `/api/**` requests and render zero leaderboard DOM. `smoke.spec.ts`
   asserts no `console.error` on load, and a fetch to a nonexistent `/api` route in
   dev would log one — gating is what protects that pin. Test override for e2e:
   `window.__ARCADE_LB_FORCE__ = true` via `addInitScript` (mirror the
   `__ARCADE_FIXED_SEEDS__` pattern), always paired with `page.route` mocks.
2. **Chromium logs failed HTTP as console errors.** Leaderboard error-path specs
   (mocked 429/500/abort) must not assert console cleanliness; happy-path specs
   fulfill 200s. This mirrors the CLAUDE.md headless-caveats rule.
3. **Import boundary scans `src/**/*.test.ts`** for the literal words
   `window`/`document`/`localStorage`/`phaser`/`AudioEngine` — every new Vitest file
   in `src/leaderboard/` must be pure (they test pure modules, so this is natural;
   just don't mention the banned words even in comments).
4. **`api/` is outside the root tsconfig** (`include` lists only src/tests/configs/
   scripts). Give it `api/tsconfig.json` (strict, Node types), add
   `tsc --noEmit -p api` to the build script chain, and add `api` to the eslint
   invocation in `package.json` lint. Prettier already covers new files via
   `--check .`.
5. **Vite dev serves no functions.** The real API is exercised via `vercel dev`
   (envs from `vercel env pull .env.local`) and curl — manual, documented in
   `NEXT_RUN.md`, never wired into CI. Playwright never talks to a real backend.
6. **No-scroll pins are geometry law.** Home cards: the `World` fragment joins the
   existing high line — zero added card height (the 375×667/667×375 home fit test is
   the guard). Game-over panel: absolutely positioned inside `.game-root`, no layout
   shift, top-5 on short canvases. Re-run shell + home suites on both projects after
   any CSS.
7. **The panel must not eat gameplay input.** ACTION-restart and the Restart button
   must work while the panel is open; the name `<input>` participates in
   `InputManager`'s existing focused-control exemption. Blur on submit like every
   shell control does.
8. **Render server data via `textContent` only** — never innerHTML with fetched
   names, even though the server enforces the charset.
9. **One submission per run end.** `BaseGameScene` dispatches `arcade-game-over` on
   the alive→dead transition only (both existing detection sites — the fixed-step
   loop and the input handler — already compute it for audio cues). The controller
   submits once per event, on explicit user action.
10. **Preserved contracts:** pixel signatures (panel is DOM, not canvas — do not
    draw leaderboard content into scenes), `colorScheme: 'dark'` Playwright pin,
    theme tokens for all new UI (both themes), reduced-motion gating for any panel
    animation, tab-order pins (new focusables enter deliberately, update the keyboard
    spec in the same slice with the commit message saying so), zero assets, no page
    scroll anywhere.
11. **Plausibility constants come from the logic files** — re-derive each bound
    against current `*Logic.ts` source in Phase 1 (the plan's §7 table cites the
    derivations); if any constant moved since the plan, update the table and say so.

## Phase 0 — Planning verification and readiness gate

- Verify manual setup (`LEADERBOARD_PLAN.md` §11) is complete: ask the user to
  confirm (or show evidence of) the Supabase schema run, RLS-with-no-policies state,
  and the four Vercel env vars. **If anything is missing, print the §11 checklist and
  stop the pass.**
- Re-verify the plan's pins against current source: game IDs, storage keys, bridge
  fields, scoring constants (§7 derivations), tsconfig include list, lint script
  shape, test counts. Record drift in the plan doc.
- Decide and record in `NEXT_RUN.md`: exact error-code list, rate-limit constants,
  panel copy. Rewrite `NEXT_RUN.md` with this pass's phase table. No code changes.

## Phase 1 — Shared types, validation helpers, profanity filter

- `src/leaderboard/`: `types.ts` (game-ID allowlist derived from one const,
  request/response shapes), `names.ts` (trim/collapse, charset, length),
  `bannedWords.ts` (curated list + normalization + leet map + substring-vs-whole-word
  tiers), `plausibility.ts` (per-game rate bounds × 1.25, divisors, hard caps, tick/
  seed ranges — each constant commented with its `*Logic.ts` source).
- Pure modules only: no DOM, no fetch, no Phaser, no storage — importable from both
  the future `api/` and the client.
- Vitest: full coverage per plan §9 (boundary accept/reject on every rule, profanity
  hits + leet + safe near-misses, plausibility per game at the boundaries).
- `npm run validate` (new tests join the run; nothing else changes).

## Phase 2 — Vercel API endpoint

- `api/leaderboard.ts` (GET + POST per plan §4) as a thin adapter over a testable
  core (`src/leaderboard/serverCore.ts`) that takes an injected transport — unit
  tests cover every status code, validation order, and `improved` semantics with a
  fake transport; the adapter is glue only.
- Transport: Node `fetch` → PostgREST (`leaderboard_scores`, `leaderboard_tops`) and
  RPC `submit_score`, service-role key from env. Origin check, 1 KB body cap, method
  guards, generic 502 on upstream failure, CDN cache headers on GET.
- Wiring: `api/tsconfig.json` (strict), build/lint script updates (trap 4),
  `@vercel/node` devDependency, `.env*` added to `.gitignore`.
- Verify: Vitest green; `npm run build` green; `grep -ri supabase dist/` empty;
  manual `vercel dev` curl matrix (valid submit, each 4xx, 7th-rapid-submit 429, GET
  cache header) recorded in `NEXT_RUN.md`.

## Phase 3 — Client leaderboard service with offline/error states

- `src/core/LeaderboardService.ts` singleton: flag gating
  (`VITE_LEADERBOARD_ENABLED === '1'` or the test override), `fetchTop`, `fetchTops`,
  `submit`; 5 s abort timeout; typed results, never throws, never logs; `disabled`
  short-circuit does not touch the network.
- New `tests/leaderboard.spec.ts` starts here: flag-off spec counts `/api/**`
  requests (must be 0) and asserts no leaderboard DOM; a flag-forced spec with
  route mocks proves the service fetches and parses.
- Full validate (both projects).

## Phase 4 — Name entry and score submission UI

- `arcade-game-over` CustomEvent from `BaseGameScene` (trap 9); shell controller +
  `src/ui/LeaderboardPanel.ts` submit row: name input (first run) or saved name +
  edit; live shared-validator messages; explicit Submit; submitting/submitted-rank/
  failed-retry states; name persisted at `pocket-arcade:player-name` on success.
- Panel overlay styling inside `.game-root` (trap 6), both themes, keyboard-operable,
  focus-visible rings, ≥44 px touch targets, `touch-action: manipulation`.
- e2e: submit flow with mocked 200 (name persists, rank renders), invalid-name block
  (0 requests), 429/offline paths (trap 2), restart-works-with-panel-open, existing
  high-score keys untouched. Tab-order spec updated deliberately if pins move.
- Full validate.

## Phase 5 — Leaderboard display on home and game-over

- Game-over panel gains the top-10 (top-5 on short canvases) list for the current
  game: fetch on open, `…` loading row, quiet unavailable state, `textContent` only.
- Home: one `fetchTops()` per home entry (≥60 s between refetches); `World <score>`
  fragment on the existing `.home-card-high` line — zero added height; absent on
  error/disabled.
- e2e: mocked tops render on home cards; home fit test still green; game-over top-10
  renders; loading and error states asserted.
- Full validate, both projects, screenshots (both themes × desktop/portrait).

## Phase 6 — Tests, docs, validation, deploy checklist

- Test sweep: flake pass `--repeat-each=2` on leaderboard + home + shell + smoke
  (both projects); confirm every plan-§9 row exists and is green; audit that no
  existing assertion was weakened (diff the specs).
- Docs: README (feature + flag + architecture paragraph), `CLAUDE.md` architecture
  notes (leaderboard invariants: flag gating, no keys client-side, shared validation
  module, `arcade-game-over` contract, protected hooks), `CURRENT_APP_STATE.md`
  refresh, `LEADERBOARD_PLAN.md` marked implemented-with-deviations.
- Deploy checklist (record results in `NEXT_RUN.md`): push branch → Vercel preview →
  curl matrix against the preview URL (submit/4xx/429/GET+cache header) → browser
  smoke on the preview (submit a real score, see it on home) → verify prod envs →
  merge → repeat the browser smoke on production → confirm Supabase rows look sane.
- Fresh full `npm run validate`; commit only if green; stop with push/PR commands.

## NEXT_RUN.md protocol (every phase)

Overwrite, keep short: phase table, what changed, commands + results, deliberately
updated pins (old → new, why), curl/screenshot evidence paths, next task specific
enough to start cold. Never leave the repo red without documenting the exact failure;
revert the slice instead.
