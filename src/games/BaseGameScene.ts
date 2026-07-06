import Phaser from 'phaser';
import { audioEngine } from '../core/AudioEngine';
import { nextRunSeed } from '../core/RunSeeds';
import { ScoreManager } from '../core/ScoreManager';
import { publishBridge, updateBridgeSnapshot } from '../core/TestBridge';
import { hasCoarsePointer, prefersReducedMotion } from '../core/Viewport';
import type { GameLogic, GameSnapshot, SemanticInput } from '../core/types';

export abstract class BaseGameScene<TState extends GameSnapshot> extends Phaser.Scene {
  protected abstract logic: GameLogic<TState>;
  protected readonly graphicsKey = 'playfield';
  protected graphics!: Phaser.GameObjects.Graphics;
  protected hud!: Phaser.GameObjects.Text;
  protected stateText!: Phaser.GameObjects.Text;
  private hudFontPx = 16;
  protected accumulator = 0;
  protected stepMs = 120;
  protected reducedMotion = false;
  protected scores!: ScoreManager;
  protected runSeed = 0;
  private readonly audio = audioEngine;
  private readonly onInput = (event: Event) => {
    const input = (event as CustomEvent<SemanticInput>).detail;
    const before = this.logic.getState();
    if (input === 'ACTION' && before.isGameOver) {
      // The logic's own ACTION-restart would replay its fixed default seed;
      // the scene owns run seeds so every new run varies (or honors the
      // forced test seed). The logic-internal restart stays as a fallback
      // for pure-logic use.
      this.startNewRun();
      this.audio.play('select');
      return;
    }
    this.logic.handleInput(input);
    if (input === 'ACTION') this.audio.play('select');
    const after = this.logic.getState();
    if (after.score > before.score) this.audio.play('score');
    if (after.isGameOver && !before.isGameOver) this.audio.play('game-over');
  };
  private readonly onRestart = () => {
    this.startNewRun();
    this.audio.play('select');
  };

  private startNewRun(): void {
    this.runSeed = nextRunSeed(this.scene.key);
    this.logic.restart(this.runSeed);
  }

  create(): void {
    this.reducedMotion = prefersReducedMotion();
    this.scores = new ScoreManager(this.scene.key);
    // A scene (re)start is a new run: switching away and back begins fresh
    // instead of resuming the frozen old run, and live play draws a fresh
    // seed each time (a forced test seed reproduces the exact same run).
    this.startNewRun();
    this.audio.attachUnlockListeners();
    this.graphics = this.add.graphics();
    this.hud = this.add.text(18, 16, '', {
      color: '#d8fff9',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      fontSize: '16px'
    });
    this.stateText = this.add
      .text(0, 0, '', {
        color: '#d8fff9',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        fontSize: '24px',
        align: 'center'
      })
      .setOrigin(0.5)
      .setStroke('#02080a', 4)
      .setVisible(false);
    window.addEventListener('arcade-semantic-input', this.onInput);
    window.addEventListener('arcade-restart', this.onRestart);
    publishBridge(this.scene.key, () => ({
      ...this.logic.getState(),
      highScore: this.scores.highScore,
      runSeed: this.runSeed
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
    updateBridgeSnapshot({ ...latest, highScore: this.scores.highScore, runSeed: this.runSeed });
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
    // Narrow canvases (small phones) get a smaller HUD so the line never clips.
    const hudPx = Math.max(10, Math.min(16, Math.floor(width / 26)));
    if (hudPx !== this.hudFontPx) {
      this.hudFontPx = hudPx;
      this.hud.setFontSize(hudPx);
    }
    const extra = this.hudExtra(state);
    this.hud.setText(
      `Score ${state.score}  High ${this.scores.highScore}${extra ? `  ${extra}` : ''}`
    );
    // End-of-run messaging lives in a centered overlay (the HUD line used to
    // clip it off on mobile) with device-correct restart wording.
    const ended = state.isGameOver || state.phase === 'won';
    if (ended) {
      const heading = state.isGameOver ? 'GAME OVER' : 'CLEARED';
      const restart = hasCoarsePointer() ? 'Tap ● to restart' : 'Press Space to restart';
      this.stateText
        .setPosition(width / 2, height / 2)
        .setFontSize(Math.max(16, Math.min(28, Math.floor(width / 14))))
        .setText(`${heading}\n${restart}`);
    }
    this.stateText.setVisible(ended);
  }
}
