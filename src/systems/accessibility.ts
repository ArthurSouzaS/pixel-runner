import Phaser from 'phaser';
import { daltonizeMatrix, toColorMatrix, type AccessSettings } from '../logic/accessibility';
import { saveManager } from './saveManager';

/**
 * Aplica as opções de acessibilidade no Phaser:
 *  - tremida de câmera e flashes podem ser desligados (vale para o jogo todo);
 *  - filtro de cores para daltonismo em todas as cenas (WebGL).
 */
export function installAccessibility(game: Phaser.Game): void {
  const Camera = Phaser.Cameras.Scene2D.Camera.prototype;
  const shake = Camera.shake;
  const flash = Camera.flash;
  Camera.shake = function (this: Phaser.Cameras.Scene2D.Camera, ...args: Parameters<typeof shake>) {
    return saveManager.get().access.shake ? shake.apply(this, args) : this;
  };
  Camera.flash = function (this: Phaser.Cameras.Scene2D.Camera, ...args: Parameters<typeof flash>) {
    return saveManager.get().access.flash ? flash.apply(this, args) : this;
  };

  const apply = (scene: Phaser.Scene, access: AccessSettings) => applyColorFilter(scene, access);
  game.events.once(Phaser.Core.Events.READY, () => {
    for (const scene of game.scene.scenes) {
      scene.events.on(Phaser.Scenes.Events.CREATE, () => apply(scene, saveManager.get().access));
    }
  });
  saveManager.onAccessChange((access) => {
    for (const scene of game.scene.getScenes(true)) apply(scene, access);
  });
}

const filters = new WeakMap<Phaser.Cameras.Scene2D.Camera, Phaser.Display.ColorMatrix>();

function applyColorFilter(scene: Phaser.Scene, access: AccessSettings): void {
  if (scene.game.renderer.type !== Phaser.WEBGL) return;
  const cam = scene.cameras?.main;
  if (!cam?.postFX) return;
  const existing = filters.get(cam);
  if (access.colorblind === 'off') {
    if (existing) {
      cam.postFX.clear();
      filters.delete(cam);
    }
    return;
  }
  const fx = existing ?? (cam.postFX.addColorMatrix() as unknown as Phaser.Display.ColorMatrix);
  fx.set(toColorMatrix(daltonizeMatrix(access.colorblind)));
  filters.set(cam, fx);
}
