import Phaser from 'phaser';
import { sfx } from '../audio/Sfx';
import { COLORS } from '../gfx/palette';
import { GAME_HEIGHT, GAME_WIDTH } from '../gfx/textures';
import { t } from '../i18n';
import { type PowerUpId, POWERUPS, powerUpChoices } from '../logic/powerups';
import { MAX_LIVES, type RunState } from '../logic/score';
import { pixelText } from '../ui/text';
import { createMenuBackdrop } from './menuBackdrop';

/** Entre as salas do Infinito: escolha 1 de 3 power-ups para a próxima sala. */
export class PowerUpScene extends Phaser.Scene {
  private tick: () => void = () => {};
  private index = 1;
  private cards: Phaser.GameObjects.Container[] = [];
  private choices: PowerUpId[] = [];
  private info!: { seed: string; room: number; run: RunState };
  private chosen = false;

  constructor() {
    super('PowerUp');
  }

  create(data: { seed: string; room: number; run: RunState }): void {
    this.info = data;
    this.index = 1;
    this.chosen = false;
    this.cards = [];
    this.tick = createMenuBackdrop(this, 10);
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.ink, 0.65).setOrigin(0);
    pixelText(this, GAME_WIDTH / 2, 24, t('power.title'), { size: 14, color: COLORS.yellow }).setOrigin(0.5);
    pixelText(this, GAME_WIDTH / 2, 44, t('power.subtitle', { n: data.room + 1 }), { size: 8, color: COLORS.cyan }).setOrigin(0.5);
    this.choices = powerUpChoices(data.seed, data.room);
    this.choices.forEach((id, i) => {
      const pu = POWERUPS.find((p) => p.id === id)!;
      const c = this.add.container(GAME_WIDTH / 2 + (i - 1) * 150, 140);
      c.add(this.add.rectangle(0, 0, 136, 140, COLORS.ink, 0.9).setStrokeStyle(2, COLORS.white, 0.5));
      c.add(this.add.circle(0, -38, 18, pu.color).setStrokeStyle(2, COLORS.white));
      c.add(pixelText(this, 0, -38, t(`power.${id}.icon`), { size: 12, color: COLORS.ink, strokeThickness: 0 }).setOrigin(0.5));
      c.add(pixelText(this, 0, -6, t(`power.${id}.name`), { size: 8, color: COLORS.yellow }).setOrigin(0.5));
      c.add(pixelText(this, 0, 26, t(`power.${id}.desc`), { size: 8, align: 'center', wrap: 124 }).setOrigin(0.5).setLineSpacing(3));
      c.setSize(136, 140).setInteractive({ useHandCursor: true });
      c.on('pointerdown', () => (this.index === i ? this.choose() : this.select(i)));
      this.cards.push(c);
    });
    pixelText(this, GAME_WIDTH / 2, GAME_HEIGHT - 16, t('power.hint', { lives: data.run.lives, score: data.run.score }), { size: 8, color: COLORS.gray }).setOrigin(0.5);
    const kb = this.input.keyboard;
    kb?.on('keydown-LEFT', () => this.select(this.index - 1));
    kb?.on('keydown-A', () => this.select(this.index - 1));
    kb?.on('keydown-RIGHT', () => this.select(this.index + 1));
    kb?.on('keydown-D', () => this.select(this.index + 1));
    kb?.on('keydown-ENTER', () => this.choose());
    kb?.on('keydown-SPACE', () => this.choose());
    this.refresh();
  }

  private select(i: number): void {
    this.index = Phaser.Math.Wrap(i, 0, this.cards.length);
    sfx.play('select');
    this.refresh();
  }

  private refresh(): void {
    this.cards.forEach((c, i) => {
      c.setScale(i === this.index ? 1.08 : 0.95);
      (c.list[0] as Phaser.GameObjects.Rectangle).setStrokeStyle(2, i === this.index ? COLORS.yellow : COLORS.white, i === this.index ? 1 : 0.4);
    });
  }

  private choose(): void {
    if (this.chosen) return;
    this.chosen = true;
    sfx.play('ability');
    const powerup = this.choices[this.index];
    const run = { ...this.info.run };
    if (powerup === 'life') run.lives = Math.min(MAX_LIVES, run.lives + 1);
    this.cameras.main.flash(200, 255, 255, 255);
    this.time.delayedCall(350, () => this.scene.start('Level', { levelIndex: 0, run, infinite: { seed: this.info.seed, room: this.info.room, powerup } }));
  }

  update(): void {
    this.tick();
  }
}
