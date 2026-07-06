# Pocket Arcade — Research Backlog

> A research map to explore _before_ asking for implementation. It is specific to this
> repo's constraints: **zero external assets** (all visuals procedural, all audio
> synthesized), **deterministic `SeededRandom` logic** with test-critical draw order,
> **logic/scene separation** enforced by `scripts/import-boundary.mjs`, **pixel-signature
> switching tests**, **reduced-motion gating**, and the **mobile no-scroll / desktop
> three-column** layout contracts. Anything researched here must be implementable inside
> those rails. Cross-references to current code are given so research targets the real gaps
> identified in `CURRENT_APP_STATE.md`.

---

## 1. Arcade / game-feel research areas

Each item notes the current baseline in this repo so research fills a real gap, not a
generic one.

- **Juice / impact.** Current: `effects.ts` has spark bursts, `smallShake`, `popText`,
  `deathFeedback` (shake+flash). Missing: **hitstop / freeze-frames**, sustained trails,
  layered impact (flash + shake + particle + audio as one "hit" event). Research
  time-scaled hitstop that respects a fixed-step logic loop (freeze render, not logic) and
  reduced-motion fallbacks.
- **Progression / difficulty curves.** Current: Neon Serpent and Bounce ramp well; **Circuit
  Stack never accelerates**, **Lane Rush speed is unbounded**, Star Courier scales linearly.
  Research classic gravity/level curves (Tetris gravity table), soft difficulty caps,
  rubber-banding, and "flow channel" pacing (difficulty tracking skill).
- **Enemy / hazard design.** Current: Star Courier is the model (telegraphs, silhouettes,
  danger rings). Research telegraph timing windows, enemy "roles" (rusher/blocker/weaver),
  and fair one-hit-kill design (reaction-time budgets).
- **Scoring systems.** Current: flat per-event (`+10×mult`, `+25`, `+15`, `+12/+5`, line
  table). Research score _legibility_ (why did I get points?), risk multipliers, and
  score-attack framing (per-run bests, medals).
- **Combo systems.** Current: only Neon Serpent (x1→x8 decay). Research combo windows,
  visible combo meters/timers, and combo-driven audio pitch ramps as a cross-game mechanic
  that lives in logic (testable) not just the scene.
- **Difficulty curves (mathematical).** Research parameterized curves (linear vs
  logarithmic vs stepped), and expressing them as pure functions in `*Logic.ts` so they're
  unit-testable and deterministic.
- **Pacing.** Research tension-release rhythm (waves, calm/spike alternation), and
  intro/first-10-seconds design (the current games drop you straight into full difficulty).
- **Readability.** Current gap: Lane Rush's crash/near-miss bands are invisible; Bounce's
  physics is subtle. Research foreground/background contrast, hazard color language
  consistency, and telegraph legibility on small mobile canvases.
- **Failure feedback.** Current: uniform `deathFeedback` for all games/causes. Research
  cause-specific death feedback (what killed me?), slow-motion death, and "so close"
  framing near a high score.
- **Replayability.** Current: endless single-life loops, one seed path per game per session
  (seeds are fixed constants: 7/11/9/12/14). Research seed variety vs determinism trade-off,
  daily-seed challenges, per-run objectives/medals, and unlockables — all while preserving
  the fixed seeds the tests depend on (use a _separate_ play seed from the _test_ seed).

---

## 2. Procedural graphics research areas (no image assets)

All must be Phaser Graphics / `generateTexture` / WebGL-shader-via-Phaser, never a loaded
file. Note the **pixel-signature contract**: `tests/switching.spec.ts` counts specific
signature colors — new effects must not flood those colors or must update the spec
deliberately.

- **Phaser Graphics techniques.** Batching, `generateTexture` for repeated shapes (the
  spark texture in `effects.ts` is the only current example), reusing one `Graphics` object
  vs many (current scenes clear+redraw one per frame).
- **Generated textures.** Pre-bake glow sprites, gradient ramps, noise tiles, and vignettes
  once in `create()` instead of redrawing primitives each frame (perf + richer looks).
- **Particles.** Current: single burst emitter per scene. Research continuous trails,
  ribbon/streak particles, gravity/attractor fields, and pooled emitters within the reduced-
  motion gate and a mobile particle budget.
- **Trails.** Afterimage/motion trails for the snake, the ship, fast falls in Bounce, cars in
  Lane Rush — research fading-quad trails and framebuffer-free "ghost" techniques.
- **Shader-like effects without assets.** Phaser 3 supports custom **pipelines/shaders**
  (GLSL strings, no file). Research a post-processing pipeline for CRT curvature, bloom,
  chromatic aberration, scanlines-in-canvas (currently scanlines are a CSS `::after` on
  `.game-root`) — feasibility on `CANVAS` renderer vs needing WebGL is a key open question.
- **CRT / cabinet effects.** Barrel distortion, aperture-grille, phosphor glow, vignette,
  rolling scanline — as a shared toggleable layer; must respect reduced motion and mobile
  perf.
- **Neon glow.** Additive-blend glow layers, double-stroke "bloom" without a blur shader,
  pulsing intensity tied to game state (Neon Serpent already scales a border glow by speed).
- **Parallax.** Current: Bounce Circuit has two-layer hashed-tower parallax. Research
  multi-layer starfields (Star Courier has one flat layer), depth-scaled scroll, and
  reusing the hash-height trick (no RNG) elsewhere.
- **Screen shake.** Current: fixed-magnitude `shake`. Research trauma-based shake (decaying
  magnitude², directional shake), and perceptual tuning on small screens.
- **Impact flashes.** Current: `camera.flash`. Research colored/edge-only flashes, per-event
  color coding, and freeze+flash pairing (hitstop).
- **UI / canvas integration.** Research shared design tokens between CSS shell and canvas
  HUD (font sizing harmony is noted as an open item), and drawing HUD as canvas vs DOM
  overlay for crispness on high-DPR screens.

---

## 3. Game-specific research directions

Each game: concrete mechanics/visual systems to research, inspirations, search terms, and
what to avoid so the game stays coherent and doesn't break determinism/tests.

### Neon Serpent — `neon-serpent/`

**Research (5–10):** (1) segment motion **trail/afterimage**; (2) speed-tied audio pitch
ramp; (3) "near-miss" tension cue when the head passes adjacent to body/obstacle; (4)
food variety (bonus/moving/timed food) as pure-logic entities; (5) portal-edge visual
telegraph (which edge wraps where); (6) combo-meter visualization for the existing x1–x8
multiplier; (7) obstacle telegraph before it appears (currently pops in every 3rd food);
(8) optional "hazard-free grace" opening; (9) score-attack medals; (10) subtle grid
parallax/breathing.
**Inspirations:** _Nibbler_, _Snake_ (Nokia), _Tron_ light-cycles, _Slither.io_ (trail/glow).
**Search terms:** "snake game juice", "grid movement afterimage trail", "combo decay timer
design", "arcade neon glow Phaser graphics", "readable portal wrap telegraph".
**Avoid:** adding RNG draws to food/obstacle spawning without re-probing the seed-7 tests;
free-form (non-grid) movement (breaks the whole model); food types that change the
occupancy-scan cost dramatically on the 18×24 grid.

### Bounce Circuit — `bounce-circuit/`

**Research:** (1) distance/orb **milestone flourishes**; (2) speed-tied parallax + audio;
(3) motion trail on fast falls; (4) coin/orb magnet or arc-collection feedback; (5)
variable jump height (hold-to-jump) within coyote/buffer model; (6) chunk-type variety +
difficulty-scaled chunk selection; (7) landing dust scaled by fall speed; (8) a visible
"speed" readout / sense of acceleration; (9) background depth (day/night or biome shift by
distance); (10) fair death telegraph (spike readability at speed).
**Inspirations:** _Canabalt_, _Bit.Trip Runner_, _Geometry Dash_, _Alto's Odyssey_ (feel).
**Search terms:** "endless runner game feel", "canabalt procedural generation chunks",
"variable jump height coyote time buffer", "runner difficulty pacing", "parallax speed
lines procedural".
**Avoid:** changing the `generateChunk` RNG roll order (tests depend on seed-11 terrain);
over-tuning physics constants (`vy*0.15`, `0.5` gravity, jump velocity) without new logic
tests; adding vertical complexity that breaks the one-button readability.

### Star Courier — `star-courier/`

**Research:** (1) **hitstop on kills**; (2) wave-clear screen-freeze + banner payoff; (3)
player health/shield or lives (currently one-hit death); (4) power-ups (spread/charge shot)
as pooled logic entities; (5) fire cooldown/heat model; (6) enemy formations/patterns
beyond single-column spawns; (7) a boss or mini-boss every N waves; (8) escalating
density audio bed; (9) score/kill-streak multiplier; (10) bomb/clear-screen panic button.
**Inspirations:** _Space Invaders_, _Galaga_ (formations/dive), _Ikaruga_/_DoDonPachi_
(bullet legibility, chaining), _Resogun_ (particle juice).
**Search terms:** "shmup game feel hitstop", "bullet hell readability", "object pool bullet
pattern", "galaga enemy formation AI", "power-up design vertical shooter".
**Avoid:** breaking the seed-9 "first enemy in column 2" opener the e2e test relies on; bullet
counts that blow the mobile particle/draw budget; power-ups that add non-deterministic RNG
without new seeded tests; losing the current telegraph/silhouette readability.

### Lane Rush — `lane-rush/`

**Research:** (1) **visible near-miss zone** flash so scoring is legible; (2) consecutive
near-miss **combo**; (3) speed **cap / plateau** (currently unbounded `0.18 + tick/2400`);
(4) risk multiplier for tighter/faster passes; (5) lane-change juice (tilt/lean, tire
streak); (6) traffic variety with behavior (not just color variant); (7) oncoming vs
same-direction traffic; (8) pickups/boost lanes; (9) crash cause telegraph (the invisible
hit band); (10) rubber-band difficulty.
**Inspirations:** _Spy Hunter_, _OutRun_ (speed feel), _Crossy Road_ (readable lanes),
_Subway Surfers_ (near-miss scoring + juice).
**Search terms:** "near miss scoring design", "endless lane runner difficulty cap", "arcade
racer speed feel juice", "crossy road lane readability", "risk reward scoring multiplier".
**Avoid:** adding RNG draws in `spawnTraffic` that shift the seed-12 crash-at-~tick-102 the
tests pin (the `spawnTick % 3` variant trick exists specifically to avoid this); making the
hit bands even less visible; a fourth lane (breaks the three-lane layout/tests).

### Circuit Stack — `circuit-stack/`

**Research:** (1) **gravity/level curve** tied to lines cleared (the biggest gap — it never
speeds up); (2) **hard-drop** with slam effect + lock delay; (3) **hold piece**; (4)
line-clear flash + row-collapse animation; (5) combo / back-to-back / T-spin scoring; (6)
danger warning as the stack nears the top; (7) ghost-piece styling/toggle (ghost exists);
(8) next-queue of 3–5 (currently one NEXT); (9) garbage/rising-floor mode; (10) per-piece
color identity (currently all locked cells are cyan, active magenta).
**Inspirations:** _Tetris_ (Guideline: SRS, 7-bag, gravity table — already partly here),
_Tetris Effect_ (juice/audio-reactive), _Puyo Puyo_ (chain scoring), _Lumines_.
**Search terms:** "tetris gravity level curve", "SRS wall kick T-spin", "lock delay design",
"tetris line clear animation", "7-bag randomizer" (already implemented — verify before
re-adding).
**Avoid:** changing the seed-14 7-bag draw order or the rotation/kick order the tests
depend on; per-piece colors that collide with the `#31545a` grid or `#ff4fd8` piece
pixel-signatures without updating `switching.spec.ts`; feature-creeping into full modern
Tetris (keep it a tight micro-stacker).

---

## 4. Portfolio / recruiter positioning

**Resume one-liner options:**

- "Built **Pocket Arcade** — a zero-asset, five-game HTML5 arcade (Vite + strict TypeScript
  - Phaser 3) with a pure/deterministic game-logic layer, procedural graphics, synthesized
    audio, and a Vitest + Playwright validation pipeline including canvas pixel-signature
    regression tests."
- Shorter: "Zero-asset browser arcade: 5 games, procedural-only rendering, deterministic
  tested game logic, cross-viewport E2E."

**Technical bullets this project can already support (code-proven):**

- Enforced **architecture boundary** (framework-free logic vs Phaser rendering) via a custom
  import-boundary script + ESLint.
- **Deterministic simulation** (seeded LCG) enabling reproducible unit + e2e tests.
- **Procedural graphics & synthesized audio** under a strict zero-asset rule.
- **Pixel-signature E2E** that reads canvas `getImageData` to prove render correctness (not
  just DOM/bridge state).
- **Responsive/mobile engineering**: `svh`/safe-area/iOS-toolbar handling, touch d-pad with
  hold-to-repeat, no-scroll layout contracts, `prefers-reduced-motion` support.
- **Fixed-step game loop**, object pooling (Star Courier), and a clean TestBridge contract.

**Features that would make it more impressive to recruiters (map to §5):**

- A **win/lose/pause meta-layer** (removes the "endless death loop" tell; see the dead
  `won`/`ready`/`PAUSE` seams in `CURRENT_APP_STATE.md` §8).
- **Designed audio** (music bed + per-game SFX) — a visible "and it's all synthesized" story.
- **Hitstop + richer juice** — the most _visible_ upgrade in a 10-second demo/GIF.
- **Bundle/perf story** with before/after numbers (lazy-load scenes; Phase 7).
- **CRT/shader cabinet layer** — a striking screenshot differentiator.

**Strongest demo flow (for a live walk-through):** open on Neon Serpent (combo + speed
ramp reads instantly) → switch to Star Courier (telegraphed hazards, wave banner) → switch
to Lane Rush (speed/juice) → resize the window to show the desktop→mobile layout snap →
show a touch play on a phone/emulator → end on the case-study panel + `npm run validate`
green.

**Most valuable screenshots / GIFs:** (1) a **combo/eat moment** in Neon Serpent (sparks +
popText + glow); (2) a **wave-clear flash** in Star Courier; (3) a **near-miss** in Lane
Rush; (4) the **desktop three-column cabinet** with scanlines; (5) a **mobile portrait**
shot with the thumb-zone controls; (6) a **line-clear** in Circuit Stack. GIFs beat stills
here because the value is in the motion/feel.

---

## 5. Highest-leverage future implementation ideas (ranked)

Tags: `[gameplay] [graphics] [ui] [audio] [perf] [test]`. Impact/Risk are relative to this
repo's constraints (RNG determinism, pixel signatures, zero-asset, mobile no-scroll).

### Quick wins (high impact ÷ low risk)

1. **iPad-landscape touch layout** `[ui]` — the one device class that's currently unplayable
   (`min-width:900` + coarse + landscape + height>500). Low risk: a new coarse-pointer media
   block + a mobile-project e2e; desktop (fine pointer) can't match it. _Already scoped in
   `NEXT_RUN.md`._ **Impact: high / Risk: low.**
2. **Hitstop + cause-specific death feedback** `[gameplay][graphics]` — freeze render a few
   frames on kills/deaths; huge felt-quality gain. Risk: must not freeze the fixed-step
   _logic_ or break e2e timing; gate on reduced motion. **Impact: high / Risk: low–med.**
3. **Circuit Stack gravity/level curve** `[gameplay][test]` — make it accelerate with lines
   cleared; pure-logic, unit-testable, fixes the biggest design gap. Risk: keep seed-14 bag
   order intact; add tests. **Impact: high / Risk: low.**
4. **Lane Rush speed cap + visible near-miss zone** `[gameplay][ui]` — fixes fairness +
   scoring legibility. Risk: no new RNG draws (preserve seed-12 crash tick). **Impact: med–
   high / Risk: low.**
5. **Typographic copy pass + HUD/shell font harmony** `[ui]` — curly apostrophes, shared
   sizing tokens. **Impact: low–med / Risk: very low.**

### Medium improvements

6. **Designed audio layer** `[audio]` — expand `AudioEngine` beyond four blips: per-game SFX,
   a synthesized music bed, envelope/filter design, combo-pitch ramps. Risk: keep the single-
   AudioContext/no-listener-growth contract (`audio.spec.ts`); don't assert output in e2e.
   **Impact: high / Risk: med.**
7. **Pause + win/round meta-layer** `[gameplay][ui][test]` — actually implement the dead
   `PAUSE` input and `won`/`ready` phases (or remove them honestly). Risk: touches every
   logic file + BaseGameScene; needs tests. **Impact: high / Risk: med.**
8. **Trails + continuous particles** `[graphics][perf]` — snake/ship/car afterimages, pooled.
   Risk: mobile draw budget; reduced-motion gate; watch pixel signatures. **Impact: med /
   Risk: med.**
9. **Score-attack meta** `[gameplay][ui]` — per-run medals, "new best" celebration, maybe a
   daily seed (separate from test seeds). **Impact: med / Risk: low–med.**
10. **Star Courier depth: power-ups / shield / formations** `[gameplay]` — pooled, seeded,
    tested. Risk: seed-9 opener + mobile bullet budget. **Impact: med / Risk: med.**

### Ambitious upgrades

11. **CRT/bloom shader cabinet layer** `[graphics][perf]` — a Phaser custom pipeline for
    curvature/scanlines/bloom. Risk: **feasibility on the `CANVAS` renderer is unknown** —
    may require switching to WebGL, which interacts with `pixelArt`/scaling and could shift
    pixel signatures; research first. **Impact: high (visual) / Risk: high.**
12. **Scene lazy-loading + bundle optimization** `[perf][test]` — dynamic-import scenes to
    shrink first load below the ~319 kB Phaser chunk; report before/after gzip. This is the
    repo's designated **Phase 7**. Risk: scene-switch timing, e2e stability. **Impact: med /
    Risk: med–high.**
13. **Visual/layout regression testing** `[test]` — go beyond dominant-color counts (e.g.
    structural snapshots or masked screenshot diffs) to catch wrong-position rendering.
    **Impact: med / Risk: med** (flake management).
14. **Per-game progression/unlocks or a meta-hub** `[gameplay][ui]` — an arcade "profile"
    across games. Risk: scope creep; keep it optional. **Impact: med / Risk: high.**

---

## 6. Things not to do yet

**Overengineering risks:**

- Don't build a **shader/CRT pipeline** before confirming renderer feasibility — it may force
  a `CANVAS → WEBGL` switch that ripples through scaling, `pixelArt`, and every pixel-
  signature test. Research (#11) before committing.
- Don't add a **general entity/ECS framework** — the five games are small; the current
  per-game logic classes are the right size.
- Don't chase **DPR-perfect canvas rendering** yet (`UI_MOBILE_AUDIT.md` P2-13 flags it as
  measure-first: a resolution bump multiplies fill cost on low-end phones).

**Feature-creep risks:**

- Don't turn Circuit Stack into full modern Tetris (hold + 5-queue + T-spin + garbage +
  multiplayer). Pick the one or two that fix pacing (gravity curve, hard-drop) and stop.
- Don't add bullet-hell density to Star Courier that the mobile draw budget can't sustain.
- Don't add game modes/unlock economies before the core feel layer (juice/audio/pacing) is
  done — that's the higher-leverage work.

**Mechanics that would hurt the arcade identity:**

- Free-form (off-grid) movement in Neon Serpent; a fourth lane in Lane Rush; multi-button
  fighting-game inputs anywhere — the shared six-input semantic model + d-pad is the
  identity, keep games expressible in it.
- Realistic (non-neon) art directions; loaded fonts/images/audio (violates the zero-asset
  hard rule and the whole portfolio thesis).

**Changes likely to break tests or determinism (handle with extra care):**

- **Adding or reordering `SeededRandom` draws.** Tests/e2e pin exact seeded outcomes: Star
  Courier seed-9 "first enemy in column 2", Lane Rush seed-12 crash near tick ~102, Bounce
  seed-11 terrain, Circuit seed-14 7-bag, Neon seed-7 obstacle at (4,6). Derive cosmetic
  variety from stable data (like `spawnTick % 3`) instead; if a draw is truly needed, re-probe
  and update the dependent tests deliberately (never weaken them).
- **Flooding pixel-signature colors.** New effects/overlays must not add large areas of the
  signature colors (`#0d252b`, `#12353c`, `#31545a`, `#ff4fd8`, ship-region cyan) or must
  update `tests/switching.spec.ts` on purpose, and re-run it after any `*Scene.ts` change.
- **Weakening the import boundary or logic purity** to sneak rendering/DOM/audio into
  `*Logic.ts` — fix the architecture instead; the guard is a hard rule.
- **Regressing the layout contracts** — desktop no-scroll at four viewports, mobile no-
  overlap/no-scroll at six sizes, `.arcade-shell` `min-height: 0`, phone-landscape
  playability. Any shell CSS change must run both Playwright projects.
- **Growing window listeners or AudioContexts across scene switches** (`audio.spec.ts`) — new
audio work must keep the single-context, self-removing-listener discipline.
</content>
