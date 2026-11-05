import { sfx } from '../audio/Sfx';
import { TOTAL_LEVELS } from '../levels';
import type { AbilityId } from '../logic/abilities';
import { type Achievement, type AchievementContext, findAchievement, newlyUnlocked } from '../logic/achievements';
import { buy, deposit, equip, type ShopCategory } from '../logic/shop';
import { type StatKey, addStat, maxStat } from '../logic/stats';
import { type VolumeChannel, stepVolume } from '../logic/audioSettings';
import { type SaveData, type StorageLike, loadSave, recordLevelClear, saveWithAbility, submitScore, writeSave } from '../logic/save';

function getStorage(): StorageLike | null {
  try {
    const storage = window.localStorage;
    const probe = '__pixel-runner-probe__';
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
}

/** Ponte entre a lógica pura de save e o localStorage do navegador. */
class SaveManager {
  private storage = getStorage();
  private data: SaveData = loadSave(this.storage, TOTAL_LEVELS);
  private dirty = false;
  private listeners = new Set<(achievement: Achievement) => void>();

  constructor() {
    sfx.setMuted(this.data.muted);
    sfx.setVolumes(this.data.volumes);
  }

  /** Muda um canal de volume em um passo (e aplica na hora). */
  changeVolume(channel: VolumeChannel, direction: 1 | -1): void {
    const volumes = stepVolume(this.data.volumes, channel, direction);
    sfx.setVolumes(volumes);
    this.commit({ ...this.data, volumes });
  }

  get(): Readonly<SaveData> {
    return this.data;
  }

  private commit(next: SaveData): void {
    this.data = next;
    this.dirty = false;
    writeSave(this.storage, next);
    this.checkAchievements();
  }

  /** Grava alterações pendentes (estatísticas são acumuladas em memória). */
  flush(): void {
    if (!this.dirty) return;
    this.dirty = false;
    writeSave(this.storage, this.data);
  }

  /** Soma uma estatística. Use `check = false` para valores muito frequentes (tempo). */
  stat(key: StatKey, amount = 1, check = true): void {
    this.data = { ...this.data, stats: addStat(this.data.stats, key, amount) };
    this.dirty = true;
    if (check) this.checkAchievements();
  }

  statMax(key: StatKey, value: number): void {
    const stats = maxStat(this.data.stats, key, value);
    if (stats === this.data.stats) return;
    this.data = { ...this.data, stats };
    this.dirty = true;
    this.checkAchievements();
  }

  onAchievement(listener: (achievement: Achievement) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private context(): AchievementContext {
    const d = this.data;
    return { stats: d.stats, unlockedLevels: d.unlockedLevels, abilities: d.abilities, ownedSkins: d.ownedSkins, ownedTrails: d.ownedTrails };
  }

  private checkAchievements(): void {
    const fresh = newlyUnlocked(this.context(), this.data.achievements);
    if (fresh.length === 0) return;
    this.data = { ...this.data, achievements: [...this.data.achievements, ...fresh] };
    writeSave(this.storage, this.data);
    this.dirty = false;
    for (const id of fresh) {
      const achievement = findAchievement(id);
      if (achievement) this.listeners.forEach((fn) => fn(achievement));
    }
  }

  /** Registra a pontuação; retorna true se for um novo recorde. */
  submitScore(score: number): boolean {
    const result = submitScore(this.data, score);
    if (result.isNewRecord) this.commit(result.save);
    return result.isNewRecord;
  }

  levelCleared(levelIndex: number, seconds: number): boolean {
    const result = recordLevelClear(this.data, levelIndex, seconds, TOTAL_LEVELS);
    this.commit(result.save);
    return result.isBestTime;
  }

  /** Guarda na carteira as moedas coletadas. */
  depositCoins(coins: number): void {
    if (coins > 0) this.commit(deposit(this.data, coins));
  }

  /** Compra (e equipa) um item da loja. */
  buyItem(category: ShopCategory, id: string): 'ok' | 'owned' | 'funds' | 'unknown' {
    const result = buy(this.data, category, id);
    if (!result.ok) return result.reason;
    this.data = { ...result.state, stats: addStat(result.state.stats, 'purchases') };
    this.commit(this.data);
    return 'ok';
  }

  equipItem(category: ShopCategory, id: string): void {
    this.commit(equip(this.data, category, id));
  }

  /** Marca uma cena de história como vista. */
  markStory(id: string): void {
    if (this.data.storySeen.includes(id)) return;
    this.commit({ ...this.data, storySeen: [...this.data.storySeen, id] });
  }

  grantAbility(id: AbilityId): void {
    this.commit(saveWithAbility(this.data, id));
  }

  toggleMute(): boolean {
    const muted = !this.data.muted;
    this.commit({ ...this.data, muted });
    sfx.setMuted(muted);
    return muted;
  }
}

export const saveManager = new SaveManager();
