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

    const kb = scene.input.keyboard;
    kb?.on('keydown-UP', () => this.move(-1));
    kb?.on('keydown-W', () => this.move(-1));
    kb?.on('keydown-DOWN', () => this.move(1));
    kb?.on('keydown-S', () => this.move(1));
    kb?.on('keydown-ENTER', () => this.activate());
    kb?.on('keydown-SPACE', () => this.activate());
    kb?.on('keydown-Z', () => this.activate());
    this.refresh();
  }

  private labelOf(item: MenuItem): string {
    return typeof item.label === 'function' ? item.label() : item.label;
  }

  private isEnabled(i: number): boolean {
    return this.items[i].enabled?.() ?? true;
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
