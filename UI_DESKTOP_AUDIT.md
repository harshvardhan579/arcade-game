# Pocket Arcade — Desktop UI Audit

Audited 2026-07-05 on branch `fable-playtest-fixes-1` (all gameplay phases complete, validation green). Scope: laptop/desktop shell UI only — layout, selector, cards, instructions, high scores, hierarchy, focus/hover, cabinet identity. Viewports inspected via live screenshots: 1440×900, 1280×800, 1512×982, 1366×768, plus a keyboard-focus state. Frameworks applied: UI/UX Pro Max priority checklist, Bencium design critique (hierarchy/spacing/typographic scale), Vercel Web Interface Guidelines.

## 1. Current desktop UI problems, ranked by severity

### P0 — broken on every laptop viewport

1. **The mobile d-pad renders on desktop.** `.touch-controls` is created unconditionally in `ArcadeShell` and only ever _styled_ by the mobile media query — nothing hides it at ≥900px. At all four audited viewports a clipped "↑" button pokes above the fold below the canvas. It is dead UI on desktop (keyboard is the input) and the single loudest "unfinished" signal.
2. **Desktop page scrolls vertically.** The stage grid (`auto minmax(420px, 1fr) auto`) stacks topbar + canvas + touch controls; with the d-pad present and `.game-root`'s size math using a stale `100vh - 150px` estimate of the chrome, total height exceeds the viewport at 1440×900, 1366×768, 1280×800, and 1512×982. A polished cabinet fills the screen exactly; today the fold cuts a button in half.
3. **Case-study panel content is factually wrong.** `CaseStudyPanel.ts` still says "Bounce Circuit uses a compact single-screen portrait layout" (it is an auto-runner since `1e3001c`) and undersells the test suite as "Playwright smoke tests." This panel is the portfolio pitch — stale copy here undermines the whole artifact.

### P1 — amateur signals

4. **The brand name appears twice, adjacent.** Sidebar `<h2>Pocket Arcade</h2>` sits ~20px from the topbar `<h1>Pocket Arcade</h1>`. The sidebar heading should label the list ("Games" or similar), leaving one brand instance. Related a11y nit: the `h2` precedes the `h1` in DOM order.
5. **Zero transitions anywhere.** No `transition` rule exists in `style.css`; card hover borders, the Restart hover, and focus rings all snap at 0ms. Guideline floor is 150–300ms ease-out on interactive state changes.
6. **The right panel has no internal hierarchy.** Four undifferentiated paragraphs, no headings/labels/list structure, trailing into a large empty region at 900p. It reads as filler text pasted into a box.
7. **Cards are flat data, not arcade cards.** Title/subtitle/high-score stack with near-identical visual weight; the two-line Star Courier subtitle makes card heights ragged; the active state (left bar + border) is good but there is no hover lift/glow and no "now playing" affordance beyond the border.
8. **Stage vertical composition is unbalanced.** The canvas top-aligns under the topbar and leaves uneven dead space below (before the stray d-pad); the `--game-aspect`/max-height math doesn't center the cabinet screen in the available column.
9. **Typography carries no identity.** The `h1` is default bold Inter/system; the eyebrow's letter-spacing is the only typographic gesture. Constraint: webfonts are banned (zero-asset rule — the UI/UX Pro Max suggestion of Press Start 2P is explicitly inapplicable), so identity must come from weight/size/spacing/case/color treatment of system fonts.

### P2 — polish gaps

10. `index.html` has no `meta name="description"` or `theme-color`; the tab strip shows the default color on dark-themed browsers.
11. Scrollbars are default bright chrome when any overflow occurs on dark panels (visible if the selector column ever scrolls).
12. Score numerals in cards (`High 777`) are proportional; `font-variant-numeric: tabular-nums` prevents jitter when values update live.
13. The Restart button is the sole topbar action and reads slightly detached; hover exists (brightness) but no active/pressed transition pairing with the new card states.

## 2. What makes the app still feel amateur or unfinished

- A clipped mobile control floating below the games (P0-1) — the definitive tell.
- The page scrolls a few dozen pixels for no reason (P0-2); arcade cabinets don't scroll.
- Saying its own name twice in the top-left corner (P1-4).
- Instant state snaps everywhere — nothing eases (P1-5).
- A wall of stale marketing text in the right column (P0-3, P1-6).
- Everything is competent but nothing is composed: the three columns don't share a vertical rhythm, and the canvas floats rather than being framed as the centerpiece.

## 3. What should NOT be changed (already working)

- **The three-column layout concept** (selector / stage / case study) — it is the portfolio story; refine, don't restructure.
- **The `.game-root` cabinet treatment** — cyan bezel glow, inner vignette, CSS scanline `::after`. This is the strongest identity element in the shell. (Note: it is DOM, not canvas — the pixel-signature tests read the canvas via `getImageData`, so the overlay is safe to tune, but it doesn't need tuning.)
- **Focus-visible states** — the yellow ring on cards/Restart/select works and was screenshot-verified; extend, never remove.
- **Card high scores + live `arcade-high-score` updates** and the `High —` empty state.
- **Controls-hint line** under the title (content and element are test-asserted).
- **The dark palette** (`--bg/--panel/--cyan/--pink/--red/--yellow/--muted`) — it matches the in-canvas game language (cyan = player, warm = hazard, amber = score). The UI/UX Pro Max palette suggestion (red/blue/green) must be ignored; consistency with the canvases wins.
- **In-canvas HUD** (`Score X High Y …`) — consistent across games since the hudExtra work; only touch if a slice needs HUD/shell font harmony.
- **Mobile layout** — out of scope; every change must be desktop-scoped (`@media (min-width: 900px)`) or verified against the mobile specs.

## 4. Acceptance criteria for a polished laptop UI

1. **No vertical or horizontal page scroll** at 1280×800, 1366×768, 1440×900, and 1512×982 with any game selected (`document.scrollingElement.scrollHeight <= window.innerHeight`, e2e-asserted).
2. **No touch controls visible on desktop** (`.touch-controls` hidden ≥900px, e2e-asserted); mobile behavior unchanged (existing mobile specs still green).
3. **Exactly one "Pocket Arcade"** on screen; heading order is valid (h1 before h2s or aria-labelled sections); the sidebar is labeled as the game list.
4. **Every interactive element** (cards, Restart, future controls) has distinct hover, active, and focus-visible states with 150–300ms ease-out transitions on color/border/transform only (no layout-shifting properties), honoring `prefers-reduced-motion`.
5. **The canvas is the composed centerpiece:** vertically balanced in its column, bezel intact, no clipped chrome, stage chrome height math derived from real elements rather than magic constants.
6. **Case-study panel is accurate and structured:** current game descriptions, real validation story, scannable structure (short heads or list), no orphan whitespace void at 900p.
7. **Cards read as arcade cards:** consistent height behavior, clear title > subtitle > score hierarchy (size/weight/spacing, not color alone), tabular numerals for scores, a visible "selected/now playing" treatment beyond a 1px border.
8. **Chrome details:** meta description + `theme-color`, dark-styled scrollbars where overflow is possible, `text-wrap: balance` on the h1/headings, curly typography (`·` separators already fine).
9. **Full keyboard pass:** logical tab order (games → picker/restart), no focus traps, arrow keys reach the game without focus fighting (Space on a focused card must not double-trigger — verify against the existing `preventDefault` behavior).
10. **All existing suites stay green unmodified** except where a spec asserts something this pass deliberately changes (e.g., new desktop d-pad-hidden assertion is _added_; nothing is weakened).

## 5. Phase plan (see `.claude/desktop-ui-loop.md` for the executable loop)

- **Phase 1 — Layout & hierarchy:** hide d-pad on desktop, kill page scroll, fix chrome-height math, single brand heading, heading order. (Fixes P0-1, P0-2, P1-4, P1-8.)
- **Phase 2 — Selector/cards/high scores:** card hierarchy, hover/active/selected treatment, tabular numerals, height consistency. (P1-7, P2-12.)
- **Phase 3 — Instructions/case-study/readability:** rewrite CaseStudyPanel content + structure, controls-hint prominence, right-column composition. (P0-3, P1-6.)
- **Phase 4 — Cabinet identity:** transitions everywhere, typographic treatment of h1/eyebrow, stage framing/centering, background depth, scrollbars, meta tags. (P1-5, P1-9, P2-10, P2-11, P2-13.)
- **Phase 5 — Keyboard/focus/no-overlap:** full keyboard pass, focus order, no-scroll/no-overlap assertions as e2e, reduced-motion verification.
- **Phase 6 — Screenshot verification + full validation** at all four viewports; compare against this audit's captures.
- **Phase 7 — Docs/NEXT_RUN + summary.**

## 6. Screenshots

Ephemeral session captures (regenerate with the snippet below — they are not committed):

- `…/scratchpad/ui-audit/desktop-1440x900.png` — stray d-pad clipped at fold; duplicate brand; right-panel void.
- `…/scratchpad/ui-audit/desktop-1280x800.png` — same defects at the smallest common laptop size.
- `…/scratchpad/ui-audit/desktop-1512x982.png`, `…/desktop-1366x768.png` — confirm defects scale-independent.
- `…/scratchpad/ui-audit/desktop-1440-focus.png` — focus-visible ring working on the third card (keep).

Regenerate: temporary Playwright spec that sets `page.setViewportSize` per size, `goto('/')`, waits for `window.__ARCADE__`, screenshots. (The audit used exactly this; see the loop file's Phase 6.)

## 7. Test plan for UI changes

- **New desktop assertions (add to `tests/shell.spec.ts`, desktop project):** `.touch-controls` hidden at ≥900px; no page scroll (`scrollHeight <= innerHeight`) at 1440×900 and 1280×800; exactly one element with text "Pocket Arcade" in headings; heading order valid.
- **Existing specs that constrain this pass (do not break):** `tests/shell.spec.ts` (controls-hint texts, mobile picker + `toBeInViewport`), `tests/highscore.spec.ts` (`.game-card[data-game-id]`, `.card-high` text format `High 777`/`High —`), `tests/smoke.spec.ts` (`h1` text "Pocket Arcade", `.game-card` count 5, Restart button role/name), `tests/switching.spec.ts` (card accessible names contain game titles; canvas pixel signatures), `tests/audio.spec.ts` / `tests/games.spec.ts` (button names, bridge behavior).
- **Per slice:** run the narrowest affected spec first, then `tests/shell.spec.ts` + `tests/smoke.spec.ts` both projects (mobile regressions are the biggest risk of desktop-scoped CSS), then full `npm run validate` when `style.css`/`ArcadeShell.ts`/`main.ts` change (shared layout).
- **Visual:** screenshot at 1440×900 + 1280×800 after each phase; eyeball against acceptance criteria.

## 8. Hard rules to avoid breaking gameplay and tests

1. **Never touch** `src/games/*Logic.ts`, `SeededRandom` usage, or anything that consumes RNG — no gameplay changes in this pass.
2. **Canvas pixel signatures** (`tests/switching.spec.ts`) read the _canvas_ via `getImageData`; DOM/CSS changes cannot affect them — but do not modify scene `draw()` code except for HUD font/consistency, and re-run the switching spec if any scene file is touched.
3. **Do not rename/remove test-asserted hooks:** `.game-card`, `data-game-id`, `.card-high`, `.controls-hint`, `.touch-controls`, `#game-root canvas`, the Restart button's accessible name, the `Choose game` select label, card accessible names containing game titles, the `h1` "Pocket Arcade".
4. **Desktop-scope all changes** — new CSS behind `@media (min-width: 900px)` or verified mobile-safe; run the mobile project specs after every shell change.
5. **Honor `prefers-reduced-motion`** for any new transition/animation; the existing media query zeroes animation durations — keep new transitions compatible.
6. **Zero external assets** stands: no webfonts (system stacks only — the skill recommendation of Press Start 2P is rejected), no images/SVG files/icon fonts; decorative UI is CSS only.
7. **Never weaken a test.** New assertions are added; existing ones change only when the UI change they assert is the deliberate point of a slice, with the change called out in the commit message.
8. Strict TypeScript, Prettier, ESLint, and the import boundary all stay green — `npm run validate` before every commit that touches shared layout.
