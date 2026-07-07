# NEXT_RUN — Global Leaderboard Pass (branch `leaderboard-pass-1`)

Loop: `.claude/leaderboard-loop.md`. Spec: `LEADERBOARD_PLAN.md` (marked
IMPLEMENTED). System map: `CURRENT_APP_STATE.md`. **Pass complete — phases 0–6
done, all green, ready to merge.**

## Phase status

| Phase | Scope                                           | Status           |
| ----- | ----------------------------------------------- | ---------------- |
| 0     | Readiness gate + plan-pin verification          | done (`e264f6e`) |
| 1     | `src/leaderboard/` shared validation + Vitest   | done (`3123105`) |
| 2     | `api/leaderboard.ts` + tsconfig/lint/build      | done (`dcbe362`) |
| 3     | `LeaderboardService` client (flag-gated)        | done (`4c1e9b0`) |
| 4     | Name entry + submission UI (`arcade-game-over`) | done (`db4a5d8`) |
| 5     | Display: game-over top-10 + home `World` line   | done (`7eb97aa`) |
| 6     | Hardening + docs + deploy checklist             | **done** (this)  |

## Phase 6 (this run) — hardening + docs

**What changed:** documentation only — no source/test/behavior changes.

- `README.md` — new "Global Leaderboard (optional, flag-gated)" section (feature,
  name entry, local vs global, Vercel/Supabase architecture, env-var names without
  values, deploy notes) + a leaderboard entry under Current Limitations.
- `CLAUDE.md` — architecture map updated (`src/leaderboard/`, `api/`, new core/ui
  modules) + a "Leaderboard Invariants" block (flag gating, no browser Supabase,
  shared server-authoritative validation, `arcade-game-over`/`arcade-run-start`
  contracts, independent local highs, throttled home tops, `textContent`, DOM-not-
  canvas, test rules).
- `CURRENT_APP_STATE.md` — leaderboard pass note + counts refreshed (Vitest 154,
  Playwright 103/33, 8 spec files) + `leaderboard`/`home` spec coverage bullets.
- `LEADERBOARD_PLAN.md` — "IMPLEMENTED" banner: final files/architecture,
  deliberate deviations, honest security limitations.
- `NEXT_RUN.md` — this final summary.

## Test integrity audit (branch vs `main`)

Only **two** test files differ from `main`, both intended:

- `tests/leaderboard.spec.ts` — **entirely new** on this branch (created Phase 3,
  extended 4–5). No pre-existing assertion exists to weaken.
- `tests/home.spec.ts` — **pure additions** (+153 lines; diffstat shows no
  deletions). Existing home assertions are byte-identical to `main`.
- `smoke` / `games` / `switching` / `highscore` / `audio` / `shell` specs are
  **byte-identical to `main`** — untouched, none weakened.

Documented intra-branch deltas (Phase 5, not weakenings):

- Phase-3 service specs (`leaderboard.spec` tests 2 & 3) now drive the service in
  **game mode** so the new home `game=all` auto-fetch does not inflate their exact
  request counts. Same result assertions.
- Phase-4 invalid-name spec now counts **POST** requests only — the panel
  legitimately GETs the top list on open; the "invalid name never submits" contract
  is unchanged.
- `home.spec` high-score assertions unchanged; `.home-card-high` was split into
  `.hs-local` + `.hs-world`, and the combined `textContent` is identical flag-off.

No tests skipped, no assertions deleted, no timeouts raised to mask flakes.

## Final validation results

- **Flake sweep:** `npx playwright test leaderboard home shell smoke games
--repeat-each=2` (both projects) → **194 passed / 58 skipped**, exit 0. No
  forced-seed restart flake, no console-cleanliness regression, throttle/refetch
  stable.
- **Full `npm run validate`** (fresh) → **green**:
  - build: `tsc --noEmit` (root) + `tsc --noEmit -p api` + `vite build` OK.
  - Vitest: **154 passed** (11 files).
  - lint: eslint (`src tests scripts api`) + import-boundary (**16 files**) +
    Prettier `--check .` clean.
  - Playwright: **103 passed / 33 skipped** (desktop + mobile), incl. the
    `switching.spec` pixel-signature regression → no pixel-signature regression.
- **Secret grep:** `grep -riE 'supabase|service_role|SUPABASE_SERVICE_ROLE_KEY|LEADERBOARD_IP_SALT'
dist/` → **empty**. Even `VITE_LEADERBOARD_ENABLED` compiles away flag-off.
- **Flag-off network:** `leaderboard.spec` + `home.spec` pin **zero `/api`** on home
  and game-over with the flag off. Flag-on specs use `page.route` mocks only.
- **Repo hygiene:** `.env*` is git-ignored (`.gitignore:8`); no `.env` file is
  tracked.

## Deploy checklist (manual — run against a Vercel Preview, then Production)

Automated so far: `.env*` ignored + untracked ✅; `dist` secret-free ✅. The rest
require the live platforms and must be done by a human with dashboard access:

**Env vars (Vercel → Settings → Environment Variables, Production + Preview):**

- [ ] `SUPABASE_URL` set (server-only, not `VITE_`-prefixed)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set + marked Sensitive (server-only)
- [ ] `LEADERBOARD_IP_SALT` set (`openssl rand -hex 16`, Sensitive)
- [ ] `VITE_LEADERBOARD_ENABLED = 1` (the only `VITE_` leaderboard var)
- [ ] `.env.local` present locally only, never committed (verified ignored above)

**Supabase dashboard:**

- [ ] `leaderboard_scores` table exists
- [ ] `leaderboard_submissions` table exists
- [ ] RLS enabled (shield icon) on both, with **zero policies** (← Phase 0 residual:
      confirm the zero-policies state visually before trusting prod)
- [ ] `submit_score` function exists; `service_role` can execute it
- [ ] tables clean or only deliberate test rows

**Preview deployment smoke (browser):**

- [ ] home loads; `World` fragments appear (or fail silently — no console error)
- [ ] play a game, die with a positive score, enter a valid name, Submit → rank/best
- [ ] the score appears in the game-over top list
- [ ] returning home (after the throttle) shows it on the `World` line
- [ ] a profanity/too-short/illegal name blocks Submit
- [ ] mobile portrait fits with no scroll; dark + light both readable

**Curl matrix (against the Preview URL or `vercel dev`):**

- [ ] `GET /api/leaderboard?game=neon-serpent` → 200 + `Cache-Control` header
- [ ] `GET /api/leaderboard?game=all` → 200 tops
- [ ] `POST` valid score → 200 `{accepted, improved, best, rank}`
- [ ] `POST` implausible score → 400 `implausible_score`
- [ ] `POST` banned name → 400 `name_not_allowed`
- [ ] 7th rapid `POST` within 60 s → 429 `rate_limited`
- [ ] `PUT`/`DELETE` → 405 `method_not_allowed`
- [ ] malformed body → 400 `invalid_body`

## Manual QA checklist (feature behavior)

- [ ] Game-over panel: lower-third overlay, doesn't cover Restart/Back/d-pad/ACTION,
      no page scroll, both themes readable, reduced-motion calm.
- [ ] Submit is always explicit; one submission per run-end; Retry re-arms after a
      failure; Restart/Back/ACTION restart all still work with the panel open.
- [ ] Saved name greets on the next game over with Edit; Edit changes the name.
- [ ] Top list: TOP 10 desktop / TOP 5 mobile; loading `…`, empty, and unavailable
      states read cleanly; server names render literally (no HTML injection).
- [ ] Home cards: `High N · World M`; one line, no card-height growth, no scroll;
      omitted for games without a global best.

## Known limitations

- No accounts/auth; names are not owned. Score integrity is best-effort: server
  enforces plausibility bounds + profanity/reserved filter + salted-IP rate limit
  (6 / 60 s), but a client posting plausible, well-formed scores is not
  cryptographically blocked. Not an anti-cheat system.
- Home `World` fetch is throttled ≥60 s; a brand-new global best set elsewhere can
  lag on an already-open home hub until the window elapses.
- The real API is verified manually (`vercel dev` / preview curl); CI never hits a
  real backend (route mocks only).
- Phase 0's RLS/zero-policies state was inferred from a single-batch schema run —
  eyeball it in the dashboard before production (checklist above).

## Merge recommendation

**Recommend merge.** The branch is fully green (build + api tsc + Vitest 154 + lint

- Playwright 103/33 + clean flake pass), `dist` is secret-free, and the feature is
  **off by default** — merging to `main` changes nothing for the static build until
  `VITE_LEADERBOARD_ENABLED=1` is set in the deploy env. Suggested flow: open the PR,
  run the Preview deploy checklist above, then merge and repeat the browser smoke on
  Production.

* Push: `git push -u origin leaderboard-pass-1`
* PR title: `Global leaderboard (flag-gated): API, submission UI, and display`
* After merge, enable `VITE_LEADERBOARD_ENABLED=1` (Prod + Preview) and run the
  deploy checklist.

## Prior-phase anchors

- **Phase 5 (`7eb97aa`):** game-over top list (`fetchTop`, TOP 10/5, loading/empty/
  unavailable, refresh-on-improved) + home `World` fragments (throttled `fetchTops`,
  mode-gated, silent-on-fail, `textContent`).
- **Phase 4 (`db4a5d8`):** `arcade-game-over`/`arcade-run-start`; `LeaderboardPanel`
  submit flow; name at `pocket-arcade:player-name` on accept.
- **Phase 3 (`4c1e9b0`):** `LeaderboardService` (flag-gated, same-origin, typed
  never-throwing results).
- **Phase 2 (`dcbe362`):** `api/leaderboard.ts` over `serverCore.ts` (guards,
  validation order, RPC → improved/429, generic 502).
- **Phase 0/1 (`e264f6e`/`3123105`):** readiness gate + pure shared validation.
  Error codes 400/403/405/413/415/429/502; rate-limit 6 / ip_hash / 60 s; GET cache
  `public, s-maxage=30, stale-while-revalidate=120`.
