import { leaderboardService } from '../core/LeaderboardService';
import type { HighScoreEventDetail } from '../core/ScoreManager';
import { SafeStorage } from '../core/Storage';
import type { GameDefinition } from '../core/types';
import { isGameId } from '../leaderboard/types';
import type { TopsByGame } from '../leaderboard/types';
import { formatHigh } from './GameSelector';
import { createThemeToggle } from './ThemeToggle';

declare global {
  interface Window {
    // Test-only override of the home tops refetch throttle (ms), mirroring the
    // __ARCADE_FIXED_SEEDS__ / __ARCADE_LB_FORCE__ hooks. Never set by app code.
    __ARCADE_LB_TOPS_TTL__?: number;
  }
}

// A global best line reflects the whole world; it is fine for it to lag, so
// one refetch per minute is plenty and keeps returning Back to home cheap.
const TOPS_DEFAULT_TTL_MS = 60_000;

/** One-line hooks are hub copy, not game data — they live here. */
const hooks: Record<string, string> = {
  'neon-serpent': 'Eat, speed up, never bite your tail.',
  'bounce-circuit': 'One tap to jump — one more mid-air.',
  'star-courier': 'Glide, line up, shoot the swarm.',
  'lane-rush': 'Thread the traffic. Double-tap to boost.',
  'circuit-stack': 'Stack clean, clear lines, level up.'
};

/**
 * The home hub: the boot surface with one selectable card per game. Cards
 * dispatch the same `arcade-select-game` event the sidebar and picker use.
 * Emblems are pure CSS (`.home-logo--<id>`); highs mirror the sidebar cards
 * via the same `arcade-high-score` subscription.
 */
export function createHomeScreen(games: readonly GameDefinition[]): HTMLElement {
  const storage = new SafeStorage();
  const home = document.createElement('section');
  home.className = 'home-screen';
  home.setAttribute('aria-label', 'Game hub');

  const header = document.createElement('header');
  header.className = 'home-header';
  const heading = document.createElement('div');
  heading.innerHTML = `
    <h1>Pocket Arcade</h1>
    <p class="home-tagline">Five zero-asset neon arcade games. Pick one.</p>
  `;
  header.append(heading, createThemeToggle());

  const grid = document.createElement('div');
  grid.className = 'home-grid';
  for (const game of games) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'home-card';
    card.dataset.gameId = game.id;
    const high = storage.getNumber(`pocket-arcade:${game.id}:high`, 0);
    card.innerHTML = `
      <span class="home-logo home-logo--${game.id}" aria-hidden="true"></span>
      <span class="home-card-body">
        <strong>${game.title}</strong>
        <span class="home-card-sub">${game.subtitle}</span>
        <span class="home-card-hook">${hooks[game.id] ?? ''}</span>
        <small class="home-card-high"><span class="hs-local">${formatHigh(
          high
        )}</span><span class="hs-world"></span></small>
      </span>
    `;
    card.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('arcade-select-game', { detail: game.id }));
      // Like every shell control: release focus so gameplay keys flow.
      card.blur();
    });
    grid.append(card);
  }

  window.addEventListener('arcade-high-score', (event) => {
    const detail = (event as CustomEvent<HighScoreEventDetail>).detail;
    // Only the local half of the high line; the World fragment is independent.
    const local = grid.querySelector<HTMLElement>(
      `.home-card[data-game-id="${detail.gameId}"] .hs-local`
    );
    if (local) local.textContent = formatHigh(detail.score);
  });

  // --- Global "World" best fragments (Phase 5) ---------------------------
  // One `game=all` fetch per home visit, throttled so returning Back does not
  // spam the API. Failure is silent (no fragment, no console output). Rendered
  // via textContent only. Flag-off short-circuits before any network.
  let lastTopsFetchAt = 0;
  const topsTtlMs = (): number => {
    const override = window.__ARCADE_LB_TOPS_TTL__;
    return typeof override === 'number' && override >= 0 ? override : TOPS_DEFAULT_TTL_MS;
  };

  const applyTops = (tops: TopsByGame): void => {
    for (const game of games) {
      if (!isGameId(game.id)) continue;
      const world = grid.querySelector<HTMLElement>(
        `.home-card[data-game-id="${game.id}"] .hs-world`
      );
      if (!world) continue;
      const entry = tops[game.id];
      // textContent: the score is server data; keep it out of the parser.
      world.textContent = entry ? ` · World ${entry.score.toLocaleString('en-US')}` : '';
    }
  };

  const refreshWorldScores = async (): Promise<void> => {
    if (!leaderboardService.isEnabled()) return;
    // Only fetch while the home hub is actually on screen.
    if (document.querySelector('.arcade-shell')?.getAttribute('data-mode') !== 'home') return;
    const now = Date.now();
    if (now - lastTopsFetchAt < topsTtlMs()) return;
    lastTopsFetchAt = now; // Claim the window before awaiting (blocks spam).
    const result = await leaderboardService.fetchTops();
    if (result.ok) applyTops(result.data);
  };

  // Defer past the current turn so main.ts has set the shell mode (and, on
  // Back, so main.ts's arcade-go-home handler has switched to home first).
  const scheduleRefresh = (): void => {
    requestAnimationFrame(() => void refreshWorldScores());
  };
  scheduleRefresh();
  window.addEventListener('arcade-go-home', scheduleRefresh);

  home.append(header, grid);
  return home;
}
