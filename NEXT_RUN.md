# NEXT_RUN — Playtest Fix Pass Complete

## Final state (2026-07-05, Phase H)

The playtest-driven pass on branch `fable-playtest-fixes-1` is complete: all eight phases done, every commit landed green, docs current.

**Phase H changes:** `README.md` Games section rewritten to describe the actual games (auto-runner Bounce Circuit, weaver/debris Star Courier, neon Lane Rush, seven-piece Circuit Stack with ghost preview, Serpent's surfaced speed ramp); the stale "single-screen Bounce Circuit" shell note replaced; the Validation section now names the pixel-signature switching regression. `CLAUDE.md` gained three future-agent invariants: the scene stop-before-start switching fix, the pixel-signature contract (colors, thresholds, never weaken), and RNG draw-order discipline (derive cosmetic variety from stable data; probe dependent tests if a draw must be added). No gameplay changes.

**Validation:** full `npm run validate` ✓ — build + strict tsc, 54 Vitest, ESLint + import boundary + Prettier, Playwright 22 passed / 18 intentionally skipped. Flake confidence: `tests/switching.spec.ts` 3/3 under `--repeat-each=3`; deep `tests/games.spec.ts` 20/20 under `--repeat-each=2`. No flakes observed; no sleeps added anywhere in the pass.

## Commits in this pass (oldest first)

| Commit    | Phase | Summary                                                                       |
| --------- | ----- | ----------------------------------------------------------------------------- |
| `80e64b0` | A     | P0 switching fix (stop outgoing scene) + pixel-signature regression test      |
| `fb10f68` | B     | Circuit Stack full tetromino set, 7-bag randomizer, ±2 kicks, preview sizing  |
| `f9949d8` | C     | Neon Serpent speed ramp tuned (80 ms floor) and surfaced (`Spd N`, hint)      |
| `1e3001c` | D     | Bounce Circuit redesigned into a scrolling procedural auto-runner             |
| `4114bdd` | E     | Star Courier weavers, telegraphed debris, defense line, readability + juice   |
| `bc7e712` | F     | Lane Rush neon racer overhaul (shoulders/posts/haze/layered cars/popups)      |
| `e9fd550` | G     | Arcade-wide cohesion (shared game-over dim, amber popups, Serpent/Stack glow) |
| this      | H     | Docs refresh, invariants, flake-confidence validation                         |

Test growth this pass: 40 → 54 Vitest; e2e 22 active per run (40 defined across projects) including the canvas pixel regression.

## Known remaining polish ideas (none blocking)

1. Circuit Stack row-clear path still has no e2e (logic-tested only; honest gap, needs a test-only fast setup hook).
2. Per-scene lazy loading could shrink the initial app chunk further (Phaser vendor chunk already split).
3. Audio is minimal — per-game cue palettes would deepen identity (synthesized only, no e2e audio assertions).
4. `PAUSE` semantic input is mapped but unused by any logic.
5. Mobile shows high scores only in-canvas (selector cards are desktop-only).
6. Bounce Circuit LEFT/RIGHT nudge is subtle; a playtest may want it stronger or telegraphed in the hint.

## Recommended manual QA checklist (~10 minutes)

1. `npm run dev` → desktop: click through all five games **in both directions**, ending with Circuit Stack → each other game; confirm the visible game always matches the selected card and hint.
2. Neon Serpent: eat several foods — confirm `+N` popups, `Spd` climbing, faster steps, mine obstacles readable; die on a mine; Space restarts.
3. Circuit Stack: confirm the ghost outline tracks moves/rotations, the I piece appears within a bag or two, and a row clear pops the bonus.
4. Bounce Circuit: confirm forward motion + parallax immediately; jump over spikes (coyote/buffer should feel forgiving); collect an orb; die; confirm distance banked into the score.
5. Star Courier: shoot a drone (+15 popup), watch a weaver drift, let a debris warning fall and dodge it, try to shoot debris (shot absorbed), lose to the defense line.
6. Lane Rush: dodge for near-miss popups; crash; confirm dim + shake + restart.
7. Mobile viewport (or device): pick each game from the dropdown, confirm canvas + d-pad fit the first viewport and the hint updates.
8. OS reduced-motion on: confirm games stay playable and informational (warnings, defense line, ghost) while shake/particles/popups are gone.

## Merge recommendation

**Ready for review and merge into `main`.** All work is on `fable-playtest-fixes-1` (8 commits, each individually green through the full validation chain), architecture constraints intact (pure logic boundary enforced, zero external assets, synthesized audio only, no guards weakened). Suggested flow: open a PR from `fable-playtest-fixes-1` → `main`, run the manual QA checklist above on the preview, merge.
