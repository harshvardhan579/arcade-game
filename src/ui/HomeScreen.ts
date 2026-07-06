import type { GameDefinition } from '../core/types';
import { createThemeToggle } from './ThemeToggle';

/**
 * The home hub: the boot surface with one selectable card per game. Cards
 * dispatch the same `arcade-select-game` event the sidebar and picker use.
 * Emblems, hooks, and live high scores land in the home-cards phase; this
 * module owns the structure.
 */
export function createHomeScreen(games: readonly GameDefinition[]): HTMLElement {
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
    card.innerHTML = `<strong>${game.title}</strong><span>${game.subtitle}</span>`;
    card.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('arcade-select-game', { detail: game.id }));
      // Like every shell control: release focus so gameplay keys flow.
      card.blur();
    });
    grid.append(card);
  }

  home.append(header, grid);
  return home;
}
