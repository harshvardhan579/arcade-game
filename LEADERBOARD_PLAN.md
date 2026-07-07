# Pocket Arcade — Global Leaderboard Plan

> Planning-only document (branch `leaderboard-plan-1`, 2026-07-07). No code, schema, or
> dependencies are added by this pass. Implementation follows
> `.claude/leaderboard-loop.md`, one phase per invocation, only after the manual setup
> in §11 is complete. Everything below is grounded in the current source
> (`src/core/ScoreManager.ts`, `src/core/Storage.ts`, `src/core/TestBridge.ts`,
> `src/core/RunSeeds.ts`, `src/games/*/*Logic.ts`, `src/main.ts`, `src/ui/*`,
> `tests/*`, `tsconfig.json`, `scripts/import-boundary.mjs`).

## Implementation status — IMPLEMENTED (branch `leaderboard-pass-1`, 2026-07-07)

This plan is **implemented** across phases 0–6 (commits `e264f6e` → phase 6). The
feature ships flag-gated (off by default). Final architecture as built:

- **Client:** `src/core/LeaderboardService.ts` (same-origin `/api/leaderboard` only,
  flag-gated, 5 s abort, typed never-throwing results); `src/ui/LeaderboardPanel.ts`
  (game-over submit panel + top-10/5 list, DOM overlay in `.game-root`);
  `src/ui/HomeScreen.ts` (`World` fragments, one throttled `fetchTops()` per home visit).
- **Shared (pure):** `src/leaderboard/` — `types`, `names`, `bannedWords`,
  `plausibility`, `serverCore` — imported by both client and API.
- **Server:** `api/leaderboard.ts` (thin adapter over `serverCore.ts`) +
  `api/tsconfig.json`; Node `fetch` → Supabase PostgREST + `submit_score` RPC.
- **Scene boundary:** `BaseGameScene` emits `arcade-game-over`
  (`GameOverDetail {gameId,score,tick,runSeed}`, `core/types.ts`) + `arcade-run-start`.
- **Storage:** player name at `pocket-arcade:player-name`; local highs unchanged.

**Deviations from the original plan (all deliberate, documented in `NEXT_RUN.md`):**

- Game-over list limit is **10 fine-pointer / 5 coarse-pointer** (via `hasCoarsePointer`)
  rather than a canvas-height measurement — simpler and deterministic in tests.
- Home tops throttle uses a module-scoped timestamp with a test-only override hook
  `window.__ARCADE_LB_TOPS_TTL__` (mirrors `__ARCADE_FIXED_SEEDS__`).
- Two Phase-3 service specs now run in game mode and the Phase-4 invalid-name spec
  counts POST-only, because the panel/home now legitimately issue GET fetches on
  open/home — no assertion was weakened (see `NEXT_RUN.md` test-integrity audit).

**Security limitations (honest):** no accounts/auth; server enforces plausibility
bounds + profanity/reserved filter + salted-IP rate limit (6 / 60 s), but a client
submitting plausible, well-formed scores is not cryptographically blocked. Client
validation is UX only; the server (§7) re-validates everything. See §8.

## 0. Repo reality check (what exists today)

- Pure static Vite deploy: **no `api/` directory, no `vercel.json`, no backend, no
  network calls anywhere in the app**. One runtime dependency (`phaser`).
- Local high scores: `pocket-arcade:<gameId>:high` via `SafeStorage` (try/catch
  localStorage); `ScoreManager.record()` persists maxima and dispatches
  `arcade-high-score` CustomEvents that the sidebar cards, mobile picker, and home
  cards all render. **This entire path stays untouched.**
- Run identity: every live run draws a fresh non-zero uint32 seed
  (`src/core/RunSeeds.ts`); the bridge exposes `score`, `tick`, `runSeed`,
  `isGameOver`, `highScore`. Game IDs: `neon-serpent`, `bounce-circuit`,
  `star-courier`, `lane-rush`, `circuit-stack`.
- Game-over is detectable at the scene layer today (both death paths already compare
  `before.isGameOver`/`after.isGameOver` in `BaseGameScene` for audio cues) — a clean
  place to emit one submission event per run end.
- Test contracts that constrain this feature: `smoke.spec.ts` asserts **zero
  `console.error` on load**; home/shell specs pin **no-scroll fits** (portrait 375×667
  up); `scripts/import-boundary.mjs` bans the literal words `window` / `document` /
  `localStorage` / `phaser` / `AudioEngine` in every `src/**/*Logic.ts` **and**
  `src/**/*.test.ts` file; root `tsconfig.json` includes only
  `src`/`tests`/configs/`scripts` (an `api/` dir needs its own strict tsconfig and
  lint/build wiring).

## 1. Recommended architecture

```
Browser (Vite static app, Vercel CDN)
  │  same-origin fetch, JSON, no keys
  ▼
/api/leaderboard  (one Vercel Node function, GET + POST)
  │  server-side validation: gameId, name, profanity, score/tick plausibility, runSeed
  │  fetch → Supabase PostgREST + one SQL RPC, using the SERVICE ROLE key
  ▼
Supabase Postgres (RLS enabled, zero public policies — anon role can do nothing)
```

Decisions and rationale:

- **One Vercel function, `api/leaderboard.ts`, handling GET and POST.** Vercel
  auto-builds `/api/*.ts` next to a static Vite build with no `vercel.json` needed;
  one file stays under Hobby-plan function limits and keeps the surface tiny.
- **Browser never talks to Supabase.** No Supabase URL, anon key, or service key ships
  in the bundle. The client calls same-origin `/api/...` only. RLS is enabled with no
  policies, so even a leaked anon key could do nothing; the service role key (server
  env var only) bypasses RLS.
- **Zero new runtime npm dependencies.** The function uses Node 22's global `fetch`
  against Supabase's PostgREST REST API and one `submit_score` SQL function (RPC) for
  the atomic rate-limit + best-score upsert. (`@supabase/supabase-js` is an acceptable
  DX alternative, but plain fetch matches the repo's minimal-dependency rule and
  avoids bundling concerns entirely.) Only new devDependency: `@vercel/node` (types).
- **Shared pure validation module** in `src/leaderboard/` (types, name rules,
  profanity filter, per-game score plausibility) imported by both the client (friendly
  pre-validation) and the API function (enforcement). It contains no DOM, no Phaser,
  no storage — Vitest-testable and Node-safe. Server never trusts the client copy.
- **Feature flag, off by default.** The client leaderboard code activates only when
  `import.meta.env.VITE_LEADERBOARD_ENABLED === '1'` (set in Vercel) or a test-only
  runtime override is present. `npm run dev` and every existing Playwright suite run
  with the flag absent → **zero network requests, zero behavior change, zero risk to
  the no-console-error and pixel-signature contracts**. Leaderboard e2e specs force
  the override and mock `/api/**` routes.
- **One-row-per-(game, normalized name), best score kept.** The leaderboard displays
  distinct names, an upsert keeps only improvements, and spam can't flood the top 10
  with one grinder's run history. (Names are unowned without accounts — see §8.)
- **Local high scores are independent.** `ScoreManager`/`SafeStorage`/HUD/bridge/cards
  are not modified; global submission is a parallel, additive path that works (or
  silently doesn't) without affecting play.

## 2. Supabase schema

Run in the Supabase SQL editor (§11). Checks are a backstop; the API validates first.

```sql
-- One row per (game, normalized name); only improvements overwrite.
create table if not exists leaderboard_scores (
  id         bigint generated always as identity primary key,
  game_id    text not null check (game_id in
    ('neon-serpent','bounce-circuit','star-courier','lane-rush','circuit-stack')),
  name       text not null check (char_length(name) between 2 and 16),
  name_key   text not null check (char_length(name_key) between 2 and 16),
  score      integer not null check (score > 0 and score <= 1000000),
  tick       integer not null check (tick > 0 and tick <= 1000000),
  run_seed   bigint  not null check (run_seed between 1 and 4294967295),
  ip_hash    text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (game_id, name_key)
);

create index if not exists leaderboard_scores_top
  on leaderboard_scores (game_id, score desc);

-- Rolling submission log for rate limiting; pruned inside submit_score.
create table if not exists leaderboard_submissions (
  id         bigint generated always as identity primary key,
  ip_hash    text not null,
  game_id    text not null,
  created_at timestamptz not null default now()
);

create index if not exists leaderboard_submissions_recent
  on leaderboard_submissions (ip_hash, created_at desc);

-- RLS on, zero policies: anon/authenticated can read/write nothing.
-- The service role key used by the Vercel function bypasses RLS.
alter table leaderboard_scores enable row level security;
alter table leaderboard_submissions enable row level security;

-- Top entry per game in one query (home screen "world best" line).
create or replace view leaderboard_tops
  with (security_invoker = true) as
  select distinct on (game_id) game_id, name, score
  from leaderboard_scores
  order by game_id, score desc, updated_at asc;

-- Atomic submit: rate limit + best-score upsert + rank, one round trip.
create or replace function submit_score(
  p_game_id text, p_name text, p_name_key text,
  p_score integer, p_tick integer, p_run_seed bigint, p_ip_hash text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  recent_count integer;
  current_best integer;
  new_best     integer;
  improved     boolean;
  new_rank     integer;
begin
  select count(*) into recent_count
    from leaderboard_submissions
    where ip_hash = p_ip_hash
      and created_at > now() - interval '60 seconds';
  if recent_count >= 6 then
    return jsonb_build_object('accepted', false, 'reason', 'rate_limited');
  end if;

  insert into leaderboard_submissions (ip_hash, game_id)
    values (p_ip_hash, p_game_id);
  delete from leaderboard_submissions
    where created_at < now() - interval '1 hour';

  select score into current_best
    from leaderboard_scores
    where game_id = p_game_id and name_key = p_name_key
    for update;

  if current_best is null then
    insert into leaderboard_scores
        (game_id, name, name_key, score, tick, run_seed, ip_hash)
      values (p_game_id, p_name, p_name_key, p_score, p_tick, p_run_seed, p_ip_hash);
    new_best := p_score; improved := true;
  elsif p_score > current_best then
    update leaderboard_scores
      set score = p_score, name = p_name, tick = p_tick,
          run_seed = p_run_seed, ip_hash = p_ip_hash, updated_at = now()
      where game_id = p_game_id and name_key = p_name_key;
    new_best := p_score; improved := true;
  else
    new_best := current_best; improved := false;
  end if;

  select count(*) + 1 into new_rank
    from leaderboard_scores
    where game_id = p_game_id and score > new_best;

  return jsonb_build_object(
    'accepted', true, 'improved', improved,
    'best', new_best, 'rank', new_rank);
end;
$$;

revoke execute on function
  submit_score(text, text, text, integer, integer, bigint, text)
  from public, anon, authenticated;
```

## 3. Environment variables

| Variable                    | Where                                 | Purpose                                                                                                               |
| --------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `SUPABASE_URL`              | Vercel (Prod + Preview), `.env.local` | Supabase project URL. Server-only.                                                                                    |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel (Prod + Preview), `.env.local` | Service role key; bypasses RLS. **Server-only; never `VITE_`-prefixed; never in the repo.**                           |
| `LEADERBOARD_IP_SALT`       | Vercel (Prod + Preview), `.env.local` | Random salt for `sha256(ip + salt)` — rate limiting without storing raw IPs. Generate once (`openssl rand -hex 16`).  |
| `VITE_LEADERBOARD_ENABLED`  | Vercel (Prod + Preview), value `1`    | Build-time client flag. Absent locally/CI → leaderboard UI dormant, zero network calls, all existing tests unchanged. |

Rules: anything `VITE_`-prefixed is compiled into the public bundle — only the boolean
flag ever gets that prefix. Local dev of the real API uses `vercel dev` +
`vercel env pull .env.local`; `.env*` must be added to `.gitignore` (planned for
Phase 2 — **deviation: landed in Phase 0**, because `.env.local` already existed on
disk and had to be protected before any commits). A post-build grep for `SUPABASE`
in `dist/` is part of the Phase 2 validation.

## 4. Vercel API contracts

Single function `api/leaderboard.ts`. JSON only. Same-origin use; no CORS headers are
set (browsers on other origins are refused by default). When an `Origin` header is
present and does not match the deployment host, respond 403. Non-GET/POST → 405.
Bodies over 1 KB → 413. Upstream/Supabase failures → 502 with a generic body (never
leak Supabase errors or URLs).

### GET `/api/leaderboard?game=<id>&limit=<n>`

- `game`: one of the five game IDs, or `all`.
- `limit`: optional, integer, clamped to 1–50, default 10. Ignored for `all`.
- 200 (single game):

```json
{
  "game": "lane-rush",
  "entries": [{ "rank": 1, "name": "AAA", "score": 1234, "createdAt": "2026-07-07T00:00:00Z" }]
}
```

- 200 (`all` — one request for the home screen; from `leaderboard_tops`):

```json
{ "tops": { "neon-serpent": { "name": "AAA", "score": 900 }, "bounce-circuit": null, "...": null } }
```

- 400 `{ "error": { "code": "invalid_game" } }` / `{ "code": "invalid_limit" }`.
- Caching: `Cache-Control: public, s-maxage=30, stale-while-revalidate=120` — the
  Vercel CDN absorbs read traffic; the browser never caches stale boards for long.

### POST `/api/leaderboard`

Request (all fields required):

```json
{ "gameId": "lane-rush", "name": "AAA", "score": 1234, "tick": 4021, "runSeed": 987654321 }
```

Validation order (first failure wins; each returns 400 unless noted):

1. `gameId` in the five-ID allowlist → `invalid_game`.
2. `name` after trim + whitespace collapse: 2–16 chars → `name_length`; charset
   `A–Z a–z 0–9 space _ -` → `name_charset`; profanity check (§6) → `name_not_allowed`.
3. `score` integer, `1 ≤ score ≤ hard cap(gameId)` → `invalid_score`.
4. `tick` integer, `1 ≤ tick ≤ 1_000_000` → `invalid_tick`.
5. `runSeed` integer, `1 ≤ runSeed ≤ 4_294_967_295` → `invalid_seed`.
6. Per-game plausibility `score ≤ plausibleMaxScore(gameId, tick)` and divisor check
   (§7) → `implausible_score`.
7. RPC `submit_score(...)`; `rate_limited` → **429** `{ "error": { "code": "rate_limited" } }`.

Success → 200:

```json
{ "accepted": true, "improved": true, "best": 1234, "rank": 7 }
```

`improved: false` means an equal-or-higher score already existed for that name; the
client shows "best for AAA is 2000" instead of celebrating. Malformed JSON → 400
`invalid_body`. Wrong content type → 415.

## 5. Client-side UI plan

New shell-side module set (none of it lives in `*Logic.ts` files; no Phaser imports):

- `src/leaderboard/shared.ts` (+ `bannedWords.ts`, `plausibility.ts`) — pure shared
  validation (§6, §7), imported by client and API.
- `src/core/LeaderboardService.ts` — module singleton (the `audioEngine` pattern):
  `isEnabled()`, `fetchTop(gameId, limit)`, `fetchTops()`, `submit(entry)`. `fetch`
  with a 5 s `AbortController` timeout; **never throws and never logs** — every call
  resolves to a typed result (`{ ok: true, ... } | { ok: false, reason: 'offline' | 'http' | 'invalid' | 'disabled' }`).
  When the flag is off, every method resolves `{ ok: false, reason: 'disabled' }`
  without touching the network.
- `src/ui/LeaderboardPanel.ts` — game-over submission + top-10 display.

**Name entry.** Stored at `pocket-arcade:player-name` via the existing `SafeStorage`
string API. First game-over with a score shows a compact inline form (text input,
`maxlength=16`, `autocomplete=off`) inside the game-over panel; the shared validator
runs on input and shows friendly messages ("2–16 letters, numbers, spaces, - or \_",
"That name isn't allowed"). Once saved, later game-overs show the name with a small
"edit" affordance instead of the input.

**Score submission flow.** `BaseGameScene` dispatches one `arcade-game-over`
CustomEvent (`{ gameId, score, tick, runSeed }`) on each alive→dead transition — both
existing death-detection sites (fixed-step loop and input handler) already compute the
transition for audio cues, so no new game state is needed and `*Logic.ts` is
untouched. A shell-side controller listens and, when the flag is on and `score > 0`,
shows the panel: **one explicit Submit tap/click** (never auto-submit — restart-spam
must not become request-spam), then `submitting → submitted (rank N / best M) |
failed (Retry) `. Duplicate protection client-side: the controller submits at most
once per run-end event.

**Leaderboard display.** In the same game-over panel, below the submit row: top 10 for
the current game (fetched when the panel opens), rows `rank · name · score` rendered
**via `textContent` only** (server data is untrusted). On short canvases (mobile
portrait) show the top 5 — the panel must never introduce page scroll.

**Loading / error states.** Loading: a quiet `…` placeholder row. Error/offline: a
single muted line "Global scores unavailable" plus Retry on the submit action; the
panel never blocks restarting (ACTION/Restart keep working — the panel is
display-only chrome and must not swallow gameplay input; inputs inside it are excluded
the same way shell buttons already are via `InputManager`'s focus check). Flag off:
no panel, no fetches, nothing rendered.

**Home screen integration.** One `fetchTops()` call when the home hub is shown (flag
on): each `.home-card` gains a `World <score>` fragment on the existing high-score
line (e.g. `High 777 · World 12,340`) — same line, no added card height, because the
375×667 no-scroll fit test pins the hub geometry. No data / error → the fragment
simply doesn't render. Cached for the session; Back-to-home doesn't refetch more than
once a minute.

**Game-over integration.** The panel is an absolutely-positioned DOM overlay inside
`.game-root` (the canvas already dims and draws GAME OVER/restart text; the panel
sits in the lower third). DOM overlay, not canvas, because it needs an `<input>`,
focus management, and `textContent` safety. It appears only on game-over, is removed
on restart/scene switch/Back, respects both themes via existing tokens, and is fully
keyboard-operable with visible focus.

## 6. Profanity / moderation strategy

- **Client-side (friendly):** the shared validator runs as the user types; violations
  show a gentle inline message and disable Submit. Purely UX — never trusted.
- **Server-side (enforcement):** the API re-runs the exact same shared module on every
  POST; failures return 400 `name_not_allowed` / `name_charset` / `name_length`.
  Postgres CHECK constraints back-stop length/charset drift.
- **Allowed characters:** `A–Z a–z 0–9`, space, `_`, `-` after trimming and collapsing
  whitespace runs. No leading/trailing space. ASCII-only in v1 — this dodges Unicode
  homoglyph bypasses entirely and matches the arcade three-initials spirit; document
  as a deliberate v1 restriction.
- **Length limits:** 2–16 characters (display and key).
- **Matching:** normalize before checking — lowercase, strip spaces/`_`/`-`, map
  common leetspeak (`0→o 1→i 3→e 4→a 5→s 7→t 8→b @→a $→s`). Slurs/severe entries
  match as substrings; short/mild entries match whole-string only (avoids the
  Scunthorpe problem). A few reserved names (`admin`, `moderator`, `pocket arcade`)
  are rejected too.
- **Banned word list location:** `src/leaderboard/bannedWords.ts` — a small curated
  const array (slurs, severe profanity, reserved names), unit-tested for both hits and
  safe near-misses. Shared by client and server so they can never disagree. No
  third-party filter dependency.
- **Moderation backstop:** the Supabase table editor is the manual moderation tool
  (delete a row); `ip_hash` supports pattern spotting. Good enough at this scale;
  a report button is explicitly out of scope.

## 7. Score validation strategy

- **Allowed game IDs:** exactly the five registry IDs (single shared const array —
  client, API, and SQL CHECK all derive from the same list).
- **Integer / range checks:** `score`, `tick`, `runSeed` must be integers
  (`Number.isSafeInteger`); ranges per §4. Score `0` is never submitted (nothing to
  rank).
- **Per-game plausibility** — pure functions in `src/leaderboard/plausibility.ts`,
  derived from logic constants, unit-tested, generous by ~25% so no honest run is ever
  rejected:

| Game             | Derivation (from `*Logic.ts`)                                                                                             | Rate bound (pre-slack) | Divisor | Hard cap |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ------- | -------- |
| `neon-serpent`   | ≤1 food/tick, ≤10×8 per food; 18×24 grid caps foods at ~429 → theoretical max ≈ 34,320                                    | `80 × tick`            | 10      | 35,000   |
| `bounce-circuit` | distance ≤ 0.42/tick banked once; orbs ≤3 per 16-unit chunk at 25 each → ≤ ~2.4/tick                                      | `3 × tick + 200`       | —       | 150,000  |
| `star-courier`   | spawn interval ≥14 ticks, +15/kill, kills ≤ spawns                                                                        | `15 × (tick/14 + 1)`   | 15      | 120,000  |
| `lane-rush`      | spawn attempt every 28 ticks, best +12/car                                                                                | `12 × (tick/28 + 1)`   | —       | 50,000   |
| `circuit-stack`  | ≥10 ticks/lock at max gravity; a 700-point tetris consumes 8 pieces → sustained ≤ ~8.75/tick (+2 tetrises early headroom) | `9 × tick + 1400`      | 50      | 200,000  |

    `plausibleMaxScore(gameId, tick)` applies the rate bound × 1.25 slack, then the
    hard cap. The divisor column is an extra cheap check (`score % d === 0`) where all
    scoring events share a factor. Constants live beside a comment citing each source
    line; Phase 1 re-derives them against the code and records a few real max-effort
    runs as sanity fixtures. If gameplay scoring ever changes (not this pass), these
    constants are part of the change's blast radius — the Vitest suite pins them.

- **`runSeed` handling:** required, stored verbatim. Honest framing: without
  server-authoritative simulation the server **cannot replay or verify** a run from
  its seed; `runSeed` is a forensic/dedupe signal (identical name+score+seed
  resubmissions are idempotent by the upsert; oddities like hundreds of distinct
  scores sharing one seed are visible in the table). Seeds forced via `?seed=N` are
  legitimate play and are not rejected.
- **Duplicate / spam handling:** (a) best-per-name upsert means resubmits and grinder
  streaks collapse to one row; (b) the RPC rate limit: ≥6 submissions per `ip_hash`
  per 60 s → 429 (constants tunable in one place); (c) client submits once per
  run-end event; (d) `improved: false` responses give re-submitters no new row.

## 8. Security / abuse limitations

**What this design prevents:**

- Direct database access or mass writes: no key of any kind ships to the browser; RLS
  with zero policies makes even the anon role inert; the RPC is revoked from public.
- Garbage data: server-side type/range/charset/profanity/plausibility validation with
  DB CHECK backstops; XSS is dead twice over (charset allowlist + `textContent`
  rendering).
- Casual score forgery: DevTools "submit score: 999999999" fails the hard caps;
  "score 50,000 at tick 100" fails the rate bounds; wrong divisors fail.
- Flooding: per-IP rate limiting, one-row-per-name, CDN-cached reads, 1 KB body cap.
- Accidental self-DoS: the flag-off default means dev/CI/tests generate zero traffic.

**What it does not prevent (accepted, documented):**

- **A determined forger.** Anyone can read the client, compute a plausible
  `{score, tick, runSeed}`, and POST it with curl. Without accounts or
  server-authoritative gameplay, submitted scores are ultimately claims. Mitigations
  land in a future pass if ever needed: replaying the run server-side from
  `runSeed` + a recorded input trace (the deterministic logic engines make this
  genuinely feasible later — they run in Node today), signed run tokens, accounts.
- **Name impersonation / squatting:** names are first-come, unowned; anyone can
  submit as "AAA" (they can only ever raise that name's score, never lower it).
- **IP rotation:** rate limits are per-IP-hash; VPN rotation defeats them.
- **Shared-IP collateral:** NAT'd players share a rate-limit bucket (6/min is sized
  so this rarely bites).

This matches the stated bar: reasonably secure against casual abuse, cheap, no auth.

## 9. Testing plan

- **Vitest (pure, in `src/leaderboard/*.test.ts`):** name validation (lengths,
  charset, trim/collapse), profanity (hits, leet hits, safe near-misses), game-ID
  allowlist, integer/range rules, per-game plausibility tables (accept boundary,
  reject boundary+1, divisor checks), and — with a small injected fake store — the
  API core (`handleGet`/`handlePost` extracted as pure functions taking a transport):
  every error code, validation order, rate-limit passthrough, `improved` semantics.
  **Trap:** the import-boundary guard scans all `src/**/*.test.ts` for the literal
  words `window`/`document`/`localStorage` — these tests must be (and naturally are)
  pure. `api/leaderboard.ts` itself stays a thin adapter (req/res ↔ core), so the
  untested surface is glue only.
- **Playwright (`tests/leaderboard.spec.ts`, all network via `page.route`
  fulfillments — no real API in CI):** submit flow end-to-end (die with score → panel
  → enter name → Submit → mocked 200 → rank shown, name persisted); persisted-name
  fast path; client-side profanity/charset message blocks Submit (0 requests fired);
  top-10 renders from mocked GET; home cards show mocked `World` fragments; mocked
  429/500 → quiet error + Retry. **Console caveat:** Chromium logs failed HTTP
  responses as console errors — error-path specs must not assert console cleanliness
  (mirrors the existing headless-caveats rule); happy-path specs fulfill 200s and may.
- **localStorage tests:** `pocket-arcade:player-name` write/read via the UI;
  `pocket-arcade:<id>:high` keys asserted **unchanged** by submission flows; the
  entire existing `highscore.spec.ts` keeps passing untouched.
- **No-network fallback:** `route.abort()` spec — panel shows "Global scores
  unavailable", restart still works, no crash; service-level unit tests for timeout
  and non-JSON responses.
- **Env var / flag behavior:** a spec with the flag off (the default dev build)
  counts `/api/**` requests and asserts **zero**, and asserts no leaderboard DOM
  exists; the flag-on path is exercised via the documented test override
  (`window.__ARCADE_LB_FORCE__` set in `addInitScript`), keeping `npm run dev`
  builds honest. Post-build `grep -r SUPABASE dist/` (and for the service key
  variable name) must return nothing — wired into the Phase 2/6 validation notes.
- **Real-API smoke (manual, documented not automated):** curl matrix against
  `vercel dev` and against the preview deployment — valid submit, each 4xx class,
  429 on the 7th rapid submit, GET caching header present.
- **Regression sweep:** full `npm run validate` at every phase close; both Playwright
  projects for any shell CSS change (no-scroll pins at all eleven viewports); pixel
  signatures unaffected (the panel is DOM, not canvas — same reasoning as the CSS
  scanlines).

## 10. Implementation phases

Mirrors `.claude/leaderboard-loop.md` (one phase per loop invocation):

- **Phase 0 — Readiness gate.** Verify §11 manual setup is done (Supabase schema
  applied, Vercel envs set); re-verify this plan's pins against current source; stop
  the pass if anything is missing.
- **Phase 1 — Shared foundation.** `src/leaderboard/` types + name/profanity/
  plausibility modules + full Vitest coverage. No UI, no network, no api/.
- **Phase 2 — API.** `api/leaderboard.ts` + `api/tsconfig.json` (strict) + lint/build
  wiring + testable core with injected transport + `.gitignore` for `.env*` + bundle
  grep + manual curl verification via `vercel dev`.
- **Phase 3 — Client service.** `LeaderboardService` with flag gating and the typed
  offline/error results; zero-requests-when-disabled spec.
- **Phase 4 — Name entry + submission UI.** `arcade-game-over` event,
  `LeaderboardPanel` submit flow, name persistence, client validation messages.
- **Phase 5 — Display.** Game-over top-10, home-card `World` fragments,
  loading/error states, both themes, no-scroll pins re-run on both projects.
- **Phase 6 — Hardening + docs + deploy.** Full test sweep and flake pass, README /
  CLAUDE.md / CURRENT_APP_STATE.md updates, deploy checklist run against a Vercel
  preview, then production.

## 11. Exact manual setup steps (do these before Phase 0 approves)

**Supabase (~10 min):**

1. Create a project at supabase.com (free tier, region nearest your Vercel region;
   default `us-east-1`-adjacent is fine). Save the database password anywhere safe —
   the app never uses it.
2. SQL Editor → New query → paste all of §2 → Run. Expect "Success".
3. Verify: Table Editor shows `leaderboard_scores` and `leaderboard_submissions`,
   both with the RLS shield icon enabled and **zero policies**; Database → Functions
   shows `submit_score`.
4. Project Settings → API: copy the **Project URL** and the **`service_role` secret
   key** (not the anon key). Never commit either.

**Vercel (~5 min, in the existing Pocket Arcade project):**

5. Settings → Environment Variables, add for **Production and Preview**:
   - `SUPABASE_URL` = the project URL
   - `SUPABASE_SERVICE_ROLE_KEY` = the service_role key (mark Sensitive)
   - `LEADERBOARD_IP_SALT` = output of `openssl rand -hex 16`
   - `VITE_LEADERBOARD_ENABLED` = `1`
6. Settings → General: confirm Framework Preset is Vite and Node.js version is 22.x
   (matches `engines`).

**Local (~5 min, for testing the real function during Phase 2):**

7. `npm i -g vercel` (or use `npx vercel`), then `vercel link` in the repo (pick the
   existing project) and `vercel env pull .env.local`.
8. Do **not** set `VITE_LEADERBOARD_ENABLED` in your shell for normal `npm run dev` —
   local play should stay flag-off so the standing test suites keep meaning what they
   mean. `vercel dev` is the tool for exercising the real API locally.

Nothing else is required before implementation starts.
