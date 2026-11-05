import Phaser from 'phaser';
import { sfx } from '../audio/Sfx';
import { COLORS } from '../gfx/palette';
import { GAME_HEIGHT, GAME_WIDTH } from '../gfx/textures';
import { isTouchDevice, touchState } from '../input/touchState';
import { formatScore, formatTime } from '../logic/score';
import { pixelText } from '../ui/text';
import type { LevelScene } from './LevelScene';

interface TouchButton {
  id: 'left' | 'right' | 'jump' | 'dash';
  x: number;
  y: number;
  r: number;
  gfx: Phaser.GameObjects.Container;
  pressed: boolean;
}

/** HUD: vidas, moedas, tempo, placar, barra do chefe e controles de toque. */
export class HUDScene extends Phaser.Scene {
  private level!: LevelScene;
  private livesText!: Phaser.GameObjects.Text;
  private coinsText!: Phaser.GameObjects.Text;
  private timeText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private bossBar!: Phaser.GameObjects.Container;
  private bossFill!: Phaser.GameObjects.Rectangle;
  private buttons: TouchButton[] = [];
  private last = { lives: -1, score: -1, coins: -1, time: -1 };

  constructor() {
    super('HUD');
  }

  init(data: { level: LevelScene }): void {
    this.level = data.level;
    this.buttons = [];
    this.last = { lives: -1, score: -1, coins: -1, time: -1 };
  }

  create(): void {
    this.add.rectangle(0, 0, GAME_WIDTH, 20, COLORS.ink, 0.55).setOrigin(0);

    this.add.image(10, 10, 'heart').setScale(1.25);
    this.livesText = pixelText(this, 18, 6, 'x3', { size: 8 });

    this.add.image(58, 10, 'coin', 0);
    this.coinsText = pixelText(this, 66, 6, '0/0', { size: 8, color: COLORS.yellow });

    const info = this.level.getLevelInfo();
    pixelText(this, GAME_WIDTH / 2, 6, `FASE ${info.number}`, { size: 8, color: COLORS.cyan }).setOrigin(0.5, 0);
    this.timeText = pixelText(this, GAME_WIDTH / 2 + 46, 6, '0:00', { size: 8 });

    this.scoreText = pixelText(this, GAME_WIDTH - 30, 6, '0000000', { size: 8 }).setOrigin(1, 0);

    // Botão de pausa (funciona com mouse e toque)
    const pause = this.add.container(GAME_WIDTH - 12, 10);
    pause.add(this.add.rectangle(0, 0, 16, 14, COLORS.white, 0.15).setStrokeStyle(1, COLORS.white, 0.6));
    pause.add(this.add.rectangle(-3, 0, 3, 8, COLORS.white));
    pause.add(this.add.rectangle(3, 0, 3, 8, COLORS.white));
    pause.setSize(22, 20).setInteractive({ useHandCursor: true });
    pause.on('pointerdown', () => {
      touchState.pauseQueued = true;
    });

    this.createBossBar();
    this.showLevelCard(info.number, info.name, info.subtitle);

    if (isTouchDevice()) this.createTouchControls();
  }

  private createBossBar(): void {
    const w = 200;
    this.bossBar = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT - 14).setVisible(false);
    const label = pixelText(this, 0, -10, 'NÚCLEO ANCESTRAL', { size: 8, color: COLORS.orange }).setOrigin(0.5);
    const bg = this.add.rectangle(0, 2, w + 4, 8, COLORS.ink).setStrokeStyle(1, COLORS.white);
    this.bossFill = this.add.rectangle(-w / 2, 2, w, 4, COLORS.red).setOrigin(0, 0.5);
    this.bossBar.add([label, bg, this.bossFill]);
  }

  private showLevelCard(n: number, name: string, subtitle: string): void {
    const card = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30);
    card.add(this.add.rectangle(0, 0, 320, 56, COLORS.ink, 0.8).setStrokeStyle(2, COLORS.yellow));
    card.add(pixelText(this, 0, -14, `FASE ${n}`, { size: 8, color: COLORS.cyan }).setOrigin(0.5));
    card.add(pixelText(this, 0, 2, name.toUpperCase(), { size: 12, color: COLORS.yellow }).setOrigin(0.5));
    card.add(pixelText(this, 0, 18, subtitle, { size: 8 }).setOrigin(0.5));
    card.setScale(0.6).setAlpha(0);
    this.tweens.add({ targets: card, scale: 1, alpha: 1, duration: 300, ease: 'Back.easeOut' });
    this.tweens.add({ targets: card, alpha: 0, y: card.y - 20, delay: 2200, duration: 400, onComplete: () => card.destroy() });
  }

  // -------------------------------------------------------------------------
  // Controles de toque
  // -------------------------------------------------------------------------

  private makeButton(id: TouchButton['id'], x: number, y: number, r: number, label: string | null, rotation = 0): void {
    const c = this.add.container(x, y);
    const circle = this.add.circle(0, 0, r, COLORS.white, 0.18).setStrokeStyle(2, COLORS.white, 0.5);
    c.add(circle);
    if (label) {
      c.add(pixelText(this, 0, 1, label, { size: 12 }).setOrigin(0.5).setAlpha(0.85));
    } else {
      c.add(this.add.image(0, 0, 'button-arrow').setScale(1.6).setRotation(rotation).setAlpha(0.85));
    }
    this.buttons.push({ id, x, y, r, gfx: c, pressed: false });
  }

  private createTouchControls(): void {
    this.input.addPointer(3);
    const by = GAME_HEIGHT - 36;
    this.makeButton('left', 38, by, 24, null, -Math.PI / 2);
    this.makeButton('right', 100, by, 24, null, Math.PI / 2);
    this.makeButton('dash', GAME_WIDTH - 100, by + 6, 22, 'B');
    this.makeButton('jump', GAME_WIDTH - 40, by - 12, 26, 'A');
  }

  /** Lê todos os dedos na tela a cada frame (permite deslizar entre botões). */
  private updateTouches(): void {
    if (this.buttons.length === 0) return;
    const pointers = this.input.manager.pointers.filter((p) => p.isDown);
    for (const button of this.buttons) {
      const pressed = pointers.some((p) => Phaser.Math.Distance.Between(p.x, p.y, button.x, button.y) < button.r * 1.35);
      if (pressed && !button.pressed) {
        sfx.unlock();
        if (button.id === 'jump') touchState.jumpQueued = true;
        if (button.id === 'dash') touchState.dashQueued = true;
      }
      button.pressed = pressed;
      touchState[button.id] = pressed;
      button.gfx.setScale(pressed ? 0.9 : 1).setAlpha(pressed ? 1 : 0.75);
    }
  }

  update(): void {
    this.updateTouches();
    const s = this.level.getHudState();
    if (s.lives !== this.last.lives) {
      if (this.last.lives !== -1) {
        this.tweens.add({ targets: this.livesText, scale: 1.4, duration: 120, yoyo: true });
      }
      this.livesText.setText(`x${s.lives}`);
    }
    if (s.coins !== this.last.coins) this.coinsText.setText(`${s.coins}/${s.coinsTotal}`);
    if (s.score !== this.last.score) this.scoreText.setText(formatScore(s.score));
    const t = Math.floor(s.time);
    if (t !== this.last.time) this.timeText.setText(formatTime(t));
    this.last = { lives: s.lives, score: s.score, coins: s.coins, time: t };

    this.bossBar.setVisible(s.bossVisible);
    if (s.bossVisible) {
      const target = Math.max(0, s.bossHp / s.bossMax);
      this.bossFill.scaleX += (target - this.bossFill.scaleX) * 0.2;
    }
  }
}
