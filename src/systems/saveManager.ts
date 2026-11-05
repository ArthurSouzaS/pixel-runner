import { sfx } from '../audio/Sfx';
import { TOTAL_LEVELS } from '../levels';
import type { AbilityId } from '../logic/abilities';
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

  constructor() {
    sfx.setMuted(this.data.muted);
  }

  get(): Readonly<SaveData> {
    return this.data;
  }

  private commit(next: SaveData): void {
    this.data = next;
    writeSave(this.storage, next);
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
