import type { SemanticInput } from '../core/types';

const buttons: Array<[SemanticInput, string]> = [
  ['UP', '↑'],
  ['LEFT', '←'],
  ['ACTION', '●'],
  ['RIGHT', '→'],
  ['DOWN', '↓']
];

export function createTouchControls(): HTMLElement {
  const wrap = document.createElement('section');
  wrap.className = 'touch-controls';
  wrap.setAttribute('aria-label', 'Virtual controls');
  for (const [input, label] of buttons) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.arcadeInput = input;
    button.className = `touch-button touch-${input.toLowerCase()}`;
    button.textContent = label;
    button.title = input.toLowerCase();
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      window.dispatchEvent(
        new CustomEvent<SemanticInput>('arcade-virtual-input', { detail: input })
      );
    });
    wrap.append(button);
  }
  return wrap;
}
