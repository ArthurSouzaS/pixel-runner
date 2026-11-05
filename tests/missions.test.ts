import { describe, expect, it } from 'vitest';
import { hasKey } from '../src/i18n';
import { LEVELS } from '../src/levels';
import { parseLevel } from '../src/logic/levelParser';
import {
  MISSIONS,
  MISSION_ITEMS,
  accept,
  applyEvent,
  availableFor,
  claim,
  doneFor,
  emptyMissionState,
  itemsToSpawn,
  missionStatus,
  objectiveTarget,
  sanitizeMissions,
} from '../src/logic/missions';
import { defaultSave, sanitizeSave } from '../src/logic/save';
import { SKINS, buy, deposit, defaultShopState } from '../src/logic/shop';

describe('missões: catálogo', () => {
  it('tem missões principais e secundárias com ids únicos', () => {
    expect(new Set(MISSIONS.map((m) => m.id)).size).toBe(MISSIONS.length);
    expect(MISSIONS.filter((m) => m.type === 'main').length).toBe(3);
    expect(MISSIONS.filter((m) => m.type === 'side').length).toBeGreaterThanOrEqual(6);
  });

  it('cobre coletar itens, vencer sem dano e terminar abaixo de um tempo', () => {
    const kinds = new Set(MISSIONS.map((m) => m.objective.kind));
    for (const k of ['collect', 'noDamage', 'time', 'clear']) expect(kinds.has(k as never)).toBe(true);
  });

  it('as recompensas dão moedas e skins exclusivas que existem', () => {
    for (const m of MISSIONS) {
      expect(m.reward.coins).toBeGreaterThan(0);
      if (m.reward.skin) expect(SKINS.find((s) => s.id === m.reward.skin)?.exclusive).toBe(true);
    }
    expect(MISSIONS.some((m) => m.reward.skin)).toBe(true);
  });

  it('fases citadas existem e textos têm tradução', () => {
    for (const m of MISSIONS) {
      if ('level' in m.objective) expect(LEVELS[m.objective.level]).toBeDefined();
      for (const suffix of ['title', 'offer']) {
        expect(hasKey(`mission.${m.id}.${suffix}`, 'pt')).toBe(true);
        expect(hasKey(`mission.${m.id}.${suffix}`, 'en')).toBe(true);
      }
    }
  });

  it('há itens suficientes no mapa para cada missão de coleta, sempre no lugar de moedas', () => {
    for (const m of MISSIONS) {
      if (m.objective.kind !== 'collect') continue;
      const item = m.objective.item;
      expect(MISSION_ITEMS.filter((i) => i.item === item).length).toBeGreaterThanOrEqual(m.objective.count);
    }
    for (const i of MISSION_ITEMS) expect(i.coin).toBeLessThan(parseLevel(LEVELS[i.level].map).coins.length);
  });

  it('skins exclusivas não podem ser compradas', () => {
    const rich = deposit(defaultShopState(), 9999);
    expect(buy(rich, 'skin', 'astronaut')).toMatchObject({ ok: false, reason: 'exclusive' });
  });
});

describe('missões: ciclo de vida', () => {
  it('fica disponível conforme o progresso e a missão anterior', () => {
    let s = emptyMissionState();
    const main2 = MISSIONS.find((m) => m.id === 'main-2')!;
    expect(missionStatus(s, main2, 10)).toBe('locked');
    s = accept(s, 'main-1');
    s = applyEvent(s, { type: 'levelClear', level: 4, seconds: 100, deaths: 2 }).state;
    expect(missionStatus(s, main2, 10)).toBe('locked');
    s = claim(s, 'main-1').state;
    expect(missionStatus(s, main2, 3)).toBe('locked');
    expect(missionStatus(s, main2, 6)).toBe('available');
  });

  it('aceita, conclui e entrega a recompensa uma vez só', () => {
    let s = accept(emptyMissionState(), 'flawless-3');
    expect(accept(s, 'flawless-3')).toBe(s);
    expect(claim(s, 'flawless-3').reward).toBeNull();
    s = applyEvent(s, { type: 'levelClear', level: 2, seconds: 50, deaths: 1 }).state;
    expect(s.missions['flawless-3'].status).toBe('active');
    const r = applyEvent(s, { type: 'levelClear', level: 2, seconds: 50, deaths: 0 });
    expect(r.completed.map((m) => m.id)).toEqual(['flawless-3']);
    expect(doneFor(r.state, 'lumi').map((m) => m.id)).toEqual(['flawless-3']);
    const c = claim(r.state, 'flawless-3');
    expect(c.reward).toEqual({ coins: 60 });
    expect(claim(c.state, 'flawless-3').reward).toBeNull();
  });

  it('missão de tempo só conta abaixo do limite', () => {
    let s = accept(emptyMissionState(), 'speed-2');
    s = applyEvent(s, { type: 'levelClear', level: 1, seconds: 75, deaths: 0 }).state;
    expect(s.missions['speed-2'].status).toBe('active');
    s = applyEvent(s, { type: 'levelClear', level: 1, seconds: 59.5, deaths: 3 }).state;
    expect(s.missions['speed-2'].status).toBe('done');
  });

  it('coleta itens sem contar o mesmo item duas vezes', () => {
    let s = accept(emptyMissionState(), 'gears');
    expect(itemsToSpawn(s, 0).length).toBe(1);
    const key = itemsToSpawn(s, 0)[0].key;
    s = applyEvent(s, { type: 'item', item: 'gear', key }).state;
    s = applyEvent(s, { type: 'item', item: 'gear', key }).state;
    expect(s.missions.gears.progress).toBe(1);
    expect(itemsToSpawn(s, 0)).toEqual([]);
    for (const i of [1, 2, 3, 4]) s = applyEvent(s, { type: 'item', item: 'gear', key: itemsToSpawn(s, i)[0].key }).state;
    expect(s.missions.gears.status).toBe('done');
  });

  it('itens só aparecem com a missão ativa', () => {
    expect(itemsToSpawn(emptyMissionState(), 0)).toEqual([]);
  });

  it('missão de moedas conta cada moeda', () => {
    let s = accept(emptyMissionState(), 'savings');
    for (let i = 0; i < objectiveTarget(MISSIONS.find((m) => m.id === 'savings')!.objective); i++) s = applyEvent(s, { type: 'coin' }).state;
    expect(s.missions.savings.status).toBe('done');
  });

  it('cada NPC oferece suas missões', () => {
    const s = emptyMissionState();
    expect(availableFor(s, 'elder', 1).map((m) => m.id)).toEqual(['main-1']);
    expect(availableFor(s, 'lumi', 1).map((m) => m.id)).toEqual(['gears']);
    expect(availableFor(s, 'astro', 5)).toEqual([]);
  });
});

describe('missões: save', () => {
  it('começa vazio e descarta dados inválidos', () => {
    expect(defaultSave().missions).toEqual(emptyMissionState());
    const s = sanitizeMissions({ missions: { gears: { status: 'active', progress: 99 }, nada: { status: 'done' }, shells: { status: 'xyz' } }, items: ['a', 'a', 3] });
    expect(s).toEqual({ missions: { gears: { status: 'active', progress: 5 } }, items: ['a'] });
  });

  it('saves antigos (sem missões) continuam funcionando', () => {
    expect(sanitizeSave({ version: 2, unlockedLevels: 4 }, 15).missions).toEqual(emptyMissionState());
  });
});
