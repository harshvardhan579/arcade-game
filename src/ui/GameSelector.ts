import type { HighScoreEventDetail } from '../core/ScoreManager';
import { SafeStorage } from '../core/Storage';
import type { GameDefinition } from '../core/types';

function formatHigh(score: number): string {
  return score > 0 ? `High ${score}` : 'High —';
}

export function createGameSelector(games: readonly GameDefinition[]): HTMLElement {
  const storage = new SafeStorage();
  const wrap = document.createElement('section');
  wrap.className = 'panel selector';
  wrap.setAttribute('aria-label', 'Game selector');
  const title = document.createElement('h2');
  title.textContent = 'Pocket Arcade';
  wrap.append(title);

  for (const game of games) {
    const button = document.createElement('button');
    button.className = 'game-card';
    button.type = 'button';
    button.dataset.gameId = game.id;
    const high = storage.getNumber(`pocket-arcade:${game.id}:high`, 0);
    button.innerHTML = `<strong>${game.title}</strong><span>${game.subtitle}</span><small class="card-high">${formatHigh(high)}</small>`;
    button.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('arcade-select-game', { detail: game.id }));
    });
    wrap.append(button);
  }

  window.addEventListener('arcade-high-score', (event) => {
    const detail = (event as CustomEvent<HighScoreEventDetail>).detail;
    const card = wrap.querySelector<HTMLElement>(
      `.game-card[data-game-id="${detail.gameId}"] .card-high`
    );
    if (card) card.textContent = formatHigh(detail.score);
  });

  return wrap;
}

export function createMobileGameSelect(games: readonly GameDefinition[]): HTMLLabelElement {
  const label = document.createElement('label');
  label.className = 'mobile-game-picker';
  label.textContent = 'Game';

  const select = document.createElement('select');
  select.setAttribute('aria-label', 'Choose game');
  select.className = 'mobile-game-select';
  for (const game of games) {
    const option = document.createElement('option');
    option.value = game.id;
    option.textContent = game.title;
    select.append(option);
  }
  select.addEventListener('change', () => {
    window.dispatchEvent(new CustomEvent('arcade-select-game', { detail: select.value }));
  });

  label.append(select);
  return label;
}

export function markSelectedGame(id: string): void {
  document.querySelectorAll<HTMLButtonElement>('.game-card').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.gameId === id);
  });
  document.querySelectorAll<HTMLSelectElement>('.mobile-game-select').forEach((select) => {
    select.value = id;
  });
}
