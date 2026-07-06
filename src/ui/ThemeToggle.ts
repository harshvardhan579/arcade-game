export type ThemeName = 'dark' | 'light';

export function currentTheme(): ThemeName {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

export function applyTheme(theme: ThemeName): void {
  document.documentElement.dataset.theme = theme;
}

/**
 * Text-glyph theme toggle (zero-asset). Lives after Restart in the topbar so
 * the pinned tab order (cards ×5 → Restart) is untouched. Like the cards,
 * select, and Restart, it blurs after activation so gameplay keys keep
 * flowing to the game.
 */
export function createThemeToggle(): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'theme-toggle';
  button.textContent = '◐';
  const syncLabel = () => {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    button.setAttribute('aria-label', `Switch to ${next} theme`);
    button.title = `Switch to ${next} theme`;
  };
  button.addEventListener('click', () => {
    applyTheme(currentTheme() === 'dark' ? 'light' : 'dark');
    syncLabel();
    button.blur();
  });
  syncLabel();
  return button;
}
