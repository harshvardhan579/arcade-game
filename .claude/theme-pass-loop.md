# Pocket Arcade — Theme Pass Loop (pass 1)

You are executing a focused theming pass on branch `theme-pass-1` (branched from `main`
after the gameplay/replayability pass merged in `8b9bf8a`). Read `CLAUDE.md` first and
obey every hard rule there. `CURRENT_APP_STATE.md` is the ground-truth system map.

**Mission:** a polished dark/light theme system for the **application shell/UI only**.
Dark stays the primary retro-neon arcade identity (visually identical or near-identical
to today). Light is a clean "daylight cabinet": bright shell chrome around game canvases
that **stay dark/neon** for readability and pixel-signature stability.

## Execution contract

- **One phase per invocation.** Orient (git status, `NEXT_RUN.md`), execute the next
  incomplete phase, verify, commit if green, update `NEXT_RUN.md`, **stop with a
  summary**. Phases run in strict order 0 → 5.
- For every phase: inspect before editing → smallest coherent change → targeted tests →
  affected Playwright specs (both projects for any shared CSS/shell change) → full
  `npm run validate` when `src/style.css`, `src/ui/*`, `src/core/*`, `index.html`, or
  `playwright.config.ts` change → commit only if green → update `NEXT_RUN.md` → stop.
- Phase 0 is analysis + design only; it may stop the pass if implementation risk is
  unclear. Never leave the repo red without documenting the exact failure.

## Ground truth and guardrails (verified against the current source, 2026-07-06)

1. **Pixel signatures are canvas-only — shell theming cannot break them.** The
   switching spec reads the canvas via `getImageData`; DOM/CSS never appears there. The
   in-canvas world (Phaser config `backgroundColor '#071114'`, `BaseGameScene`'s clear
   fill `0x071114`, HUD `#d8fff9`, overlay text, all scene palettes) is **out of scope**
   and keeps the games readable on their own terms in both themes. If any in-canvas
   color must change for integration, it is a deliberate exception: minimal, argued in
   `NEXT_RUN.md`, and `tests/switching.spec.ts` + the shell game-over canvas-pixel test
   re-run in the same slice.
2. **Token inventory:** `:root` already defines `--bg/--panel/--line/--text/--muted/
--cyan/--pink/--red/--yellow` — but ~33 additional color literals are scattered
   through `src/style.css` (body gradients `#081418/#05090b`, card fills `#0a181d/
#183942/#0c222a`, select/touch-button `#102a31/#2b636e/#16414c`, ACTION pressed
   `#ff7ce2`, restart text `#081418`, `.game-root` `#071114` + rgba glows, scanline
   rgba, scrollbar `#1f4a53`, focus yellow, and every rgba(77,255,225,…) glow). Phase 1
   promotes these to tokens **with today's values** so dark stays pixel-identical.
3. **Computed-style pins that theme CSS must not disturb:**
   - `touch-action` pins (mobile zoom regression): `html/body` = `manipulation`,
     `.game-root`/`.touch-controls` = `none`, Restart/picker = `manipulation`. Never set
     `touch-action` in theme blocks.
   - Focus ring pin (desktop keyboard test): `outline: 2px solid` on focus-visible —
     the **color** may become a token, width/style stay `2px solid`.
   - `.arcade-shell` `min-height: 0` pins, no-scroll/no-overlap geometry at all pinned
     viewports — theming must not change layout properties (colors/shadows only).
4. **Protected hooks (never rename/remove):** `.touch-controls`, `[data-arcade-input]`,
   `.mobile-game-select`, `Choose game` aria-label, `.controls-hint` + exact hint
   strings, `.game-card`, `.card-high`, `#game-root canvas`, Restart's accessible name,
   single `h1`, `.eyebrow` (asserted hidden on mobile).
5. **Tab-order pin:** the desktop keyboard test asserts Tab order = five cards then
   `restart-button` at position 6. The theme toggle must sit **after Restart in DOM
   order** (or that assertion is updated deliberately in the same slice — prefer the
   DOM placement).
6. **`SafeStorage` is numbers-only** (`getNumber`/`setNumber`). Persistence needs a
   string API — extend `src/core/Storage.ts` with `getString`/`setString` using the
   same try/catch best-effort discipline (private browsing must not crash; there is a
   feasible vitest for the pure fallback path only if it avoids `window` — otherwise
   cover via e2e).
7. **Playwright's default `colorScheme` is `light`.** The moment first-load honors
   `prefers-color-scheme`, every existing e2e silently runs the light theme. In the
   same slice that adds system-preference behavior (Phase 3): set
   `colorScheme: 'dark'` in the shared `use` block of `playwright.config.ts` (the
   primary identity stays the tested baseline) **and** add explicit theme tests that
   use `page.emulateMedia({ colorScheme: … })` for both directions. Canvas signatures
   and layout geometry are theme-independent, but decide this explicitly — never let
   the suite's theme flip as a side effect.
8. **FOUC prevention (Phase 3):** a tiny **inline** script in `index.html`'s `<head>`
   (zero-asset, Vite-preserved, static/Vercel-safe) resolves stored choice →
   else `matchMedia('(prefers-color-scheme: light)')` → sets `data-theme` on
   `<html>` before first paint. CSS strategy: `:root` carries dark tokens (default
   identity), `[data-theme='light']` overrides them; also set the CSS `color-scheme`
   property per theme so the native `<select>` picker popup renders correctly.
9. **Light-theme design constraints:** the `.game-root` cabinet bezel + scanline chrome
   stays **dark around the dark canvas** (a dark screen in a daylight cabinet is the
   honest arcade look); shell text must hold ~4.5:1 contrast (muted text included —
   don't make light unreadable to be "bright"); cyan/pink accents need darkened
   text-safe variants on light backgrounds; keep the yellow focus ring visible on both.
10. **Theme state lives in `src/ui`/`src/core` only** (window/matchMedia are fine
    there — never in `*Logic.ts`; the import boundary also bans the literal word
    "window" in `src/**/*.test.ts`). No Phaser scene involvement; games don't listen to
    theme changes.
11. **Reduced motion:** the global reduced-motion rule zeroes transitions — any theme
    color transition must remain compatible (transition colors only, never layout).
12. **`theme-color` meta** is `#071114`; Phase 4 may update it per theme via the toggle
    (cheap polish, keeps the browser chrome matching).
13. **Zero assets** stands: toggle is text/CSS only (e.g. "◐" glyph or DARK/LIGHT
    label — system glyphs, no SVG/icon font). No new dependencies.
14. **Never weaken a test.** New assertions are added; a changed assertion means the
    slice deliberately changed the asserted behavior and the commit message says so.

---

## Phase 0 — Theme audit and design decision (analysis only)

- Inventory every color literal in `src/style.css` (the ~33 beyond the tokens) and in
  `index.html` (`theme-color`); classify each: **tokenize** (shell), **keep literal**
  (canvas-adjacent chrome that stays dark in both themes — decide explicitly for the
  `.game-root` bezel/scanlines/vignette), or **out of scope** (everything drawn inside
  the canvas).
- Confirm the protected-hook and computed-style-pin lists above against the current
  specs (they move; re-grep).
- Design both palettes concretely (hex values, in a table): dark = current values
  verbatim; light = bright cabinet (bg/panel/line/text/muted + accent variants with
  contrast ratios noted). Decide the toggle's placement (topbar-actions, after
  Restart), its glyph/label, and its accessible-name pattern (e.g. `aria-pressed` +
  stable name, or a name that states the action).
- Decide scope explicitly: themed = shell background/gradients, panels, cards, topbar,
  buttons, select, picker label, touch controls, scrollbars, focus ring color, haze;
  not themed = canvas content, cabinet bezel/scanlines (dark in both), all gameplay,
  all audio.
- Write the full plan into `NEXT_RUN.md` (palette table, token map, file-by-file
  touch list, test impact). **Stop after the audit** — implementation starts Phase 1
  on explicit continuation; stop the pass entirely if any risk is unclear and say why.

## Phase 1 — CSS variable theme foundation

- Promote the scattered literals to CSS custom properties in `:root` **using today's
  exact values** — the dark theme must render visually identical (verify with before/
  after screenshots at 1440×900 and 390×844; a pixel-diff eyeball is enough, note it).
- Add `[data-theme='light']` token overrides implementing the Phase 0 palette; set
  `color-scheme` per theme. No toggle yet — flip `data-theme` by hand in DevTools/e2e
  for verification. Default (no attribute) must equal dark.
- Do not touch Phaser scenes, `BaseGameScene`, or any `*Logic.ts`. Do not change any
  layout property, `touch-action`, or focus-ring width/style.
- Run `shell + smoke` both projects; full `npm run validate` (shared CSS changed).

## Phase 2 — Theme toggle UI

- A small, polished toggle in `.topbar-actions`, **after Restart in DOM** (tab-order
  pin), text/CSS only, ≥44 px on touch layouts (mobile + coarse-landscape blocks),
  keyboard accessible with a clear accessible name, visible pressed/hover/focus states
  in both themes, quiet enough not to compete with the picker/Restart hierarchy the
  mobile pass established.
- Wire it to set `data-theme` on `<html>` (a small `src/ui/ThemeToggle.ts` or an
  `ArcadeShell` addition; keep the module seam clean for Phase 3 persistence).
- Tests (`tests/shell.spec.ts`): click toggles `data-theme` and back; keyboard
  activation (Tab to it + Enter/Space) toggles; accessible name present; desktop
  tab-order test still green unmodified; mobile: toggle visible + ≥44 px + does not
  break no-overlap/no-scroll pins.
- Both projects green; full validate (shell changed).

## Phase 3 — Persistence and system preference

- Extend `SafeStorage` with `getString`/`setString` (try/catch, best-effort). Persist
  the choice under a `pocket-arcade:theme` key; clear-key hygiene in specs that assert
  defaults (mirror `highscore.spec.ts`'s `pocket-arcade:*` cleanup).
- First load: stored choice wins; else `prefers-color-scheme`; resolve **early** via
  the inline `<head>` script (guardrail 8) so there is no flash. The toggle updates
  storage and the attribute together.
- **Same slice:** set `colorScheme: 'dark'` in `playwright.config.ts` shared `use`
  (guardrail 7) and re-run the full suite — this pins the existing baseline to the
  primary identity before system-preference behavior can flip it.
- Tests: system default honored (`emulateMedia({ colorScheme: 'light' })` + cleared
  storage → light; dark → dark); manual override persists across reload and beats the
  system preference; storage-unavailable path doesn't crash if cheaply testable
  (init-script that breaks `localStorage.getItem` → app still boots dark).
- Full validate.

## Phase 4 — Desktop/mobile polish (both themes)

- Screenshot both themes at 1440×900, 1280×800, 1512×982, 1366×768 (desktop) and
  375×667, 390×844, 412×915, 430×932 + the pinned landscape sizes 667×375, 844×390,
  932×430 (mobile project) — reuse the scratchpad screenshot-script pattern from the
  Lane Rush pass. Eyeball against the Phase 0 palette: contrast, card/panel hierarchy,
  picker/Restart/toggle legibility, touch-control visibility and pressed states,
  game-over overlay readability over the dark canvas in a light shell, no accidental
  scroll/overlap in either theme.
- Fix only what the review finds (colors/shadows only; geometry is pinned).
- Cheap assertions where useful: e.g. light-theme mobile run of the no-overlap pins
  (a `beforeEach` emulateMedia variant or one looped spec), `theme-color` meta update
  per theme if implemented.
- Full validate + re-run `switching.spec.ts` explicitly if anything near the stage
  changed (it should not — canvas untouched).

## Phase 5 — Validation, docs, close-out

- Fresh full `npm run validate`.
- Flake pass: theme/storage state is new global state — run `shell + smoke` (both
  projects) with `--repeat-each=2`; add `games` if any spec now touches theme state.
- Docs: `README.md` gains a short Theme section (dark primary, light cabinet, system
  preference + persistence, zero-asset toggle); refresh `CURRENT_APP_STATE.md` (shell
  section, test counts) and `CLAUDE.md` only where now stale (protected hooks list
  gains the toggle; note the Playwright `colorScheme: 'dark'` baseline decision).
- Overwrite `NEXT_RUN.md`: final state, commit table, validation results, manual QA
  checklist (real phone: toggle reachable with a thumb, both themes readable outdoors
  metaphorically — brightness/contrast, iOS select popup matches theme via
  `color-scheme`, no flash on reload, theme survives app switch), remaining ideas,
  merge recommendation.
- Stop with a final summary and the exact push/PR commands.

## NEXT_RUN.md protocol (every phase)

Overwrite, keep short: phase status table (0–5), what changed, exact commands run +
results (output snippets on failure), any deliberately updated pins (old → new, why),
screenshot/artifact paths, and the next task specific enough to start cold. Never leave
the repo red without documenting the failing commands and suspected cause; revert the
slice instead.
