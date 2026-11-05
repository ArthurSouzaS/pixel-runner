import Phaser from 'phaser';
import { t } from '../i18n';
import { sfx } from '../audio/Sfx';
import { COLORS } from '../gfx/palette';
import { GAME_HEIGHT, GAME_WIDTH } from '../gfx/textures';
import { pixelText } from '../ui/text';
import { createMenuBackdrop } from './menuBackdrop';

/** Linhas dos créditos: chave de tradução (ou texto fixo, começando com "="), e cor. */
const CREDITS: [string, number][] = [
  ['credits.title', COLORS.yellow],
  ['', 0],
  ['credits.creation', COLORS.cyan],
  ['=Arthur Souza Soares', COLORS.white],
  ['', 0],
  ['credits.art', COLORS.cyan],
  ['credits.artText', COLORS.white],
  ['', 0],
  ['credits.music', COLORS.cyan],
  ['credits.musicText', COLORS.white],
  ['', 0],
  ['credits.levels', COLORS.cyan],
  ['credits.levelsText', COLORS.white],
  ['', 0],
  ['credits.tech', COLORS.cyan],
  ['=Phaser 3 · TypeScript · Vite · Vitest', COLORS.white],
  ['', 0],
  ['credits.font', COLORS.cyan],
  ['=Press Start 2P (SIL Open Font License)', COLORS.white],
  ['', 0],
  ['', 0],
  ['credits.thanks', COLORS.lightGreen],
];

/** Créditos rolando. Qualquer tecla ou toque volta ao menu. */
export class CreditsScene extends Phaser.Scene {
  private tick: () => void = () => {};
  private roll!: Phaser.GameObjects.Container;

  constructor() {
    super('Credits');
  }

  create(): void {
    this.tick = createMenuBackdrop(this, 8);
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.ink, 0.55).setOrigin(0);
    sfx.playMusic('credits');
    this.roll = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT + 10);
    CREDITS.forEach(([line, color], i) => {
      if (line) this.roll.add(pixelText(this, 0, i * 16, line.startsWith('=') ? line.slice(1) : t(line), { size: i === 0 ? 16 : 8, color }).setOrigin(0.5, 0));
    });
    const pix = this.add.sprite(0, CREDITS.length * 16 + 30, 'pix').play('pix-run').setScale(2);
    this.roll.add(pix);
    const back = (): void => {
      sfx.stopMusic();
      this.scene.start('Menu');
    };
    this.time.delayedCall(400, () => {
      this.input.keyboard?.once('keydown', back);
      this.input.once('pointerdown', back);
    });
  }

  update(_t: number, delta: number): void {
    this.tick();
    const end = -(CREDITS.length * 16 + 60) + GAME_HEIGHT / 2;
    if (this.roll.y > end) this.roll.y -= delta * 0.025;
  }
}
