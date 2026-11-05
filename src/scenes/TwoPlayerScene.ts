import Phaser from 'phaser';
import { sfx } from '../audio/Sfx';
import { COLORS } from '../gfx/palette';
import { ensurePixSkin, PLAYER2_COLORS } from '../gfx/skins';
import { GAME_HEIGHT, GAME_WIDTH } from '../gfx/textures';
import type { GameMode } from '../input/controls';
import { LEVELS } from '../levels';
import { saveManager } from '../systems/saveManager';
import { pixelText } from '../ui/text';
import { createMenuBackdrop } from './menuBackdrop';

/** Escolha do modo para 2 jogadores (cooperativo ou corrida) e da fase. */
export class TwoPlayerScene extends Phaser.Scene {
  private tick: () => void = () => {};
  private modeIndex = 0;
  private levelIndex = 0;
  private row = 0;
  private modeText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private descText!: Phaser.GameObjects.Text;
  private cursors: Phaser.GameObjects.Text[] = [];

  private static readonly MODES: { id: GameMode; name: string; desc: string }[] = [
    { id: 'coop', name: 'COOPERATIVO', desc: 'Joguem juntos dividindo vidas e pontos.\nQuem cair renasce ao lado do parceiro.' },
    { id: 'race', name: 'CORRIDA', desc: 'Quem chegar primeiro ao portal vence!\nVidas infinitas, cada um com seu checkpoint.' },
  ];

  constructor() {
    super('TwoPlayer');
  }

  create(): void {
    this.tick = createMenuBackdrop(this, 0);
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.ink, 0.55).setOrigin(0);
    const cx = GAME_WIDTH / 2;
    pixelText(this, cx, 22, '2 JOGADORES', { size: 14, color: COLORS.yellow }).setOrigin(0.5);

    this.modeText = pixelText(this, cx, 58, '', { size: 10 }).setOrigin(0.5);
    this.levelText = pixelText(this, cx, 84, '', { size: 10 }).setOrigin(0.5);
    this.descText = pixelText(this, cx, 116, '', { size: 8, color: COLORS.cyan, align: 'center' }).setOrigin(0.5).setLineSpacing(4);
    this.cursors = [58, 84].map((y) => pixelText(this, 0, y, '>', { size: 10, color: COLORS.yellow }).setOrigin(0.5));

    // Controles de cada jogador
    this.add.image(cx - 110, 160, 'pix', 0).setScale(2);
    this.add.image(cx + 110, 160, ensurePixSkin(this, 'p2', PLAYER2_COLORS), 0).setScale(2);
    pixelText(this, cx - 110, 186, 'JOGADOR 1\nA D  mover\nW  pular\nS  dash\nE  investida', { size: 8, align: 'center', color: COLORS.lightGreen }).setOrigin(0.5, 0).setLineSpacing(3);
    pixelText(this, cx + 110, 186, 'JOGADOR 2\nSetas  mover\nCima  pular\nBaixo  dash\nEnter  investida', { size: 8, align: 'center', color: COLORS.cyan }).setOrigin(0.5, 0).setLineSpacing(3);
    pixelText(this, cx, GAME_HEIGHT - 10, 'Enter/Espaço: jogar   Esc: voltar', { size: 8, color: COLORS.gray }).setOrigin(0.5);

    const kb = this.input.keyboard;
    kb?.on('keydown-UP', () => this.moveRow(-1));
    kb?.on('keydown-DOWN', () => this.moveRow(1));
    kb?.on('keydown-W', () => this.moveRow(-1));
    kb?.on('keydown-S', () => this.moveRow(1));
    kb?.on('keydown-LEFT', () => this.change(-1));
    kb?.on('keydown-RIGHT', () => this.change(1));
    kb?.on('keydown-A', () => this.change(-1));
    kb?.on('keydown-D', () => this.change(1));
    kb?.on('keydown-ENTER', () => this.start());
    kb?.on('keydown-SPACE', () => this.start());
    kb?.on('keydown-ESC', () => this.scene.start('Menu'));

    this.modeText.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      this.row = 0;
      this.change(1);
    });
    this.levelText.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      this.row = 1;
      this.change(1);
    });
    pixelText(this, cx, 140, '[ JOGAR ]', { size: 10, color: COLORS.lightGreen })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.start());
    this.refresh();
  }

  private moveRow(dir: number): void {
    this.row = Phaser.Math.Wrap(this.row + dir, 0, 2);
    sfx.play('select');
    this.refresh();
  }

  private change(dir: number): void {
    if (this.row === 0) this.modeIndex = Phaser.Math.Wrap(this.modeIndex + dir, 0, TwoPlayerScene.MODES.length);
    else this.levelIndex = Phaser.Math.Wrap(this.levelIndex + dir, 0, saveManager.get().unlockedLevels);
    sfx.play('select');
    this.refresh();
  }

  private refresh(): void {
    const mode = TwoPlayerScene.MODES[this.modeIndex];
    const level = LEVELS[this.levelIndex];
    this.modeText.setText(`<  ${mode.name}  >`);
    this.levelText.setText(`<  FASE ${level.id}: ${level.name}  >`);
    this.descText.setText(mode.desc);
    this.cursors.forEach((c, i) => {
      const target = i === 0 ? this.modeText : this.levelText;
      c.setPosition(target.x - target.width / 2 - 12, target.y).setVisible(i === this.row);
    });
  }

  private start(): void {
    sfx.unlock();
    sfx.play('confirm');
    this.scene.start('Level', { levelIndex: this.levelIndex, mode: TwoPlayerScene.MODES[this.modeIndex].id });
  }

  update(): void {
    this.tick();
  }
}
