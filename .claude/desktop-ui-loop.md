# Pocket Arcade Desktop UI Loop

You are running a laptop/desktop UI perfection pass. Read `UI_DESKTOP_AUDIT.md` first — it holds the ranked findings, acceptance criteria, protected-hooks list, and hard rules; this file is the execution procedure. Also obey `CLAUDE.md` (zero assets, import boundary, pixel-signature contract, RNG discipline).

**Scope guard:** shell/DOM/CSS only. No gameplay changes, no `*Logic.ts` edits, no scene `draw()` edits except HUD/presentation consistency (and re-run `tests/switching.spec.ts` if a scene file is touched). Mobile is out of scope but must not regress — desktop-scope CSS via `@media (min-width: 900px)` and re-run the mobile-project specs after every shell change.

## Per-iteration procedure

1. **Orient:** `git status`, `git log --oneline -5`, read `NEXT_RUN.md` for the current phase pointer. If the repo is red, fixing it is the slice.
2. **Inspect before editing:** read the exact files the slice touches and the specs that assert them (protected hooks are listed in `UI_DESKTOP_AUDIT.md` §7–8).
3. **Smallest coherent change** for the current phase (below). One concern per slice.
4. **Verify:** targeted spec first → `tests/shell.spec.ts` + `tests/smoke.spec.ts` on BOTH projects → full `npm run validate` when `src/style.css`, `src/ui/*`, `src/main.ts`, or `index.html` changed (shared layout).
5. **Screenshot** at 1440×900 and 1280×800 for visually-scoped slices (temporary spec, scratchpad output, view and judge against acceptance criteria, delete spec).
6. **Commit only if green**; descriptive message; never leave the repo red without documenting the failing command + suspicion in `NEXT_RUN.md`.
7. **Update `NEXT_RUN.md`:** what changed, validation results, phase status, next task.

## Phases (strict order)

### Phase 1 — Desktop layout & visual hierarchy

- Hide `.touch-controls` at ≥900px (mobile untouched); remove the stray d-pad from desktop.
- Eliminate desktop page scroll at 1280×800 through 1512×982: fix the stage grid rows and replace the stale `100vh - 150px` chrome estimates in `.game-root` sizing with math derived from actual chrome height; center the canvas vertically in its column.
- One brand heading: sidebar `h2` becomes a list label ("Games"); valid heading order.
- **Add new desktop e2e assertions** (`tests/shell.spec.ts`): d-pad hidden, `scrollHeight <= innerHeight` at two viewports, single brand heading. These are the phase's regression tests — add them in the same slice as the fix and confirm they fail against the pre-fix CSS (stash trick).

### Phase 2 — Game selector, cards, high scores

- Card hierarchy: title > subtitle > score via size/weight/spacing; consistent height behavior (reserve two subtitle lines or tighten copy); `font-variant-numeric: tabular-nums` on `.card-high`.
- Hover state (border + subtle glow/translate, transition 150–300ms ease-out, transform/color only), pressed state, and a stronger selected/"now playing" treatment.
- Keep `.game-card`, `data-game-id`, `.card-high` hooks and accessible names intact (highscore + switching specs).

### Phase 3 — Instructions, help, readability

- Rewrite `CaseStudyPanel.ts` content: accurate game/tech story (auto-runner Bounce Circuit, hazards, pixel-signature testing, bundle split), structured for scanning (short labeled sections or list), balanced column at 900p.
- Consider a compact per-game "how to play" block near the stage fed from the registry `controls` strings — the `.controls-hint` element and its exact texts are spec-asserted; extend, don't rename.

### Phase 4 — Cabinet identity, spacing, background, transitions

- Global interaction transitions (cards, Restart, select) with `prefers-reduced-motion` compatibility.
- Typographic identity within system fonts: h1 treatment (weight/spacing/case), eyebrow refinement, `text-wrap: balance` on headings.
- Stage framing: bezel emphasis, background depth behind the columns, consistent spacing rhythm (4/8px scale audit of paddings/gaps).
- Chrome details: `meta description` + `theme-color` in `index.html`, dark scrollbar styling, cursor states.

### Phase 5 — Keyboard, focus, accessibility, no-overlap polish

- Full keyboard pass: tab order, focus-visible on every interactive element, Space on a focused card must not double-fire game input (verify against `InputManager`'s preventDefault).
- Verify no overlap/clipping at all four viewports; reduced-motion run (emulate, play, zero console errors — pattern exists in `tests/games.spec.ts`).
- Fold any remaining acceptance-criteria gaps into assertions where cheap.

### Phase 6 — Screenshot verification & full validation

- Regenerate the audit screenshot set (1440×900, 1280×800, 1512×982, 1366×768, focus state), compare against `UI_DESKTOP_AUDIT.md` acceptance criteria one by one.
- `npm run validate` plus `--repeat-each=2` on `tests/shell.spec.ts` and `tests/switching.spec.ts`.

### Phase 7 — Docs & close

- Update `README.md` (shell description), `UI_DESKTOP_AUDIT.md` (mark criteria met/unmet honestly), `NEXT_RUN.md` (final state, commits, remaining ideas, merge recommendation).
- Stop the loop.

## Stop conditions

Goal met (acceptance criteria pass and validation green), a blocking decision needs the user (e.g., a copy rewrite they should approve), or any change would require weakening a protected test — stop and report instead.
