/**
 * Habilidades desbloqueáveis do Pix. Módulo puro (sem Phaser).
 */

export type AbilityId = 'wallClimb' | 'glide' | 'charge';

export interface AbilityInfo {
  id: AbilityId;
  name: string;
  description: string;
  /** Como usar no teclado e na tela de toque. */
  keyboard: string;
  touch: string;
  /** Cor do orbe que concede a habilidade. */
  color: number;
}

export const ABILITIES: Record<AbilityId, AbilityInfo> = {
  wallClimb: {
    id: 'wallClimb',
    name: 'Escalar paredes',
    description: 'Agarre-se às paredes e suba por elas. Pule para dar um salto na parede.',
    keyboard: 'No ar, segure a direção da parede para subir.\nPule para se impulsionar para o outro lado.',
    touch: 'No ar, segure a seta na direção da parede.\nToque em A para se impulsionar.',
    color: 0x38b764,
  },
  glide: {
    id: 'glide',
    name: 'Planar',
    description: 'Abra o cachecol e desça devagar. Correntes de ar levam você ainda mais alto.',
    keyboard: 'Segure o pulo enquanto estiver caindo.',
    touch: 'Segure A enquanto estiver caindo.',
    color: 0x41a6f6,
  },
  charge: {
    id: 'charge',
    name: 'Investida',
    description: 'Carregue energia e avance com força: quebra blocos rachados e derrota inimigos blindados.',
    keyboard: 'Segure C (ou L) para carregar e solte para avançar.',
    touch: 'Segure C para carregar e solte para avançar.',
    color: 0xb13e53,
  },
};

export const ABILITY_IDS: readonly AbilityId[] = ['wallClimb', 'glide', 'charge'];

export function isAbilityId(value: unknown): value is AbilityId {
  return typeof value === 'string' && (ABILITY_IDS as readonly string[]).includes(value);
}

export function hasAbility(owned: readonly string[], id: AbilityId): boolean {
  return owned.includes(id);
}

/** Retorna a nova lista (sem duplicatas, na ordem oficial). */
export function grantAbility(owned: readonly string[], id: AbilityId): AbilityId[] {
  const set = new Set(owned.filter(isAbilityId));
  set.add(id);
  return ABILITY_IDS.filter((a) => set.has(a));
}

/** Tempo mínimo segurando o botão para a investida sair (ms). */
export const CHARGE_TIME_MS = 350;

export function chargeProgress(heldMs: number): number {
  return Math.max(0, Math.min(1, heldMs / CHARGE_TIME_MS));
}
