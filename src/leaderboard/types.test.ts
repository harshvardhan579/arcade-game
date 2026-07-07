import { describe, expect, it } from 'vitest';
import { GAME_IDS, isGameId } from './types';

describe('game id allowlist', () => {
  it('contains exactly the five registry ids in registry order', () => {
    expect(GAME_IDS).toEqual([
      'neon-serpent',
      'bounce-circuit',
      'star-courier',
      'lane-rush',
      'circuit-stack'
    ]);
  });

  it('accepts each allowed id', () => {
    for (const id of GAME_IDS) {
      expect(isGameId(id)).toBe(true);
    }
  });

  it('rejects unknown ids, wrong casing, and non-strings', () => {
    expect(isGameId('tetris')).toBe(false);
    expect(isGameId('NEON-SERPENT')).toBe(false);
    expect(isGameId('neon-serpent ')).toBe(false);
    expect(isGameId('')).toBe(false);
    expect(isGameId('all')).toBe(false);
    expect(isGameId(3)).toBe(false);
    expect(isGameId(null)).toBe(false);
    expect(isGameId(undefined)).toBe(false);
    expect(isGameId(['neon-serpent'])).toBe(false);
  });
});
