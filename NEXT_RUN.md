# Next Run — Playtest Fix Pass

## Last iteration (2026-07-05, Phase F)

**Slice: Lane Rush visual/game-feel overhaul.**

**Logic (`LaneRushLogic.ts`, minimal):** traffic cars gain a `variant` (0–2) derived from `spawnTick % 3` — zero extra rng draws, so the seed-12 deterministic sequence (near-miss at ~3.4 s, crash at tick 102) is untouched; verified by running the crash e2e and highscore specs unchanged. Variant exposed in the snapshot; stability asserted in the traffic contract test.

**Scene (`LaneRushScene.ts`, rewritten):**

- **Road presentation:** dark shoulders (12% each side) with neon edge lines; roadside light posts with glow dots scrolling at road speed on both shoulders; glowing lane dashes (soft outer pass + bright core) still scrolling with `state.speed`; a four-band depth haze darkening the top of the road for fake perspective.
- **Cars:** layered shapes replace plain rectangles — traffic cars have per-variant body colors (coral/amber/magenta from the existing palette), dark cabins, and amber taillights facing the player; the player car is cyan with a dark cabin, windshield band, and white headlights, keeping its bob.
- **Speed sensation:** faint speed streaks appear across the road above speed 0.26 (on top of the scrolling posts/dashes).
- **Feedback:** near-misses now pop `+12`/`+5` at the scored car's true position (amount derived from the same lane-distance rule the logic scores by) plus the existing sparks/shake; crashes add a burst at the player car on top of the shake/red flash; game over dims the whole road under the HUD message. `popText` was extracted into `src/games/effects.ts` (third consumer) and Star Courier refactored onto it.
- All decorative motion (post/dash scroll, streaks, bob, popups) stays `reducedMotion`-gated as before.

**Pixel-signature constraint held:** the road fill `#0d252b` remains dominant (shoulders take 24%, haze dims only the top bands) — the switching spec's >200k-pixel road assertion passes unmodified. Screenshot-verified: posts, edge lines, glowing dashes, layered cars with taillights/headlights, depth haze all render.

**Validation:** lane-rush logic 6/6 ✓; affected desktop e2e (games incl. seed-12 crash, highscore live-card, switching pixels) 14/14 ✓; full `npm run validate` ✓ (build + tsc, 54 vitest, lint, e2e 22 passed / 18 intentionally skipped).

## Playtest phase status

- Phase A ✅ (`80e64b0`) · B ✅ (`fb10f68`) · C ✅ (`f9949d8`) · D ✅ (`1e3001c`) · E ✅ (`4114bdd`) · **F ✅ (this commit)**
- Phase G ⬜ arcade-wide cohesive graphics polish. Phase H ⬜ final validation + docs.

## Next task

**Phase G — cohesive retro-neon identity across all five games.** The per-game passes (D–F) upgraded Bounce, Courier, and Lane Rush; the gap is now consistency and the two games that predate this pass:

1. **Neon Serpent:** still the plainest visually — grid + rounded rects. Candidates: glow pass on the snake (soft outer fill), food halo, obstacle warning styling consistent with Courier's hazard language (red family), subtle animated background pulse.
2. **Circuit Stack:** flat grid + solid cells. Candidates: cell bevels/glow for locked cells, ghost-piece landing preview (logic-derivable in the scene from `pieceCells` + grid drop scan — presentation only), grid backdrop vignette.
3. **Cross-game consistency:** shared color language is mostly in place (cyan = player, red/warm = hazards, yellow = pickups/score, magenta = special). Verify each game honors it; unify popText colors (+N amber in Lane Rush vs white in Courier — pick one, suggest amber for scores everywhere).
4. Keep every existing pixel signature intact (grid-stroke for circuit-stack presence, serpent food magenta 50..3000, courier ship cyan, lane road, bounce ground) — run `tests/switching.spec.ts` after each game's restyle.
5. Performance sanity: draw calls grew this pass (posts/streaks/haze are bounded loops); keep new Phase G loops bounded and allocation-free; spot-check frame feel in the browser if anything stutters.

After G: **Phase H** — full validation, README/CLAUDE.md refresh (Bounce Circuit description is stale: README still calls it "portrait single-screen platformer with key pickup"; the games list needs the runner/hazard updates), and a closing session summary here.
