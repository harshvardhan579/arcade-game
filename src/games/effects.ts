import Phaser from 'phaser';

const SPARK_TEXTURE = 'fx-spark';

function ensureSparkTexture(scene: Phaser.Scene): string {
  if (!scene.textures.exists(SPARK_TEXTURE)) {
    const spark = scene.add.graphics();
    spark.fillStyle(0xffffff, 1);
    spark.fillRect(0, 0, 5, 5);
    spark.generateTexture(SPARK_TEXTURE, 5, 5);
    spark.destroy();
  }
  return SPARK_TEXTURE;
}

export function createSparkEmitter(
  scene: Phaser.Scene,
  tints: number[]
): Phaser.GameObjects.Particles.ParticleEmitter {
  const emitter = scene.add.particles(0, 0, ensureSparkTexture(scene), {
    speed: { min: 60, max: 170 },
    lifespan: 320,
    scale: { start: 1, end: 0 },
    quantity: 12,
    emitting: false,
    tint: tints
  });
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => emitter.destroy());
  return emitter;
}

export function smallShake(scene: Phaser.Scene): void {
  scene.cameras.main.shake(80, 0.0035);
}

export function popText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  message: string,
  color: string,
  size = 14
): void {
  const label = scene.add
    .text(x, y, message, {
      color,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      fontSize: `${size}px`
    })
    .setOrigin(0.5);
  scene.tweens.add({
    targets: label,
    y: y - 26,
    alpha: 0,
    duration: 420,
    onComplete: () => label.destroy()
  });
}

export function deathFeedback(scene: Phaser.Scene): void {
  scene.cameras.main.shake(180, 0.008);
  scene.cameras.main.flash(140, 255, 79, 100);
}
