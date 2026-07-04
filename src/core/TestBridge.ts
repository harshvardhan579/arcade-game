import type { GameSnapshot } from './types';

export interface ArcadeBridge {
  activeScene: string;
  getState(): GameSnapshot;
}

declare global {
  interface Window {
    __ARCADE__?: ArcadeBridge;
  }
}

let currentSnapshot: GameSnapshot = { score: 0, isGameOver: false, tick: 0 };

export function publishBridge(activeScene: string, getState: () => GameSnapshot): void {
  window.__ARCADE__ = {
    activeScene,
    getState: () => {
      currentSnapshot = getState();
      return { ...currentSnapshot };
    }
  };
}

export function updateBridgeSnapshot(snapshot: GameSnapshot): void {
  currentSnapshot = { ...snapshot };
}
