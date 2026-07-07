# NEXT_RUN — Global Leaderboard Pass (branch `leaderboard-pass-1`)

Loop: `.claude/leaderboard-loop.md` (one phase per invocation, strict order).
Spec: `LEADERBOARD_PLAN.md`. System map: `CURRENT_APP_STATE.md`.

## Phase status

| Phase | Scope                                            | Status              |
| ----- | ------------------------------------------------ | ------------------- |
| 0     | Readiness gate + plan-pin verification           | **done** (this run) |
| 1     | `src/leaderboard/` shared validation + Vitest    | next                |
| 2     | `api/leaderboard.ts` + tsconfig/lint/build       | pending             |
| 3     | `LeaderboardService` client (flag-gated)         | pending             |
| 4     | Name entry + submission UI (`arcade-game-over`)  | pending             |
| 5     | Display: game-over top-10 + home `World` line    | pending             |
| 6     | Hardening + docs + deploy checklist              | pending             |

## Phase 0 (this run) — readiness verdict: **PROCEED**

No code changes (per phase contract). Evidence gathered live on 2026-07-07:

### Manual setup verification (plan §11)

- **Supabase schema applied.** REST probes with the service key (from `.env.local`):
  `leaderboard_scores`, `leaderboard_submissions`, and the `leaderboard_tops` view
  all return HTTP 200.
- **`submit_score` RPC exists and service_role can execute it.** Called it live with
  a temporary row (`name_key=phase0check`, `ip_hash=phase0-verification-temp`):
  returned `{"accepted": true, "improved": true, "best": 10, "rank": 1}` — correct
  §2 response shape. Both test rows were then deleted via REST (HTTP 204) and the
  post-cleanup state was re-queried to confirm.
- **RLS enabled / zero policies — verified by inference, one residual manual check.**
  This machine has no Supabase anon key, no `supabase` CLI, and no DB password, so
  `pg_policies` cannot be queried directly. Evidence chain: the §2 script is one
  batch; the objects created *after* its `alter table … enable row level security`
  statements (the view, the RPC) all exist and work, so the RLS statements ran.
  **Residual:** eyeball Table Editor shield icons + zero policies in the dashboard
  (§11 step 3) before Phase 6's production deploy.
- **Vercel envs.** `vercel env ls`: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
  `LEADERBOARD_IP_SALT` in Development+Preview+Production; `VITE_LEADERBOARD_ENABLED`
  in **Preview+Production only** (intentional — local `npm run dev` stays flag-off).
  Pulled the Preview env to scratchpad (then deleted): flag value is exactly `"1"`.
- **`.env.local`** exists with the three server vars (plus Vercel's own
  `VERCEL_OIDC_TOKEN`), no `VITE_LEADERBOARD_ENABLED` — as designed.
  `git check-ignore` matches it via the new `.gitignore` `.env*` line; not tracked.
  The `.gitignore` addition (`.vercel`, `.env*`) is committed with this phase —
  the plan scheduled it for Phase 2 but it must protect secrets from now on.
- **Existing data note:** `leaderboard_scores` holds one row from the user's own
  dashboard test (`lane-rush / AAA / 120 / ip_hash test_hash`). Left in place —
  not mine to delete. **Delete it before the Phase 6 production smoke** (or keep
  deliberately). The user's matching `leaderboard_submissions` row was pruned by
  the RPC's own 1-hour cleanup during the verification call (by design).

### Plan-pin verification against current source (no drift found)

- Game IDs in `src/main.ts`: exactly the five plan IDs.
- Storage keys: `pocket-arcade:<gameId>:high` (`ScoreManager.ts:14`),
  `pocket-arcade:theme` — `pocket-arcade:player-name` is free.
- Bridge: `score`/`isGameOver`/`tick` base + `highScore`/`runSeed` published by
  `BaseGameScene` (lines 76–79). Both game-over transition sites exist (input
  handler line 25/38, fixed-step loop line 97) for the `arcade-game-over` event.
- Root tsconfig `include`: src/tests/configs/scripts — **no `api/`**; lint script is
  `eslint src tests scripts && node scripts/import-boundary.mjs && prettier --check .`;
  build is `tsc --noEmit && vite build`. Confirms Phase 2 wiring plan (own strict
  `api/tsconfig.json`, `tsc --noEmit -p api` in build, `api` added to eslint).
- §7 scoring derivations all match source: Neon Serpent 18×24 grid, `10×multiplier`
  capped at 8 (`NeonSerpentLogic.ts:126–127`); Bounce Circuit `runnerMaxSpeed 0.42`,
  chunk 16 units, `+25`/orb, max 3 orbs/chunk (the arc archetype); Star Courier
  `+15`/kill, spawn floor `max(14, 34−wave×3)` (`StarCourierLogic.ts:121,217`);
  Lane Rush spawn every 28 ticks, `+12` near-miss / `+5` (`LaneRushLogic.ts:108,118`);
  Circuit Stack clears `[100,250,450,700]` only score source, `circuitMinDropTicks=10`.
  Divisors hold: serpent 10, courier 15, stack 50; bounce/lane mixed (none).
- Test counts: Vitest **73 passed** (matches the pin). Playwright not run this
  phase — no code changed since the green merge of `main` (57 passed / 31 skipped);
  Phase 1 re-runs the full validate.

### Decisions recorded (Phase 0 deliverable)

**Error codes** (shape `{ "error": { "code": "<code>" } }`):

| Status | Codes                                                                                                                            |
| ------ | -------------------------------------------------------------------------------------------------------------------------------- |
| 400    | `invalid_body`, `invalid_game`, `invalid_limit`, `name_length`, `name_charset`, `name_not_allowed`, `invalid_score`, `invalid_tick`, `invalid_seed`, `implausible_score` |
| 403    | `forbidden_origin` (Origin header present and ≠ deployment host)                                                                   |
| 405    | `method_not_allowed` (non-GET/POST)                                                                                                |
| 413    | `body_too_large` (POST body > 1 KB)                                                                                                |
| 415    | `unsupported_media_type` (POST content-type ≠ application/json)                                                                    |
| 429    | `rate_limited` (RPC verdict passthrough)                                                                                           |
| 502    | `upstream_error` (generic; never leaks Supabase URLs/errors)                                                                       |

GET `limit`: non-integer → 400 `invalid_limit`; integer out of 1–50 → clamped
(matches plan §4 "clamped" wording). Validation order is plan §4 exactly
(first failure wins).

**Rate-limit constants** (must match the deployed SQL — verified live):
max **6** submissions per `ip_hash` per rolling **60 s** (7th → 429); submissions
log pruned past **1 hour** inside the RPC; client fetch timeout **5 s** abort;
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

## Next task (Phase 1 — start cold from the loop file)

Build `src/leaderboard/`: `types.ts` (single game-ID const → allowlist,
request/response shapes incl. the error-code union above), `names.ts`
(trim/collapse → 2–16 chars → charset `A–Za–z0–9 _-`), `bannedWords.ts` (curated
list, leet map `0→o 1→i 3→e 4→a 5→s 7→t 8→b @→a $→s`, substring vs whole-word
tiers, reserved names), `plausibility.ts` (§7 table verbatim — constants
re-verified this run, cite the source lines above). Pure modules only (no DOM /
fetch / Phaser / storage; import-boundary scans these test files — keep banned
words out of comments too). Full Vitest boundary coverage per plan §9, then
`npm run validate`.
