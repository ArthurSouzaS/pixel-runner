/**
 * Loja: skins de cores do Pix e rastros de partícula, comprados com moedas.
 * Módulo puro (sem Phaser).
 */

export type ShopCategory = 'skin' | 'trail';

export interface SkinItem {
  id: string;
  name: string;
  price: number;
  /** Troca de letras da paleta do Pix: l/t/T = capacete (brilho/base/sombra), o = cachecol. */
  colors: Record<string, string>;
}

export interface TrailItem {
  id: string;
  name: string;
  price: number;
  /** Cores das partículas (vazio = sem rastro). */
  tints: number[];
  texture: 'px' | 'px4' | 'star';
  /** Partícula sobe (bolhas) ou cai (fogo/folhas). */
  gravity: number;
}

export const SKINS: readonly SkinItem[] = [
  { id: 'classic', name: 'Clássico', price: 0, colors: {} },
  { id: 'ocean', name: 'Oceano', price: 120, colors: { l: 'c', t: 'B', T: 'b', o: 'w' } },
  { id: 'ruby', name: 'Rubi', price: 150, colors: { l: 'o', t: 'r', T: 'p', o: 'y' } },
  { id: 'gold', name: 'Ouro', price: 250, colors: { l: 'w', t: 'y', T: 'o', o: 'r' } },
  { id: 'shadow', name: 'Sombra', price: 200, colors: { l: 'G', t: 'd', T: 'k', o: 'r' } },
  { id: 'snow', name: 'Neve', price: 180, colors: { l: 'w', t: 'g', T: 'G', o: 'B' } },
  { id: 'lavender', name: 'Lavanda', price: 220, colors: { l: 'w', t: 'p', T: 'n', o: 'c' } },
  { id: 'mint', name: 'Menta', price: 300, colors: { l: 'w', t: 'l', T: 't', o: 'p' } },
];

export const TRAILS: readonly TrailItem[] = [
  { id: 'none', name: 'Nenhum', price: 0, tints: [], texture: 'px', gravity: 0 },
  { id: 'sparkle', name: 'Brilhos', price: 150, tints: [0xffcd75, 0xf4f4f4], texture: 'px', gravity: 0 },
  { id: 'fire', name: 'Fogo', price: 250, tints: [0xef7d57, 0xb13e53, 0xffcd75], texture: 'px4', gravity: -60 },
  { id: 'bubbles', name: 'Bolhas', price: 200, tints: [0x73eff7, 0x41a6f6, 0xf4f4f4], texture: 'px', gravity: -90 },
  { id: 'leaves', name: 'Folhas', price: 200, tints: [0x38b764, 0xa7f070, 0x257179], texture: 'px4', gravity: 80 },
  { id: 'stars', name: 'Estrelas', price: 350, tints: [0xffffff], texture: 'star', gravity: 0 },
  { id: 'rainbow', name: 'Arco-íris', price: 500, tints: [0xb13e53, 0xef7d57, 0xffcd75, 0x38b764, 0x41a6f6, 0x5d275d], texture: 'px4', gravity: 0 },
];

export const DEFAULT_SKIN = 'classic';
export const DEFAULT_TRAIL = 'none';

export interface ShopState {
  wallet: number;
  ownedSkins: string[];
  equippedSkin: string;
  ownedTrails: string[];
  equippedTrail: string;
}

export function defaultShopState(): ShopState {
  return { wallet: 0, ownedSkins: [DEFAULT_SKIN], equippedSkin: DEFAULT_SKIN, ownedTrails: [DEFAULT_TRAIL], equippedTrail: DEFAULT_TRAIL };
}

export function catalog(category: ShopCategory): readonly (SkinItem | TrailItem)[] {
  return category === 'skin' ? SKINS : TRAILS;
}

export function findItem(category: ShopCategory, id: string): SkinItem | TrailItem | undefined {
  return catalog(category).find((item) => item.id === id);
}

export function findSkin(id: string): SkinItem {
  return SKINS.find((s) => s.id === id) ?? SKINS[0];
}

export function findTrail(id: string): TrailItem {
  return TRAILS.find((t) => t.id === id) ?? TRAILS[0];
}

function ownedKey(category: ShopCategory): 'ownedSkins' | 'ownedTrails' {
  return category === 'skin' ? 'ownedSkins' : 'ownedTrails';
}

function equippedKey(category: ShopCategory): 'equippedSkin' | 'equippedTrail' {
  return category === 'skin' ? 'equippedSkin' : 'equippedTrail';
}

export function isOwned(state: ShopState, category: ShopCategory, id: string): boolean {
  return state[ownedKey(category)].includes(id);
}

export function isEquipped(state: ShopState, category: ShopCategory, id: string): boolean {
  return state[equippedKey(category)] === id;
}

/** Adiciona moedas à carteira (valores inválidos são ignorados). */
export function deposit<T extends ShopState>(state: T, coins: number): T {
  if (!Number.isFinite(coins) || coins <= 0) return state;
  return { ...state, wallet: state.wallet + Math.floor(coins) };
}

export type PurchaseResult<T> = { ok: true; state: T } | { ok: false; state: T; reason: 'unknown' | 'owned' | 'funds' };

/** Compra um item e já o equipa. */
export function buy<T extends ShopState>(state: T, category: ShopCategory, id: string): PurchaseResult<T> {
  const item = findItem(category, id);
  if (!item) return { ok: false, state, reason: 'unknown' };
  if (isOwned(state, category, id)) return { ok: false, state, reason: 'owned' };
  if (state.wallet < item.price) return { ok: false, state, reason: 'funds' };
  const key = ownedKey(category);
  return {
    ok: true,
    state: { ...state, wallet: state.wallet - item.price, [key]: [...state[key], id], [equippedKey(category)]: id },
  };
}

/** Equipa um item já comprado. */
export function equip<T extends ShopState>(state: T, category: ShopCategory, id: string): T {
  if (!isOwned(state, category, id)) return state;
  return { ...state, [equippedKey(category)]: id };
}

/** Normaliza dados vindos do save. */
export function sanitizeShop(raw: Partial<Record<keyof ShopState, unknown>>): ShopState {
  const base = defaultShopState();
  const wallet = typeof raw.wallet === 'number' && Number.isFinite(raw.wallet) && raw.wallet > 0 ? Math.floor(raw.wallet) : 0;
  const list = (value: unknown, category: ShopCategory, fallback: string): string[] => {
    const ids = Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string' && !!findItem(category, v)) : [];
    return [...new Set([fallback, ...ids])];
  };
  const ownedSkins = list(raw.ownedSkins, 'skin', DEFAULT_SKIN);
  const ownedTrails = list(raw.ownedTrails, 'trail', DEFAULT_TRAIL);
  const equippedSkin = typeof raw.equippedSkin === 'string' && ownedSkins.includes(raw.equippedSkin) ? raw.equippedSkin : base.equippedSkin;
  const equippedTrail = typeof raw.equippedTrail === 'string' && ownedTrails.includes(raw.equippedTrail) ? raw.equippedTrail : base.equippedTrail;
  return { wallet, ownedSkins, equippedSkin, ownedTrails, equippedTrail };
}
