# NEXT_RUN — Global Leaderboard Pass (branch `leaderboard-pass-1`)

Loop: `.claude/leaderboard-loop.md` (one phase per invocation, strict order).
Spec: `LEADERBOARD_PLAN.md`. System map: `CURRENT_APP_STATE.md`.

## Phase status

| Phase | Scope                                           | Status              |
| ----- | ----------------------------------------------- | ------------------- |
| 0     | Readiness gate + plan-pin verification          | done (`e264f6e`)    |
| 1     | `src/leaderboard/` shared validation + Vitest   | done (`3123105`)    |
| 2     | `api/leaderboard.ts` + tsconfig/lint/build      | done (`dcbe362`)    |
| 3     | `LeaderboardService` client (flag-gated)        | done (`4c1e9b0`)    |
| 4     | Name entry + submission UI (`arcade-game-over`) | **done** (this run) |
| 5     | Display: game-over top-10 + home `World` line   | next                |
| 6     | Hardening + docs + deploy checklist             | pending             |

## Phase 4 (this run) — name entry + submission panel

**What changed**

- **`src/core/types.ts`** — added the DOM-free `GameOverDetail` contract
  (`{ gameId, score, tick, runSeed }`) shared by the scene and the shell.
- **`src/games/BaseGameScene.ts`** — dispatches **one** `arcade-game-over`
  CustomEvent on the alive→dead transition at both existing detection sites
  (input handler + fixed-step loop; each already guarded by
  `!before.isGameOver`, so it never repeats per frame). `startNewRun()` now
  dispatches a plain `arcade-run-start` event (scene (re)start, Restart,
  ACTION-after-death) that the panel uses to dismiss. No logic/scoring change.
- **`src/ui/LeaderboardPanel.ts`** (new) — flag-gated DOM overlay. Mounts (and
  creates DOM) only when `leaderboardService.isEnabled()`, so flag-off builds
  carry zero leaderboard markup. Shows on `arcade-game-over` when enabled and
  `score > 0`; name input (first run) or saved name + `Edit`; live shared
  validator messages; explicit `Submit score` (never auto-submits; at most one
  submission per run-end, `Retry` re-arms after a failure);
  submitting/improved/not-improved/429/offline/rejected states; persists the
  name at `pocket-arcade:player-name` (SafeStorage) **on accept only**; server
  data via `textContent`. Dismisses on `arcade-run-start` + `arcade-go-home`.
- **`src/main.ts`** — `mountLeaderboardPanel(gameRoot)` after shell creation.
- **`src/style.css`** — `.leaderboard-panel` overlay (absolute inside
  `.game-root`, `z-index 3` above the scanline pseudo; theme-token driven both
  themes; ≥44px targets; `touch-action: manipulation`; focus-visible rings) +
  new `--danger-text` token (both themes) for error/reject copy. Reduced-motion
  handled by the existing global block.
- **`tests/leaderboard.spec.ts`** — +12 Phase 4 e2e (both projects).

**Deliberately updated pins**

- New window-event contract from `BaseGameScene`: `arcade-game-over`
  (`GameOverDetail`) + `arcade-run-start`.
- New storage key `pocket-arcade:player-name` (SafeStorage string). Local
  high-score keys (`pocket-arcade:<id>:high`) untouched.
- **Tab order pin NOT moved:** the panel's focusables live in `.game-root`
  (after Back/Restart/toggle in DOM) and exist only when flag-on **and**
  game-over, so the desktop keyboard spec (7 tab stops, panel hidden) is
  unaffected — `tests/shell.spec.ts` unchanged and green.

**Validation** (`npm run validate` — all green)

- Targeted: `tests/leaderboard.spec.ts` → 14 passed desktop / 15 passed mobile
  (1 mobile-only skip on desktop).
- Full: build (root + api tsc) green; Vitest **154 passed** (11 files);
  eslint, import-boundary (**16 files**), and Prettier clean; Playwright
  **86 passed / 32 skipped** (both projects). `grep -ri supabase dist/` empty.
- Test host trick: Neon Serpent (portal snake) never auto-dies with no input,
  so it is the stable host for synthetic `arcade-game-over` dispatches (no
  background game-over disrupts the panel); Bounce Circuit auto-dies (~7s,
  score>0), exercising the real scene→event→panel path plus the one-event,
  local-high-score, and ACTION-restart-dismiss assertions. All network mocked
  via `page.route`.

**Manual QA checklist (real preview, `VITE_LEADERBOARD_ENABLED=1`)**

- [ ] Game over with score>0 shows the panel in the lower third; center
      "GAME OVER / Press Space" text stays visible.
- [ ] Dark and light themes both readable (panel fill + text + error red).
- [ ] First run shows the input; after a successful submit the next game over
      greets the saved name with `Edit`; `Edit` changes it.
- [ ] Submit → `Submitting…` → `Ranked #N worldwide · Best M` (improved) or
      `Best for <name> is M` (not improved).
- [ ] 429 → cooldown copy + `Retry`; offline → retry copy + `Retry` resends.
- [ ] Restart button, Space (ACTION), and Back each clear the panel.
- [ ] Mobile portrait: panel fits, no page scroll, does not cover the d-pad /
      ACTION; targets ≥44px; typing in the name field never moves the game.
- [ ] Reduced motion: no panel animation churn.

## Phase 5 — cold-start brief (leaderboard display)

Extend the **existing** `src/ui/LeaderboardPanel.ts` and touch home cards.

1. **Game-over top list.** On panel open (after `open(run)`), call
   `leaderboardService.fetchTop(run.gameId)` and render a top-10 list (top-5 on
   short canvases) below the submit row: `…` loading row, quiet
   `Global scores unavailable` on failure, `No scores yet — be the first` when
   empty. **`textContent` only** for names/scores. Refresh the list after a
   successful submit so the player sees their new rank.
2. **Home `World` fragment.** In `src/ui/HomeScreen.ts`, one `fetchTops()` per
   home entry with a ≥60s refetch throttle (the service is stateless — throttle
   in the controller). Append `World <score>` to the existing
   `.home-card-high` line (`High 777 · World 12,340`) — **zero added card
   height**; absent on error/disabled. Guard: flag-off home must still make
   **zero `/api`** (leaderboard.spec test 1 pins this) and add no height (the
   375×667 / 667×375 home-fit test in `home.spec.ts` pins it).
3. **Copy (Phase 0, binding):** list heading `TOP 10` / `TOP 5`; loading `…`;
   empty `No scores yet — be the first`; error `Global scores unavailable`;
   home fragment `World <score>`.
4. **e2e:** mocked tops render on home cards; home-fit still green; game-over
   top list renders + loading + error states. Full validate both projects +
   screenshots (both themes × desktop/portrait). Pixel signatures unaffected
   (list is DOM, never drawn into the canvas).

## Prior-phase anchors

- **Phase 3 (`4c1e9b0`):** `src/core/LeaderboardService.ts` singleton
  (`createLeaderboardService(deps)`), flag gate
  `VITE_LEADERBOARD_ENABLED==='1'` OR `__ARCADE_LB_FORCE__`; `fetchTop`,
  `fetchTops`, `submit`; 5s abort; typed results
  (`disabled` / `offline` / `http` + status + code / `invalid`); never
  throws/logs.
- **Phase 2 (`dcbe362`):** `api/leaderboard.ts` over
  `src/leaderboard/serverCore.ts` (method/origin guards, §4 validation order,
  RPC → `improved`/429 mapping, generic 502). Error-code→status table below.
- **Phase 0 decisions (binding):** error codes 400/403/405/413/415/429/502;
  rate-limit **6 / ip_hash / 60s** (7th→429); GET cache
  `public, s-maxage=30, stale-while-revalidate=120`. RLS/zero-policies eyeball
  still owed before Phase 6 prod.
