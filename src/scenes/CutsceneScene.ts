import Phaser from 'phaser';
import { sfx } from '../audio/Sfx';
import { COLORS } from '../gfx/palette';
import { ensurePixSkin } from '../gfx/skins';
import { GAME_HEIGHT, GAME_WIDTH } from '../gfx/textures';
import { t } from '../i18n';
import { findSkin } from '../logic/shop';
import { CUTSCENES, type CutsceneId, NPCS } from '../story/story';
import { saveManager } from '../systems/saveManager';
import { DialogueBox } from '../ui/DialogueBox';
import { pixelText } from '../ui/text';
import { createMenuBackdrop } from './menuBackdrop';

export interface CutsceneData {
  id: CutsceneId;
  /** Para onde ir no fim. */
  next: { scene: string; data?: object };
}

/** Cena curta de história entre os mundos: personagens em cena e diálogo. */
export class CutsceneScene extends Phaser.Scene {
  private tick: () => void = () => {};

  constructor() {
    super('Cutscene');
  }

  create(data: CutsceneData): void {
    const cutscene = CUTSCENES[data.id];
    saveManager.markStory(data.id);
    this.tick = createMenuBackdrop(this, cutscene.backdrop);
    sfx.playMusic('worldmap');
    this.cameras.main.fadeIn(500, 26, 28, 44);

    // Personagens em cena, de pé sobre o chão do cenário.
    const groundY = GAME_HEIGHT - 32 - 16;
    const spacing = 90;
    const startX = GAME_WIDTH / 2 - ((cutscene.cast.length - 1) * spacing) / 2;
    cutscene.cast.forEach((speaker, i) => {
      const x = startX + i * spacing;
      let sprite: Phaser.GameObjects.Sprite;
      if (speaker === 'pix') {
        const skin = findSkin(saveManager.get().equippedSkin);
        const key = ensurePixSkin(this, skin.id, skin.colors);
        sprite = this.add.sprite(x, groundY, key, 0).play(`${key}-idle`);
      } else {
        sprite = this.add.sprite(x, groundY, NPCS[speaker].texture, 0).play(`npc-${speaker}-idle`).setFlipX(true);
      }
      sprite.setScale(2).setOrigin(0.5, 1).setY(groundY + 16);
      sprite.setAlpha(0);
      this.tweens.add({ targets: sprite, alpha: 1, y: sprite.y, duration: 400, delay: 200 + i * 150 });
    });

    const skip = pixelText(this, GAME_WIDTH - 8, 8, t('cutscene.skip'), { size: 8, color: COLORS.gray }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    const finish = (): void => {
      this.cameras.main.fadeOut(400, 26, 28, 44);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start(data.next.scene, data.next.data));
    };
    skip.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, e: Phaser.Types.Input.EventData) => {
      e.stopPropagation();
      finish();
    });
    this.input.keyboard?.on('keydown-ESC', finish);

    const box = new DialogueBox(this);
    this.time.delayedCall(800, () => box.play(cutscene.lines, finish));
  }

  update(): void {
    this.tick();
  }
}
