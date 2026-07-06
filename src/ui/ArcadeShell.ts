import type { GameDefinition } from '../core/types';
import { hasCoarsePointer } from '../core/Viewport';
import { createCaseStudyPanel } from './CaseStudyPanel';
import { createGameSelector, createMobileGameSelect } from './GameSelector';
import { createThemeToggle } from './ThemeToggle';
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
        <p class="controls-hint" aria-label="Controls"></p>
      </div>
      <div class="topbar-actions">
        <button class="restart-button" type="button">Restart</button>
      </div>
    </header>
    <div id="game-root" class="game-root" aria-label="Game canvas"></div>
  `;
  stage.querySelector('.topbar-actions')?.prepend(createMobileGameSelect(games));
  // After Restart in DOM order: the desktop keyboard spec pins Restart at
  // tab position six, so the toggle must follow it, never precede it.
  stage.querySelector('.topbar-actions')?.append(createThemeToggle());
  stage.append(createTouchControls());
  const restart = stage.querySelector<HTMLButtonElement>('.restart-button');
  restart?.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('arcade-restart'));
    restart.blur();
  });

  const hint = stage.querySelector<HTMLElement>('.controls-hint');
  const showControls = (id: string) => {
    const game = games.find((item) => item.id === id) ?? games[0];
    if (hint && game) {
      hint.textContent = hasCoarsePointer() ? game.controlsTouch : game.controls;
    }
  };
  showControls(games[0]?.id ?? '');
  window.addEventListener('arcade-select-game', (event) => {
    showControls((event as CustomEvent<string>).detail);
  });

  shell.append(createGameSelector(games), stage, createCaseStudyPanel());
  root.append(shell);
  return stage.querySelector<HTMLElement>('#game-root')!;
}
