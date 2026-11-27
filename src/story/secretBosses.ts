/**
 * Portais do planeta secreto: cada um levará a uma luta contra um chefe novo.
 * Os chefes ainda não existem — os portais aparecem com "Em breve".
 *
 * Para ativar um chefe no futuro:
 *  1. crie o chefe em `src/objects/` (implementando `BossLike`) e o tipo em `BossKind`;
 *  2. crie a fase da arena (um `LevelData` com `boss` e, se quiser, `bossAssist`);
 *  3. aqui, troque `status` para `'ready'` e preencha `level`.
 * A cena do planeta já leva o jogador para a luta e o traz de volta ao terminar.
 */
import type { LevelData } from '../levels/types';

export type SecretBossStatus = 'soon' | 'ready';

export interface SecretBossSlot {
  id: string;
  /** Chave de tradução do nome do portal. */
  nameKey: string;
  /** Cor do portal e do brilho em volta dele. */
  color: number;
  status: SecretBossStatus;
  /** Fase da luta, quando o chefe existir. */
  level?: LevelData;
}

export const SECRET_BOSSES: readonly SecretBossSlot[] = [
  { id: 'guardian-flame', nameKey: 'secret.portal.flame', color: 0xef7d57, status: 'soon' },
  { id: 'guardian-frost', nameKey: 'secret.portal.frost', color: 0x73eff7, status: 'soon' },
  { id: 'guardian-void', nameKey: 'secret.portal.void', color: 0xb13e53, status: 'soon' },
];

/** O portal já leva a uma luta? */
export function secretBossReady(slot: SecretBossSlot): slot is SecretBossSlot & { level: LevelData } {
  return slot.status === 'ready' && !!slot.level;
}
