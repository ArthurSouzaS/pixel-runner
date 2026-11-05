import Phaser from 'phaser';
import { sfx } from '../audio/Sfx';
import { COLORS } from '../gfx/palette';
import { ensurePixSkin } from '../gfx/skins';
import { GAME_HEIGHT, GAME_WIDTH } from '../gfx/textures';
import { t } from '../i18n';
import type { GameMode } from '../input/controls';
import { findSkin } from '../logic/shop';
import { saveManager } from '../systems/saveManager';
import { pixelText } from '../ui/text';

export interface EndingData {
  score: number;
  isNewRecord: boolean;
  mode?: GameMode;
}

/** Cena de final: o Eclipse cai, as estrelas voltam a brilhar e Pix volta para casa. */
export class EndingScene extends Phaser.Scene {
  private slide = 0;
  private slides: { text: string; draw: () => void }[] = [];
  private layer!: Phaser.GameObjects.Container;
  private caption!: Phaser.GameObjects.Text;
  private info!: EndingData;
  private busy = false;

  constructor() {
    super('Ending');
  }

  create(data: EndingData): void {
    this.info = data;
    this.slide = 0;
    this.busy = false;
    sfx.playMusic('ending');
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.ink).setOrigin(0);
    // Campo de estrelas
    for (let i = 0; i < 70; i++) {
      const star = this.add.rectangle(Phaser.Math.Between(0, GAME_WIDTH), Phaser.Math.Between(0, GAME_HEIGHT - 60), 1, 1, 0xf4f4f4);
      this.tweens.add({ targets: star, alpha: 0.15, duration: Phaser.Math.Between(500, 1800), yoyo: true, repeat: -1, delay: Phaser.Math.Between(0, 1500) });
    }
    this.layer = this.add.container(0, 0);
    this.add.rectangle(0, GAME_HEIGHT - 58, GAME_WIDTH, 58, COLORS.ink, 0.9).setOrigin(0).setStrokeStyle(2, COLORS.yellow);
    this.caption = pixelText(this, GAME_WIDTH / 2, GAME_HEIGHT - 30, '', { size: 8, align: 'center', wrap: 440 }).setOrigin(0.5).setLineSpacing(5);
    pixelText(this, GAME_WIDTH - 8, GAME_HEIGHT - 62, t('ending.next'), { size: 8, color: COLORS.gray }).setOrigin(1, 1);

    const skin = findSkin(saveManager.get().equippedSkin);
    const pixKey = ensurePixSkin(this, skin.id, skin.colors);
    const cx = GAME_WIDTH / 2;
    this.slides = [
      {
        text: t('ending.1'),
        draw: () => {
          const boss = this.add.sprite(cx, 90, 'eclipse', 2);
          this.layer.add(boss);
          this.tweens.add({ targets: boss, scale: 0, angle: 540, alpha: 0, duration: 2200, ease: 'Quad.easeIn' });
          const burst = this.add.particles(cx, 90, 'px4', { speed: { min: 40, max: 160 }, lifespan: 1600, quantity: 4, frequency: 40, tint: [0xffcd75, 0xf4f4f4, 0x5d275d], duration: 1800 });
          this.layer.add(burst);
        },
      },
      {
        text: t('ending.2'),
        draw: () => {
          for (let i = 0; i < 5; i++) {
            const s = this.add.image(80 + i * 80, 50 + (i % 2) * 40, 'star').setScale(0);
            this.layer.add(s);
            this.tweens.add({ targets: s, scale: 3, duration: 600, delay: i * 300, ease: 'Back.easeOut' });
          }
          this.layer.add(this.add.sprite(cx, 150, pixKey, 0).setScale(3).play(`${pixKey}-idle`));
        },
      },
      {
        text: t('ending.3'),
        draw: () => {
          const ground = this.add.rectangle(0, 180, GAME_WIDTH, 32, 0x38b764).setOrigin(0);
          const pix = this.add.sprite(-20, 166, pixKey, 0).setScale(2).play(`${pixKey}-run`);
          const elder = this.add.image(330, 166, 'npc-elder', 0).setScale(2);
          this.layer.add([ground, elder, pix]);
          this.tweens.add({ targets: pix, x: 290, duration: 2600, ease: 'Sine.easeOut', onComplete: () => pix.active && pix.play(`${pixKey}-idle`) });
        },
      },
      {
        text: t('ending.4', { score: data.score }),
        draw: () => {
          const title = pixelText(this, cx, 70, t('ending.title'), { size: 20, color: COLORS.yellow, strokeThickness: 5 }).setOrigin(0.5).setScale(0.4);
          this.layer.add(title);
          this.tweens.add({ targets: title, scale: 1, duration: 600, ease: 'Back.easeOut' });
          if (data.isNewRecord) {
            const rec = pixelText(this, cx, 110, t('common.newRecord'), { size: 10, color: COLORS.lightGreen }).setOrigin(0.5);
            this.layer.add(rec);
            this.tweens.add({ targets: rec, alpha: 0.2, duration: 300, yoyo: true, repeat: -1 });
          }
          const confetti = this.add.particles(0, -10, 'px4', { x: { min: 0, max: GAME_WIDTH }, lifespan: 4000, speedY: { min: 30, max: 80 }, frequency: 50, tint: [0xffcd75, 0x38b764, 0x41a6f6, 0xb13e53] });
          this.layer.add(confetti);
        },
      },
    ];
    this.show();
    this.time.delayedCall(600, () => {
      this.input.keyboard?.on('keydown', () => this.next());
      this.input.on('pointerdown', () => this.next());
    });
  }

  private show(): void {
    this.layer.removeAll(true);
    const s = this.slides[this.slide];
    s.draw();
    this.caption.setText('').setAlpha(1);
    // Texto aparece letra por letra.
    let i = 0;
    this.time.addEvent({
      delay: 28,
      repeat: s.text.length - 1,
      callback: () => {
        i++;
        this.caption.setText(s.text.slice(0, i));
      },
    });
    this.cameras.main.fadeIn(400, 26, 28, 44);
  }

  private next(): void {
    if (this.busy) return;
    this.busy = true;
    sfx.play('select');
    this.slide++;
    this.cameras.main.fadeOut(300, 26, 28, 44);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.busy = false;
      if (this.slide >= this.slides.length) {
        this.scene.start('GameOver', { victory: true, score: this.info.score, levelIndex: 14, isNewRecord: this.info.isNewRecord, mode: this.info.mode });
        return;
      }
      this.show();
    });
  }
}
