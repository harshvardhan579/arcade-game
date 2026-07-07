# NEXT_RUN — Global Leaderboard Pass (branch `leaderboard-pass-1`)

Loop: `.claude/leaderboard-loop.md` (one phase per invocation, strict order).
Spec: `LEADERBOARD_PLAN.md`. System map: `CURRENT_APP_STATE.md`.

## Phase status

| Phase | Scope                                           | Status              |
| ----- | ----------------------------------------------- | ------------------- |
| 0     | Readiness gate + plan-pin verification          | done (`e264f6e`)    |
| 1     | `src/leaderboard/` shared validation + Vitest   | **done** (this run) |
| 2     | `api/leaderboard.ts` + tsconfig/lint/build      | next                |
| 3     | `LeaderboardService` client (flag-gated)        | pending             |
| 4     | Name entry + submission UI (`arcade-game-over`) | pending             |
| 5     | Display: game-over top-10 + home `World` line   | pending             |
| 6     | Hardening + docs + deploy checklist             | pending             |

## Phase 1 (this run) — shared validation foundation

Four pure modules in `src/leaderboard/` (no DOM, no fetch, no Phaser, no
storage — importable from both the future `api/` and the client) plus 41 new
Vitest tests in three suites:

- **`types.ts`** — `GAME_IDS` (the single allowlist every layer derives from;
  must stay in sync with the `src/main.ts` registry), `isGameId` guard, the
  full Phase 0 error-code union, and the §4 request/response shapes
  (`SubmitRequest/Response`, `TopResponse`, `TopsResponse`, error envelope).
- **`names.ts`** — `canonicalizeName` (trim + collapse whitespace runs),
  `validateName` with the §4-pinned order length → charset (`A–Za–z0–9 _-`,
  ASCII-only v1) → moderation; returns canonical `name` + `nameKey`
  (lowercase-only key, so its length always equals the display name's and the
  DB's 2–16 CHECK can never disagree). Non-string input → `name_length`.
- **`bannedWords.ts`** — `normalizeForModeration` (lowercase → leet fold
  `0→o 1→i 3→e 4→a 5→s 7→t 8→b @→a $→s` → strip space/`_`/`-`), severe
  substring tier, mild whole-string tier (Scunthorpe-safe: `bass`,
  `Assassin`, `Therapist`, `Dickens`, `raccoon`, `Grape` all accepted —
  tested), reserved names (`admin`, `administrator`, `moderator`,
  `pocketarcade`).
- **`plausibility.ts`** — §7 table verbatim (rate bounds, ×1.25 slack,
  divisors 10/—/15/—/50, hard caps 35k/150k/120k/50k/200k), each constant
  commented with its `*Logic.ts` source; `isValidScore/Tick/RunSeed` range
  guards (`TICK_MAX` 1e6, `RUN_SEED_MAX` uint32); `isPlausibleScore` =
  divisor + rate-bound check.
- **Derivation sync pins:** `plausibility.test.ts` imports the exported logic
  constants (`runnerMaxSpeed`, `runnerChunkUnits`, `circuitMinDropTicks`) and
  asserts the §7 coefficients still dominate the honest per-tick ceilings —
  if those gameplay constants ever move, the suite fails and forces a
  re-derivation. Inline (non-exported) constants are covered by exact
  boundary fixtures instead (e.g. star-courier tick 14 → bound 37 → best
  divisible score 30; circuit-stack tick 100 → 2 875 → best 2 850).

Deliberately **not** built (later phases): no orchestrating
`validateSubmitPayload` (that ordering lives in Phase 2's `serverCore`), no
fetch/service code, no UI, no `api/`. Nothing outside `src/leaderboard/` was
touched except this file.

### Phase 1 validation

- Targeted: `npx vitest run src/leaderboard` → **41 passed** (3 files).
- Import boundary: passed for **14 files** (the three new `.test.ts` join the
  scan; zero banned literals, verified).
- Full `npm run validate`: build + strict tsc clean; Vitest **114 passed**
  (73 existing + 41 new, zero changes to existing suites); eslint, boundary,
  and Prettier clean; Playwright **57 passed / 31 skipped** — identical to
  the pre-pass pins.
- One pre-existing nit fixed: Phase 0's `NEXT_RUN.md` failed
  `prettier --check .` (table alignment); reformatted — that's why lint ran
  twice. No spec or source involved.

## Phase 0 record — readiness verdict: PROCEED (`e264f6e`)

- Supabase §2 schema verified live over REST: both tables + `leaderboard_tops`
  200; `submit_score` executed via service role (correct response shape), test
  rows cleaned up after.
- **RLS/zero-policies residual:** not directly queryable from this machine
  (no anon key/CLI/DB password); inferred from the single-batch §2 run.
  Eyeball the dashboard shield icons + zero policies before Phase 6 prod.
- **Existing data note:** `leaderboard_scores` still holds the user's own
  dashboard test row (`lane-rush / AAA / 120 / ip_hash test_hash`). Delete it
  before the Phase 6 production smoke (or keep deliberately).
- Vercel envs: three server vars in Dev+Preview+Prod; `VITE_LEADERBOARD_ENABLED`
  = `"1"` in **Preview+Production only** — local dev stays flag-off.
  `.env.local` present and git-ignored (`.env*` committed in `e264f6e`).
- All plan pins re-verified against source, zero drift (game IDs, storage
  keys, bridge fields incl. both game-over transition sites, tsconfig/lint
  shapes, §7 scoring derivations, test counts).

### Decisions (Phase 0, binding for later phases)

**Error codes** (shape `{ "error": { "code": "<code>" } }`):

| Status | Codes                                                                                                                                                                    |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 400    | `invalid_body`, `invalid_game`, `invalid_limit`, `name_length`, `name_charset`, `name_not_allowed`, `invalid_score`, `invalid_tick`, `invalid_seed`, `implausible_score` |
| 403    | `forbidden_origin` (Origin header present and ≠ deployment host)                                                                                                         |
| 405    | `method_not_allowed` (non-GET/POST)                                                                                                                                      |
| 413    | `body_too_large` (POST body > 1 KB)                                                                                                                                      |
| 415    | `unsupported_media_type` (POST content-type ≠ application/json)                                                                                                          |
| 429    | `rate_limited` (RPC verdict passthrough)                                                                                                                                 |
| 502    | `upstream_error` (generic; never leaks Supabase URLs/errors)                                                                                                             |

GET `limit`: non-integer → 400 `invalid_limit`; integer out of 1–50 → clamped
(plan §4 "clamped" wording). Validation order is plan §4 exactly (first
failure wins).

**Rate-limit constants** (match the deployed SQL — verified live): max **6**
submissions per `ip_hash` per rolling **60 s** (7th → 429); log pruned past
**1 hour** inside the RPC; client fetch timeout **5 s** abort; GET cache
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

## Next task (Phase 2 — start cold from the loop file)

`api/leaderboard.ts` (GET + POST per plan §4) as a thin adapter over a
testable `src/leaderboard/serverCore.ts` core with an injected transport —
unit-test every status code from the table above, the §4 validation order
(reusing Phase 1's validators), and `improved` semantics with a fake
transport. Transport: Node `fetch` → PostgREST (`leaderboard_scores`,
`leaderboard_tops`) + RPC `submit_score`, service-role key from env. Origin
check, 1 KB body cap, method guards, generic 502, CDN cache header on GET.
Wiring (trap 4): strict `api/tsconfig.json`, `tsc --noEmit -p api` in build,
`api` in the eslint invocation, `@vercel/node` devDependency. Verify: Vitest
green; `npm run build` green; `grep -ri supabase dist/` empty; manual
`vercel dev` curl matrix (valid submit, each 4xx, 7th-rapid 429, GET cache
header) recorded here. The serverCore tests are `src/**/*.test.ts` → they get
scanned by the boundary; keep them pure (fake transport only, no banned
literals).
