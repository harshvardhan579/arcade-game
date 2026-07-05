# Next Run — Session Complete

## Final iteration (2026-07-04, iteration 17)

**Slice: docs refresh + smoke-flake root fix. The loop's goal is met; all seven phases are complete and validated.**

- `README.md`: Architecture, Validation, and Current Limitations sections updated to match reality (truth-based rendering, singleton audio, high-score events, deep e2e suites, split bundle).
- `CLAUDE.md`: "Known Debts" replaced with post-overhaul invariants to preserve (scenes render truth, high-score event path, audio singleton, effects cleanup, bundle split).
- `tests/smoke.spec.ts`: **root-caused the intermittent smoke failure** seen twice this session — the test waited exactly one tick after pressing ArrowDown before asserting `headY` changed, racing the keypress against the step that consumes it. Now waits for the observable effect (`headY` change) instead. Verified with `--repeat-each=5` across both projects (20/20) plus a green full validate.

**Validation:** build + tsc ✓, 34 vitest ✓, lint ✓, e2e 21 passed / 17 intentionally skipped ✓.

## Session summary (17 iterations, all committed green)

| Phase             | Commits                                                     | Outcome                                                                                                                                 |
| ----------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 1 Truth/render    | `73ca32c` `e6f659b` `b8d1056`                               | Star Courier, Lane Rush, Circuit Stack render real entity positions; snapshot contract tests                                            |
| 2 High scores     | `6639c6d`                                                   | ScoreManager persists real gameplay maxima; bridge + HUD; e2e incl. deterministic live scoring                                          |
| 3 Audio lifecycle | `b68a57e`                                                   | Singleton engine, idempotent unlock, Phaser SoundManager off; discriminating AudioContext-count e2e                                     |
| 4 Deep e2e        | `d18ce13`                                                   | Interaction test per game via the bridge, waitForFunction-only                                                                          |
| 5 Feel + fairness | `aca742c` `1d55ac6` `dfa8099` `21b3883` `6177e6b` `cace17c` | HUD truth hook, per-game juice (shared effects helper, reduced-motion gated), ship collision fairness; deterministic win/death e2e runs |
| 6 UI shell        | `b90966e` `1ea0c26` `4357ccd`                               | High scores on cards (event-driven), controls hints, focus states, CRT cabinet treatment; screenshot-verified                           |
| 7 Bundle          | `d5178c4`                                                   | Phaser vendor chunk: app 326 kB → **9.18 kB gzip**; production boot verified via vite preview                                           |
| Wrap-up           | (this commit)                                               | Docs current; smoke race fixed at the root                                                                                              |

Vitest 22 → 34 tests; Playwright 6 → 38 tests (21 active per run). No guards weakened; the import boundary and console-error assertions held throughout.

## Possible future work (not started, in rough priority)

1. Per-scene lazy loading (further bundle work) — scenes registered async; verify bridge timing in smoke.
2. Mobile high-score surface (selector is hidden on mobile; only the in-canvas HUD shows it).
3. Circuit Stack row-clear e2e (needs a faster path to a full row — e.g. a test-only seed/setup hook).
4. Audio variety (per-game cue palettes) within the no-e2e-audio-assertion rule.
5. Pause state (`PAUSE` semantic input is mapped but unused by any logic).
