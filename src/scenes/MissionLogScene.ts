import Phaser from 'phaser';
import { sfx } from '../audio/Sfx';
import { COLORS, hex } from '../gfx/palette';
import { GAME_HEIGHT, GAME_WIDTH } from '../gfx/textures';
import { t, tk } from '../i18n';
import { MISSIONS, type Mission, missionStatus, objectiveTarget } from '../logic/missions';
import { NPCS } from '../story/story';
import { saveManager } from '../systems/saveManager';
import { pixelText } from '../ui/text';

const ROW_H = 13;
const LIST_Y = 40;
const BOX_Y = 186;

/**
 * Quadro de missões: uma linha por missão (título e recompensa) e, embaixo, os detalhes
 * da missão escolhida — tudo em tamanho de leitura (antes o status vinha em letra miúda).
 */
export class MissionLogScene extends Phaser.Scene {
  private rows: Phaser.GameObjects.Text[] = [];
  private missions: Mission[] = [];
  private index = 0;
  private detail!: Phaser.GameObjects.Text;
  private status!: Phaser.GameObjects.Text;
  private cursor!: Phaser.GameObjects.Text;

  constructor() {
    super('MissionLog');
  }

  create(data: { from?: string } = {}): void {
    const back = data.from ?? 'Hub';
    const save = saveManager.get();
    this.rows = [];
    this.index = 0;
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x5e3a28).setOrigin(0);
    this.add.rectangle(8, 8, GAME_WIDTH - 16, GAME_HEIGHT - 16, 0xffcd75).setOrigin(0).setStrokeStyle(3, COLORS.ink);
    pixelText(this, GAME_WIDTH / 2, 22, t('mission.log.title'), { size: 14, color: COLORS.ink, strokeThickness: 0 }).setOrigin(0.5);

    this.missions = MISSIONS.filter((m) => missionStatus(save.missions, m, save.unlockedLevels) !== 'locked');
    if (this.missions.length === 0) {
      pixelText(this, GAME_WIDTH / 2, GAME_HEIGHT / 2, t('mission.log.empty'), { size: 8, color: COLORS.ink, strokeThickness: 0, wrap: 400, align: 'center' }).setOrigin(0.5);
    }
    this.cursor = pixelText(this, 16, 0, '>', { size: 8, color: COLORS.red, strokeThickness: 0 }).setVisible(this.missions.length > 0);
    this.missions.forEach((m, i) => {
      const y = LIST_Y + i * ROW_H;
      const status = missionStatus(save.missions, m, save.unlockedLevels);
      const mark = status === 'claimed' ? '+' : status === 'done' ? '!' : m.type === 'main' ? '*' : '-';
      const row = pixelText(this, 28, y, `${mark} ${t(`mission.${m.id}.title`)}`, { size: 8, color: COLORS.ink, strokeThickness: 0 }).setInteractive({ useHandCursor: true });
      row.on('pointerdown', () => this.select(i));
      this.rows.push(row);
      const reward = t('mission.rewardShort', { coins: m.reward.coins }) + (m.reward.skin ? ' + skin' : '');
      pixelText(this, GAME_WIDTH - 20, y, reward, { size: 8, color: status === 'claimed' ? COLORS.gray : COLORS.ink, strokeThickness: 0 }).setOrigin(1, 0);
    });

    // Caixa de detalhes da missão escolhida.
    this.add.rectangle(16, BOX_Y, GAME_WIDTH - 32, 58, 0xf4f4f4, 0.55).setOrigin(0).setStrokeStyle(1, COLORS.ink);
    this.status = pixelText(this, 22, BOX_Y + 5, '', { size: 8, color: COLORS.purple, strokeThickness: 0 });
    this.detail = pixelText(this, 22, BOX_Y + 19, '', { size: 8, color: COLORS.ink, strokeThickness: 0, wrap: GAME_WIDTH - 48 }).setLineSpacing(3);

    const backBtn = pixelText(this, GAME_WIDTH / 2, GAME_HEIGHT - 14, tk('mission.back'), { size: 8, color: COLORS.ink, strokeThickness: 0 })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    const leave = (): void => {
      this.scene.start(back);
    };
    backBtn.on('pointerdown', leave);
    const kb = this.input.keyboard;
    kb?.on('keydown-ESC', leave);
    kb?.on('keydown-ENTER', leave);
    for (const k of ['keydown-UP', 'keydown-W']) kb?.on(k, () => this.select(this.index - 1));
    for (const k of ['keydown-DOWN', 'keydown-S']) kb?.on(k, () => this.select(this.index + 1));
    this.refresh();
  }

  private select(i: number): void {
    if (this.missions.length === 0) return;
    const next = Phaser.Math.Clamp(i, 0, this.missions.length - 1);
    if (next === this.index) return;
    this.index = next;
    sfx.play('select');
    this.refresh();
  }

  private refresh(): void {
    const m = this.missions[this.index];
    if (!m) return;
    const save = saveManager.get();
    const status = missionStatus(save.missions, m, save.unlockedLevels);
    const npc = t(NPCS[m.giver].nameKey);
    this.rows.forEach((r, i) => r.setColor(hex(i === this.index ? COLORS.red : COLORS.ink)));
    this.cursor.setY(LIST_Y + this.index * ROW_H);
    const kind = m.type === 'main' ? t('mission.log.main') : t('mission.log.side');
    let line = t(`mission.status.${status}`, { npc });
    if (status === 'active') line = `${t('mission.status.active')} ${save.missions.missions[m.id].progress}/${objectiveTarget(m.objective)}`;
    this.status.setText(`${kind}  ·  ${line}`);
    this.detail.setText(t(`mission.${m.id}.offer`));
  }
}
