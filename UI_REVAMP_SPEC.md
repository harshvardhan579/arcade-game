# Pocket Arcade — UI Revamp Spec (pass 1)

> Phase 0 deliverable of `.claude/ui-revamp-loop.md`, branch `ui-revamp-pass-1`,
> written 2026-07-14. This is the design contract Phases 1–5 implement; deviations
> must be recorded here with a reason. Baseline screenshots ("before" record):
> `output/ui-revamp/before/*.png` (12 shots: desktop/mobile/landscape × dark/light ×
> home/game/game-over-with-panel; untracked evidence, not committed).
>
> **Verdict: PROCEED.** No blocker found. Zero test-pin updates are planned; the
> whole revamp is achievable in DOM/CSS without touching canvas rendering,
> geometry contracts, or any pinned copy.

---

## 0. Audit summary (what exists today, what's weak)

Grounded in the before-screenshots and a full read of `src/style.css` (1,339
lines), `index.html`, every `src/ui/*` module, `BaseGameScene.ts`, and all eight
Playwright specs.

**What already works (protect it):**

- The dark game-mode composition is genuinely good: three-column cabinet, glowing
  bezel + scanlines on `.game-root`, coherent cyan/pink/amber identity shared with
  the canvases, quiet Back / filled Restart hierarchy, `NOW PLAYING` state.
- The token system is real (dark `:root` + light overrides), contrast is strong
  everywhere (see §11 table — all text ≥5.3:1), focus/keyboard/touch behavior is
  disciplined and heavily pinned by tests.
- The leaderboard panel's information design (rank / name / amber score rows) is
  already sound; it needs chrome, not restructuring.

**Weaknesses the revamp targets:**

1. **Desktop home is a floating island.** `max-width: 880px` + vertical centering
   leaves a sea of empty page at 1440×900; cards are visually light; no cabinet
   presence. It reads "unstyled starter", not "arcade lobby".
2. **Light theme breaches the anti-goal today**: white cards on pale gray reads
   generic-SaaS. It needs "daylight cabinet" character (tinted panels, trim,
   chamfer) while keeping its verified contrast.
3. **Mobile portrait topbar is expensive**: the brand wraps to two lines and the
   hint to three (~1/6 of the viewport before the canvas). Needs compaction
   without touching the pinned copy or the picker/Restart/toggle geometry.
4. **The ACTION button is a raw magenta slab** (~100×178 px of pure `#ff4fd8`) —
   the loudest element on screen while being pure chrome. D-pad buttons are flat.
5. **Leaderboard panel nits**: opens with the helper "Use 2–16 characters" in
   error tone before the user has typed anything; the name placeholder clips on
   narrow widths ("YOUR NAM"); the panel is flat relative to its importance.
6. **Sidebar cards reserve dead space** (`.game-card span { min-height: 2.6em }`)
   producing a visible hole between subtitle and `High —`.
7. **Case-study copy is stale** ("73 deterministic logic and contract tests" —
   actual: 154) and uses straight apostrophes. No test pins this copy (verified:
   no spec selects `.case-study` text) — safe to fix in Phase 3.
8. **No systemized scales**: spacing/duration/radius values are ad-hoc literals;
   glow rgba() values are scattered one-offs. Phase 1 tokenizes them.

---

## 1. Visual language

**Thesis: a premium neon arcade cabinet in a dark room.** Four depth layers, each
one step brighter/denser than the one behind it:

| Layer       | Surface                               | Treatment                                                            |
| ----------- | ------------------------------------- | -------------------------------------------------------------------- |
| **Room**    | page background                       | near-black teal, radial glow + faint vignette; static, no grid noise |
| **Cabinet** | panels, selector, case-study, topbar  | panel fills, chamfered corners, 1px neon trim lines                  |
| **Bezel**   | `.game-root` frame, leaderboard panel | strongest glow + scanlines (existing identity, refined)              |
| **Screen**  | the canvas                            | **untouchable** — literal `#071114`, pixel-signature territory       |

Rules of the language:

- **Neon is an accent, never a surface.** Cyan/pink/amber appear as text, 1px
  trim, small fills, and glows — the only large saturated fill allowed is the
  ACTION button, and it gets tamed with a gradient + inner rim (§8).
- **Chamfer = cabinet sheet-metal.** Cut corners (via `clip-path`) on panels and
  the leaderboard panel only; buttons and cards keep small radii (CLAUDE.md
  "cards stay compact"). Never chamfer `.game-root` (geometry + `overflow`
  contracts) or touch buttons (hit-area integrity — clipped regions don't
  receive pointer events).
- **Scoreboard typography**: every numeric score in the shell uses the same
  monospace stack the canvas HUD already uses — shell and screen speak one type
  language. Labels are uppercase, tracked, small.
- **One glow per component per state.** Restraint is the premium signal:
  hover = border + one glow; no stacked shadows, no hue animation, no blur filters.
- **The scanline overlay stays subtle** and DOM-side (`.game-root::after`);
  Phase 3 may refine its density/alpha but it must stay ≤ its current visual
  weight and keep `pointer-events: none`, z-index 2.

Anti-goals restated as review checks: if a slice looks like a SaaS dashboard
(flat white cards, gray dividers), a toy (oversized radii, bouncy easing), a
Cyberpunk 2077 clone (yellow/glitch/jagged-mask motifs), or neon chaos (>1 glow
per element, saturated fills on large surfaces) — revert the slice.

---

## 2. Color tokens

**No existing token changes value in Phase 1.** Dark must render near-identical
at baseline; the revamp layers new tokens on top. `--bg` hexes (`#071114` /
`#e9f1f1`) are frozen — they're duplicated in `index.html`'s inline script,
`ThemeToggle.applyTheme`, and shell.spec's `theme-color` assertions.

### Existing tokens (kept as-is — verified 2026-07-14)

`--bg --panel --line --text --muted --cyan --pink --red --yellow --bg-glow
--bg-grad-a --bg-grad-b --panel-fill --h1-glow --accent-text --score-text
--danger-text --focus-ring --on-accent --card-bg --card-border --card-hover-bg
--card-glow --card-glow-active --control-bg --control-border --control-pressed
--control-pressed-glow --action-pressed --action-pressed-glow --quiet-fill
--restart-glow --stage-glow --scrollbar-thumb --game-aspect` (+ full light set).

### New tokens (Phase 1)

| Token          | Dark                                                                 | Light                  | Role / consumers                                             |
| -------------- | -------------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------ |
| `--panel-2`    | `#102830`                                                            | `#ffffff`              | raised surface (topbar chip, lb-panel body, selected states) |
| `--bezel`      | `#0c1d23`                                                            | `#d7e4e6`              | cabinet trim fill around the stage                           |
| `--edge-hi`    | `rgba(216,255,249,0.07)`                                             | `rgba(11,42,48,0.08)`  | 1px top bevel (inset shadow) on panels/buttons               |
| `--edge-lo`    | `rgba(2,8,10,0.55)`                                                  | `rgba(11,42,48,0.18)`  | 1px bottom bevel                                             |
| `--trim`       | `rgba(77,255,225,0.28)`                                              | `rgba(11,110,95,0.35)` | neon trim lines (panel top edges, heading underlines)        |
| `--glow-pink`  | `rgba(255,79,216,0.25)`                                              | `rgba(179,38,30,0.15)` | ACTION pressed / danger glow                                 |
| `--glow-amber` | `rgba(255,209,102,0.18)`                                             | `rgba(138,90,0,0.15)`  | score emphasis glow                                          |
| `--action-hi`  | `#ff6ee0`                                                            | `#ff6ee0`              | ACTION gradient top (identity fill, theme-invariant)         |
| `--action-lo`  | `#d63bb4`                                                            | `#d63bb4`              | ACTION gradient bottom                                       |
| `--space-1..6` | `4/8/12/16/24/32px`                                                  | same                   | spacing scale (§4)                                           |
| `--radius-1/2` | `4px / 8px`                                                          | same                   | radii scale                                                  |
| `--chamfer`    | `10px`                                                               | same                   | panel corner cut                                             |
| `--dur-1/2/3`  | `120ms / 180ms / 240ms`                                              | same                   | motion durations                                             |
| `--ease-out`   | `cubic-bezier(.2,.7,.3,1)`                                           | same                   | standard easing                                              |
| `--font-mono`  | `ui-monospace, 'SFMono-Regular', Menlo, Monaco, Consolas, monospace` | same                   | scoreboard type (matches canvas HUD stack)                   |

Migration task in Phase 1: fold the scattered literal `rgba(...)` glows and
`0.15s/0.18s ease-out` transitions into these tokens with zero visual delta,
then build on them.

### Contrast verification of every text-bearing pair (computed 2026-07-14)

See §11 — all pairs ≥ 4.38:1; nothing in this palette moves below WCAG AA.

---

## 3. Typography scale

System stacks only (hard rule). Two families:

- `--font-ui` — existing `Inter, ui-sans-serif, system-ui, …` stack (Inter only
  if locally installed; nothing downloads).
- `--font-mono` — the scoreboard stack (identical to the canvas HUD's).

| Role            | Spec                                                            | Consumers                                                                                |
| --------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Display         | `clamp(1.45rem, 2.2vw, 2.2rem)` / 800 / `-0.01em` + `--h1-glow` | `h1` (copy pinned: "Pocket Arcade")                                                      |
| Marquee/eyebrow | `0.78rem` / 700 / `0.09em` caps / muted                         | `.eyebrow`, `.home-tagline` (restyled as lobby marquee line)                             |
| Panel label     | `0.78rem` / 700 / `0.09em` caps                                 | `.panel-label`, `.mobile-game-picker`, `.lb-heading` (0.7rem/0.12em), `.lb-list-heading` |
| Card title      | `0.98–1.02rem` / 700 / `0.01em`                                 | `.game-card strong`, `.home-card strong`                                                 |
| Body            | `0.85–0.94rem` / 400 / lh 1.3–1.45                              | subtitles, case-study, `.lb-message`                                                     |
| Hook            | `0.8rem` italic muted                                           | `.home-card-hook`                                                                        |
| **Score**       | `--font-mono` / 700 / `tabular-nums` / `0.78–0.85rem` / amber   | `.card-high`, `.home-card-high`, `.lb-row-score`, `.lb-rank` (muted)                     |
| Hint            | `0.82rem` / muted / `0.02em`                                    | `.controls-hint`                                                                         |

The only typographic _change_ is scores adopting `--font-mono` (visual only —
`formatHigh` text content is pinned and unchanged). Everything else is
systematization of values that already exist.

---

## 4. Spacing scale, radii, chamfer

- **Spacing**: 4px base — `--space-1..6` = 4, 8, 12, 16, 24, 32. Existing
  paddings (cards 12–14px, panels 16px, grid gaps 8–16px) map onto the scale
  as-is; no wholesale re-spacing that could disturb no-scroll fits.
- **Radii**: `--radius-1: 4px` (micro elements), `--radius-2: 8px` (cards,
  buttons, panels — current de-facto standard), emblems keep 10px. No radius
  inflation ("childish toy" anti-goal).
- **Chamfer**: `--chamfer: 10px` corner cuts via
  `clip-path: polygon(...)` on **`.panel`** (selector, case-study) and
  **`.leaderboard-panel`** only, cutting the top-right + bottom-left corners
  (asymmetric = cabinet sheet-metal, not sci-fi hexagon).
  **Constraint:** `clip-path` clips outer box-shadows — chamfered elements carry
  their glow as `inset` shadows or on a non-clipped parent/pseudo-element.
  Never chamfer: `.game-root`, `.touch-button`, `.home-card`/`.game-card`
  (compact-card rule), form inputs.
  **Phase 1 implementation note (deviation, accepted):** `clip-path` also clips
  the element's own 1px border stroke along the two cut diagonals. The
  border-following pseudo-element workaround was rejected because
  `.selector`/`.case-study` are scroll containers — an absolutely positioned
  fill pseudo scrolls away with the content. The unstroked 10px diagonals are
  visually negligible in both themes (verified in the Phase 1 screenshots)
  and read as a lit cut edge.

---

## 5. Panel / card / button system

### Panel (`.panel`, `.leaderboard-panel`)

Anatomy: chamfered container → 1px `--line` border → `--edge-hi`/`--edge-lo`
inset bevels → optional 1px `--trim` top edge-light → `.panel-label` header.
States: static (panels don't hover).

### Cards

**Sidebar `.game-card`** — anatomy: mini-emblem (reuse `.home-logo--<id>` at
~40px, `aria-hidden`, new inner span, no accessible-name change) + title +
subtitle + mono `High` line. Kill the dead `min-height: 2.6em` reservation in
favor of consistent content spacing.

| State          | Treatment                                                                                              |
| -------------- | ------------------------------------------------------------------------------------------------------ |
| default        | `--card-bg`, 1px `--card-border`, bevel edges                                                          |
| hover          | `--card-hover-bg`, `--cyan` border, one `--card-glow` shadow (existing)                                |
| focus-visible  | pinned: `outline: 2px solid var(--focus-ring); outline-offset: 2px`                                    |
| active (press) | `translateY(1px)` (existing)                                                                           |
| `.is-active`   | inset 3px cyan bar (existing) + `--card-glow-active`; `Now playing` ::after restyled as a marquee chip |

**Home `.home-card`** — same state table; emblem 64px (may grow to 72px on
≥900px only if the 375×667 fit still passes); title/sub/hook/high hierarchy
sharpened per §3; `.home-card-high` stays single-line ellipsis (geometry law).

### Buttons

| Kind         | Selector(s)                                                                        | Fill / border                                                                                    | Hover                         | Pressed                                                           |
| ------------ | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ----------------------------- | ----------------------------------------------------------------- |
| Primary      | `.restart-button` (desktop), `.lb-submit`                                          | `--cyan` fill, `--on-accent` text, bevel rim                                                     | brightness + `--restart-glow` | `translateY(1px)`                                                 |
| Quiet        | `.back-button`, `.theme-toggle`, mobile `.restart-button`, `.lb-retry`, `.lb-edit` | `--quiet-fill`/`--control-bg`, 1px `--control-border`                                            | border → `--accent-text`      | `translateY(1px)` + `--control-pressed`                           |
| Select       | `.mobile-game-select`                                                              | `--control-bg`, 1px border, custom caret stays native                                            | border accent                 | —                                                                 |
| Touch d-pad  | `.touch-button`                                                                    | `--control-bg` + bevel, glyph `--text`                                                           | n/a (coarse)                  | `.is-pressed`: `--control-pressed` + one `--control-pressed-glow` |
| Touch ACTION | `.touch-action`                                                                    | `linear-gradient(--action-hi, --action-lo)` + 2px inner rim (inset shadow) + `--on-accent` glyph | n/a                           | `.is-pressed`: `--action-pressed` + `--action-pressed-glow`       |
| Disabled     | `.lb-submit:disabled`                                                              | `opacity: 0.5; cursor: not-allowed` (existing)                                                   | —                             | —                                                                 |

All buttons keep: `blur()` after activation (JS, untouched), `touch-action:
manipulation`, ≥44px touch floors on coarse layouts, pinned focus ring.

---

## 6. Motion rules

- **Durations/easing**: `--dur-1` 120ms (pressed/small state), `--dur-2` 180ms
  (hover, borders, glows — current de-facto), `--dur-3` 240ms (panel entrances).
  Single easing `--ease-out`. Nothing longer except one optional idle pulse.
- **Animatable properties**: `transform`, `opacity`, `border-color`,
  `background-color`, `box-shadow`, `filter (brightness)`. **Never**: width,
  height, top/left, margin, padding, font-size (layout thrash + fit-test risk).
- **Panel entrance** (Phase 5): `.leaderboard-panel.is-open` plays a one-shot
  keyframe `opacity 0→1, translateY(6px)→0` over `--dur-3` (keyframes fire on
  `display` flip; the global reduced-motion block zeroes it to a pop-in).
- **Optional idle pulse** (Phase 5, dark theme only): the `.is-active` card's
  inset bar breathes opacity 0.75→1 over 3s. Decorative, reduced-motion-killed,
  drop it if it reads noisy.
- **No JS animation loops, no infinite hue/position animation, no transition on
  `.arcade-shell` mode switches** (mode flips must stay instant — tests flip
  modes and assert immediately).
- **Phase 5 implementation notes:** shipped as specified — `lb-reveal` panel
  entrance + a `score-pop` on the run readout (both one-shot, from-only
  keyframes), and the `.is-active` breathe as an opacity-only `::before` bar
  overlay (explicit `animation: none` under reduced motion; the zeroed-
  duration block alone would leave a degenerate infinite loop). Additive
  micro-polish within these rules: the theme toggle rotates 180° with the
  theme (paint-only, with an `:active` override in the rotated frame), home
  emblems lift on card hover, touch keys squish (`scale(0.985)`) while
  pressed, sidebar cards lift on hover, and the `.game-root` scanline layer
  gained one static diagonal glass-glare gradient. All verified by computed-
  style probe in both motion modes.

---

## 7. Desktop layout (≥900px, fine pointer)

Grid, column sizes, no-scroll behavior, and `.game-root` row-derived sizing are
**unchanged**. Work within them:

- **Phase 2 implementation notes (deviations, accepted):** emblems stayed
  64px — their interiors are pixel-positioned art, and presence came instead
  from per-game accent borders + an inner screen vignette. The home stage
  widened to 960px with `minmax(250px, 1fr)` cards (desktop only). The
  375×667 portrait fit measured **zero** height slack, so every additive
  treatment (footer, wordmark rule, score-line hairline, larger padding) is
  scoped to ≥900px. Bonus fix: short-landscape home (667×375) overflowed by
  ~72px on `main` (the fifth card was clipped); dropping the flavor hook line
  - 2px card padding there brings all five cards fully on screen (+9px slack).
- **Home**: keep `max-width: 880px` centered, but give the room a floor —
  page-level vignette + a wide, faint radial glow behind the header; marquee-ize
  the header (tagline as tracked caps line with trim rules either side); larger
  emblem presence; a muted mono footer line inside `.home-screen` (e.g.
  `5 GAMES · ZERO ASSETS · EVERY PIXEL PROCEDURAL`) — a `<p>`, never a heading
  (heading-count pin), added inside the existing flex column (fit-tested).
- **Game mode**: selector cards gain mini-emblems (§5); case-study gets
  typographic apostrophes, the real test counts, tightened rhythm; topbar
  eyebrow restyled as a cabinet-marquee tag over the h1; stage bezel gains
  `--bezel` trim ring **outside** `.game-root`'s border-box (e.g. via
  box-shadow spread or a wrapper-free outline — must not change
  `.game-root`'s client box; `switching.spec` re-run guards it).
- Scrollbar styling stays (thin, themed).

---

## 8. Mobile portrait layout (≤899px)

Geometry contracts (svh height, `min-height: 0` pin, row-derived canvas, grid
templates, 44px floors, safe-area padding) are **unchanged**. Visual work:

- **Topbar compaction**: brand block tightens — h1 down to ~1.2rem on ≤899px
  (still visible, text pinned), hint clamped to 2 lines via `line-clamp` only if
  it never hides pinned copy... it must not: the hint strings are asserted with
  `toHaveText` which reads full textContent — clamping is visual-only
  (`-webkit-line-clamp` keeps textContent) and acceptable; prefer a smaller
  font-size + tighter leading first.
- **D-pad**: bevel edges + pressed glow per §5; glyph size unchanged.
- **ACTION**: gradient + inner rim + dark glyph per §5 — tames the slab while
  keeping its grid cell, size, and single-shot behavior byte-identical.
- **Picker row**: unchanged structure; label micro-type per §3.

## 9. Mobile landscape layout (coarse, ≤500px tall)

Geometry (overlay grid, row clearances, disjointness from topbar chrome) is
**unchanged** — the 667×375 disjointness pins are tight; do not grow any button
metrics. Visual work only: the overlaid clusters may adopt a slightly
translucent control fill (`rgba` of `--control-bg`, ~0.85 alpha) so they sit on
the side margins like cabinet side-buttons; same bevel/pressed language as
portrait; verify glyph contrast stays ≥4.5:1 against the darkest underlay.

---

## 10. Game-over + leaderboard panel

DOM structure, classes, state machine, copy, and event contracts are **frozen**
(loop trap 12). Visual spec per state:

| State            | Treatment                                                                                                                                                                                                                                          |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Open (entry)     | chamfered `--panel-2` body, `--trim` rule under `GLOBAL LEADERBOARD`, name input with mono placeholder that **never clips** (input keeps `flex: 1 1 auto` with a real `min-width: 0` chain; placeholder shortens visually via font-size, not copy) |
| Saved name       | `Playing as NAME` — name in `--font-mono` 700; Edit stays quiet-button                                                                                                                                                                             |
| Submitting…      | message muted; Submit disabled look (existing)                                                                                                                                                                                                     |
| Success          | `Ranked #N worldwide · Best N` in `--accent-text` with one `--glow-amber` text-shadow on the rank                                                                                                                                                  |
| Not improved     | muted (existing copy)                                                                                                                                                                                                                              |
| Failure + Retry  | `--danger-text` message; Retry quiet-button                                                                                                                                                                                                        |
| List loading     | `…` muted                                                                                                                                                                                                                                          |
| List rows        | `#rank` muted mono / name ui / score amber mono; `#1` row may carry a faint amber left-edge tick                                                                                                                                                   |
| List empty       | `No scores yet — be the first` muted                                                                                                                                                                                                               |
| List unavailable | `Global scores unavailable` muted                                                                                                                                                                                                                  |

Approved micro-tweak (Phase 4, optional): the helper "Use 2–16 characters"
currently renders in **error** tone the moment the panel opens (empty input
fails validation before the user types). Presenting the initial helper as
muted until the first `input` event is a tone-only change — no copy, no
enable/disable, no test pins touched (specs assert text, never `data-tone`).
Implement only if it stays a ≤5-line diff in `LeaderboardPanel.ts`; otherwise
record and skip.

Panel remains: absolutely positioned inside `.game-root`, z-index 3, no layout
height, both themes, ≥44px targets, `aria-live` message, TOP 5 coarse / TOP 10
fine.

**Phase 4 implementation notes (deviations, accepted):** per explicit user
direction ("stronger hierarchy: final score, local high…"), the panel gained
an additive run-result readout — `.lb-run` (`.lb-run-label` RUN SCORE /
`.lb-run-score` big amber mono / `.lb-run-meta` "Local best N" from
SafeStorage) — populated in `open()` via `textContent` only; no behavior,
network, or state-machine involvement, and no existing selector/copy pin
touched. The helper-tone micro-tweak shipped (muted tone on an untouched
empty field; text unchanged). The placeholder-clipping fix is a
placeholder-only `font-size: 0.78rem` (typed text keeps 0.9rem mono).
Status/message states carry a colored left-edge tick (shape + color, not
color alone); list states render as dashed terminal slots.

---

## 11. Accessibility rules

**Contrast (computed 2026-07-14, WCAG 2.x relative luminance):**

| Pair                                     | Ratio              | Status           |
| ---------------------------------------- | ------------------ | ---------------- |
| dark text `#d8fff9` on bg `#071114`      | 17.82:1            | AAA              |
| dark text on card `#0a181d`              | 16.87:1            | AAA              |
| dark text on new `--panel-2` `#102830`   | 14.32:1            | AAA              |
| muted `#8fb9bd` on bg / card / panel-2   | 8.95 / 8.48 / 7.19 | AAA              |
| cyan `#4dffe1` as text on panel / card   | 13.33 / 14.39      | AAA              |
| amber `#ffd166` on card / panel-2        | 12.54 / 10.64      | AAA              |
| danger `#ff9a86` on panel                | 8.15:1             | AAA              |
| `--on-accent` on cyan (Restart/Submit)   | 14.87:1            | AAA              |
| `--on-accent` on `--action-lo` `#d63bb4` | 4.58:1             | AA (large glyph) |
| focus `#ffd166` vs bg (UI, 3:1 floor)    | 13.25:1            | pass             |
| light text `#0b2a30` on bg / white       | 13.20 / 15.13      | AAA              |
| light muted `#3f6169` on bg / white      | 5.86 / 6.72        | AA+              |
| light accent `#0b6e5f` on white / bg     | 6.16 / 5.37        | AA+              |
| light score `#8a5a00` on white           | 5.93:1             | AA+              |
| light danger `#b3261e` on panel          | 6.22:1             | AA+              |
| light focus `#b45309` vs bg (3:1 floor)  | 4.38:1             | pass             |

Any **new** text/background pairing introduced later must be added to this table
with a computed ratio ≥4.5:1 (≥3:1 for large text / UI affordances).

**Non-negotiables:** focus ring exactly `outline: 2px solid var(--focus-ring);
outline-offset: 2px` on every focusable; ≥44px touch targets on coarse layouts;
existing aria-labels/roles/`aria-live` untouched; tab orders pinned (home:
theme-toggle → 5 cards; game desktop: 5 cards → Back → Restart → toggle); zero
new focusable elements in this pass; color never the sole state signal (pressed
also translates, selected also shows the inset bar + chip).

## 12. Reduced-motion rules

The global `@media (prefers-reduced-motion: reduce)` block (zeroes all
animation/transition durations, `!important`) **stays byte-identical**. New
motion must therefore: (a) be decorative only, (b) have a legible static
end-state at 0.001ms (no opacity-0 keyframe starts that could strand an element
invisible — entrance keyframes end at the resting state), (c) never encode
information exclusively in motion. Pressed/focus/selected states remain fully
visible without animation.

---

## 13. Test impact map

Planned pin updates across the whole pass: **none**. Per contract:

| Pinned contract (spec)                                                    | Phase(s) nearby | Expected outcome                                                                                |
| ------------------------------------------------------------------------- | --------------- | ----------------------------------------------------------------------------------------------- |
| Selector/class/data-attr inventory (loop trap 1)                          | 1–5             | unchanged — restyle only, no rename/reparent                                                    |
| Copy pins: h1, hints, `High`/`World` formats, lb messages (trap 2)        | 1–5             | unchanged verbatim                                                                              |
| `controls-hint` exact strings (`shell.spec:25-29,100,117-119`)            | 3               | unchanged (styling only)                                                                        |
| Focus ring 2px solid (`shell.spec:91-96`)                                 | 1               | unchanged rule kept on all focusables                                                           |
| Tab order game mode (`shell.spec:63-108`)                                 | 3               | unchanged (no new focusables, DOM order kept)                                                   |
| Tab order home, toggle first (`home.spec:99-118`)                         | 2               | unchanged (footer line is a `<p>`, not focusable; nothing inserted before the header toggle)    |
| Heading "Pocket Arcade" count = 1 (`shell.spec:59`, `home.spec:23`)       | 2, 3            | unchanged (no new headings named Pocket Arcade; marquee/footer lines are `<p>`)                 |
| No-scroll: 4 desktop / 6 portrait / 3 landscape viewports + home fits     | 1–5             | green — spacing changes stay within current row budgets; re-run per phase                       |
| `.arcade-shell` min-height `0px` (`shell.spec:364-373`)                   | 1               | unchanged (no base `min-height` reintroduction)                                                 |
| `touch-action` computed map (`shell.spec:522-552`)                        | 1, 3            | unchanged (theme/decoration CSS never sets touch-action)                                        |
| `theme-color` meta `#071114`/`#e9f1f1` (`shell.spec:431-434`)             | 1               | unchanged (bg hexes frozen)                                                                     |
| Theme toggle accessible names + persistence suite                         | 1–3             | unchanged (aria-label logic untouched; glyph may restyle visually)                              |
| Touch: pressed class, hold-repeat, single-shot ACTION (`shell.spec:296+`) | 3               | unchanged (CSS-only restyle of `.is-pressed`)                                                   |
| Landscape disjointness + 44px floors (`shell.spec:178-261`)               | 3               | green — button metrics not grown; re-run mobile project                                         |
| Pixel signatures (`switching.spec`, thresholds incl. road >80k)           | 1, 3            | green — canvas + `.game-root` client box untouched; re-run desktop project after any bezel work |
| Canvas game-over overlay pixels `#d8fff9` (`shell.spec:148-176`)          | —               | untouched (BaseGameScene not edited)                                                            |
| Home: 5 cards, 5 emblems, canvas count 0, Back hidden (`home.spec`)       | 2               | unchanged (no Phaser/canvas on home, emblems stay)                                              |
| World fragments + throttle + fit (`home.spec:156-307`)                    | 2               | unchanged (`.hs-local`/`.hs-world` structure kept)                                              |
| Leaderboard suite: flag-off zero DOM/network, submit flow, list states    | 4               | unchanged (presentation only; `[class*="leaderboard"]` never in base shell)                     |
| High-score pins `High 777` etc. (`highscore.spec`)                        | 2, 3            | unchanged (mono font doesn't change textContent)                                                |
| Audio: ≤1 context, no listener growth (`audio.spec`)                      | —               | untouched (no new per-scene listeners)                                                          |
| Smoke: no console.error, live seeds (`smoke.spec`)                        | 1–5             | green every phase                                                                               |

**Contingency:** if any bezel/frame treatment measurably changes the canvas
client box, stop, revert the treatment to a box-neutral technique (outline /
outer shadow), and re-run `switching.spec` — never adjust a threshold to pass.

## 14. Fragile pins beyond the loop's trap list + must-not-change

Additional fragilities found in the full spec read (beyond
`.claude/ui-revamp-loop.md` traps 1–15):

1. **Home tab order starts at the header theme toggle** (`home.spec:110`) —
   nothing focusable may precede it inside `.home-screen`.
2. **`#game-root canvas` count is 0 on home** (`home.spec:22`) — decorative
   `<canvas>` elements are forbidden anywhere in the shell (home or game chrome);
   all decoration is CSS.
3. **Heading-role "Pocket Arcade" count is exactly 1 per mode** — marquee,
   footer, and tagline embellishments must be `<p>`/`<span>`, never `<h*>`.
4. **`.eyebrow` must remain hidden on mobile** (`shell.spec:122`) and the Back
   button hidden on home (`home.spec:24`) — both are display rules keyed off
   existing blocks; keep the selectors intact.
5. **`.mobile-game-select` option text = `Title · High N`** (`shell.spec:136`) —
   picker restyling must not touch option textContent.
6. **Landscape disjointness margins are tight at 667×375** — the overlay grid's
   first row (104px) barely clears the two-row topbar; any topbar height growth
   breaks `button clear of .restart-button` pins. Mobile topbar work must be
   height-neutral or smaller.
7. **`.lb-name` participates in `InputManager`'s focus exemption and blurs on
   submit** — don't wrap it in a focusable or change its element type.
8. **Chromium logs failed HTTP as console errors** — any new spec that exercises
   panel error states must not assert console cleanliness (existing convention).

**Must-not-change (consolidated):** canvas rendering and all in-canvas colors/
text; `.game-root` client-box geometry, `overflow: hidden`, `touch-action:
none`, z-order (canvas < scanline 2 < panel/touch 3); `--bg` hexes + theme meta

- storage keys/values; the reduced-motion global block; the Playwright
  `colorScheme: 'dark'` pin; all class names/data attributes/aria labels; all
  pinned copy; blur-on-activate; lazy Phaser boot on home; flag-off leaderboard
  zero-footprint; system-font-only typography; every test assertion.

---

## 15. Phase mapping (implementation order)

| Phase | Scope (files)                                                                                                  | Verification                                                                  |
| ----- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| 1     | `src/style.css` tokens + base shell (bg, panels, topbar, buttons, bezel)                                       | shell/home/smoke both projects → full validate                                |
| 2     | `style.css` home blocks (+ optional footer `<p>` in `HomeScreen.ts`)                                           | home/shell/smoke both projects → full validate                                |
| 3     | `style.css` game-mode blocks, touch controls; `GameSelector.ts` mini-emblems; `CaseStudyPanel.ts` copy refresh | shell/switching/games/smoke → full validate                                   |
| 4     | `style.css` lb blocks (+ optional tone micro-tweak in `LeaderboardPanel.ts`)                                   | leaderboard both projects, shell no-scroll, smoke → full validate             |
| 5     | `style.css` motion layer                                                                                       | full validate + `--repeat-each=2` flake sweep on home/shell/leaderboard/smoke |
| 6     | docs + screenshots + final sweeps                                                                              | fresh full validate + evidence                                                |
