# NEXT_RUN — Global Leaderboard Pass (branch `leaderboard-pass-1`)

Loop: `.claude/leaderboard-loop.md` (one phase per invocation, strict order).
Spec: `LEADERBOARD_PLAN.md`. System map: `CURRENT_APP_STATE.md`.

## Phase status

| Phase | Scope                                           | Status              |
| ----- | ----------------------------------------------- | ------------------- |
| 0     | Readiness gate + plan-pin verification          | done (`e264f6e`)    |
| 1     | `src/leaderboard/` shared validation + Vitest   | done (`3123105`)    |
| 2     | `api/leaderboard.ts` + tsconfig/lint/build      | **done** (this run) |
| 3     | `LeaderboardService` client (flag-gated)        | next                |
| 4     | Name entry + submission UI (`arcade-game-over`) | pending             |
| 5     | Display: game-over top-10 + home `World` line   | pending             |
| 6     | Hardening + docs + deploy checklist             | pending             |

## Phase 2 (this run) — Vercel API

- **`src/leaderboard/serverCore.ts`** — the testable core. Takes a plain
  `CoreRequest` (method, Origin/Host, content type/length, parsed body +
  invalid-JSON flag, query, precomputed `ipHash`) plus an injected
  `LeaderboardTransport`; returns `{ status, body, headers? }`. Owns every
  decision: 405 method guard, 403 origin guard (absent Origin passes; present
  must match Host), GET single (`entries` ranked, limit default 10 /
  non-integer → `invalid_limit` / integers clamped 1–50) and GET `all`
  (all five keys, `null` fills), POST guards (415 → 413 at 1 KB → 400
  `invalid_body`), the §4 field order via the Phase 1 shared modules, RPC
  outcome mapping (`rate_limited` → 429; unknown rejection or malformed
  outcome → 502), and a catch-all generic 502 so upstream detail never
  reaches a client.
- **`api/leaderboard.ts`** — glue-only Vercel adapter: env checks (missing →
  502, fail-safe), `sha256(ip + LEADERBOARD_IP_SALT)` from first
  `x-forwarded-for` hop (`node:crypto`, adapter-side so the core stays
  platform-pure), try/catch around Vercel's lazy body parse → the core's
  invalid-JSON flag, and the real transport: Node 22 `fetch` → PostgREST
  (`leaderboard_scores`, `leaderboard_tops`) + RPC `submit_score`, service
  key from env, non-OK upstream → throw without reading the body.
- **Wiring (trap 4):** strict `api/tsconfig.json` (node types, no DOM,
  includes `../src/leaderboard` sans tests); build =
  `tsc --noEmit && tsc --noEmit -p api && vite build`; lint =
  `eslint src tests scripts api && …`. New devDependency: `@vercel/node`
  (types for the handler signature) — the only addition, per plan.
- **Tests:** +24 in `serverCore.test.ts` (pure fake transport; boundary-safe):
  every status code and error code from the Phase 0 table, §4 validation
  order pins, limit clamping via transport spy, canonical
  name/nameKey/ipHash passthrough, `improved: false`, malformed-outcome 502.

### Phase 2 validation

- Vitest **138 passed** (10 files; 73 pre-pass + 41 Phase 1 + 24 new).
- `npm run build` green with the api typecheck; **dist secret grep clean**:
  `grep -ri supabase dist/`, `grep -ri SERVICE_ROLE dist/`,
  `grep -ri LEADERBOARD_IP_SALT dist/` all empty (api/ and serverCore are
  never bundled — Vite only follows imports from `src/main.ts`).
- Full `npm run validate`: build, 138 Vitest, eslint (now incl. `api`) +
  boundary (15 files) + Prettier, Playwright **57 passed / 31 skipped** —
  pins unchanged.
- **Real-API smoke via `vercel dev --listen 3111`** (CLI pulls the
  Development env vars automatically; curl matrix all as designed):
  - GET `?game=lane-rush` → 200 `{game, entries:[]}`;
    `cache-control: public, s-maxage=30, stale-while-revalidate=120` present.
  - GET `?game=all` → 200 all-null tops (table was empty — see data note).
  - GET `?game=bogus` → 400 `invalid_game`; `?limit=abc` → 400 `invalid_limit`.
  - DELETE → 405. Cross-origin POST (`Origin: https://evil.example`) → 403.
  - POST valid (star-courier 30 @ tick 50) → 200
    `{accepted:true, improved:true, best:30, rank:1}`; GET then returned the
    ranked row. Resubmits → `improved:false`. **7th rapid submit → 429**
    `rate_limited`.
  - POST implausible (lane-rush 45 000 @ tick 100) → 400 `implausible_score`;
    leet-banned name → 400 `name_not_allowed`; malformed JSON → 400
    `invalid_body`; `text/plain` → 415.
  - Cleanup: smoke score row + its `leaderboard_submissions` rows deleted via
    REST (204s), both tables re-queried **empty**.
- **Data note:** the user's old dashboard test row (`lane-rush / AAA / 120`)
  is gone — they deleted it themselves. Phase 0's "delete before Phase 6"
  item is resolved; both tables are empty as of this run.

## Phase 1 record (`3123105`)

Pure shared modules in `src/leaderboard/` + 41 tests: `types.ts` (GAME_IDS
allowlist, error-code union, §4 shapes), `names.ts` (canonicalize →
length → charset → moderation; lowercase `nameKey`), `bannedWords.ts`
(leet-folding normalization, severe-substring vs mild-exact tiers, reserved
names), `plausibility.ts` (§7 bounds/divisors/caps + range guards, cited to
sources). Derivation sync pins import `runnerMaxSpeed`, `runnerChunkUnits`,
`circuitMinDropTicks` so logic-constant drift fails the suite.

## Phase 0 record — readiness verdict: PROCEED (`e264f6e`)

- Supabase §2 schema verified live over REST; `submit_score` executed via
  service role; Vercel envs confirmed (`VITE_LEADERBOARD_ENABLED`=`"1"` in
  Preview+Production only; local dev flag-off; `.env.local` git-ignored).
- **RLS/zero-policies residual:** inferred from the single-batch §2 run (not
  directly queryable from this machine). Eyeball the dashboard shield icons +
  zero policies before Phase 6 prod.
- All plan pins re-verified against source, zero drift.

### Decisions (Phase 0, binding for later phases)

**Error codes** (shape `{ "error": { "code": "<code>" } }`) — all now
implemented and unit-tested in `serverCore.ts`:

| Status | Codes                                                                                                                                                                    |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 400    | `invalid_body`, `invalid_game`, `invalid_limit`, `name_length`, `name_charset`, `name_not_allowed`, `invalid_score`, `invalid_tick`, `invalid_seed`, `implausible_score` |
| 403    | `forbidden_origin` (Origin header present and ≠ deployment host)                                                                                                         |
| 405    | `method_not_allowed` (non-GET/POST)                                                                                                                                      |
| 413    | `body_too_large` (POST body > 1 KB)                                                                                                                                      |
| 415    | `unsupported_media_type` (POST content-type ≠ application/json)                                                                                                          |
| 429    | `rate_limited` (RPC verdict passthrough)                                                                                                                                 |
| 502    | `upstream_error` (generic; never leaks Supabase URLs/errors)                                                                                                             |

**Rate-limit constants** (verified live again this run): max **6** per
`ip_hash` per rolling **60 s** (7th → 429); log pruned past **1 hour** in the
RPC; client fetch timeout **5 s** abort (Phase 3); GET cache
`Cache-Control: public, s-maxage=30, stale-while-revalidate=120`.

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

## Next task (Phase 3 — start cold from the loop file)

`src/core/LeaderboardService.ts` module singleton (the `audioEngine`
pattern): flag gating on `import.meta.env.VITE_LEADERBOARD_ENABLED === '1'`
or the test override `window.__ARCADE_LB_FORCE__` (set via `addInitScript`,
mirroring `__ARCADE_FIXED_SEEDS__`); `isEnabled()`, `fetchTop(gameId,
limit)`, `fetchTops()`, `submit(entry)` against same-origin
`/api/leaderboard` only; 5 s `AbortController` timeout; never throws, never
logs — typed results `{ ok: true, … } | { ok: false, reason: 'offline' |
'http' | 'invalid' | 'disabled' }`; `disabled` short-circuits without
touching the network. New `tests/leaderboard.spec.ts` starts here: flag-off
spec counts `/api/**` requests (must be **0**) and asserts no leaderboard
DOM; a flag-forced spec with `page.route` mocks proves fetch + parse.
Remember trap 2 (Chromium logs failed HTTP as console errors — error-path
specs must not assert console cleanliness) and run both Playwright projects.
Full validate.
