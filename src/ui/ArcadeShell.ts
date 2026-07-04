import type { GameDefinition } from '../core/types';
import { createCaseStudyPanel } from './CaseStudyPanel';
import { createGameSelector, createMobileGameSelect } from './GameSelector';
import { createTouchControls } from './TouchControls';

export function createArcadeShell(
  root: HTMLElement,
  games: readonly GameDefinition[]
): HTMLElement {
  root.innerHTML = '';
  const shell = document.createElement('main');
  shell.className = 'arcade-shell';

  const stage = document.createElement('section');
  stage.className = 'stage';
  stage.innerHTML = `
    <header class="topbar">
      <div>
        <p class="eyebrow">Zero-Asset HTML5 Retro Arcade</p>
        <h1>Pocket Arcade</h1>
      </div>
      <div class="topbar-actions">
        <button class="restart-button" type="button">Restart</button>
      </div>
    </header>
    <div id="game-root" class="game-root" aria-label="Game canvas"></div>
  `;
  stage.querySelector('.topbar-actions')?.prepend(createMobileGameSelect(games));
  stage.append(createTouchControls());
  stage.querySelector('.restart-button')?.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('arcade-restart'));
  });

  shell.append(createGameSelector(games), stage, createCaseStudyPanel());
  root.append(shell);
  return stage.querySelector<HTMLElement>('#game-root')!;
}
