import type { HighScoreEventDetail } from '../core/ScoreManager';
import { SafeStorage } from '../core/Storage';
import type { GameDefinition } from '../core/types';
import { formatHigh } from './GameSelector';
import { createThemeToggle } from './ThemeToggle';

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
        <small class="home-card-high">${formatHigh(high)}</small>
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
    const high = grid.querySelector<HTMLElement>(
      `.home-card[data-game-id="${detail.gameId}"] .home-card-high`
    );
    if (high) high.textContent = formatHigh(detail.score);
  });

  home.append(header, grid);
  return home;
}
