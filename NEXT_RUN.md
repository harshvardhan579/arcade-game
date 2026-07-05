# Next Run — Playtest Fix Pass

## Last iteration (2026-07-05, Phase G)

**Slice: arcade-wide cohesion polish. All scene-side; zero logic changes; no tests weakened.**

**Inconsistencies found and fixed:**

- **Game-over presentation** was Lane Rush-only → the dim overlay moved into `BaseGameScene.renderState`, so every game now dims identically under the shared "GAME OVER - press Space" HUD line (Lane Rush's local copy removed).
- **Score popups** were amber in Lane Rush, white in Star Courier, missing elsewhere → unified on amber `#ffd166` via the shared `popText`: Serpent pops `+10×multiplier` at the eaten food, Circuit Stack pops the clear bonus at the cleared row, Bounce pops `+25` at the collected orb, Courier's `+15` recolored. Status text (WAVE banner) stays cyan — score = amber, player = cyan, hazard = red/warm, special = magenta across all five games.

**Neon Serpent restyle (gameplay untouched):** soft cyan halo pass under every segment, body alpha fading toward the tail (head stays brightest), a magenta halo ring around the pulsing food, obstacles restyled as mines (outer glow stroke + dark core dot — hazard-red language consistent with Courier), and the playfield border glow now scales with `speedLevel` so the speed ramp is ambient as well as in the HUD.

**Circuit Stack restyle (readability-first):** locked cells got bevels (light top edge, shaded bottom); the active piece gained a glow halo and bright top highlight; a **ghost landing preview** (outline cells at the computed drop position — a bounded ≤14×4 scan of `pieceCells` against `this.logic.grid`, presentation-only, hidden when the piece is already grounded); the NEXT preview gained a small static label created once in `create()`.

**Pixel-signature discipline:** switching spec re-run after the restyles and again after popup unification — all five signatures hold (serpent's food halo ring is alpha-blended, far from the magenta match window; circuit's grid strokes untouched so the gridline blend is identical; courier ship, lane road, bounce ground untouched). Screenshot-verified both restyled games, ghost preview visible.

**Performance:** all new draw loops are bounded (snake ≤ grid cells, circuit grid 8×14, ghost scan ≤ 56 checks) with no per-frame allocations added.

**Validation:** 54 vitest ✓ (no logic changes), switching + games desktop e2e 11/11 ✓, full `npm run validate` ✓ (build + tsc, 54 vitest, lint, e2e 22 passed / 18 intentionally skipped).

**Deliberately skipped:** shell/CSS changes — the cabinet treatment, cards, focus states, and mobile layout from the earlier overhaul still hold up, and the task allowed shell work "only if needed."

## Playtest phase status

- Phase A ✅ (`80e64b0`) · B ✅ (`fb10f68`) · C ✅ (`f9949d8`) · D ✅ (`1e3001c`) · E ✅ (`4114bdd`) · F ✅ (`bc7e712`) · **G ✅ (this commit)**
- **Phase H ⬜ (final):** full validation + docs.

## Next task

**Phase H — closing pass.** (1) `README.md` is stale: the Games section still describes Bounce Circuit as a "portrait single-screen platformer with jump physics, spike hazard, key pickup, locked door" and Star Courier/Lane Rush/Circuit Stack descriptions predate the hazard/tetromino/visual work; the Architecture section should mention the shared effects helpers (spark emitter, popText, shared game-over dim). (2) `CLAUDE.md` invariants section: add the pixel-signature contract (switching spec depends on road/ground/grid/food/ship color signatures — restyles must re-run it) and the no-new-rng-draws determinism caution for seeded games. (3) Re-run full validation including a `--repeat-each=2` pass on the deep e2e suites for flake confidence. (4) Close with a session summary here.
