import { sfx } from '../audio/Sfx';
import { TOTAL_LEVELS } from '../levels';
import type { AbilityId } from '../logic/abilities';
import { type Achievement, type AchievementContext, findAchievement, newlyUnlocked } from '../logic/achievements';
import { buy, deposit, equip, grantItem, type ShopCategory } from '../logic/shop';
import { type Mission, type MissionEvent, accept, applyEvent, claim } from '../logic/missions';
import { type InfiniteEntry, addInfiniteEntry } from '../logic/powerups';
import { addAttempt, addDailyEntry, rollDaily, todayString } from '../logic/daily';
import { finishRun, recordSegments } from '../logic/speedrun';
import type { AccessSettings } from '../logic/accessibility';
import { setLang } from '../i18n';
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
  private missionListeners = new Set<(mission: Mission) => void>();
  private accessListeners = new Set<(a: AccessSettings) => void>();

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
  buyItem(category: ShopCategory, id: string): 'ok' | 'owned' | 'funds' | 'unknown' | 'exclusive' {
    const result = buy(this.data, category, id);
    if (!result.ok) return result.reason;
    this.data = { ...result.state, stats: addStat(result.state.stats, 'purchases') };
    this.commit(this.data);
    return 'ok';
  }

  equipItem(category: ShopCategory, id: string): void {
    this.commit(equip(this.data, category, id));
  }

  onMissionComplete(listener: (mission: Mission) => void): () => void {
    this.missionListeners.add(listener);
    return () => this.missionListeners.delete(listener);
  }

  acceptMission(id: string): void {
    this.commit({ ...this.data, missions: accept(this.data.missions, id) });
  }

  /** Entrega a recompensa de uma missão concluída. */
  claimMission(id: string): Mission['reward'] | null {
    const result = claim(this.data.missions, id);
    if (!result.reward) return null;
    let next: SaveData = { ...this.data, missions: result.state };
    next = deposit(next, result.reward.coins);
    if (result.reward.skin) next = grantItem(next, 'skin', result.reward.skin);
    this.commit(next);
    return result.reward;
  }

  /** Repassa um acontecimento do jogo para as missões (moedas, itens, fase concluída). */
  missionEvent(event: MissionEvent): void {
    const hasActive = Object.values(this.data.missions.missions).some((m) => m.status === 'active');
    if (!hasActive) return;
    const result = applyEvent(this.data.missions, event);
    if (result.state === this.data.missions) return;
    this.data = { ...this.data, missions: result.state };
    this.dirty = true;
    if (result.completed.length > 0) {
      this.flush();
      result.completed.forEach((m) => this.missionListeners.forEach((fn) => fn(m)));
    }
  }

  /** Registra uma corrida do Infinito. Retorna a posição no placar (0 = melhor) ou -1. */
  recordInfinite(entry: InfiniteEntry): number {
    const board = addInfiniteEntry(this.data.infinite, entry);
    this.commit({ ...this.data, infinite: board });
    return board.indexOf(entry);
  }

  /** Estado do desafio do dia (arquiva o de ontem se a data mudou). */
  dailyToday(date = todayString()): SaveData['daily'] {
    return rollDaily(this.data.daily, date);
  }

  dailyAttempt(date: string): void {
    this.commit({ ...this.data, daily: addAttempt(this.data.daily, date) });
  }

  /** Registra um tempo no placar do dia. Retorna a posição (0 = melhor) ou -1. */
  dailyResult(date: string, time: number, coins: number): number {
    const result = addDailyEntry(this.data.daily, date, { name: this.data.playerName, time, coins });
    this.commit({ ...this.data, daily: result.state });
    return result.rank;
  }

  setPlayerName(name: string): void {
    const clean = name.trim().slice(0, 8).toUpperCase();
    if (clean) this.commit({ ...this.data, playerName: clean });
  }

  /** Fim de uma corrida de speedrun completa. Retorna true se for recorde pessoal. */
  speedrunFinish(category: string, segments: number[]): boolean {
    const result = finishRun(this.data.speedrun[category], segments);
    this.commit({ ...this.data, speedrun: { ...this.data.speedrun, [category]: result.best } });
    return result.isPb;
  }

  /** Corrida interrompida: guarda só os melhores trechos. */
  speedrunSegments(category: string, segments: number[]): void {
    if (segments.length === 0) return;
    this.commit({ ...this.data, speedrun: { ...this.data.speedrun, [category]: recordSegments(this.data.speedrun[category], segments) } });
  }

  /** Atualiza opções de acessibilidade e avisa quem estiver ouvindo. */
  setAccess(change: Partial<AccessSettings>): void {
    this.commit({ ...this.data, access: { ...this.data.access, ...change } });
    this.accessListeners.forEach((fn) => fn(this.data.access));
  }

  onAccessChange(listener: (a: AccessSettings) => void): () => void {
    this.accessListeners.add(listener);
    return () => this.accessListeners.delete(listener);
  }

  setLang(lang: 'pt' | 'en'): void {
    setLang(lang);
    this.commit({ ...this.data, lang });
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
