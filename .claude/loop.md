# Pocket Arcade Autonomous Improvement Loop

You are running an autonomous improvement loop on Pocket Arcade. Each iteration delivers one small, verified, committed slice of improvement. Read `CLAUDE.md` first and obey every hard rule there (zero assets, logic/scene separation, strict TypeScript, validation requirements). Never fake progress.

## Per-Iteration Procedure

### 1. Orient

- Run `git status` and `git log --oneline -10`. Summarize the current state in one or two sentences.
- Read `NEXT_RUN.md` if it exists — it names the next highest-leverage task and any known failures. If it documents a broken state, fixing that is automatically the current slice.

### 2. Baseline (when relevant)

If this is the first iteration, or `NEXT_RUN.md` is missing/stale, or the previous iteration touched shared systems, establish a baseline:

```bash
npm run build && npm run test && npm run lint && npm run test:e2e
```

(First e2e run may need `npx playwright install chromium`.) Record pass/fail per command. If baseline is red, fixing it is the slice — nothing else proceeds on a red baseline.

### 3. Pick the next slice

Work strictly in phase order; within a phase, pick the smallest slice that produces verifiable improvement. Do not start a later phase while an earlier phase has undone work, except for trivial opportunistic fixes encountered in files you are already editing.

- **Phase 1 — Truth/render integrity.** Star Courier, Lane Rush, and Circuit Stack scenes currently draw entities from counts at synthetic positions. For each game: extend the logic state snapshot with real entity positions (JSON-serializable, deterministic), render from them, and add a render/state contract test (Playwright bridge assertion or logic test) proving positions in the snapshot match logic truth. One game per slice.
- **Phase 2 — High scores for real.** Wire `src/core/ScoreManager.ts` into actual gameplay: persist per-game high scores on score changes/game-over, expose `highScore` through the bridge snapshot, display it in the HUD and shell. Add a Playwright test that scores, reloads, and sees the persisted high score (clear `pocket-arcade:*` keys in setup).
- **Phase 3 — AudioEngine lifecycle.** Fix the unlock-listener teardown (listeners attached per scene `create()` are never removed unless unlock fires, and each scene builds its own AudioContext) — either remove listeners on scene SHUTDOWN or convert AudioEngine to a safe module singleton attached once. Keep the import boundary intact; verify no `console.error` in e2e and no listener accumulation across scene switches.
- **Phase 4 — Deep per-game tests.** Add per-game Playwright interaction tests (semantic input → observable state change, game-over, restart) and/or render-state contract tests. Every game gets at least one deep test beyond the smoke suite. Keep each under ~15s, `waitForFunction` only, no fixed sleeps.
- **Phase 5 — Game feel.** For every game: particles, trails, hitstop, screen shake, procedural explosions, transitions, pause/game-over states, progression, scoring clarity, fairness. Get a design from `game-feel-director` first, implement rendering via `phaser-renderer` conventions, keep gameplay-affecting feel (grace periods, combo windows) in logic with tests. Respect `prefers-reduced-motion`. One game (or one cross-cutting mechanic) per slice.
- **Phase 6 — UI shell.** Arcade cabinet identity, game cards, instructions/onboarding, leaderboard (built on Phase 2), settings, mobile controls, responsive polish. Audit with `ux-polish-auditor` first; preserve the desktop three-column layout and mobile no-scroll constraint.
- **Phase 7 — Bundle/performance.** Only after gameplay quality is substantially improved. Use `performance-guardian`: dynamic-import scenes, manual chunks, allocation cleanup. Report before/after gzip numbers.

### 4. Use skills and subagents where they earn their cost

- `.claude/agents/`: `game-feel-director` (feel audits/designs), `phaser-renderer` (rendering conventions/implementation), `ux-polish-auditor` (shell audits), `test-quality-guardian` (test design, coverage review, red-pipeline diagnosis), `performance-guardian` (perf/bundle review). Prefer read-only audit agents before large Phase 5/6 slices; implement small, well-understood slices directly.
- Installed skills: use gamedev skills (`gamedev:phaser-core`, `gamedev:phaser-arcade-physics`, `gamedev:game-feel`, `gamedev:game-ui-ux`, `gamedev:performance-optimization`, `gamedev:input-systems`, `gamedev:audio-design`) and UI/UX/design skills when the slice is in their domain. Don't invoke skills for trivial edits.

### 5. Implement the slice

Small and checkpointed: one game, one system, or one test file per slice. Follow the architecture — truth in `*Logic.ts` (deterministic, framework-free), presentation in `*Scene.ts`, no placeholder rendering, no new assets, no big dependencies. Every meaningful change gets a test or an explicit validation note.

### 6. Verify

- Run the narrow relevant tests first (`npx vitest run src/games/<game>`, `npx playwright test tests/<file>`).
- Run full `npm run validate` when the slice touched shared systems (`src/core/`, `BaseGameScene.ts`, `main.ts`, shell UI, configs) or before any commit that follows several narrow-only slices.
- If validation fails, fix it within this iteration or revert the slice. Do not stack new work on a red repo.

### 7. Checkpoint

- **Commit only if the repo is stable and tests pass.** Use a descriptive message; stay on the current branch.
- Update `NEXT_RUN.md` (overwrite, keep it short) with:
  - What changed this iteration (files + behavior).
  - Which commands ran and passed; which failed and their exact output snippet.
  - Screenshots/artifacts if any were produced (paths under `test-results/` or the scratchpad).
  - Current phase status and the **next highest-leverage task**, specific enough to start cold.
  - Bundle-size figures when they were measured.

### 8. Continue or stop

- Continue to the next iteration while phases remain and validation is green.
- Stop when: the goal is met (all phases done and validated), credits/rate limits end the session, or a blocking issue genuinely requires human input (record the question in `NEXT_RUN.md`).
- **Never leave the repo broken without documenting the exact failing commands, their output, and the suspected cause in `NEXT_RUN.md`.** If a slice can't be finished, revert it and note why.
