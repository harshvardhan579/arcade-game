# Pocket Arcade — Current App State

> Read-only snapshot of the repo as of 2026-07-05 (branch `mobile-ui-pass-1`, working
> tree clean). Written to hand to a senior game developer, recruiter, or designer.
> Everything below is grounded in the source; where a claim is inferred or uncertain it
> says so, and features that are only _documented_ but not implemented are called out
> explicitly.

---

## 1. What Pocket Arcade is today

Pocket Arcade is a **zero-asset, five-game HTML5 retro-neon arcade** that runs entirely in
the browser. Five distinct micro-games (a portal snake, a procedural auto-runner, a
vertical shooter, a three-lane near-miss racer, and a seven-piece block stacker) share one
responsive "cabinet" shell; you pick a game from a selector and play it on a single canvas
with keyboard or on-screen touch controls. What makes it technically interesting is not the
games individually — they are classic arcade forms — but the **architecture and
constraints**: every pixel is drawn procedurally at runtime (no images, sprite sheets, or
fonts are ever loaded), every sound is synthesized with WebAudio, and each game is split
into a **pure, deterministic, framework-free logic engine** and a separate **Phaser
renderer**, with an automated import-boundary guard that fails the build if the two mix.
That separation is what lets the project be validated the way real software is: 54 Vitest
logic/contract tests plus Playwright end-to-end suites that read actual canvas pixels to
prove the right game is on screen. Category-wise it is a **portfolio artifact / mini-arcade
collection** — deliberately built to demonstrate frontend architecture, pure game-logic
design, mobile UX, and an AI-assisted spec-to-tested-code workflow, rather than to ship as
a commercial game.

---

## 2. Tech stack and constraints

**Stack (all exact-pinned; see `package.json`):**

- **Vite `8.1.3`** — dev server and bundler; app entry `src/main.ts`.
- **TypeScript `6.0.3`**, strict — `npm run build` runs `tsc --noEmit` before `vite build`.
- **Phaser `3.90.0`** — intentionally pinned to the last Phaser 3 line, **not** Phaser 4
  (a hard rule in `CLAUDE.md`). Used in `CANVAS` render mode with `RESIZE` scaling and its
  own SoundManager disabled (`audio: { noAudio: true }` in `src/main.ts`).
- **Vitest `4.1.9`** — logic/contract unit tests (`*.test.ts` colocated with each game).
- **Playwright `1.61.1`** — cross-viewport e2e (`tests/*.spec.ts`), two projects: `desktop`
  (Desktop Chrome, 1440×900) and `mobile` (Pixel 5, 390×844) in `playwright.config.ts`.
- **ESLint `10.6.0` + Prettier `3.9.4` + `scripts/import-boundary.mjs`** — the lint step is
  all three in sequence.
- Node ≥ 22. One runtime dependency only: `phaser`.

**Hard constraints (enforced, from `CLAUDE.md`):**

- **Zero external runtime assets.** No `.png/.jpg/.svg/.mp3/.wav`, fonts, sprite sheets, or
  remote images. Everything visual is Phaser Graphics primitives / `generateTexture`;
  everything audible is synthesized WebAudio. System font stacks only.
- **Logic files are framework-independent and deterministic.** `*Logic.ts` may not import
  `phaser`, `AudioEngine`, DOM APIs, `window`, `document`, or `localStorage`. Enforced by
  `scripts/import-boundary.mjs` (the guard is never weakened to make a change pass).
- **Deterministic randomness** via `SeededRandom` (a 32-bit LCG in `src/core/types.ts`), so
  tests and e2e scripts can depend on exact draw order.
- **No placeholder rendering** — if logic tracks an entity position, the scene must draw it
  there; no count-derived synthetic layouts.
- Browser/mobile support: desktop three-column layout ≥ 900px; mobile portrait, phone
  landscape, and (with a documented gap) tablets. Honors `prefers-reduced-motion`.

---

## 3. Current architecture

**App shell / bootstrap (`src/main.ts`).** Declares the five `GameDefinition`s (id, title,
subtitle, keyboard + touch control strings, `aspectRatio` 3/4, `orientation: 'portrait'`),
builds the DOM shell via `createArcadeShell`, constructs one `Phaser.Game` with all five
scenes registered, and wires an `arcade-select-game` window event to `startGame`.

**Scene switching (`startGame` in `src/main.ts`).** Tracks `currentSceneKey` and calls
`game.scene.stop(previous)` **before** `game.scene.start(next)`. This is load-bearing:
Phaser's `SceneManager.start` does not stop the running scene, so without the explicit stop,
scenes stack and later scenes render on top. Guarded by `tests/switching.spec.ts`.

**Phaser scene lifecycle (`src/games/BaseGameScene.ts`).** Abstract base every game scene
extends. On `create()` it: reads reduced-motion, builds a `ScoreManager`, attaches audio
unlock listeners, creates a `Graphics` object + HUD text + a centered overlay text,
subscribes to `arcade-semantic-input` and `arcade-restart` window events, and publishes the
TestBridge. Its `update(time, delta)` runs a **fixed-step accumulator loop** — the step
interval is `state.speedMs` if the game exposes one (Neon Serpent), else the scene's
`stepMs`. Each step calls `logic.step()`, triggers score/hit audio cues, records the high
score, updates the bridge snapshot, and redraws. `renderState` clears to `#071114`, calls
the subclass `draw()`, dims on game-over, scales the HUD font down on narrow canvases, and
shows the centered end-of-run overlay. Listeners are removed on `SHUTDOWN`.

**Input system (`src/core/InputManager.ts`).** Maps keyboard keys (arrows + WASD, Space/
Enter = ACTION, Escape/P = PAUSE) and `arcade-virtual-input` CustomEvents (from touch) into
six `SemanticInput`s, then re-dispatches an `arcade-semantic-input` window event. It ignores
keydowns while a shell `button/select/input` is focused so native activation still works.
The `subscribe()` handler API exists but is **unused** — scenes listen to the window event
directly (see §8).

**Touch controls (`src/ui/TouchControls.ts`).** Builds five buttons (↑ ← ● → ↓) with
`data-arcade-input` and aria-labels. On `pointerdown` it `preventDefault`s, toggles an
`is-pressed` class (because `preventDefault` suppresses `:active`), dispatches one
`arcade-virtual-input`, and — for directions only — arms auto-repeat (300 ms delay, then
90 ms interval). **ACTION is single-shot** so holding ● can't spam fire/restart. Timers are
cleared on `pointerup/cancel/leave`.

**Audio engine (`src/core/AudioEngine.ts`).** A **module singleton** (`export const
audioEngine`). Lazily creates one `AudioContext` on the first pointer/key/touch gesture
(idempotent unlock listeners that remove themselves). `play(cue)` synthesizes one
oscillator + gain envelope per cue. Four cues only: `select` (440 Hz square), `score`
(720 Hz triangle), `hit` (150 Hz saw), `game-over` (92 Hz sine). No music, no per-game
sounds. Guarded by `tests/audio.spec.ts` (≤ 1 AudioContext, no listener growth).

**Score / high-score (`src/core/ScoreManager.ts`, `Storage.ts`).** Per-game key
`pocket-arcade:<id>:high` in `localStorage` via a try/catch `SafeStorage`. `record(score)`
updates the cached max, persists it, and dispatches `arcade-high-score`, which the selector
cards and the mobile picker options listen for and re-render. `BaseGameScene.update` calls
`record` every frame with the latest score.

**Test bridge (`src/core/TestBridge.ts`).** Publishes `window.__ARCADE__ = { activeScene,
getState() }`. `getState()` returns a fresh spread of the latest logic snapshot **plus**
`highScore`. Snapshots are JSON-serializable and never expose Phaser objects; Playwright
reads them with `page.evaluate`.

**Logic ↔ rendering separation.** Truth lives in `*Logic.ts` (grid coordinates, entity
arrays, score, phase). Scenes translate semantic input to `logic.handleInput`, run
`logic.step`, and draw entities at their real logic positions mapped to canvas space. Each
game's `getState()` exposes real positions (`snake`/`food`, `platforms`/`orbs`/`spikes`,
`projectiles`/`enemies`/`debris`, `traffic`, `pieceCells`), and per-game Vitest contract
tests assert those positions are in bounds, deterministic for a seed, and detached (mutating
the returned snapshot doesn't mutate internal state).

---

## 4. Game-by-game breakdown

All five share: portrait 3/4 canvas, cyan = player, warm (red/amber/pink) = hazard/score,
`SeededRandom`, restart on ACTION-when-dead or the Restart button, and the shared effects in
`src/games/effects.ts` (spark burst, `smallShake`, `popText`, `deathFeedback` = 180 ms shake

- red flash), all gated on reduced motion. **None of the five has a win state** — every game
  sets phase `playing` or `game-over` only, so they are all endless/survival (see §8).

### Neon Serpent (`neon-serpent/`)

- **Genre:** grid snake with portal wrapping.
- **Core loop:** steer a snake on an 18×24 grid, eat magenta food, avoid your body and
  red mine obstacles; the field wraps at all edges (modulo in `step()`).
- **Controls:** arrows/WASD steer (no reversing into yourself); ACTION restarts when dead.
- **Scoring:** `10 × multiplier` per food. Multiplier climbs `+1` per food up to **x8** and
  **decays back to x1** if you don't eat within 8 steps (`comboTimer`). This is the only
  real combo system in the arcade.
- **Progression:** eating ramps the step interval from **144 ms → 80 ms floor** in 4 ms
  steps (`serpentBaseSpeedMs`/`serpentFloorSpeedMs`, surfaced as `Spd N`, ~17 levels). Every
  3rd food adds a new obstacle, so the board fills over time.
- **Visual style:** grid lines, pulsing magenta food with a halo ring, rounded cyan segments
  with a soft glow under-layer and a white head outline, a speed-reactive border glow.
- **Juice:** spark burst + `+score` popText + small shake on eat; death flash/shake.
- **Strengths:** the combo-decay + speed-ramp + accreting obstacles give it the clearest
  risk/reward and difficulty curve of the five; determinism is clean.
- **Weaknesses:** food-spawn scans every free cell each time (fine at this size, wasteful at
  scale); no near-miss/tension feedback; obstacles are visually static.
- **Systems:** wrap arithmetic, combo timer, speed ramp, occupancy-set food spawn.
- **More professional:** trail/afterimage on the snake, escalating audio pitch with speed,
  a "close call" cue when the head passes adjacent to its body or an obstacle.

### Bounce Circuit (`bounce-circuit/`)

- **Genre:** procedural endless auto-runner (side-scroller).
- **Core loop:** the world scrolls right at a ramping capped speed; you auto-run and jump
  over spike clusters, land on one-way platforms, and grab amber orbs. Death banks the
  distance run into the score.
- **Controls:** ↑ / ACTION jump; ← → nudge horizontally (`±1.5` clamp); ACTION restarts.
- **Scoring:** orbs `+25` each (immediate); on death `+floor(distance)`.
- **Progression:** speed `0.22 → 0.42` cap scaled by distance (`currentSpeed`). Terrain is
  generated ahead in 16-unit chunks with a 5-way roll (single spike, spike pair, platform +
  orb, orb arc, ground orb) and an anti-frustration rule that avoids back-to-back spike
  chunks.
- **Visual style:** two-layer parallax skyline (hashed tower heights, no RNG), full-width
  ground strip (kept exact `#12353c` for the pixel-signature test), platform highlights,
  triangular spikes, pulsing orbs.
- **Juice:** **squash & stretch** on the player box (jump/fall/land states), landing spark
  puff, orb-collect burst + popText + shake, death flash.
- **Strengths:** the platforming feel (coyote time = 4 steps, jump buffer = 5 steps, in
  `BounceCircuitLogic`) is genuinely tuned; parallax + squash/stretch make it the most
  "alive" of the five.
- **Weaknesses:** the physics model (support-height probing, `vy * 0.15` integration) is
  subtle and only lightly visualized; no coin/tension audio distinct from other games;
  no distance milestones.
- **Systems:** chunk generator, coyote/buffer, support-height collision, off-screen pruning.
- **More professional:** distance/orb milestone flourishes, speed-tied parallax and audio,
  a subtle motion trail on fast falls.

### Star Courier (`star-courier/`)

- **Genre:** fixed vertical shooter (single-axis mover).
- **Core loop:** slide left/right across 11 columns, fire upward, destroy descending drones,
  dodge sinusoidal weavers (wave 2+) and un-shootable debris rocks that absorb shots. You
  die if an enemy reaches the bottom or collides with you.
- **Controls:** ← → move (0–10 clamp), ACTION fires; ACTION restarts when dead.
- **Scoring:** `+15` per enemy killed. Debris cannot be scored (shots are absorbed).
- **Progression:** wave `+1` every 80 ticks; spawn cadence tightens (`max(14, 34 − wave×3)`
  ticks), enemy fall speed rises (`0.08 + wave×0.015`), weavers appear at wave 2 (35% roll),
  debris starts wave 2 on a 130-tick interval with a 24-tick telegraph.
- **Visual style:** drifting starfield, dashed defense line, distinct silhouettes (drone
  triangle+pods, magenta diamond weaver, grey debris), a warning chevron before debris
  arms, a cyan ship with flickering thruster; a red danger ring on enemies near the line.
- **Juice:** kill burst + `+15` popText, muzzle spark on fire, **wave banner + camera
  flash** on wave-up, death flash/shake. Object pools (8 shots, 10 enemies, 4 debris) —
  zero per-frame allocation for entities.
- **Strengths:** the most **readable hazard design** — telegraphs, silhouettes, danger
  rings; genuinely escalating waves; pooling is a real engineering point.
- **Weaknesses:** no player health/lives (one hit = death), no power-ups, single weapon,
  no boss or wave-clear payoff; fire has no cooldown model beyond pool size.
- **Systems:** fixed object pools, sinusoidal weaver motion, telegraph timers, wave scaling.
- **More professional:** hitstop on kills, a brief screen-freeze + bigger flash on wave
  clear, escalating enemy-density audio, an optional charged/spread shot.

### Lane Rush (`lane-rush/`)

- **Genre:** three-lane endless "dodge / near-miss" racer.
- **Core loop:** hold a lane, hop left/right, thread between descending cars. You crash if a
  car occupies your lane in the hit band; you **score by near-missing** cars in adjacent
  lanes.
- **Controls:** ← → change lane (0–2 clamp). No accelerate/brake. ACTION restarts.
- **Scoring:** near-miss `+12` if the car is one lane away, `+5` if two lanes away, once per
  car (`scored` flag).
- **Progression:** speed `0.18 + tick/2400` (**unbounded** — no cap), traffic spawns every
  28 ticks avoiding top-lane saturation. Car color variant derives from `spawnTick % 3` (no
  RNG draw, deliberately).
- **Visual style:** the richest scene — scrolling roadside posts with glow dots, dashed lane
  lines with speed-tied scroll, speed streaks past 0.26, layered player/traffic car shapes
  with windows + lights, a `drawDepthHaze` vignette gradient.
- **Juice:** near-miss spark + `+12/+5` popText + shake, big spark burst + death feedback on
  crash, player-car bob.
- **Strengths:** the near-miss scoring rewards _risk proximity_, which is more interesting
  than pure dodging; the visual depth/motion sell speed well.
- **Weaknesses:** the crash vs near-miss bands (`y` 8.8–10.2 vs 9.1–10.4) are invisible to
  the player, so scoring can feel arbitrary; unbounded speed means late runs get
  unfairly fast; only three inputs' worth of decisions.
- **Systems:** lane clamp, per-car scored flag, band collision, tick-derived variants.
- **More professional:** a visible near-miss "zone" flash, combo for consecutive near-misses,
  a speed cap or difficulty plateau, a risk multiplier for tighter passes.

### Circuit Stack (`circuit-stack/`)

- **Genre:** falling-block puzzle (Tetris-family).
- **Core loop:** the full **seven-piece tetromino set** falls on an 8×14 grid from a seeded
  **7-bag**; move/rotate to complete and clear rows; you lose when a spawn is blocked.
- **Controls:** ← → move, ↑ / ACTION rotate (with wall kicks), ↓ soft-drop. ACTION restarts.
- **Scoring:** multi-row clears `[0, 100, 250, 450, 700]` for 1–4 lines (Tetris-like reward
  curve); a ghost/landing preview and a shape-accurate NEXT box are drawn.
- **Progression:** **gravity is fixed** — a piece steps down every 24 ticks regardless of
  score. Difficulty comes only from stack height, not speed (see Weaknesses).
- **Visual style:** grid strokes (exact `#31545a` @ 0.8 for the pixel signature), beveled
  locked cells, magenta active piece with a soft aura, magenta ghost outline, a small NEXT
  preview box.
- **Juice:** big spark burst + `+score` popText + shake on line clear, small sparks + shake
  on lock, death feedback on top-out. Wall kicks include the `±2` kicks the I-piece needs.
- **Strengths:** correct 7-bag + kicks + ghost + NEXT is a faithful, complete stacker; the
  scoring curve rewards multi-line clears.
- **Weaknesses:** **no gravity acceleration / level system** — it never speeds up, so long
  runs are a stamina exercise, not escalating tension; no hard-drop; no hold piece; no
  back-to-back / T-spin scoring.
- **Systems:** 7-bag shuffle, rotation matrix + kick table, row-clear compaction, ghost
  projection (computed in the scene via `dropDistance`).
- **More professional:** a level/gravity curve tied to lines cleared, hard-drop with a slam
  effect + lock-delay, a line-clear flash/row-collapse animation, combo/back-to-back bonuses.

---

## 5. Current desktop UI

- **Layout (`ArcadeShell.ts`, `style.css` `@media (min-width: 900px)`):** a fixed three-
  column grid — **selector | stage (topbar + canvas) | case-study panel** — sized to exactly
  the viewport with `overflow: hidden` and **no page scroll** (e2e-asserted at 1440×900,
  1280×800, 1512×982, 1366×768). Touch controls are `display: none`. The canvas is centered
  in its column as the "cabinet screen."
- **Cabinet identity (`.game-root`):** cyan bezel glow, inner vignette, and a **CSS scanline
  overlay** (`::after` repeating-linear-gradient). This is DOM chrome, not canvas, so it
  doesn't affect the pixel-signature tests. The strongest single identity element.
- **Game cards (`GameSelector.ts`):** title > subtitle > `High N` (amber, tabular numerals),
  hover/active glow with an inset cyan bar, a `Now playing` `::after` on the active card,
  150–180 ms ease-out transitions. Clicking blurs the card so gameplay keys flow through.
- **HUD / instructions:** in-canvas HUD `Score X  High Y  <extra>` (per-game extra via
  `hudExtra`); a `.controls-hint` line under the H1 shows the selected game's keyboard
  string; the case-study panel gives an accurate, structured engineering pitch.
- **High-score presentation:** live on the cards via `arcade-high-score`; `High —` empty
  state; also in the bridge/HUD.
- **Accessibility / focus:** DOM-logical tab order (five cards → Restart), yellow
  `:focus-visible` rings (2px), keyboard activation works because `InputManager` ignores
  keys while shell controls are focused. Verified by `tests/shell.spec.ts` keyboard test.
- **Strengths:** composed, no-scroll, coherent palette that matches the canvases, real
  focus/keyboard support.
- **Limitations:** the case-study copy uses straight (not typographic) apostrophes (noted in
  `UI_DESKTOP_AUDIT.md`); the three-column layout is also (wrongly) served to **iPad
  landscape** — see §6.

---

## 6. Current mobile UI

- **Portrait (`@media (max-width: 899px)`):** side panels hidden; single-column grid where
  the canvas is **sized from its grid row** (not a `100vh` constant) so it can never overlap
  the controls; height uses `100svh` with a `100vh` fallback and `min-height: 0` (the fix for
  the real-device iOS Safari toolbar bug — see `NEXT_RUN.md`); `viewport-fit=cover` +
  `env(safe-area-inset-*)`. The topbar leads with the **game picker** (a `<select>` whose
  options carry live per-game high scores, e.g. `Neon Serpent · High 777`), the marketing
  eyebrow is hidden, and Restart is demoted to a quiet outline. No page scroll (e2e-asserted
  375×667 → 430×932, plus toolbar-constrained 375×553 / 390×664).
- **Landscape — phones (`@media (pointer: coarse) and (orientation: landscape) and
(max-height: 500px)`):** a dedicated composition — full-height centered canvas with the
  direction cluster and action button overlaid on the side margins — including widths that
  cross the 900px desktop breakpoint (e2e-asserted 667×375, 844×390, 932×430).
- **Touch controls:** two thumb zones (directions left, action right), ≥ 44px targets,
  class-driven pressed feedback, hold-to-repeat on directions, single-shot ACTION,
  `-webkit-tap-highlight-color: transparent`, `user-select: none`, `touch-action:
manipulation` on tappables. aria-labels on all five buttons.
- **Game over:** a centered overlay (`GAME OVER` + device-correct "Tap ● to restart") drawn
  in `BaseGameScene`, replacing the old clipped one-line HUD message.
- **Safari/browser constraints handled:** dynamic toolbar (`svh` + `min-height: 0`), safe
  areas, no double-tap zoom, no long-press callout on glyphs.
- **Strengths:** genuinely playable portrait and phone-landscape; the picker-with-highs is a
  neat mobile answer to the hidden cards.
- **Known limitation (documented, not fixed):** **iPad / tablet in landscape** — coarse
  pointer, height > 500px, width ≥ 900px — matches only the `min-width: 900px` desktop block,
  so it gets the **keyboard-only three-column layout with no touch controls**: effectively
  unplayable on iPad landscape. This is the single highest-leverage remaining UI gap
  (`NEXT_RUN.md` "Remaining polish ideas" #1, `UI_MOBILE_AUDIT.md` §4-caveat).
- **Real-device caveats still requiring manual QA (~3 min, cannot be proven headless):** iOS
  Safari toolbar clearance of ↓/●, long-press showing no magnifier, rapid double-tap Restart
  not zooming, rotate mid-game, first-tap audio unlock. Listed in `NEXT_RUN.md`.

---

## 7. Current test coverage

**Vitest (54 cases, colocated `*.test.ts`):** per-game logic + contract tests — input
clamping, scoring rules, determinism (identical snapshots for identical seeds), entity
positions in bounds and advancing correctly, and **detached JSON-serializable snapshots**
(mutating the returned array doesn't mutate internal state). Counts: Neon Serpent 12,
Bounce Circuit 13, Star Courier 12, Circuit Stack 11, Lane Rush 6.

**Playwright (6 spec files, 33 test declarations; run across desktop + mobile projects with
per-project `test.skip` guards):**

- **`smoke.spec.ts`** — shell loads with no `console.error`, keyboard drives Neon Serpent,
  desktop selector opens all five, mobile d-pad exists and moves the snake.
- **`games.spec.ts`** — one or two **deep interaction tests per game**: Bounce jump feel +
  spike death banks distance + restart; Star fire/clamp + kill-scores-15 + wave death +
  restart; Lane lane-clamp + traffic bounds + near-miss/crash/restart; Circuit soft-drop +
  rotate + lock fills grid; Neon obstacle death + Space restart + reduced-motion + portal
  wrap.
- **`switching.spec.ts`** — the **pixel-signature regression**: reads canvas `getImageData`
  and counts per-game signature colors (Lane road `#0d252b` > 200k px, Bounce ground
  `#12353c`, Circuit grid `#31545a`, Neon food magenta 50–3000, Star ship cyan bottom-center)
  to prove the selected game is truly rendered — catches stacked-scene bugs that DOM/bridge
  checks cannot. Desktop project only.
- **`highscore.spec.ts`** — starts at 0, persists across reload, survives restart; cards show
  persisted highs; **real Lane Rush gameplay** writes a high to storage. Clears
  `pocket-arcade:*` in setup.
- **`audio.spec.ts`** — instruments `AudioContext` + window listeners: cycling all five games
  keeps **≤ 1 AudioContext** and does not grow unlock listeners; no `console.error`.
- **`shell.spec.ts`** — desktop hint copy; **no-scroll at four laptop viewports**; keyboard
  tab order + focus ring + activation; mobile hint copy + eyebrow hidden; mobile game-over
  overlay pixels + picker highs + select blur; pressed feedback + hold-to-repeat + single-
  shot ACTION; **no-overlap/fit at six portrait sizes** with a computed-style pin that
  `.arcade-shell` `min-height` resolves to `0px`; **coarse-pointer landscape playability**
  at three sizes; d-pad aria-labels + reduced-motion run.

**Bugs now protected against:** stacked/overlapping scenes, count-based fake rendering,
the canvas burying the d-pad, the iOS Safari toolbar covering the bottom controls, audio
listener/context leaks, and the high-score persistence path — all have dedicated,
fail-first-verified assertions.

**Bugs that could still slip through:** (1) **no visual/layout regression testing** beyond
dominant-color counts — a scene could render entities in the wrong place and pass as long as
the signature color count holds; (2) **no performance/FPS or allocation test** — a
per-frame allocation regression wouldn't fail CI; (3) real-device iOS chrome/safe-area/
long-press behavior (headless can't diverge `vh`/`dvh`); (4) **iPad-landscape** has no test
because the layout isn't handled; (5) **audio output is never asserted** (only that paths
don't throw and one context exists); (6) Circuit Stack row-clear celebration is covered by
logic tests but **not e2e** (setting up a full row honestly is too slow); (7) DPR/canvas
sharpness on 2–3× screens is unaddressed and untested.

---

## 8. Current quality level (brutally honest)

**What it is:** a **polished portfolio mini-arcade / engineering showcase**, past MVP but
short of a commercial game. The engineering is the product. It is clearly the work of
someone who understands architecture boundaries, deterministic testing, and responsive/
mobile UX — and who documents decisions (the `UI_*_AUDIT.md` + `NEXT_RUN.md` trail is
unusually rigorous). It is **not** a toy: five complete, distinct, tested games with real
juice and a real validation pipeline.

**What currently feels impressive:**

- The **zero-asset constraint** actually held — every visual is procedural, and it still
  looks like a coherent neon arcade.
- The **logic/scene split + import-boundary guard + deterministic seeds** is a genuinely
  strong, testable architecture, and the **pixel-signature e2e** is a clever answer to "how
  do you prove the right thing rendered."
- **Mobile UX depth** — hold-to-repeat, thumb zones, `svh`/safe-area handling, a picker that
  surfaces high scores — is well beyond typical portfolio polish.
- Individual feel touches: Neon Serpent's combo-decay + speed ramp, Bounce's coyote/buffer +
  squash/stretch, Star Courier's telegraphed hazards + object pools.

**What still feels amateur / unfinished:**

- **No game has a win state, pause, or lives.** `GamePhase` defines `'ready'` and `'won'` and
  the base scene has a `CLEARED` overlay branch, but **no game ever sets those phases** — so
  `CLEARED` is dead code and all five games are one-life endless loops. Likewise **`PAUSE`
  is mapped (Escape/P) and emitted but handled by nothing** — a dead input. And
  `InputManager.subscribe()` is never called. These are small but exactly the kind of dead
  seams a careful reviewer notices.
- **Audio is a placeholder** — four blip cues, no music, no per-game identity, `hit` and
  `game-over` both fire on death. It reads as "audio was wired, not designed."
- **Feel is competent but not "juicy" by modern standards** — no hitstop/freeze-frames, no
  screen-wide impact effects beyond a flash, no sustained trails, particles are short
  bursts. Circuit Stack never speeds up; Lane Rush's speed is unbounded and its scoring
  bands are invisible.
- Minor: iPad landscape unplayable; DPR softness; straight apostrophes in copy.

**What a recruiter would notice:** the stack breadth (Vite/TS-strict/Phaser/Vitest/
Playwright/ESLint/Prettier + a custom guard), the test rigor, the responsive/mobile care,
and the honest "AI-assisted engineering workflow" framing — a strong frontend/tools
signal. They may **not** notice the dead phases/pause, which is fine.

**What a game developer would notice:** immediately, the clean determinism and the
truth-renders-in-the-scene discipline (rare and good); then, that the **games lack
meta-structure** — no win/lose arc beyond death, no pause, thin audio, no hitstop, a
non-accelerating stacker, an uncapped racer — i.e. the _systems_ are solid but the
_game-feel and progression layer_ is where the next real leverage is.

---

## Appendix — file map (as read)

- Shell/bootstrap: `src/main.ts`, `index.html`, `src/style.css` (647 lines: base +
  reduced-motion + `min-width:900` desktop + `max-width:899` mobile + coarse-landscape).
- Core: `src/core/{types,InputManager,AudioEngine,ScoreManager,Storage,TestBridge,Viewport}.ts`.
- UI: `src/ui/{ArcadeShell,GameSelector,TouchControls,CaseStudyPanel}.ts`.
- Games: `src/games/BaseGameScene.ts`, `src/games/effects.ts`, and `<game>/{*Logic,*Scene,
*Logic.test}.ts` for neon-serpent, bounce-circuit, star-courier, lane-rush, circuit-stack.
- Tests: `tests/{smoke,games,switching,highscore,audio,shell}.spec.ts`;
  `playwright.config.ts` (desktop + mobile projects); `scripts/import-boundary.mjs`.
- Docs: `README.md`, `CLAUDE.md`, `NEXT_RUN.md`, `UI_DESKTOP_AUDIT.md`, `UI_MOBILE_AUDIT.md`.
- Bundle (per `README`/`CLAUDE`, not re-measured this pass): app ≈ 9 kB gzip, Phaser vendor
chunk ≈ 319 kB gzip (split via `build.rolldownOptions` in `vite.config.ts`).
</content>

</invoke>
