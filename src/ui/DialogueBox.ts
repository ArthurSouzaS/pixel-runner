import Phaser from 'phaser';
import { sfx } from '../audio/Sfx';
import { COLORS } from '../gfx/palette';
import { ensurePixSkin } from '../gfx/skins';
import { GAME_WIDTH } from '../gfx/textures';
import { t } from '../i18n';
import { findSkin } from '../logic/shop';
import { type DialogueLine, type NpcId, NPCS } from '../story/story';
import { saveManager } from '../systems/saveManager';
import { pixelText } from './text';

const BOX_H = 70;
const CHAR_MS = 24;

/**
 * Caixa de diálogo com retrato, nome e texto digitado letra por letra.
 * Avança com Enter/Espaço/Z/toque (e A no gamepad); a primeira tecla completa a frase.
 */
export class DialogueBox {
  private readonly root: Phaser.GameObjects.Container;
  private readonly portrait: Phaser.GameObjects.Sprite;
  private readonly nameText: Phaser.GameObjects.Text;
  private readonly body: Phaser.GameObjects.Text;
  private readonly arrow: Phaser.GameObjects.Text;
  private lines: DialogueLine[] = [];
  private index = 0;
  private full = '';
  private shown = 0;
  private typer: Phaser.Time.TimerEvent | null = null;
  private onDone: (() => void) | null = null;
  private openedAt = 0;
  private closedAt = -1000;
  open = false;

  /** Aberto ou fechado há pouquíssimo tempo (evita que a tecla que fechou reabra). */
  get busy(): boolean {
    return this.open || this.scene.time.now - this.closedAt < 250;
  }

  constructor(private readonly scene: Phaser.Scene) {
    // No topo da tela, para não cobrir os personagens que estão no chão.
    const y = 24;
    this.root = scene.add.container(0, y).setDepth(200).setScrollFactor(0).setVisible(false);
    this.root.add(scene.add.rectangle(6, 0, GAME_WIDTH - 12, BOX_H, COLORS.ink, 0.94).setOrigin(0).setStrokeStyle(2, COLORS.yellow));
    this.root.add(scene.add.rectangle(14, 8, 52, 52, COLORS.darkGray).setOrigin(0).setStrokeStyle(1, COLORS.white, 0.5));
    this.portrait = scene.add.sprite(40, 34, 'pix', 0).setScale(3);
    this.nameText = pixelText(scene, 76, 8, '', { size: 8, color: COLORS.yellow, scalable: true });
    this.body = pixelText(scene, 76, 22, '', { size: 8, wrap: GAME_WIDTH - 100, scalable: true }).setLineSpacing(4);
    this.arrow = pixelText(scene, GAME_WIDTH - 20, BOX_H - 12, '▼', { size: 8, color: COLORS.yellow }).setOrigin(0.5);
    scene.tweens.add({ targets: this.arrow, y: BOX_H - 9, duration: 300, yoyo: true, repeat: -1 });
    this.root.add([this.portrait, this.nameText, this.body, this.arrow]);

    const kb = scene.input.keyboard;
    for (const key of ['keydown-ENTER', 'keydown-SPACE', 'keydown-Z']) kb?.on(key, () => this.advance());
    scene.input.on('pointerdown', () => this.advance());
  }

  /** Mostra uma sequência de falas e chama `onDone` no fim. */
  play(lines: DialogueLine[], onDone?: () => void): void {
    if (lines.length === 0) {
      onDone?.();
      return;
    }
    this.lines = lines;
    this.index = 0;
    this.onDone = onDone ?? null;
    this.open = true;
    this.openedAt = this.scene.time.now;
    this.root.setVisible(true).setAlpha(0);
    this.scene.tweens.add({ targets: this.root, alpha: 1, duration: 150 });
    this.showLine();
  }

  private showLine(): void {
    const line = this.lines[this.index];
    const isPix = line.speaker === 'pix';
    if (isPix) {
      const skin = findSkin(saveManager.get().equippedSkin);
      this.portrait.setTexture(ensurePixSkin(this.scene, skin.id, skin.colors), 0);
    } else {
      this.portrait.setTexture(NPCS[line.speaker as NpcId].texture, 0);
    }
    this.nameText.setText(t(isPix ? 'npc.pix' : NPCS[line.speaker as NpcId].nameKey));
    this.full = t(line.key, line.params);
    this.shown = 0;
    this.body.setText('');
    this.arrow.setVisible(false);
    this.typer?.remove();
    this.typer = this.scene.time.addEvent({
      delay: CHAR_MS,
      loop: true,
      callback: () => {
        this.shown++;
        this.body.setText(this.full.slice(0, this.shown));
        if (this.shown % 3 === 0) sfx.play('select');
        if (this.shown >= this.full.length) this.finishTyping();
      },
    });
  }

  private finishTyping(): void {
    this.typer?.remove();
    this.typer = null;
    this.shown = this.full.length;
    this.body.setText(this.full);
    this.arrow.setVisible(true);
  }

  advance(): void {
    // Evita que a mesma tecla que abriu o diálogo já avance a primeira fala.
    if (!this.open || this.scene.time.now - this.openedAt < 200) return;
    if (this.shown < this.full.length) {
      this.finishTyping();
      return;
    }
    this.index++;
    if (this.index < this.lines.length) {
      this.showLine();
      return;
    }
    this.close();
  }

  close(): void {
    this.open = false;
    this.closedAt = this.scene.time.now;
    this.typer?.remove();
    this.root.setVisible(false);
    const done = this.onDone;
    this.onDone = null;
    // Deixa o "fim" para o próximo quadro, para a tecla não acionar outra coisa.
    this.scene.time.delayedCall(50, () => done?.());
  }
}
