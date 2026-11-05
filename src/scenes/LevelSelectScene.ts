import Phaser from 'phaser';
import { sfx } from '../audio/Sfx';
import { COLORS } from '../gfx/palette';
import { GAME_WIDTH } from '../gfx/textures';
import { LEVELS, LEVELS_PER_WORLD } from '../levels';
import { isLevelUnlocked } from '../logic/progress';
import { formatTime } from '../logic/score';
import { saveManager } from '../systems/saveManager';
import { pixelText } from '../ui/text';
import { createMenuBackdrop } from './menuBackdrop';

/** Seleção de fases desbloqueadas. */
export class LevelSelectScene extends Phaser.Scene {
  private tick: () => void = () => {};
  private index = 0;
  private cards: Phaser.GameObjects.Container[] = [];
  private info!: Phaser.GameObjects.Text;

  constructor() {
    super('LevelSelect');
  }

  create(): void {
    this.tick = createMenuBackdrop(this, 0);
    this.cards = [];
    const save = saveManager.get();
    this.index = Math.min(save.unlockedLevels - 1, LEVELS.length - 1);

    this.add.rectangle(0, 0, GAME_WIDTH, 270, 0x1a1c2c, 0.45).setOrigin(0);
    pixelText(this, GAME_WIDTH / 2, 22, 'SELECIONAR FASE', { size: 14, color: COLORS.yellow }).setOrigin(0.5);

    const spacing = 82;
    const startX = GAME_WIDTH / 2 - spacing * 2;
    LEVELS.forEach((level, i) => {
      const unlocked = isLevelUnlocked(i, save.unlockedLevels);
      const col = i % LEVELS_PER_WORLD;
      const row = Math.floor(i / LEVELS_PER_WORLD);
      if (col === 0) pixelText(this, 14, 50 + row * 76, `MUNDO ${row + 1}`, { size: 8, color: COLORS.cyan });
      const card = this.add.container(startX + col * spacing, 86 + row * 76);
      const box = this.add.rectangle(0, 0, 58, 58, COLORS.ink, 0.85).setStrokeStyle(2, COLORS.white, 0.5);
      card.add(box);
      card.add(this.add.rectangle(0, 0, 50, 50, level.theme.skyTop, unlocked ? 0.9 : 0.25));
      if (unlocked) {
        card.add(pixelText(this, 0, -2, String(level.id), { size: 20, color: COLORS.white, strokeThickness: 4 }).setOrigin(0.5));
        const best = save.bestTimes[i];
        if (best) card.add(this.add.image(20, -20, 'star'));
      } else {
        card.add(this.add.image(0, 0, 'lock').setScale(2));
      }
      card.setSize(58, 58).setInteractive({ useHandCursor: unlocked });
      card.on('pointerdown', () => {
        if (this.index === i) this.confirm();
        else this.select(i);
      });
      card.setData('box', box);
      this.cards.push(card);
    });

    this.info = pixelText(this, GAME_WIDTH / 2, 216, '', { size: 8, align: 'center' }).setOrigin(0.5).setLineSpacing(6);
    const back = pixelText(this, GAME_WIDTH / 2, 252, '< Voltar', { size: 8, color: COLORS.gray }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    back.on('pointerdown', () => this.back());

    const kb = this.input.keyboard;
    kb?.on('keydown-LEFT', () => this.select(this.index - 1));
    kb?.on('keydown-A', () => this.select(this.index - 1));
    kb?.on('keydown-RIGHT', () => this.select(this.index + 1));
    kb?.on('keydown-D', () => this.select(this.index + 1));
    kb?.on('keydown-UP', () => this.select(this.index - LEVELS_PER_WORLD));
    kb?.on('keydown-W', () => this.select(this.index - LEVELS_PER_WORLD));
    kb?.on('keydown-DOWN', () => this.select(this.index + LEVELS_PER_WORLD));
    kb?.on('keydown-S', () => this.select(this.index + LEVELS_PER_WORLD));
    kb?.on('keydown-ENTER', () => this.confirm());
    kb?.on('keydown-SPACE', () => this.confirm());
    kb?.on('keydown-ESC', () => this.back());
    this.refresh();
  }

  private select(i: number): void {
    const next = Phaser.Math.Wrap(i, 0, LEVELS.length);
    if (next !== this.index) sfx.play('select');
    this.index = next;
    this.refresh();
  }

  private refresh(): void {
    const save = saveManager.get();
    this.cards.forEach((card, i) => {
      const box = card.getData('box') as Phaser.GameObjects.Rectangle;
      const selected = i === this.index;
      box.setStrokeStyle(2, selected ? COLORS.yellow : COLORS.white, selected ? 1 : 0.4);
      card.setScale(selected ? 1.1 : 1);
    });
    const level = LEVELS[this.index];
    if (isLevelUnlocked(this.index, save.unlockedLevels)) {
      const best = save.bestTimes[this.index];
      this.info.setText(`${level.name}\n${level.subtitle}\n${best ? `Melhor tempo: ${formatTime(best)}` : 'Ainda não concluída'}`);
    } else {
      this.info.setText(`Fase ${level.id} bloqueada\nConclua a fase anterior para liberar`);
    }
  }

  private confirm(): void {
    if (!isLevelUnlocked(this.index, saveManager.get().unlockedLevels)) {
      sfx.play('hurt');
      this.cameras.main.shake(120, 0.005);
      return;
    }
    sfx.unlock();
    sfx.play('confirm');
    this.cameras.main.fadeOut(300, 26, 28, 44);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('Level', { levelIndex: this.index });
    });
  }

  private back(): void {
    sfx.play('select');
    this.scene.start('Menu');
  }

  update(): void {
    this.tick();
  }
}
