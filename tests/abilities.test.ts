import { describe, expect, it } from 'vitest';
import { ABILITIES, ABILITY_IDS, CHARGE_TIME_MS, chargeProgress, grantAbility, hasAbility, isAbilityId } from '../src/logic/abilities';
import { LEVELS } from '../src/levels';
import { parseLevel } from '../src/logic/levelParser';
import { defaultSave, sanitizeSave, saveWithAbility } from '../src/logic/save';

describe('habilidades', () => {
  it('tem as três habilidades com textos de tutorial', () => {
    expect(ABILITY_IDS).toEqual(['wallClimb', 'glide', 'charge']);
    for (const id of ABILITY_IDS) {
      expect(ABILITIES[id].name.length).toBeGreaterThan(0);
      expect(ABILITIES[id].keyboard.length).toBeGreaterThan(0);
      expect(ABILITIES[id].touch.length).toBeGreaterThan(0);
    }
  });

  it('concede sem duplicar e mantém a ordem', () => {
    let owned = grantAbility([], 'charge');
    owned = grantAbility(owned, 'wallClimb');
    owned = grantAbility(owned, 'charge');
    expect(owned).toEqual(['wallClimb', 'charge']);
    expect(hasAbility(owned, 'charge')).toBe(true);
    expect(hasAbility(owned, 'glide')).toBe(false);
  });

  it('valida ids', () => {
    expect(isAbilityId('glide')).toBe(true);
    expect(isAbilityId('voar')).toBe(false);
    expect(isAbilityId(3)).toBe(false);
  });

  it('calcula a carga da investida', () => {
    expect(chargeProgress(0)).toBe(0);
    expect(chargeProgress(CHARGE_TIME_MS / 2)).toBeCloseTo(0.5);
    expect(chargeProgress(CHARGE_TIME_MS * 3)).toBe(1);
  });

  it('é salva e lida do save, descartando valores inválidos', () => {
    const save = saveWithAbility(saveWithAbility(defaultSave(), 'glide'), 'glide');
    expect(save.abilities).toEqual(['glide']);
    expect(sanitizeSave({ abilities: ['charge', 'x', 7, 'wallClimb'] }, 10).abilities).toEqual(['wallClimb', 'charge']);
    expect(sanitizeSave({ abilities: 'glide' }, 10).abilities).toEqual([]);
  });

  it('cada habilidade tem um orbe numa fase do Mundo 2, em ordem', () => {
    const withOrb = LEVELS.filter((l) => l.ability);
    expect(withOrb.map((l) => [l.id, l.ability])).toEqual([
      [6, 'wallClimb'],
      [7, 'glide'],
      [8, 'charge'],
    ]);
    for (const level of withOrb) expect(parseLevel(level.map).ability).not.toBeNull();
    for (const level of LEVELS.filter((l) => !l.ability)) expect(parseLevel(level.map).ability).toBeNull();
  });

  it('o parser reconhece blocos rachados, blindados e orbes', () => {
    const level = parseLevel(['P.A.a.Q', '#######']);
    expect(level.ability).toEqual({ x: 2, y: 0 });
    expect(level.enemies).toEqual([{ kind: 'armored', x: 4, y: 0 }]);
    expect(level.tiles[0][6]).toBe(5);
  });
});
