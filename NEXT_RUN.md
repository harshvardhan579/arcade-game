# Next Run — Playtest Fix Pass

## Last iteration (2026-07-05, Phase E)

**Slice: Star Courier hazards + readability.**

**Audit:** the game had exactly one threat type (plain circles descending in straight lines), unshaped projectiles, no un-shootable hazard, no telegraphing, no marker for the y=11.5 lose line, and no wave-change feedback beyond the HUD number.

**Logic (`StarCourierLogic.ts`):**

- **Weaver enemy (kind 1), from wave 2:** drifts sinusoidally (±1.8 columns around its spawn column, clamped to bounds) while descending — same collision rules, but demands prediction. Spawn mix is seeded (35% from wave 2); wave 1 stays pure drones for onboarding. Enemy snapshots now carry `kind`.
- **Debris hazard, from wave 2 (every 130 ticks):** telegraphed as a `warning` for 24 ticks at its column, then falls fast (0.24/step). It cannot be shot — it absorbs projectiles and survives — kills on ship contact, and passes the bottom harmlessly (unlike enemies, which still lose the game by crossing). The asymmetry teaches "shoot ships, dodge rocks". Exposed as a `debris` array (`x`, `y`, `warning`).
- Pools: `enemies`/`debris` made public with exported types, matching the test-manipulation pattern used by Serpent/Circuit/Bounce. The first enemy's column still comes from the first rng draw, so seed 9's column-2 opener — which the deterministic e2e and two logic tests rely on — is unchanged (verified by running them, per the probe-first instruction).

**Scene (`StarCourierScene.ts`):** shaped drone hulls (winged triangle + cockpit dot) and weaver diamonds (magenta) replace circles; projectiles recolored to the player-owned cyan-white with fading trails; debris drawn as gray rock clusters with a blinking warning chevron at the spawn column (static under reduced motion — the telegraph is fairness information); a dashed red defense line marks the lose threshold; enemies within 3 units of the line get a red proximity ring (always drawn — informational); layered ship with cockpit + flickering thruster; score popups (`+15`) at true kill positions and a fading `WAVE N` banner + subtle teal flash on wave change (both reduced-motion gated; tweened texts destroy on complete). Kill-position matching now tolerates weaver drift (|dx| < 0.4 instead of exact x). Screenshot-verified: warning chevron, proximity ring, defense line, shaped ships, trail all render.

**Tests (8 → 12 logic):** weavers appear from wave 2 and drift within bounds, reproducibly; debris warns before falling; debris absorbs shots without dying (and no score); debris kills on contact while a dodged rock exits harmlessly. Debris tests disarm line-approaching enemies via the public pool (an unshot invader would otherwise end the run at ~tick 146, before debris reaches the ship at ~197). All prior tests pass unchanged, including both seed-9 collision tests and the pool-stability test.

**Validation:** star-courier 12/12 ✓; games + switching desktop e2e 11/11 ✓ (deterministic column-2 kill run and pixel signatures unchanged); full `npm run validate` ✓ (build + tsc, 54 vitest, lint, e2e 22 passed / 18 intentionally skipped).

## Playtest phase status

- Phase A ✅ (`80e64b0`) · B ✅ (`fb10f68`) · C ✅ (`f9949d8`) · D ✅ (`1e3001c`) · **E ✅ (this commit)**
- Phase F ⬜ Lane Rush visual/game-feel overhaul (the playtest's "biggest graphics enhancement" ask). Phase G ⬜ arcade-wide polish. Phase H ⬜ final validation/docs.

## Next task

**Phase F — Lane Rush visual overhaul.** Playtest: "not pleasant to play visually... don't just draw basic rectangles." Plan: (1) road presentation — shoulders/edge lines, center dashes already scroll; add roadside posts/scenery scrolling at road speed, subtle vertical gradient bands for depth; (2) car shapes — layered procedural cars (body + cabin + lights + wheel hints) for player and traffic, distinct traffic colors per lane or per car (seeded, from logic state if variety is logic-side — consider exposing a per-car `hue`/variant in the traffic snapshot); (3) speed sensation — speed-scaled dash scroll exists; add speed streak lines at high speed and a mild exhaust trail; (4) near-miss/collision feedback exists (sparks/shake) — add a brief slow flash on near-miss score popup (`+12/+5`) reusing the Star Courier popText pattern (consider extracting popText into effects.ts now that two scenes want it); (5) keep the road fill color `#0d252b` dominant — the switching spec's lane-rush signature requires > 200k pixels of it; verify with the pixel spec after restyling; (6) probe the crash e2e timing if traffic variety changes rng consumption (it does if variants draw from rng — the crash test relies on seed 12's collision at tick ~102; adding an rng draw per spawn shifts lanes → re-probe and update the near-miss/crash expectations, or derive variants without extra rng draws, e.g. hash of spawn tick).
