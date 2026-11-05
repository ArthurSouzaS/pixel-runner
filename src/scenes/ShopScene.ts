import Phaser from 'phaser';
import { sfx } from '../audio/Sfx';
import { COLORS, hex } from '../gfx/palette';
import { ensurePixSkin } from '../gfx/skins';
import { GAME_HEIGHT, GAME_WIDTH } from '../gfx/textures';
import { type ShopCategory, type TrailItem, catalog, findSkin, findTrail, isEquipped, isOwned } from '../logic/shop';
import { saveManager } from '../systems/saveManager';
import { pixelText } from '../ui/text';
import { createMenuBackdrop } from './menuBackdrop';

/** Loja: troca as moedas por skins de cor e rastros de partícula. */
export class ShopScene extends Phaser.Scene {
  private tick: () => void = () => {};
  private category: ShopCategory = 'skin';
  private index = 0;
  private rows: Phaser.GameObjects.Text[] = [];
  private walletText!: Phaser.GameObjects.Text;
  private tabs: Phaser.GameObjects.Text[] = [];
  private preview!: Phaser.GameObjects.Sprite;
  private trail: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private infoText!: Phaser.GameObjects.Text;

  constructor() {
    super('Shop');
  }

  private from = 'Menu';

  create(data: { from?: string } = {}): void {
    this.from = data.from ?? 'Menu';
    this.tick = createMenuBackdrop(this, 0);
    this.rows = [];
    this.tabs = [];
    this.trail = null;
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.ink, 0.6).setOrigin(0);
    pixelText(this, 20, 14, 'LOJA', { size: 16, color: COLORS.yellow });
    this.add.image(GAME_WIDTH - 110, 22, 'coin', 0).setScale(1.5);
    this.walletText = pixelText(this, GAME_WIDTH - 98, 16, '', { size: 10, color: COLORS.yellow });

    (['skin', 'trail'] as ShopCategory[]).forEach((cat, i) => {
      const tab = pixelText(this, 30 + i * 100, 46, cat === 'skin' ? 'SKINS' : 'RASTROS', { size: 8 }).setInteractive({ useHandCursor: true });
      tab.on('pointerdown', () => this.setCategory(cat));
      this.tabs.push(tab);
    });

    // Vitrine
    this.add.rectangle(340, 130, 200, 150, COLORS.ink, 0.6).setStrokeStyle(2, COLORS.white, 0.3);
    this.add.rectangle(340, 180, 180, 4, COLORS.green);
    this.preview = this.add.sprite(340, 156, 'pix', 0).setScale(3).setDepth(5);
    this.tweens.add({ targets: this.preview, x: { from: 290, to: 390 }, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', onYoyo: () => this.preview.setFlipX(true), onRepeat: () => this.preview.setFlipX(false) });
    this.infoText = pixelText(this, 340, 220, '', { size: 8, align: 'center', color: COLORS.cyan }).setOrigin(0.5);

    pixelText(this, GAME_WIDTH / 2, GAME_HEIGHT - 12, 'Enter: comprar/equipar   < >: abas   Esc: voltar', { size: 8, color: COLORS.gray }).setOrigin(0.5);

    const kb = this.input.keyboard;
    kb?.on('keydown-UP', () => this.move(-1));
    kb?.on('keydown-W', () => this.move(-1));
    kb?.on('keydown-DOWN', () => this.move(1));
    kb?.on('keydown-S', () => this.move(1));
    kb?.on('keydown-LEFT', () => this.setCategory('skin'));
    kb?.on('keydown-RIGHT', () => this.setCategory('trail'));
    kb?.on('keydown-ENTER', () => this.activate());
    kb?.on('keydown-SPACE', () => this.activate());
    kb?.on('keydown-ESC', () => this.scene.start(this.from));
    const back = pixelText(this, GAME_WIDTH - 20, 46, '< VOLTAR', { size: 8, color: COLORS.gray }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    back.on('pointerdown', () => this.scene.start(this.from));

    this.setCategory('skin');
  }

  private setCategory(category: ShopCategory): void {
    if (this.category !== category) sfx.play('select');
    this.category = category;
    const save = saveManager.get();
    const items = catalog(category);
    const equipped = category === 'skin' ? save.equippedSkin : save.equippedTrail;
    this.index = Math.max(0, items.findIndex((i) => i.id === equipped));
    this.rows.forEach((r) => r.destroy());
    this.rows = items.map((_item, i) => {
      const row = pixelText(this, 30, 66 + i * 15, '', { size: 8 }).setInteractive({ useHandCursor: true });
      row.on('pointerdown', () => {
        if (this.index === i) this.activate();
        else {
          this.index = i;
          sfx.play('select');
          this.refresh();
        }
      });
      return row;
    });
    this.tabs.forEach((t, i) => t.setColor(hex((i === 0) === (category === 'skin') ? COLORS.yellow : COLORS.gray)));
    this.refresh();
  }

  private move(dir: number): void {
    this.index = Phaser.Math.Wrap(this.index + dir, 0, this.rows.length);
    sfx.play('select');
    this.refresh();
  }

  private activate(): void {
    sfx.unlock();
    const item = catalog(this.category)[this.index];
    const save = saveManager.get();
    if (isOwned(save, this.category, item.id)) {
      saveManager.equipItem(this.category, item.id);
      sfx.play('confirm');
    } else {
      const result = saveManager.buyItem(this.category, item.id);
      if (result === 'ok') {
        sfx.play('extraLife');
        this.cameras.main.flash(200, 255, 205, 117);
      } else {
        sfx.play('hurt');
        this.cameras.main.shake(150, 0.006);
        this.infoText.setText(result === 'exclusive' ? 'Recompensa de missão!' : 'Moedas insuficientes!').setColor(hex(COLORS.red));
        return;
      }
    }
    this.refresh();
  }

  private refresh(): void {
    const save = saveManager.get();
    this.walletText.setText(String(save.wallet));
    const items = catalog(this.category);
    items.forEach((item, i) => {
      const owned = isOwned(save, this.category, item.id);
      const equipped = isEquipped(save, this.category, item.id);
      const exclusive = (item as { exclusive?: boolean }).exclusive;
      const status = equipped ? 'EQUIPADO' : owned ? 'COMPRADO' : exclusive ? 'MISSÃO' : `${item.price} moedas`;
      const selected = i === this.index;
      this.rows[i]
        .setText(`${selected ? '>' : ' '} ${item.name.padEnd(10, ' ')} ${status}`)
        .setColor(hex(selected ? COLORS.yellow : equipped ? COLORS.lightGreen : owned ? COLORS.white : COLORS.gray));
    });

    // Vitrine: mostra a skin selecionada (ou a equipada, na aba de rastros) com o rastro.
    const selected = items[this.index];
    const skin = this.category === 'skin' ? findSkin(selected.id) : findSkin(save.equippedSkin);
    const trail = this.category === 'trail' ? findTrail(selected.id) : findTrail(save.equippedTrail);
    const key = ensurePixSkin(this, skin.id, skin.colors);
    this.preview.setTexture(key).play(`${key}-run`, true);
    this.setTrail(trail);
    const owned = isOwned(save, this.category, selected.id);
    this.infoText
      .setText(
        owned
          ? isEquipped(save, this.category, selected.id)
            ? 'Equipado'
            : 'Enter para equipar'
          : (selected as { exclusive?: boolean }).exclusive
            ? 'Recompensa de missão'
            : `Custa ${selected.price} moedas`,
      )
      .setColor(hex(owned || save.wallet >= selected.price ? COLORS.cyan : COLORS.red));
  }

  private setTrail(trail: TrailItem): void {
    this.trail?.destroy();
    this.trail = createTrailEmitter(this, trail, this.preview);
    this.trail?.setScale(1).setDepth(4);
  }

  update(): void {
    this.tick();
  }
}

/** Cria o emissor de partículas de um rastro seguindo um alvo (ou null se for "nenhum"). */
export function createTrailEmitter(
  scene: Phaser.Scene,
  trail: TrailItem,
  target: Phaser.GameObjects.Components.Transform,
): Phaser.GameObjects.Particles.ParticleEmitter | null {
  if (trail.tints.length === 0) return null;
  return scene.add.particles(0, 0, trail.texture, {
    follow: target,
    followOffset: { x: 0, y: 4 },
    lifespan: 500,
    frequency: 40,
    speed: { min: 4, max: 22 },
    gravityY: trail.gravity,
    scale: { start: trail.texture === 'star' ? 0.8 : 1, end: 0 },
    alpha: { start: 0.9, end: 0 },
    tint: trail.tints,
  });
}
