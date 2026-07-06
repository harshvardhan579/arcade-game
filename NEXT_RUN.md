# NEXT_RUN — Theme Pass (branch `theme-pass-1`)

Loop: `.claude/theme-pass-loop.md` (one phase per invocation, strict order).

## Phase status

| Phase | Scope                                     | Status              |
| ----- | ----------------------------------------- | ------------------- |
| 0     | Theme audit + design decision (analysis)  | done (`84eb4f5`)    |
| 1     | CSS variable foundation, both token sets  | done (`81cfee1`)    |
| 2     | Theme toggle UI + tests                   | done (`9039eb2`)    |
| 3     | Persistence + system preference + no-FOUC | **done** (this run) |
| 4     | Desktop/mobile polish, both themes        | next                |
| 5     | Validation, docs, close-out               | pending             |

## Phase 3 (this run) — what changed

- **`src/core/Storage.ts`:** `SafeStorage` gains `getString`/`setString` with the same
  try/catch best-effort discipline as the number API. (A `Storage.test.ts` under
  `src/` cannot exist without the boundary-banned word — the storage-unavailable path
  is covered end-to-end instead, which also proves the whole app's behavior.)
- **`src/ui/ThemeToggle.ts`:** `applyTheme` now persists to `pocket-arcade:theme`
  (exported `THEME_STORAGE_KEY`). Boot-time resolution deliberately does **not** live
  here —
- **`index.html`:** an inline `<head>` script (zero-asset, survives the Vite build
  verbatim — verified in `dist/index.html`, so static/Vercel deploys keep it) resolves
  the theme before first paint: stored choice wins, else `prefers-color-scheme`, dark
  default when neither exists. No flash by construction (attribute set before CSS
  renders).
- **`playwright.config.ts` (same slice, as the plan required):** `colorScheme: 'dark'`
  pinned in shared `use` — Playwright defaults to light, and without the pin every
  existing spec would have silently flipped to the light theme the moment system
  preference took effect. The suite stays on the primary dark identity; theme tests
  emulate both directions explicitly.
- **Tests (`tests/shell.spec.ts`, +3, both projects):** system preference honored in
  both directions on first visit (fresh contexts = clean storage); a chosen theme
  survives reload **and beats an opposite system preference** (stored value asserted);
  broken storage (`localStorage` getter throws via init script) still boots dark,
  keeps the toggle working in-session, and produces zero console errors.

### Phase 3 validation

- Theme + storage tests: 9 passed / 1 intentionally skipped across both projects.
- Full `npm run validate`: build + strict tsc, 73 Vitest, lint + boundary + Prettier,
  Playwright **44 passed / 30 intentionally skipped** (+6).
- `dist/index.html` retains the inline resolver (deploy-compatibility verified).

## Phase 2 (this run) — what changed

- **`src/ui/ThemeToggle.ts` (new):** `createThemeToggle()` renders a text-glyph (◐)
  button that flips `data-theme` on `<html>`; dynamic accessible name
  ("Switch to light theme" / "Switch to dark theme") + matching `title`; blurs after
  activation like the cards/select/Restart so gameplay keys keep flowing. Exports
  `currentTheme`/`applyTheme` as the seam Phase 3 wraps with persistence.
- **`src/ui/ArcadeShell.ts`:** toggle appended to `.topbar-actions` **after Restart**
  (tab-order pin: cards ×5 → Restart at 6 → toggle at 7; the pinned test ran green
  unmodified).
- **`src/style.css`:** quiet control-token styling (base 42 px, hover accent border,
  pressed state) in both themes; added to the shared focus-visible and
  `touch-action: manipulation` groups; 44 px floors in both touch blocks; and the
  planned portrait mitigation — `.topbar-actions` becomes `grid-template-columns:
1fr auto` with the picker spanning both columns, so **Restart and the toggle share
  a row and the toggle adds zero topbar height** (canvas keeps every pixel).
- **Tests (`tests/shell.spec.ts`, +2):** toggle flips theme by click and by
  focus+Enter with the accessible name swapping (runs on both projects); mobile-only
  sizing pin — ≥44×44 px and **same-row-as-Restart** (|Δy| ≤ 1 px), which is the
  regression guard for the zero-height mitigation.
- Screenshots: dark + light topbars verified on desktop and mobile (picker full-width,
  Restart + ◐ side by side).

### Phase 2 validation

- `shell + smoke` both projects: 19 passed / 13 intentionally skipped (tab-order and
  no-overlap pins green unmodified).
- Full `npm run validate`: build + strict tsc, 73 Vitest, lint + boundary + Prettier,
  Playwright **38 passed / 30 intentionally skipped** (+3 for the new theme tests).

## Phase 1 (this run) — what changed

**`src/style.css` only; no DOM, no scenes, no logic, no tests changed.**

- All inventoried shell literals promoted to the Phase 0 token names in `:root` with
  **byte-for-byte today's values**; `color-scheme: dark` declared on `:root`;
  `:root[data-theme='light']` override block added with the Phase 0 palette +
  `color-scheme: light`. Cyan/yellow-as-text usages re-pointed to
  `--accent-text`/`--score-text`/`--focus-ring` (dark values alias `--cyan`/`--yellow`,
  so dark is unchanged); identity fills (`--cyan` Restart, card accents, `--pink`
  ACTION) untouched. The only remaining literals are the cabinet screen by design:
  `.game-root` `#071114`, vignette, scanlines (verified by grep).
- **Dark verified pixel-identical:** element screenshots (desktop topbar/selector/
  case-study; mobile topbar/touch-controls) at 1440×900 + 390×844 are **byte-identical**
  before vs after (`cmp`); full-page diffs are confined to the animating canvas (live
  seeds — different runs). `color-scheme: dark` produced zero visual change including
  the select.
- **Light sanity-checked** by flipping `data-theme` manually: daylight cabinet reads as
  designed on desktop + mobile (white cards, amber highs, teal accents, dark neon
  canvas in a light shell, legible d-pad). Polish notes deferred to Phase 4.
- No `touch-action`, no focus-ring width/style, no geometry properties touched.

### Phase 1 validation

- `shell + smoke` both projects: 16 passed / 12 intentionally skipped.
- Full `npm run validate`: build + strict tsc, 73 Vitest, ESLint + import boundary +
  Prettier, Playwright 35 passed / 29 intentionally skipped (dark default — no
  `data-theme` attribute exists yet, so every existing assertion ran unchanged).
- Screenshots (scratchpad, ephemeral): `theme-before-*` / `theme-after-*` /
  `theme-light-*`.

## Phase 0 — theme design plan (no code changed this phase)

**Risk gate: PROCEED.** Shell theming is pixel-signature-safe by construction (the
switching spec reads only the canvas, which stays dark/neon in both themes), all
computed-style pins are color-independent, and the one geometry risk found (mobile
topbar height) has a concrete mitigation below.

### Color inventory and classification (`src/style.css`, verified line-by-line)

- **Existing tokens (become the dark set verbatim):** `--bg #071114`, `--panel #0e2026`,
  `--line #1f4a53`, `--text #d8fff9`, `--muted #8fb9bd`, `--cyan #4dffe1`,
  `--pink #ff4fd8`, `--red #ff7557`, `--yellow #ffd166`.
- **Literals to promote to new tokens (~30):** body gradient pair `#081418/#05090b` +
  radial cyan glow `rgba(77,255,225,.12)`; panel fill `rgba(14,32,38,.88)`; h1
  text-shadow glow; card `#0a181d` / border `#183942` / hover `#0c222a` + cyan
  glow shadows (.10/.16/.22 alphas); control (select + touch buttons) `#102a31` /
  border `#2b636e` / pressed `#16414c` + pressed glow; ACTION pressed `#ff7ce2` +
  pink glow; restart dark text `#081418` + hover glow `.35`; quiet-restart fill
  `rgba(77,255,225,.08)` (appears twice: mobile + coarse-landscape blocks);
  scrollbar `#1f4a53` (×2); focus outline `var(--yellow)` → becomes `--focus-ring`;
  stage outer glow `rgba(77,255,225,.13)`.
- **Keep literal, dark in both themes (cabinet screen):** `.game-root` background
  `#071114`, inner vignette `rgba(0,0,0,.45)`, scanline `rgba(2,8,10,.14)` — a dark
  screen inside a daylight cabinet is the honest arcade look. Its **border** uses
  `--line` (themes) and its **outer glow** becomes `--stage-glow` (cyan in dark, a
  neutral drop shadow in light).
- **Out of scope (in-canvas, unchanged):** Phaser config `backgroundColor '#071114'`,
  `BaseGameScene` clear fill/HUD `#d8fff9`/overlay, every scene palette, `popText`
  colors, Circuit's NEXT label. No gameplay, no audio.
- **`index.html`:** `theme-color` meta `#071114` → JS-updated per theme (Phase 4
  polish); light value `#e9f1f1`.

### Palette (dark = current values verbatim; light = "daylight cabinet")

Contrast ratios computed against WCAG relative luminance; text targets ≥ 4.5:1,
non-text UI ≥ 3:1.

| Token (new name)    | Dark (today)              | Light                      | Light contrast check        |
| ------------------- | ------------------------- | -------------------------- | --------------------------- |
| `--bg`              | `#071114`                 | `#e9f1f1`                  | —                           |
| `--bg-glow`         | `rgba(77,255,225,.12)`    | `rgba(11,110,95,.07)`      | decorative                  |
| `--bg-grad-a/-b`    | `#081418` / `#05090b`     | `#f6fbfb` / `#dfe9e9`      | —                           |
| `--panel-fill`      | `rgba(14,32,38,.88)`      | `rgba(246,250,250,.92)`    | —                           |
| `--line`            | `#1f4a53`                 | `#b7ced2`                  | border, decorative          |
| `--text`            | `#d8fff9`                 | `#0b2a30`                  | **13.2:1** on `--bg` ✓      |
| `--muted`           | `#8fb9bd`                 | `#3f6169`                  | **5.9:1** on `--bg` ✓       |
| `--accent-text`     | `#4dffe1` (= `--cyan`)    | `#0b6e5f`                  | **5.4:1** on `--bg` ✓       |
| `--score-text`      | `#ffd166` (= `--yellow`)  | `#8a5a00`                  | **5.9:1** on card ✓         |
| `--focus-ring`      | `#ffd166`                 | `#b45309`                  | **4.4:1** on `--bg` ✓ (>3)  |
| `--card-bg`         | `#0a181d`                 | `#ffffff`                  | —                           |
| `--card-border`     | `#183942`                 | `#c3d7da`                  | —                           |
| `--card-hover-bg`   | `#0c222a`                 | `#eef6f6`                  | —                           |
| `--control-bg`      | `#102a31`                 | `#ffffff`                  | —                           |
| `--control-border`  | `#2b636e`                 | `#9dbfc5`                  | 3:1-ish vs bg ✓             |
| `--control-pressed` | `#16414c`                 | `#cfe2e3`                  | —                           |
| `--quiet-fill`      | `rgba(77,255,225,.08)`    | `rgba(11,110,95,.08)`      | —                           |
| `--glow-*` (alphas) | cyan `rgba(77,255,225,α)` | neutral `rgba(11,42,48,β)` | decorative shadows          |
| `--stage-glow`      | cyan `.13`                | `rgba(11,42,48,.20)`       | decorative                  |
| `--scrollbar-thumb` | `#1f4a53`                 | `#9dbfc5`                  | —                           |
| `--on-accent`       | `#081418` (both)          | `#081418`                  | **14.9:1** on cyan ✓ (both) |

Unchanged in both themes: `--cyan/--pink/--red/--yellow` as **fill/identity** colors
(Restart stays cyan with dark text — 14.9:1; ACTION stays pink with dark text —
6.6:1; ACTION pressed `#ff7ce2`). The light theme swaps cyan/yellow only where they
are **text on background** (`--accent-text`, `--score-text`); usages to re-point:
case-study labels, `Now playing`, quiet-Restart text, `.card-high`, focus ring.
Also set CSS `color-scheme: dark`/`light` per theme (native select popup).

### Mechanism

- `:root { …dark tokens… }` (default identity = dark, no attribute needed);
  `:root[data-theme='light'] { …overrides… }`. Toggle sets `data-theme` on `<html>`.
- Phase 3: inline `<head>` script (zero-asset, Vite-preserved, Vercel-safe): stored
  `pocket-arcade:theme` wins, else `prefers-color-scheme`, sets the attribute before
  first paint (no FOUC). `SafeStorage` gains `getString/setString` (same try/catch).
- **Playwright default colorScheme is `light`** — in the same Phase 3 slice, pin
  `colorScheme: 'dark'` in `playwright.config.ts` shared `use`, and add explicit
  both-direction tests via `page.emulateMedia`.

### Toggle design (Phase 2)

- `<button class="theme-toggle" type="button">◐</button>` in `.topbar-actions`,
  **after Restart in DOM** (preserves the tab-order pin: cards ×5 → Restart at 6 →
  toggle at 7). Dynamic `aria-label`: "Switch to light theme" / "Switch to dark
  theme". Text glyph only (zero-asset). Quiet styling (control-bg/border tokens) so
  picker → Restart hierarchy is untouched; hover/pressed/focus states in both themes.
- **Mobile topbar height risk + mitigation:** portrait `.topbar-actions` is a column
  (picker above Restart); naively appending a 44 px toggle steals ~52 px of canvas
  row. Mitigation: portrait block switches `.topbar-actions` to
  `grid-template-columns: 1fr auto` — picker spans both columns, Restart + toggle
  share the second row side by side. Topbar height unchanged; no-overlap/no-scroll
  pins verify. Coarse-landscape block is already a row (toggle appends); desktop flex
  row unchanged. Toggle ≥ 44 px in both touch blocks.

### Protected pins re-verified this phase (must survive untouched)

- `touch-action` computed pins (html/body `manipulation`; game-root/touch-controls
  `none`; Restart/picker `manipulation`) — theme blocks never set `touch-action`.
- Focus ring `2px solid` (color becomes `--focus-ring`; width/style pinned).
- Tab order: Restart at position 6 (toggle placed after).
- Hooks: `.touch-controls`, `[data-arcade-input]`, `.mobile-game-select`,
  `Choose game`, `.controls-hint` + exact strings, `.game-card`, `.card-high`,
  `#game-root canvas`, Restart name, single `h1`, `.eyebrow` hidden on mobile.
- All geometry pins (no-scroll ×4 desktop, no-overlap ×6 portrait, landscape ×3):
  theming changes colors/shadows only, except the deliberate topbar grid above,
  which the same pins gate.

### Test plan by phase

- P1: dark visually identical (screenshot before/after 1440×900 + 390×844);
  `shell+smoke` both projects; full validate.
- P2: toggle click + keyboard activation flip `data-theme`; accessible name;
  ≥ 44 px on mobile; tab-order spec green unmodified; no-overlap pins green.
- P3: system default honored (`emulateMedia colorScheme` both ways + cleared
  storage); manual choice persists across reload and beats system; broken-storage
  boot doesn't crash (init-script sabotage of `localStorage.getItem`); config
  `colorScheme: 'dark'` pin; full suite.
- P4: screenshots both themes at the four desktop + four portrait + three landscape
  pinned viewports; fix color-only findings; optional `theme-color` meta test.
- P5: fresh validate + `--repeat-each=2` on `shell+smoke`; docs.

## Next task (Phase 1 — start cold from the loop file)

Promote the inventoried literals to the token names above with today's exact values
(dark unchanged), add the `[data-theme='light']` override block + `color-scheme`,
verify dark is pixel-identical by screenshot, flip the attribute manually to sanity-
check light, run `shell+smoke` both projects, then full `npm run validate`.
