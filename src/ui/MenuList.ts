import Phaser from 'phaser';
import { sfx } from '../audio/Sfx';
import { COLORS, hex } from '../gfx/palette';
import { pixelText } from './text';

export interface MenuItem {
  label: string | (() => string);
  action: () => void;
  enabled?: () => boolean;
}

/**
 * Lista vertical de opções navegável por teclado (setas + Enter/Espaço),
 * mouse e toque.
 */
export class MenuList {
  private texts: Phaser.GameObjects.Text[] = [];
  private cursor: Phaser.GameObjects.Text;
  private index = 0;
  private active = true;
  private readonly keyHandlers: [string, () => void][];
  private readonly kb: Phaser.Input.Keyboard.KeyboardPlugin | null;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private items: MenuItem[],
    spacing = 18,
    size = 10,
  ) {
    items.forEach((item, i) => {
      const text = pixelText(scene, x, y + i * spacing, this.labelOf(item), { size }).setOrigin(0.5);
      text.setInteractive({ useHandCursor: true });
      text.on('pointerover', () => this.select(i, false));
      text.on('pointerdown', () => {
        this.select(i, false);
        this.activate();
      });
      this.texts.push(text);
    });
    this.cursor = pixelText(scene, 0, 0, '>', { size, color: COLORS.yellow }).setOrigin(0.5);
    scene.tweens.add({ targets: this.cursor, alpha: 0.3, duration: 400, yoyo: true, repeat: -1 });

    this.kb = scene.input.keyboard;
    this.keyHandlers = [
      ['keydown-UP', () => this.move(-1)],
      ['keydown-W', () => this.move(-1)],
      ['keydown-DOWN', () => this.move(1)],
      ['keydown-S', () => this.move(1)],
      ['keydown-ENTER', () => this.activate()],
      ['keydown-SPACE', () => this.activate()],
      ['keydown-Z', () => this.activate()],
    ];
    for (const [event, fn] of this.keyHandlers) this.kb?.on(event, fn);
    this.refresh();
  }

  private labelOf(item: MenuItem): string {
    return typeof item.label === 'function' ? item.label() : item.label;
  }

  private isEnabled(i: number): boolean {
    return this.items[i].enabled?.() ?? true;
  }

  getTexts(): Phaser.GameObjects.Text[] {
    return this.texts;
  }

  getCursor(): Phaser.GameObjects.Text {
    return this.cursor;
  }

  /** Remove os textos e os atalhos de teclado. */
  destroy(): void {
    for (const [event, fn] of this.keyHandlers) this.kb?.off(event, fn);
    this.texts.forEach((t) => t.destroy());
    this.cursor.destroy();
    this.active = false;
  }

  setActive(active: boolean): void {
    this.active = active;
    this.texts.forEach((t) => t.setVisible(active));
    this.cursor.setVisible(active);
  }

  move(dir: number): void {
    if (!this.active) return;
    let next = this.index;
    for (let n = 0; n < this.items.length; n++) {
      next = (next + dir + this.items.length) % this.items.length;
      if (this.isEnabled(next)) break;
    }
    this.select(next, true);
  }

  select(i: number, withSound: boolean): void {
    if (!this.active || !this.isEnabled(i)) return;
    if (i !== this.index && withSound) sfx.play('select');
    this.index = i;
    this.refresh();
  }

  activate(): void {
    if (!this.active || !this.isEnabled(this.index)) return;
    sfx.unlock();
    sfx.play('confirm');
    this.items[this.index].action();
    this.refresh();
  }

  refresh(): void {
    this.texts.forEach((t, i) => {
      t.setText(this.labelOf(this.items[i]));
      const enabled = this.isEnabled(i);
      t.setColor(hex(!enabled ? COLORS.darkGray : i === this.index ? COLORS.yellow : COLORS.white));
    });
    const current = this.texts[this.index];
    this.cursor.setPosition(current.x - current.width / 2 - 10, current.y);
  }
}
