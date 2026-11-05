import Phaser from 'phaser';
import { COLORS } from '../gfx/palette';
import { GAME_HEIGHT, GAME_WIDTH } from '../gfx/textures';
import { t } from '../i18n';
import { MISSIONS, missionStatus, objectiveTarget } from '../logic/missions';
import { NPCS } from '../story/story';
import { saveManager } from '../systems/saveManager';
import { pixelText } from '../ui/text';

/** Quadro de missões: lista as missões, quem dá, o progresso e a recompensa. */
export class MissionLogScene extends Phaser.Scene {
  constructor() {
    super('MissionLog');
  }

  create(data: { from?: string } = {}): void {
    const back = data.from ?? 'Hub';
    const save = saveManager.get();
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x5e3a28).setOrigin(0);
    this.add.rectangle(8, 8, GAME_WIDTH - 16, GAME_HEIGHT - 16, 0xffcd75).setOrigin(0).setStrokeStyle(3, COLORS.ink);
    pixelText(this, GAME_WIDTH / 2, 22, t('mission.log.title'), { size: 14, color: COLORS.ink, strokeThickness: 0 }).setOrigin(0.5);

    const visible = MISSIONS.filter((m) => missionStatus(save.missions, m, save.unlockedLevels) !== 'locked');
    if (visible.length === 0) {
      pixelText(this, GAME_WIDTH / 2, GAME_HEIGHT / 2, t('mission.log.empty'), { size: 8, color: COLORS.ink, strokeThickness: 0, wrap: 400, align: 'center' }).setOrigin(0.5);
    }
    visible.forEach((m, i) => {
      const y = 42 + i * 19;
      const status = missionStatus(save.missions, m, save.unlockedLevels);
      const prog = save.missions.missions[m.id];
      const npc = t(NPCS[m.giver].nameKey);
      const color = status === 'claimed' ? COLORS.darkGray : status === 'done' ? COLORS.green : COLORS.ink;
      const icon = status === 'claimed' ? '✓' : status === 'done' ? '★' : m.type === 'main' ? '◆' : '•';
      pixelText(this, 18, y, `${icon} ${t(`mission.${m.id}.title`)}`, { size: 8, color, strokeThickness: 0 });
      let detail = t(`mission.status.${status}`, { npc });
      if (status === 'active') detail = `${t('mission.status.active')} ${prog.progress}/${objectiveTarget(m.objective)}`;
      pixelText(this, 18, y + 9, detail, { size: 8, color: COLORS.purple, strokeThickness: 0 }).setScale(0.75);
      const reward = t('mission.rewardShort', { coins: m.reward.coins }) + (m.reward.skin ? ' + skin' : '');
      pixelText(this, GAME_WIDTH - 18, y, reward, { size: 8, color: COLORS.ink, strokeThickness: 0 }).setOrigin(1, 0);
    });
    pixelText(this, GAME_WIDTH / 2, GAME_HEIGHT - 18, t('mission.back'), { size: 8, color: COLORS.ink, strokeThickness: 0 }).setOrigin(0.5);
    const leave = (): void => {
      this.scene.start(back);
    };
    this.input.keyboard?.on('keydown-ESC', leave);
    this.input.keyboard?.on('keydown-ENTER', leave);
    this.time.delayedCall(300, () => this.input.once('pointerdown', leave));
  }
}
