import Phaser from 'phaser';
import { COLORS } from '../gfx/palette';
import { GAME_HEIGHT, GAME_WIDTH } from '../gfx/textures';
import { isTouchDevice, touchState, usingTouch } from '../input/touchState';
import { formatScore, formatTime, formatTimePrecise } from '../logic/score';
import { pixelText } from '../ui/text';
import { TouchControls } from '../ui/TouchControls';
import { POWERUPS } from '../logic/powerups';
import { t } from '../i18n';
import type { LevelScene } from './LevelScene';

/** HUD: vidas, moedas, tempo, placar, barra do chefe e controles de toque. */
export class HUDScene extends Phaser.Scene {
  private level!: LevelScene;
  private livesText!: Phaser.GameObjects.Text;
  private coinsText!: Phaser.GameObjects.Text;
  /** Cooperativo: vidas de cada jogador e o ícone de moeda que acompanha o contador. */
  private coopLives: Phaser.GameObjects.Text[] = [];
  private coinIcon!: Phaser.GameObjects.Image;
  private timeText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private bossBar!: Phaser.GameObjects.Container;
  private bossFill!: Phaser.GameObjects.Rectangle;
  private bossLabel!: Phaser.GameObjects.Text;
  private touch: TouchControls | null = null;
  private speedText: Phaser.GameObjects.Text | null = null;
  private last = { lives: -1, score: -1, coins: -1, time: -1 };
  private raceMarkers: Phaser.GameObjects.Image[] = [];

  constructor() {
    super('HUD');
  }

  init(data: { level: LevelScene }): void {
    this.level = data.level;
    this.touch = null;
    this.speedText = null;
    this.last = { lives: -1, score: -1, coins: -1, time: -1 };
  }

  create(): void {
    this.add.rectangle(0, 0, GAME_WIDTH, 20, COLORS.ink, 0.55).setOrigin(0);

    const info = this.level.getLevelInfo();
    const race = info.mode === 'race';
    const coop = info.mode === 'coop';
    this.coopLives = [];
    if (coop) {
      // Cooperativo: "P1 ♥ 5   P2 ♥ 5" à esquerda, nas cores das etiquetas dos jogadores.
      this.livesText = pixelText(this, 0, 0, '', { size: 8 }).setVisible(false);
      [COLORS.lightGreen, COLORS.cyan].forEach((color, i) => {
        const x0 = 8 + i * 62;
        pixelText(this, x0, 6, `P${i + 1}`, { size: 8, color });
        this.heartIcon(x0 + 27);
        this.coopLives.push(pixelText(this, x0 + 38, 6, '', { size: 8 }).setOrigin(0, 0));
      });
      // Moedas à esquerda do nome da fase, espelhando o tempo do outro lado.
      this.coinsText = pixelText(this, GAME_WIDTH / 2 - 46, 6, '0/0', { size: 8, color: COLORS.yellow }).setOrigin(1, 0);
      this.coinIcon = this.add.image(0, 10, 'coin', 0);
    } else {
      if (race) this.add.image(10, 10, 'star').setScale(1.25);
      else this.heartIcon(10);
      this.livesText = pixelText(this, 18, 6, race ? t('hud.race') : '', { size: 8, color: race ? COLORS.yellow : COLORS.white });
      this.coinIcon = this.add.image(race ? 100 : 58, 10, 'coin', 0);
      this.coinsText = pixelText(this, race ? 108 : 66, 6, '0/0', { size: 8, color: COLORS.yellow });
    }
    pixelText(this, GAME_WIDTH / 2, 6, info.label, { size: 8, color: COLORS.cyan }).setOrigin(0.5, 0);
    if (info.powerup) {
      const pu = POWERUPS.find((p) => p.id === info.powerup)!;
      this.add.circle(GAME_WIDTH / 2 - 72, 10, 6, pu.color).setStrokeStyle(1, COLORS.white);
      pixelText(this, GAME_WIDTH / 2 - 72, 26, t(`power.${pu.id}.name`), { size: 8, color: COLORS.white }).setOrigin(0.5, 0).setAlpha(0.8);
    }
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
    if (race) this.createRaceBar();
    else if (info.mode === 'coop') pixelText(this, GAME_WIDTH / 2, 24, t('hud.coop'), { size: 8, color: COLORS.lightGreen }).setOrigin(0.5, 0).setAlpha(0.8);
    this.level.events.on('panel', this.showPanel, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.level.events.off('panel', this.showPanel, this));
    this.showLevelCard(info.custom ? t('hud.custom') : info.label, info.name, info.subtitle);

    // Dois jogadores no celular: cada um com joystick e botões no seu lado da tela.
    if (isTouchDevice() || usingTouch()) this.touch = new TouchControls(this, {}, info.mode === 'single' ? 1 : 2);
  }

  /**
   * Coração das vidas. O desenho ocupa só 7x7 da textura 8x8 (sobra embaixo e à direita),
   * então a origem vai para o centro do desenho e ele desce até a linha média dos textos.
   */
  private heartIcon(x: number): void {
    this.add.image(x, 11, 'heart').setOrigin(3.5 / 8, 3.5 / 8).setScale(1.25);
  }

  private createBossBar(): void {
    const w = 200;
    this.bossBar = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT - 14).setVisible(false);
    const label = pixelText(this, 0, -10, '', { size: 8, color: COLORS.orange }).setOrigin(0.5);
    this.bossLabel = label;
    const bg = this.add.rectangle(0, 2, w + 4, 8, COLORS.ink).setStrokeStyle(1, COLORS.white);
    this.bossFill = this.add.rectangle(-w / 2, 2, w, 4, COLORS.red).setOrigin(0, 0.5);
    this.bossBar.add([label, bg, this.bossFill]);
  }

  private createRaceBar(): void {
    const y = GAME_HEIGHT - 8;
    const x0 = 120;
    const w = GAME_WIDTH - 240;
    this.add.rectangle(x0, y, w, 4, COLORS.ink, 0.7).setOrigin(0, 0.5).setStrokeStyle(1, COLORS.white, 0.6);
    this.add.image(x0 + w + 8, y - 4, 'portal', 0).setScale(0.5);
    const [t1, t2] = this.level.playerTextures();
    const p1 = this.add.image(x0, y - 6, t1 ?? 'pix', 0).setScale(0.75);
    const p2 = this.add.image(x0, y - 6, t2 ?? 'pix', 0).setScale(0.75);
    this.raceMarkers = [p1, p2];
    this.raceMarkers.forEach((m) => m.setData('x0', x0).setData('w', w));
  }

  /** Painel central (fim de fase / resultado da corrida). */
  private showPanel(data: { title: string; lines: string[]; footer: string; color: number }): void {
    const cx = GAME_WIDTH / 2;
    const c = this.add.container(cx, GAME_HEIGHT / 2).setDepth(50);
    c.add(this.add.rectangle(0, 0, 300, 150, COLORS.ink, 0.88).setStrokeStyle(2, data.color));
    c.add(pixelText(this, 0, -57, data.title, { size: 14, color: data.color }).setOrigin(0.5));
    c.add(pixelText(this, 0, -3, data.lines.join('\n'), { size: 8, scalable: true }).setOrigin(0.5).setLineSpacing(6));
    c.add(pixelText(this, 0, 45, data.footer, { size: 8, color: COLORS.lightGreen }).setOrigin(0.5));
    c.setAlpha(0);
    this.tweens.add({ targets: c, alpha: 1, duration: 300, delay: 300 });
    this.touch?.setVisible(false);
  }

  private showLevelCard(n: string, name: string, subtitle: string): void {
    const card = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30);
    card.add(this.add.rectangle(0, 0, 320, 56, COLORS.ink, 0.8).setStrokeStyle(2, COLORS.yellow));
    card.add(pixelText(this, 0, -14, n, { size: 8, color: COLORS.cyan }).setOrigin(0.5));
    card.add(pixelText(this, 0, 2, name.toUpperCase(), { size: 12, color: COLORS.yellow }).setOrigin(0.5));
    card.add(pixelText(this, 0, 18, subtitle, { size: 8, scalable: true }).setOrigin(0.5));
    card.setScale(0.6).setAlpha(0);
    this.tweens.add({ targets: card, scale: 1, alpha: 1, duration: 300, ease: 'Back.easeOut' });
    this.tweens.add({ targets: card, alpha: 0, y: card.y - 20, delay: 2200, duration: 400, onComplete: () => card.destroy() });
  }

  update(): void {
    // O botão da investida aparece assim que a habilidade é conquistada.
    if (this.touch && !this.touch.has('charge') && this.level.hasAbility('charge')) {
      this.touch.add('charge');
    }
    this.touch?.update();
    const s = this.level.getHudState();
    const livesKey = s.lives2 === null ? s.lives : s.lives * 100 + s.lives2;
    if (s.mode !== 'race' && livesKey !== this.last.lives) {
      if (s.lives2 !== null && this.coopLives.length === 2) {
        [s.lives, s.lives2].forEach((lives, i) => {
          const text = this.coopLives[i];
          if (text.text === String(lives)) return;
          if (this.last.lives !== -1) this.tweens.add({ targets: text, scale: 1.4, duration: 120, yoyo: true });
          text.setText(String(lives)).setColor(lives === 0 ? '#b13e53' : '#f4f4f4');
        });
      } else {
        if (this.last.lives !== -1) this.tweens.add({ targets: this.livesText, scale: 1.4, duration: 120, yoyo: true });
        this.livesText.setText(`x${s.lives}`);
      }
    }
    if (s.mode === 'race') {
      this.coinsText.setText(`P1 ${s.raceCoins[0]}  P2 ${s.raceCoins[1]}`);
      this.raceMarkers.forEach((m, i) => m.setX((m.getData('x0') as number) + (m.getData('w') as number) * (s.raceProgress[i] ?? 0)));
    } else if (s.coins !== this.last.coins) {
      this.coinsText.setText(`${s.coins}/${s.coinsTotal}`);
      // No cooperativo o texto cresce para a esquerda: o ícone acompanha.
      if (this.coopLives.length > 0) this.coinIcon.setX(this.coinsText.x - this.coinsText.width - 8);
    }
    if (s.score !== this.last.score) this.scoreText.setText(formatScore(s.score));
    if (s.speedrun) {
      this.timeText.setText(formatTimePrecise(s.time));
      this.speedText ??= pixelText(this, GAME_WIDTH / 2, 24, '', { size: 8 }).setOrigin(0.5, 0);
      const delta = s.speedrun.delta;
      this.speedText.setText(`TOTAL ${formatTimePrecise(s.speedrun.total)}${delta !== null ? `  +${formatTimePrecise(delta)}` : ''}`);
      // setColor redesenha o texto; só chama quando a cor muda.
      const color = delta !== null ? '#b13e53' : '#73eff7';
      if (this.speedText.style.color !== color) this.speedText.setColor(color);
    }
    const t = Math.floor(s.time);
    if (t !== this.last.time && !s.speedrun) this.timeText.setText(formatTime(t));
    this.last = { lives: livesKey, score: s.score, coins: s.coins, time: t };

    this.bossBar.setVisible(s.bossVisible);
    if (s.bossVisible) {
      if (this.bossLabel.text !== s.bossName) this.bossLabel.setText(s.bossName);
      const target = Math.max(0, s.bossHp / s.bossMax);
      this.bossFill.scaleX += (target - this.bossFill.scaleX) * 0.2;
    }
  }
}
