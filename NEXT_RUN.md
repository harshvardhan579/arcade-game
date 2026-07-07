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
| 4     | Name entry + submission UI (`arcade-game-over`) | done (`db4a5d8`)    |
| 5     | Display: game-over top-10 + home `World` line   | **done** (this run) |
| 6     | Hardening + docs + deploy checklist             | next                |

## Phase 5 (this run) — leaderboard display

**What changed**

- **`src/ui/LeaderboardPanel.ts`** — on panel open, `loadTopList(run)` calls
  `leaderboardService.fetchTop(gameId, limit)` (limit **10** fine-pointer / **5**
  coarse-pointer) and renders a compact `<ol>` under the submit row. States:
  loading `…`, ranked rows, empty `No scores yet — be the first`, error
  `Global scores unavailable`. Rank/name/score via `textContent` only. Never
  blocks Submit/Retry/Restart/Back/ACTION. An **improved** accept re-fetches the
  list; a non-improving accept leaves it as-is.
- **`src/ui/HomeScreen.ts`** — the high line is now
  `<span class="hs-local">High N</span><span class="hs-world"></span>`. When the
  hub is shown and the flag is on, `refreshWorldScores()` calls
  `fetchTops()` once and appends ` · World <score>` (`toLocaleString`,
  `textContent`) to cards with a global best; omitted otherwise. Gated on
  `data-mode==='home'`, throttled (default **60 s**, `lastTopsFetchAt` claimed
  before await), triggered on initial home boot and `arcade-go-home` (both via
  `requestAnimationFrame` so the shell mode is settled first). Failure is
  silent — no fragment, no `console.error`. The live `arcade-high-score` handler
  now updates `.hs-local` only, leaving the World fragment intact.
- **`src/style.css`** — `.lb-list*` rows (compact, theme tokens, tabular nums);
  `.home-card-high` pinned single-line (`nowrap`/ellipsis) so the World fragment
  can never add card height; muted `.hs-world`.

**Deliberately updated pins**

- Home now issues one `game=all` `fetchTop`… `fetchTops()` per home visit when
  enabled (throttled). Test hook `window.__ARCADE_LB_TOPS_TTL__` overrides the
  throttle window (ms), mirroring the `__ARCADE_FIXED_SEEDS__` pattern.
- **Phase 3 service specs** (`leaderboard.spec.ts` tests 2 & 3) now drive the
  service in **game mode** (`/?game=neon-serpent`) so the new home auto-fetch
  does not inflate their exact request counts. Same assertions otherwise.
- **Phase 4 invalid-name spec** now counts **POST** requests only (the panel
  legitimately GETs the top list on open); the contract "an invalid name never
  submits" is unchanged.
- `.home-card-high` split into `.hs-local` + `.hs-world`; its combined
  `textContent` is unchanged flag-off, so existing home high-score specs stay
  green.

**Validation** (`npm run validate` — all green)

- Targeted: `leaderboard.spec.ts` + `home.spec.ts` → desktop + mobile all pass;
  flake pass `--repeat-each=3` on the throttle/refetch/World home specs (both
  projects) → clean.
- Full: build (root + api tsc) green; Vitest **154 passed** (11 files); eslint,
  import-boundary (**16 files**), Prettier clean; Playwright **103 passed / 33
  skipped** (both projects). `grep -ri supabase dist/` empty. Pixel-signature
  switching specs unchanged (list + World are DOM, never drawn into canvas).

**Manual QA checklist (real preview, `VITE_LEADERBOARD_ENABLED=1`)**

- [ ] Game over: top list loads (`…` → rows) under the submit row; empty and
      offline states read cleanly; list never covers Restart/Back or the mobile
      d-pad/ACTION; no page scroll; dark + light both readable.
- [ ] Mobile shows `TOP 5`, desktop `TOP 10`; server names render literally
      (no HTML injection).
- [ ] Improved submit refreshes the list to show the new rank; a non-improving
      submit leaves it.
- [ ] Home cards show `High N · World M` for games with a global best; no World
      fragment for games without; one line, no card-height growth, no scroll.
- [ ] Back to home within a minute does not refetch; after a minute it can.
- [ ] Flag off: no World fragments, no top list, zero `/api` on home and
      game-over; home layout unchanged.

## Phase 6 — cold-start brief (hardening + docs + deploy)

1. **Test/flake sweep.** `--repeat-each=2` on leaderboard + home + shell + smoke
   (both projects). Confirm every plan-§9 row exists and is green; diff the
   specs to prove no existing assertion was weakened (the Phase 5 changes to
   `leaderboard.spec` tests 2/3 + invalid-name and the `home.spec` high-line
   structure are the intended deltas — everything else must be untouched).
2. **Docs.** README (feature + flag + architecture paragraph); `CLAUDE.md`
   architecture notes (leaderboard invariants: flag gating, no keys client-side,
   shared validation module, `arcade-game-over`/`arcade-run-start` contracts,
   `pocket-arcade:player-name` key, home `game=all` throttle, protected hooks);
   `CURRENT_APP_STATE.md` refresh; `LEADERBOARD_PLAN.md` marked
   implemented-with-deviations.
3. **Deploy checklist** (record in `NEXT_RUN.md`): push branch → Vercel preview →
   curl matrix against the preview URL (submit / each 4xx / 7th-rapid 429 / GET
   cache header) → browser smoke on preview (submit a real score, see it on the
   home World line and the game-over list) → verify prod envs → merge → repeat
   the browser smoke on production → confirm Supabase rows look sane.
4. **Owed from Phase 0:** eyeball the Supabase RLS shield + zero-policies state
   in the dashboard before trusting prod.
5. Fresh full `npm run validate`; commit only if green; stop with push/PR
   commands.

## Prior-phase anchors

- **Phase 4 (`db4a5d8`):** `BaseGameScene` emits `arcade-game-over`
  (`GameOverDetail {gameId,score,tick,runSeed}`) once on alive→dead + a plain
  `arcade-run-start` from `startNewRun()`. `src/ui/LeaderboardPanel.ts`
  flag-gated overlay: name entry / saved name + Edit, live validator messages,
  explicit Submit (one per run-end, Retry re-arms), name at
  `pocket-arcade:player-name` on accept only, `textContent` for server data,
  dismiss on run-start + go-home.
- **Phase 3 (`4c1e9b0`):** `LeaderboardService` singleton, flag gate
  `VITE_LEADERBOARD_ENABLED==='1'` OR `__ARCADE_LB_FORCE__`; `fetchTop`,
  `fetchTops`, `submit`; 5 s abort; typed results; never throws/logs.
- **Phase 2 (`dcbe362`):** `api/leaderboard.ts` over `serverCore.ts` (method/
  origin guards, §4 validation order, RPC → `improved`/429, generic 502).
- **Phase 0 (binding):** error codes 400/403/405/413/415/429/502; rate-limit
  **6 / ip_hash / 60 s**; GET cache
  `public, s-maxage=30, stale-while-revalidate=120`. RLS eyeball owed pre-prod.
