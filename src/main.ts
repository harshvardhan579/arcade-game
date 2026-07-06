import Phaser from 'phaser';
import { InputManager } from './core/InputManager';
import { publishBridge } from './core/TestBridge';
import type { GameDefinition } from './core/types';
import { BounceCircuitScene } from './games/bounce-circuit/BounceCircuitScene';
import { CircuitStackScene } from './games/circuit-stack/CircuitStackScene';
import { LaneRushScene } from './games/lane-rush/LaneRushScene';
import { NeonSerpentScene } from './games/neon-serpent/NeonSerpentScene';
import { StarCourierScene } from './games/star-courier/StarCourierScene';
import './style.css';
import { createArcadeShell, setShellMode } from './ui/ArcadeShell';
import { markSelectedGame } from './ui/GameSelector';

const games: GameDefinition[] = [
  {
    id: 'neon-serpent',
    controls: 'Arrows steer · eating speeds up · Space restarts',
    controlsTouch: 'D-pad steers · eating speeds up · ● restarts',
    title: 'Neon Serpent',
    subtitle: 'Portal snake with combo decay',
    sceneKey: 'neon-serpent',
    aspectRatio: 3 / 4,
    orientation: 'portrait'
  },
  {
    id: 'bounce-circuit',
    controls: '↑ jump, again mid-air · ← → shift · Space restarts',
    controlsTouch: '↑ jump, again mid-air · ← → shift · ● restarts',
    title: 'Bounce Circuit',
    subtitle: 'Neon skyline auto-runner',
    sceneKey: 'bounce-circuit',
    aspectRatio: 3 / 4,
    orientation: 'portrait'
  },
  {
    id: 'star-courier',
    controls: '← → move · Space fires',
    controlsTouch: '← → move · ● fires',
    title: 'Star Courier',
    subtitle: 'Vertical shooter with object pools',
    sceneKey: 'star-courier',
    aspectRatio: 3 / 4,
    orientation: 'portrait'
  },
  {
    id: 'lane-rush',
    controls: '← → change lanes · double-tap Space = boost',
    controlsTouch: '← → change lanes · double-tap ● = boost',
    title: 'Lane Rush',
    subtitle: 'Three-lane near-miss racer',
    sceneKey: 'lane-rush',
    aspectRatio: 3 / 4,
    orientation: 'portrait'
  },
  {
    id: 'circuit-stack',
    controls: '← → move · ↑ rotate · ↓ drop',
    controlsTouch: '← → move · ↑ rotate · ↓ drop',
    title: 'Circuit Stack',
    subtitle: 'Falling-block scoring puzzle',
    sceneKey: 'circuit-stack',
    aspectRatio: 3 / 4,
    orientation: 'portrait'
  }
];

const sceneRegistry: ReadonlyArray<[string, typeof Phaser.Scene]> = [
  ['neon-serpent', NeonSerpentScene],
  ['bounce-circuit', BounceCircuitScene],
  ['star-courier', StarCourierScene],
  ['lane-rush', LaneRushScene],
  ['circuit-stack', CircuitStackScene]
];

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('Missing #app root');

const gameRoot = createArcadeShell(root, games);
const input = new InputManager();
input.connect();

let game: Phaser.Game | null = null;
let currentSceneKey: string | null = null;

function publishHomeBridge(): void {
  publishBridge('home', () => ({ score: 0, isGameOver: false, tick: 0, phase: 'ready' }));
}

// Phaser is constructed lazily on the first game selection: the home hub
// boots with no canvas and no engine work. Construction must happen while
// the stage is visible (game mode) so clientWidth measures the real layout.
function ensureGame(firstSceneKey: string): void {
  game = new Phaser.Game({
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
    scene: []
  });
  // Register every scene inactive and auto-start only the requested one —
  // a populated config array would auto-start its first scene instead.
  for (const [key, SceneClass] of sceneRegistry) {
    game.scene.add(key, SceneClass, key === firstSceneKey);
  }
  currentSceneKey = firstSceneKey;
}

function startGame(id: string): void {
  const definition = games.find((item) => item.id === id) ?? games[0]!;
  document.documentElement.style.setProperty('--game-aspect', String(definition.aspectRatio));
  setShellMode('game');
  markSelectedGame(definition.id);
  if (!game) {
    ensureGame(definition.sceneKey);
    return;
  }
  if (currentSceneKey === definition.sceneKey) return;
  // SceneManager.start does not stop the running scene (unlike the in-scene
  // ScenePlugin.start), so without an explicit stop every selected game keeps
  // running and later scenes in the list render on top of the new one.
  if (currentSceneKey) game.scene.stop(currentSceneKey);
  game.scene.start(definition.sceneKey);
  currentSceneKey = definition.sceneKey;
}

function goHome(): void {
  if (game && currentSceneKey) game.scene.stop(currentSceneKey);
  currentSceneKey = null;
  publishHomeBridge();
  setShellMode('home');
}

window.addEventListener('arcade-select-game', (event) => {
  startGame((event as CustomEvent<string>).detail);
});
window.addEventListener('arcade-go-home', goHome);
window.addEventListener('beforeunload', () => input.disconnect());

// Boot: an explicit ?game=<id> deep link (static-deploy-safe, composes with
// ?seed=N) goes straight to game mode; anything else lands on the home hub.
const requestedGame = new URLSearchParams(window.location.search).get('game');
if (requestedGame && games.some((item) => item.id === requestedGame)) {
  startGame(requestedGame);
} else {
  publishHomeBridge();
  setShellMode('home');
}
