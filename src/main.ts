import '@fontsource/press-start-2p/latin.css';
import Phaser from 'phaser';
import { sfx } from './audio/Sfx';
import { GAME_HEIGHT, GAME_WIDTH } from './gfx/textures';
import { AchievementsScene } from './scenes/AchievementsScene';
import { BootScene } from './scenes/BootScene';
import { CreditsScene } from './scenes/CreditsScene';
import { EditorScene } from './scenes/EditorScene';
import { GameOverScene } from './scenes/GameOverScene';
import { HUDScene } from './scenes/HUDScene';
import { LevelScene } from './scenes/LevelScene';
import { OptionsScene } from './scenes/OptionsScene';
import { WorldMapScene } from './scenes/WorldMapScene';
import { MenuScene } from './scenes/MenuScene';
import { PauseScene } from './scenes/PauseScene';
import { ShopScene } from './scenes/ShopScene';
import { ToastScene } from './scenes/ToastScene';
import { TutorialScene } from './scenes/TutorialScene';
import { TwoPlayerScene } from './scenes/TwoPlayerScene';
import { gamepads } from './input/gamepad';
import { touchState } from './input/touchState';
import { saveManager } from './systems/saveManager';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#1a1c2c',
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 950 },
      debug: false,
      tileBias: 20,
    },
  },
  input: {
    activePointers: 4,
  },
  scene: [BootScene, MenuScene, WorldMapScene, OptionsScene, TwoPlayerScene, EditorScene, ShopScene, AchievementsScene, CreditsScene, LevelScene, HUDScene, PauseScene, TutorialScene, GameOverScene, ToastScene],
};

// O AudioContext só pode começar após um gesto do usuário.
const unlockAudio = (): void => sfx.unlock();
window.addEventListener('pointerdown', unlockAudio);
window.addEventListener('keydown', unlockAudio);
window.addEventListener('touchstart', unlockAudio, { passive: true });

// Tecla M liga/desliga o som em qualquer tela.
window.addEventListener('keydown', (event) => {
  if (event.key === 'm' || event.key === 'M') saveManager.toggleMute();
});

// Estatísticas ficam em memória e são gravadas de tempos em tempos e ao sair.
setInterval(() => saveManager.flush(), 15000);
window.addEventListener('pagehide', () => saveManager.flush());
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') saveManager.flush();
});

async function start(): Promise<void> {
  // Espera a fonte pixel carregar (com limite de tempo) para os textos não piscarem.
  try {
    await Promise.race([document.fonts.load('8px "Press Start 2P"'), new Promise((resolve) => setTimeout(resolve, 1500))]);
  } catch {
    // Segue com a fonte reserva.
  }
  const game = new Phaser.Game(config);
  // Gamepads: lidos a cada quadro; fora da fase (ou com ela pausada) navegam pelos menus.
  game.events.on(Phaser.Core.Events.PRE_STEP, (time: number) => {
    gamepads.update(game.scene.isActive('Level'), time);
  });
  // Em desenvolvimento, expõe o jogo para depuração e testes automatizados no navegador.
  if (import.meta.env.DEV) Object.assign(window, { game, touchState });
}

void start();
