# NEXT_RUN — Global Leaderboard Pass (branch `leaderboard-pass-1`)

Loop: `.claude/leaderboard-loop.md` (one phase per invocation, strict order).
Spec: `LEADERBOARD_PLAN.md`. System map: `CURRENT_APP_STATE.md`.

## Phase status

| Phase | Scope                                           | Status              |
| ----- | ----------------------------------------------- | ------------------- |
| 0     | Readiness gate + plan-pin verification          | done (`e264f6e`)    |
| 1     | `src/leaderboard/` shared validation + Vitest   | done (`3123105`)    |
| 2     | `api/leaderboard.ts` + tsconfig/lint/build      | done (`dcbe362`)    |
| 3     | `LeaderboardService` client (flag-gated)        | **done** (this run) |
| 4     | Name entry + submission UI (`arcade-game-over`) | next                |
| 5     | Display: game-over top-10 + home `World` line   | pending             |
| 6     | Hardening + docs + deploy checklist             | pending             |

## Phase 3 (this run) — client service

- **`src/core/LeaderboardService.ts`** — module singleton (the `audioEngine`
  pattern) built by `createLeaderboardService(deps)` with injected
  `isEnabled`/`fetchFn`/`timeoutMs` so unit tests stay pure and
  boundary-safe. Flag gate: `import.meta.env.VITE_LEADERBOARD_ENABLED ===
'1'` OR the test-only override `__ARCADE_LB_FORCE__` (declared on the
  global Window type in this file; set only via Playwright `addInitScript`,
  mirroring `__ARCADE_FIXED_SEEDS__`).
- **API surface (plan §5):** `isEnabled()`, `fetchTop(gameId, limit=10)`,
  `fetchTops()`, `submit(entry)`. Same-origin by construction — every request
  uses the rooted path `/api/leaderboard`, never an absolute URL.
- **Behavior:** disabled → `{ ok: false, reason: 'disabled' }` with zero
  network; 5 s `AbortController` timeout (override for tests); never throws,
  never logs. Typed results: fetch rejection/abort → `'offline'`; non-2xx →
  `'http'` with `status` + parsed error `code` (so Phase 4 can show 429 copy);
  non-JSON or shape-mismatched 200 → `'invalid'`. Response parsing is strict
  per shape (`TopResponse`, `TopsByGame` null-filled over the five IDs,
  `SubmitResponse`).
- **Deliberately not built:** no session cache (plan §5 assigns the ≥60 s
  home refetch throttle to the Phase 5 controller — the service stays
  stateless), no UI, no `BaseGameScene`/`arcade-game-over` change.
- **Tests:** +16 Vitest in `src/core/LeaderboardService.test.ts` (injected
  fake fetch; the singleton itself proven disabled with a stubbed global) and
  the new `tests/leaderboard.spec.ts` (3 specs × both projects): flag-off
  counts `/api/**` requests (**0**) + no leaderboard DOM + console-clean in
  game and home modes; flag-forced spec drives the real module in the browser
  via the Vite dev-server module graph (string-form dynamic import keeps tsc
  out of it) against `page.route` mocks and asserts all three methods parse;
  an error-path spec (mocked 429 + aborted GET) asserts typed failures — no
  console assertion there (headless caveat, trap 2).

### Phase 3 validation

- Targeted: `npx vitest run src/core/LeaderboardService` → **16 passed**;
  `tests/leaderboard.spec.ts` → **6 passed** (desktop + mobile).
- Full `npm run validate`: build (root + api tsc) green; Vitest **154
  passed** (11 files); eslint + boundary (16 files) + Prettier clean;
  Playwright **63 passed / 31 skipped** (57 + 6 new; all pins unchanged).
- **Dist grep:** `supabase` / `SERVICE_ROLE` / `LEADERBOARD_IP_SALT` absent;
  even the literal `VITE_LEADERBOARD_ENABLED` is compiled away (Vite
  statically replaces the absent env with `undefined`). Flag-off dev builds
  ship no leaderboard traffic and no secret names.

## Phase 2 record (`dcbe362`)

`api/leaderboard.ts` (glue: env fail-safe, sha256 ip hash from
`x-forwarded-for`, Vercel lazy-body-parse flag, PostgREST/RPC transport on
Node fetch that throws without reading upstream bodies) over
`src/leaderboard/serverCore.ts` (all decisions: method/origin guards, GET
single+all with limit clamping + CDN cache header, 415/413/400 POST guards,
§4 validation order, RPC outcome mapping incl. 429, generic 502). Strict
`api/tsconfig.json`; build/lint wired; `@vercel/node` types only new dep.
+24 core tests. Real-API smoke via `vercel dev` verified the full curl
matrix (valid submit, each 4xx, improved:false, 7th-rapid 429, cache
header); smoke rows cleaned up; **both Supabase tables empty** (the user
deleted their own old test row — Phase 0's cleanup item is resolved).

## Phase 1 record (`3123105`)

Pure shared modules in `src/leaderboard/` + 41 tests: `types.ts` (GAME_IDS
allowlist, error-code union, §4 shapes), `names.ts` (canonicalize → length →
charset → moderation; lowercase `nameKey`), `bannedWords.ts` (leet-folding
normalization, severe-substring vs mild-exact tiers, reserved names),
`plausibility.ts` (§7 bounds/divisors/caps + range guards). Derivation sync
pins import exported logic constants so gameplay drift fails the suite.

## Phase 0 record — readiness verdict: PROCEED (`e264f6e`)

Supabase §2 schema verified live (tables, view, RPC via service role);
Vercel envs confirmed (`VITE_LEADERBOARD_ENABLED`=`"1"` Preview+Production
only; `.env.local` git-ignored). **RLS/zero-policies residual:** inferred
from the single-batch §2 run — eyeball the dashboard shield icons + zero
policies before Phase 6 prod. All plan pins re-verified, zero drift.

### Decisions (Phase 0, binding)

**Error codes** (shape `{ "error": { "code": "<code>" } }`) — implemented in
`serverCore.ts`, parsed by the client service:

| Status | Codes                                                                                                                                                                    |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 400    | `invalid_body`, `invalid_game`, `invalid_limit`, `name_length`, `name_charset`, `name_not_allowed`, `invalid_score`, `invalid_tick`, `invalid_seed`, `implausible_score` |
| 403    | `forbidden_origin` (Origin present and ≠ deployment host)                                                                                                                |
| 405    | `method_not_allowed` (non-GET/POST)                                                                                                                                      |
| 413    | `body_too_large` (POST body > 1 KB)                                                                                                                                      |
| 415    | `unsupported_media_type` (POST content-type ≠ application/json)                                                                                                          |
| 429    | `rate_limited` (RPC verdict passthrough)                                                                                                                                 |
| 502    | `upstream_error` (generic; never leaks Supabase URLs/errors)                                                                                                             |

**Rate-limit constants:** max **6** per `ip_hash` per rolling **60 s** (7th →
429); log pruned past **1 hour** in the RPC; client timeout **5 s** abort;
GET cache `Cache-Control: public, s-maxage=30, stale-while-revalidate=120`.

**Panel copy** (final; `textContent` only for server data):

- Heading: `GLOBAL LEADERBOARD`; list heading `TOP 10` (`TOP 5` short canvases).
- Name input: placeholder `YOUR NAME`, helper `2–16 letters, numbers, spaces, - or _`.
- Validation messages: `Use 2–16 characters` / `Letters, numbers, spaces, - and _
only` / `That name isn't allowed`.
- Buttons: `Submit score`, `Retry`, `Edit`.
- States: `Submitting…` → `Ranked #N worldwide` (improved) / `Best for <NAME> is
<M>` (not improved) / `Couldn't reach the leaderboard` + Retry (failure) /
  `Too many submissions — try again in a minute` (429).
- List states: loading row `…`; empty `No scores yet — be the first`; error
  `Global scores unavailable`.
- Home card fragment: `World <score>` appended to the existing high line
  (`High 777 · World 12,340`); absent on error/disabled.

## Next task (Phase 4 — start cold from the loop file)

Name entry + submission UI. `BaseGameScene` dispatches **one**
`arcade-game-over` CustomEvent (`{ gameId, score, tick, runSeed }`) on the
alive→dead transition only — both existing detection sites already compute
it (input handler ~line 25/38, fixed-step loop ~line 97); do not add state
to logic (trap 9). Shell-side controller + `src/ui/LeaderboardPanel.ts`:
submit row with name input (first run) or saved name + `Edit`; live messages
from the shared validator; explicit `Submit score` (never auto-submit; at
most one submission per run-end event); `Submitting…` → rank/best copy →
failed + `Retry` (copy table above); name persisted at
`pocket-arcade:player-name` via `SafeStorage` **on success only**. Panel is
an absolutely positioned DOM overlay inside `.game-root` (no layout shift,
trap 6), theme tokens both themes, keyboard-operable with focus-visible
rings, ≥44 px touch targets, `touch-action: manipulation`; the input joins
`InputManager`'s focused-control exemption and blurs on submit (trap 7);
ACTION-restart and the Restart button must work with the panel open; panel
removed on restart/scene-switch/Back; render server data via `textContent`
only (trap 8). e2e in `tests/leaderboard.spec.ts`: mocked-200 submit flow
(name persists, rank renders), invalid-name blocks Submit (0 requests),
429/offline paths (no console assertions, trap 2),
restart-works-with-panel-open, `pocket-arcade:<id>:high` keys unchanged.
Tab-order pins move only deliberately, same slice, commit message says so
(trap 10). Both Playwright projects; full validate.
