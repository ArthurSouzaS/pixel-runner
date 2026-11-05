import Phaser from 'phaser';
import { sfx } from '../audio/Sfx';
import { COLORS, hex } from '../gfx/palette';
import { GAME_HEIGHT, GAME_WIDTH } from '../gfx/textures';
import { isTouchDevice } from '../input/touchState';
import { type VolumeChannel, volumeBar } from '../logic/audioSettings';
import { saveManager } from '../systems/saveManager';
import { pixelText } from '../ui/text';
import { createMenuBackdrop } from './menuBackdrop';

interface Row {
  label: () => string;
  /** Setas esquerda/direita (volume). */
  adjust?: (dir: 1 | -1) => void;
  activate?: () => void;
}

/** Opções: volume geral, música e efeitos, som ligado/desligado e controles. */
export class OptionsScene extends Phaser.Scene {
  private tick: () => void = () => {};
  private rows: Row[] = [];
  private texts: Phaser.GameObjects.Text[] = [];
  private index = 0;
  private controls!: Phaser.GameObjects.Container;

  constructor() {
    super('Options');
  }

  create(): void {
    this.tick = createMenuBackdrop(this, 5);
    this.index = 0;
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.ink, 0.6).setOrigin(0);
    pixelText(this, GAME_WIDTH / 2, 26, 'OPÇÕES', { size: 16, color: COLORS.yellow }).setOrigin(0.5);

    const volumeRow = (channel: VolumeChannel, name: string): Row => ({
      label: () => `${name.padEnd(13, ' ')} < ${volumeBar(saveManager.get().volumes[channel])} >`,
      adjust: (dir) => {
        saveManager.changeVolume(channel, dir);
        sfx.play(channel === 'music' ? 'select' : 'coin');
      },
    });
    this.rows = [
      volumeRow('master', 'Volume geral'),
      volumeRow('music', 'Música'),
      volumeRow('sfx', 'Efeitos'),
      { label: () => `Som: ${sfx.isMuted() ? 'Desligado' : 'Ligado'}`, activate: () => saveManager.toggleMute(), adjust: () => saveManager.toggleMute() },
      { label: () => 'Ver controles', activate: () => this.toggleControls(true) },
      { label: () => 'Voltar', activate: () => this.scene.start('Menu') },
    ];
    this.texts = this.rows.map((row, i) => {
      const t = pixelText(this, GAME_WIDTH / 2, 66 + i * 26, '', { size: 10 }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      t.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        this.index = i;
        if (row.adjust && !row.activate) row.adjust(pointer.x < t.x ? -1 : 1);
        else row.activate?.();
        this.refresh();
      });
      return t;
    });
    pixelText(this, GAME_WIDTH / 2, GAME_HEIGHT - 14, 'Cima/Baixo: escolher   Esquerda/Direita: ajustar', { size: 8, color: COLORS.gray }).setOrigin(0.5);

    this.controls = this.buildControlsPanel();
    const kb = this.input.keyboard;
    kb?.on('keydown-UP', () => this.move(-1));
    kb?.on('keydown-W', () => this.move(-1));
    kb?.on('keydown-DOWN', () => this.move(1));
    kb?.on('keydown-S', () => this.move(1));
    kb?.on('keydown-LEFT', () => this.adjust(-1));
    kb?.on('keydown-A', () => this.adjust(-1));
    kb?.on('keydown-RIGHT', () => this.adjust(1));
    kb?.on('keydown-D', () => this.adjust(1));
    kb?.on('keydown-ENTER', () => this.activate());
    kb?.on('keydown-SPACE', () => this.activate());
    kb?.on('keydown-ESC', () => (this.controls.visible ? this.toggleControls(false) : this.scene.start('Menu')));
    this.refresh();
  }

  private move(dir: number): void {
    if (this.controls.visible) return;
    this.index = Phaser.Math.Wrap(this.index + dir, 0, this.rows.length);
    sfx.play('select');
    this.refresh();
  }

  private adjust(dir: 1 | -1): void {
    if (this.controls.visible) return;
    this.rows[this.index].adjust?.(dir);
    this.refresh();
  }

  private activate(): void {
    if (this.controls.visible) {
      this.toggleControls(false);
      return;
    }
    const row = this.rows[this.index];
    if (row.activate) row.activate();
    else row.adjust?.(1);
    this.refresh();
  }

  private refresh(): void {
    this.texts.forEach((t, i) => t.setText(this.rows[i].label()).setColor(hex(i === this.index ? COLORS.yellow : COLORS.white)));
  }

  private buildControlsPanel(): Phaser.GameObjects.Container {
    const cx = GAME_WIDTH / 2;
    const c = this.add.container(0, 0).setDepth(20).setVisible(false);
    c.add(this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.ink, 0.94).setOrigin(0).setInteractive());
    c.add(pixelText(this, cx, 18, 'CONTROLES', { size: 14, color: COLORS.yellow }).setOrigin(0.5));
    const solo = isTouchDevice()
      ? ['Setas da tela . correr', 'Botão A ....... pular / nadar', 'A no ar ....... pulo duplo', 'Segurar A ..... planar*', 'Botão B ....... dash', 'Segurar C ..... investida*', 'Botão II ...... pausa']
      : ['Setas / A D ......... correr', 'Espaço / W / Z / Up . pular / nadar', 'Pular no ar ......... pulo duplo', 'Segurar pulo caindo . planar*', 'Contra a parede ..... escalar*', 'Shift / X / K ....... dash', 'Segurar C / L ....... investida*', 'Esc / P ............. pausa', 'M ................... som'];
    c.add(pixelText(this, 24, 40, solo.join('\n'), { size: 8 }).setLineSpacing(6));
    c.add(pixelText(this, 24, 182, '2 JOGADORES\nP1: A D mover, W pular, S dash, E investida\nP2: setas, Cima pular, Baixo dash, Enter investida', { size: 8, color: COLORS.cyan }).setLineSpacing(4));
    c.add(pixelText(this, 24, 226, 'GAMEPAD: analógico/direcional, A pular, X dash,\nB investida, Start pausa', { size: 8, color: COLORS.lightGreen }).setLineSpacing(4));
    c.add(pixelText(this, GAME_WIDTH - 10, 18, '* Mundo 2', { size: 8, color: COLORS.gray }).setOrigin(1, 0.5));
    c.list[0].on('pointerdown', () => this.toggleControls(false));
    return c;
  }

  private toggleControls(show: boolean): void {
    this.time.delayedCall(50, () => this.controls.setVisible(show));
  }

  update(): void {
    this.tick();
  }
}
