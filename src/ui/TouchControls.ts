import type { SemanticInput } from '../core/types';

const buttons: Array<[SemanticInput, string, string]> = [
  ['UP', '↑', 'Move up'],
  ['LEFT', '←', 'Move left'],
  ['ACTION', '●', 'Action'],
  ['RIGHT', '→', 'Move right'],
  ['DOWN', '↓', 'Move down']
];

// Held direction buttons auto-repeat for parity with OS keyboard repeat.
const REPEAT_DELAY_MS = 300;
const REPEAT_INTERVAL_MS = 90;

export function createTouchControls(): HTMLElement {
  const wrap = document.createElement('section');
  wrap.className = 'touch-controls';
  wrap.setAttribute('aria-label', 'Virtual controls');
  for (const [input, glyph, label] of buttons) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.arcadeInput = input;
    button.className = `touch-button touch-${input.toLowerCase()}`;
    button.textContent = glyph;
    button.setAttribute('aria-label', label);
    button.title = label;

    let delayTimer = 0;
    let intervalTimer = 0;
    const dispatch = () => {
      window.dispatchEvent(
        new CustomEvent<SemanticInput>('arcade-virtual-input', { detail: input })
      );
    };
    const release = () => {
      button.classList.remove('is-pressed');
      window.clearTimeout(delayTimer);
      window.clearInterval(intervalTimer);
    };
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      // A second touch on the same button must not orphan running timers.
      release();
      // preventDefault suppresses :active, so pressed feedback is a class.
      button.classList.add('is-pressed');
      dispatch();
      // ACTION stays single-shot: holding it must not spam restarts/fire.
      if (input !== 'ACTION') {
        delayTimer = window.setTimeout(() => {
          intervalTimer = window.setInterval(dispatch, REPEAT_INTERVAL_MS);
        }, REPEAT_DELAY_MS);
      }
    });
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('pointerleave', release);
    wrap.append(button);
  }
  return wrap;
}
