import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SKIN,
  DEFAULT_TRAIL,
  SKINS,
  TRAILS,
  buy,
  defaultShopState,
  deposit,
  equip,
  findSkin,
  findTrail,
  isEquipped,
  isOwned,
  sanitizeShop,
} from '../src/logic/shop';
import { defaultSave, sanitizeSave } from '../src/logic/save';

describe('loja: catálogo', () => {
  it('tem itens gratuitos padrão e ids únicos', () => {
    expect(SKINS[0]).toMatchObject({ id: DEFAULT_SKIN, price: 0 });
    expect(TRAILS[0]).toMatchObject({ id: DEFAULT_TRAIL, price: 0 });
    expect(new Set(SKINS.map((s) => s.id)).size).toBe(SKINS.length);
    expect(new Set(TRAILS.map((t) => t.id)).size).toBe(TRAILS.length);
    expect(SKINS.length).toBeGreaterThanOrEqual(6);
    expect(TRAILS.length).toBeGreaterThanOrEqual(5);
  });

  it('skins só trocam cores do capacete e do cachecol por cores da paleta', () => {
    for (const skin of SKINS) {
      for (const [from, to] of Object.entries(skin.colors)) {
        expect(['l', 't', 'T', 'o']).toContain(from);
        expect(to).toMatch(/^[kproyltTnbBcwgGduU]$/);
      }
    }
  });

  it('busca com fallback para o padrão', () => {
    expect(findSkin('gold').name).toBe('Ouro');
    expect(findSkin('???').id).toBe(DEFAULT_SKIN);
    expect(findTrail('???').id).toBe(DEFAULT_TRAIL);
  });
});

describe('loja: carteira e compras', () => {
  it('deposita apenas valores positivos', () => {
    const state = defaultShopState();
    expect(deposit(state, 25).wallet).toBe(25);
    expect(deposit(state, -5)).toBe(state);
    expect(deposit(state, Number.NaN)).toBe(state);
    expect(deposit(state, 2.7).wallet).toBe(2);
  });

  it('compra desconta o preço e equipa o item', () => {
    const state = deposit(defaultShopState(), 300);
    const result = buy(state, 'skin', 'gold');
    expect(result.ok).toBe(true);
    expect(result.state.wallet).toBe(300 - findSkin('gold').price);
    expect(isOwned(result.state, 'skin', 'gold')).toBe(true);
    expect(isEquipped(result.state, 'skin', 'gold')).toBe(true);
  });

  it('não compra sem moedas, nem duas vezes, nem itens inexistentes', () => {
    const poor = deposit(defaultShopState(), 10);
    expect(buy(poor, 'trail', 'rainbow')).toEqual({ ok: false, state: poor, reason: 'funds' });
    const rich = deposit(defaultShopState(), 1000);
    const bought = buy(rich, 'trail', 'fire');
    expect(bought.ok).toBe(true);
    expect(buy(bought.state, 'trail', 'fire')).toMatchObject({ ok: false, reason: 'owned' });
    expect(buy(rich, 'skin', 'dragao')).toMatchObject({ ok: false, reason: 'unknown' });
  });

  it('equipa somente itens comprados', () => {
    const state = defaultShopState();
    expect(equip(state, 'skin', 'ruby')).toBe(state);
    const rich = buy(deposit(state, 500), 'skin', 'ruby').state;
    const back = equip(rich, 'skin', 'classic');
    expect(back.equippedSkin).toBe('classic');
    expect(equip(back, 'skin', 'ruby').equippedSkin).toBe('ruby');
  });
});

describe('loja: save', () => {
  it('o save padrão começa com a carteira vazia e itens padrão', () => {
    expect(defaultSave()).toMatchObject({ wallet: 0, ownedSkins: ['classic'], equippedSkin: 'classic', ownedTrails: ['none'], equippedTrail: 'none' });
  });

  it('corrige dados inválidos da loja', () => {
    const shop = sanitizeShop({ wallet: -10, ownedSkins: ['gold', 'xyz', 4], equippedSkin: 'ruby', ownedTrails: 'fire', equippedTrail: 'fire' });
    expect(shop).toEqual({ wallet: 0, ownedSkins: ['classic', 'gold'], equippedSkin: 'classic', ownedTrails: ['none'], equippedTrail: 'none' });
  });

  it('mantém compras válidas ao ler o save', () => {
    const save = sanitizeSave({ wallet: 99.9, ownedSkins: ['gold'], equippedSkin: 'gold', ownedTrails: ['stars'], equippedTrail: 'stars' }, 10);
    expect(save.wallet).toBe(99);
    expect(save.equippedSkin).toBe('gold');
    expect(save.ownedSkins).toEqual(['classic', 'gold']);
    expect(save.equippedTrail).toBe('stars');
  });
});
