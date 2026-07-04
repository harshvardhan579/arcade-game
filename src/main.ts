import Phaser from 'phaser';
import { InputManager } from './core/InputManager';
import type { GameDefinition } from './core/types';
import { BounceCircuitScene } from './games/bounce-circuit/BounceCircuitScene';
import { CircuitStackScene } from './games/circuit-stack/CircuitStackScene';
import { LaneRushScene } from './games/lane-rush/LaneRushScene';
import { NeonSerpentScene } from './games/neon-serpent/NeonSerpentScene';
import { StarCourierScene } from './games/star-courier/StarCourierScene';
import './style.css';
import { createArcadeShell } from './ui/ArcadeShell';
import { markSelectedGame } from './ui/GameSelector';

const games: GameDefinition[] = [
  {
    id: 'neon-serpent',
    controls: 'Arrows steer · Space restarts',
    title: 'Neon Serpent',
    subtitle: 'Portal snake with combo decay',
    sceneKey: 'neon-serpent',
    aspectRatio: 3 / 4,
    orientation: 'portrait'
  },
  {
    id: 'bounce-circuit',
    controls: '← → move · ↑ jump · Space restarts',
    title: 'Bounce Circuit',
    subtitle: 'Precision key-and-door platforming',
    sceneKey: 'bounce-circuit',
    aspectRatio: 3 / 4,
    orientation: 'portrait'
  },
  {
    id: 'star-courier',
    controls: '← → move · Space fires',
    title: 'Star Courier',
    subtitle: 'Vertical shooter with object pools',
    sceneKey: 'star-courier',
    aspectRatio: 3 / 4,
    orientation: 'portrait'
  },
  {
    id: 'lane-rush',
    controls: '← → change lanes',
    title: 'Lane Rush',
    subtitle: 'Three-lane near-miss racer',
    sceneKey: 'lane-rush',
    aspectRatio: 3 / 4,
    orientation: 'portrait'
  },
  {
    id: 'circuit-stack',
    controls: '← → move · ↑ rotate · ↓ drop',
    title: 'Circuit Stack',
    subtitle: 'Falling-block scoring puzzle',
    sceneKey: 'circuit-stack',
    aspectRatio: 3 / 4,
    orientation: 'portrait'
  }
];

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('Missing #app root');

const gameRoot = createArcadeShell(root, games);
const input = new InputManager();
input.connect();

const game = new Phaser.Game({
  type: Phaser.CANVAS,
  parent: gameRoot,
  width: gameRoot.clientWidth || 480,
  height: gameRoot.clientHeight || 640,
  backgroundColor: '#071114',
  banner: false,
  audio: { noAudio: true },
  render: {
    pixelArt: true,
    antialias: false
  },
  scale: {
    mode: Phaser.Scale.RESIZE,
    parent: gameRoot
  },
  scene: [NeonSerpentScene, BounceCircuitScene, StarCourierScene, LaneRushScene, CircuitStackScene]
});

function startGame(id: string): void {
  const definition = games.find((item) => item.id === id) ?? games[0]!;
  document.documentElement.style.setProperty('--game-aspect', String(definition.aspectRatio));
  game.scene.start(definition.sceneKey);
  markSelectedGame(definition.id);
}

window.addEventListener('arcade-select-game', (event) => {
  startGame((event as CustomEvent<string>).detail);
});

window.addEventListener('beforeunload', () => input.disconnect());
startGame('neon-serpent');
