import Phaser from 'phaser';
import { audioEngine } from '../core/AudioEngine';
import { ScoreManager } from '../core/ScoreManager';
import { publishBridge, updateBridgeSnapshot } from '../core/TestBridge';
import { prefersReducedMotion } from '../core/Viewport';
import type { GameLogic, GameSnapshot, SemanticInput } from '../core/types';

export abstract class BaseGameScene<TState extends GameSnapshot> extends Phaser.Scene {
  protected abstract logic: GameLogic<TState>;
  protected readonly graphicsKey = 'playfield';
  protected graphics!: Phaser.GameObjects.Graphics;
  protected hud!: Phaser.GameObjects.Text;
  protected accumulator = 0;
  protected stepMs = 120;
  protected reducedMotion = false;
  protected scores!: ScoreManager;
  private readonly audio = audioEngine;
  private readonly onInput = (event: Event) => {
    const input = (event as CustomEvent<SemanticInput>).detail;
    const before = this.logic.getState();
    this.logic.handleInput(input);
    if (input === 'ACTION') this.audio.play('select');
    const after = this.logic.getState();
    if (after.score > before.score) this.audio.play('score');
    if (after.isGameOver && !before.isGameOver) this.audio.play('game-over');
  };
  private readonly onRestart = () => {
    this.logic.restart();
    this.audio.play('select');
  };

  create(): void {
    this.reducedMotion = prefersReducedMotion();
    this.scores = new ScoreManager(this.scene.key);
    this.audio.attachUnlockListeners();
    this.graphics = this.add.graphics();
    this.hud = this.add.text(18, 16, '', {
      color: '#d8fff9',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      fontSize: '16px'
    });
    window.addEventListener('arcade-semantic-input', this.onInput);
    window.addEventListener('arcade-restart', this.onRestart);
    publishBridge(this.scene.key, () => ({
      ...this.logic.getState(),
      highScore: this.scores.highScore
    }));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('arcade-semantic-input', this.onInput);
      window.removeEventListener('arcade-restart', this.onRestart);
    });
    this.renderState(this.logic.getState());
  }

  update(_time: number, delta: number): void {
    this.accumulator += delta;
    const state = this.logic.getState();
    const interval = typeof state.speedMs === 'number' ? state.speedMs : this.stepMs;
    while (this.accumulator >= interval) {
      this.accumulator -= interval;
      const before = this.logic.getState();
      const next = this.logic.step();
      if (next.score > before.score) this.audio.play('score');
      if (next.isGameOver && !before.isGameOver) this.audio.play('hit');
    }
    const latest = this.logic.getState();
    this.scores.record(latest.score);
    updateBridgeSnapshot({ ...latest, highScore: this.scores.highScore });
    this.renderState(latest);
  }

  protected abstract draw(state: TState, width: number, height: number): void;

  protected hudExtra(_state: TState): string {
    return '';
  }

  private renderState(state: TState): void {
    const width = this.scale.width;
    const height = this.scale.height;
    this.graphics.clear();
    this.graphics.fillStyle(0x071114, 1);
    this.graphics.fillRect(0, 0, width, height);
    this.draw(state, width, height);
    if (state.isGameOver) {
      this.graphics.fillStyle(0x02080a, 0.42);
      this.graphics.fillRect(0, 0, width, height);
    }
    const extra = this.hudExtra(state);
    const phase = state.isGameOver
      ? '  GAME OVER - press Space'
      : state.phase === 'won'
        ? '  CLEARED - press Space'
        : '';
    this.hud.setText(
      `Score ${state.score}  High ${this.scores.highScore}${extra ? `  ${extra}` : ''}${phase}`
    );
  }
}
