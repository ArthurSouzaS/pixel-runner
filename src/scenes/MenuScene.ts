import Phaser from 'phaser';
import { sfx } from '../audio/Sfx';
import { COLORS } from '../gfx/palette';
import { GAME_HEIGHT, GAME_WIDTH } from '../gfx/textures';
import { isTouchDevice } from '../input/touchState';
import { TOTAL_LEVELS } from '../levels';
import { formatScore } from '../logic/score';
import { saveManager } from '../systems/saveManager';
import { MenuList } from '../ui/MenuList';
import { pixelText } from '../ui/text';
import { createMenuBackdrop } from './menuBackdrop';

/** Menu inicial. */
export class MenuScene extends Phaser.Scene {
  private tick: () => void = () => {};
  private menu!: MenuList;
  private controls!: Phaser.GameObjects.Container;

  constructor() {
    super('Menu');
  }

  create(): void {
    this.tick = createMenuBackdrop(this, 0);
    this.cameras.main.fadeIn(300, 26, 28, 44);
    sfx.playMusic('menu');

    const cx = GAME_WIDTH / 2;
    const title = pixelText(this, cx, 38, 'PIXEL RUNNER', { size: 28, color: COLORS.yellow, strokeThickness: 6 }).setOrigin(0.5);
    title.setShadow(3, 3, '#5d275d', 0, true, true);
    const two = pixelText(this, cx + 196, 26, '2', { size: 20, color: COLORS.red, strokeThickness: 5 }).setOrigin(0.5).setAngle(12);
    this.tweens.add({ targets: [title], y: 42, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: two, scale: 1.15, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    pixelText(this, cx, 66, 'um jogo de Arthur Souza Soares', { size: 8, color: COLORS.white }).setOrigin(0.5);

    // Pix correndo no chão do menu.
    const pix = this.add.sprite(70, GAME_HEIGHT - 40, 'pix').play('pix-run').setScale(2);
    this.tweens.add({ targets: pix, x: GAME_WIDTH - 70, duration: 5000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', onYoyo: () => pix.setFlipX(true), onRepeat: () => pix.setFlipX(false) });

    const panel = this.add.rectangle(cx, 148, 220, 142, COLORS.ink, 0.65).setStrokeStyle(2, COLORS.white, 0.4);
    panel.setDepth(-1);

    const save = saveManager.get();
    this.menu = new MenuList(
      this,
      cx,
      88,
      [
        { label: save.unlockedLevels > 1 ? 'Continuar' : 'Novo jogo', action: () => this.scene.start('LevelSelect') },
        { label: '2 jogadores', action: () => this.scene.start('TwoPlayer') },
        { label: 'Editor de fases', action: () => this.scene.start('Editor') },
        { label: 'Loja', action: () => this.scene.start('Shop') },
        { label: 'Conquistas', action: () => this.scene.start('Achievements') },
        { label: 'Controles', action: () => this.toggleControls(true) },
        { label: () => `Som: ${sfx.isMuted() ? 'Desligado' : 'Ligado'}`, action: () => saveManager.toggleMute() },
        { label: 'Créditos', action: () => this.scene.start('Credits') },
      ],
      17,
      10,
    );

    pixelText(this, 8, 6, `RECORDE ${formatScore(save.highScore)}`, { size: 8, color: COLORS.cyan });
    this.add.image(GAME_WIDTH - 84, 10, 'coin', 0);
    pixelText(this, GAME_WIDTH - 76, 6, `${save.wallet}`, { size: 8, color: COLORS.yellow });
    pixelText(this, cx, 230, `Fases ${save.unlockedLevels}/${TOTAL_LEVELS}  ·  Conquistas ${save.achievements.length}`, { size: 8, color: COLORS.white }).setOrigin(0.5);

    this.controls = this.buildControlsPanel();
    this.input.keyboard?.on('keydown-ESC', () => this.toggleControls(false));

    // Desbloqueia o áudio no primeiro toque/tecla.
    this.input.once('pointerdown', () => sfx.unlock());
    this.input.keyboard?.once('keydown', () => sfx.unlock());
  }

  private buildControlsPanel(): Phaser.GameObjects.Container {
    const cx = GAME_WIDTH / 2;
    const c = this.add.container(0, 0).setDepth(20).setVisible(false);
    c.add(this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.ink, 0.92).setOrigin(0).setInteractive());
    c.add(pixelText(this, cx, 30, 'CONTROLES', { size: 16, color: COLORS.yellow }).setOrigin(0.5));
    const lines = isTouchDevice()
      ? ['Setas da tela .... correr', 'Botão A .......... pular', 'A no ar .......... pulo duplo', 'Botão B .......... dash', 'Segurar C ........ investida*', 'II ............... pausa']
      : ['Setas / A D ......... correr', 'Espaço / W / Z / Up . pular', 'Pular no ar ......... pulo duplo', 'Shift / X / K ....... dash', 'Segurar C / L ....... investida*', 'Esc / P ............. pausa', 'M ................... som'];
    c.add(pixelText(this, cx, 106, lines.join('\n'), { size: 8 }).setOrigin(0.5).setLineSpacing(7));
    c.add(pixelText(this, cx, 190, '* Escalar, planar e investida são conquistadas\nno Mundo 2. Pise nos inimigos ou use o dash!', { size: 8, color: COLORS.cyan, align: 'center' }).setOrigin(0.5).setLineSpacing(6));
    c.add(pixelText(this, cx, 240, 'Toque ou Esc para voltar', { size: 8, color: COLORS.gray }).setOrigin(0.5));
    c.list[0].on('pointerdown', () => this.toggleControls(false));
    return c;
  }

  private toggleControls(show: boolean): void {
    if (this.controls.visible === show) return;
    // Pequeno atraso para o mesmo clique/tecla não acionar o menu de novo.
    this.time.delayedCall(50, () => {
      this.controls.setVisible(show);
      this.menu.setActive(!show);
    });
  }

  update(): void {
    this.tick();
  }
}
