import type { GameDefinition } from '../core/types';
import { hasCoarsePointer } from '../core/Viewport';
import { createCaseStudyPanel } from './CaseStudyPanel';
import { createGameSelector, createMobileGameSelect } from './GameSelector';
import { createHomeScreen } from './HomeScreen';
import { createThemeToggle } from './ThemeToggle';
import { createTouchControls } from './TouchControls';

export type ShellMode = 'home' | 'game';

/** The shell shows exactly one surface set per mode (CSS keys off this). */
export function setShellMode(mode: ShellMode): void {
  document.querySelector<HTMLElement>('.arcade-shell')?.setAttribute('data-mode', mode);
}

export function createArcadeShell(
  root: HTMLElement,
  games: readonly GameDefinition[]
): HTMLElement {
  root.innerHTML = '';
  const shell = document.createElement('main');
  shell.className = 'arcade-shell';
  shell.dataset.mode = 'home';

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
        <button class="back-button" type="button" aria-label="Back to games">‹ Games</button>
        <button class="restart-button" type="button">Restart</button>
      </div>
    </header>
    <div id="game-root" class="game-root" aria-label="Game canvas"></div>
  `;
  stage.querySelector('.topbar-actions')?.prepend(createMobileGameSelect(games));
  const back = stage.querySelector<HTMLButtonElement>('.back-button');
  back?.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('arcade-go-home'));
    back.blur();
  });
  // Last in DOM order: the desktop keyboard spec pins the tab order as
  // cards ×5 → Back → Restart → this toggle; never let it precede them.
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

  shell.append(createHomeScreen(games), createGameSelector(games), stage, createCaseStudyPanel());
  root.append(shell);
  return stage.querySelector<HTMLElement>('#game-root')!;
}
