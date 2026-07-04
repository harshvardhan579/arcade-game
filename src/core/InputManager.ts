import type { SemanticInput } from './types';

type InputHandler = (input: SemanticInput) => void;

const keyMap = new Map<string, SemanticInput>([
  ['ArrowUp', 'UP'],
  ['w', 'UP'],
  ['W', 'UP'],
  ['ArrowDown', 'DOWN'],
  ['s', 'DOWN'],
  ['S', 'DOWN'],
  ['ArrowLeft', 'LEFT'],
  ['a', 'LEFT'],
  ['A', 'LEFT'],
  ['ArrowRight', 'RIGHT'],
  ['d', 'RIGHT'],
  ['D', 'RIGHT'],
  [' ', 'ACTION'],
  ['Enter', 'ACTION'],
  ['Escape', 'PAUSE'],
  ['p', 'PAUSE'],
  ['P', 'PAUSE']
]);

export class InputManager {
  private handlers = new Set<InputHandler>();
  private readonly onKeyDown = (event: KeyboardEvent) => {
    const input = keyMap.get(event.key);
    if (!input) return;
    event.preventDefault();
    this.emit(input);
  };
  private readonly onVirtualInput = (event: Event) => {
    const custom = event as CustomEvent<SemanticInput>;
    this.emit(custom.detail);
  };

  connect(): void {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('arcade-virtual-input', this.onVirtualInput);
  }

  disconnect(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('arcade-virtual-input', this.onVirtualInput);
    this.handlers.clear();
  }

  subscribe(handler: InputHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  emit(input: SemanticInput): void {
    window.dispatchEvent(
      new CustomEvent<SemanticInput>('arcade-semantic-input', { detail: input })
    );
    for (const handler of this.handlers) handler(input);
  }
}
