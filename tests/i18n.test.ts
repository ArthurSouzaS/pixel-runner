import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { dictionaries, hasKey, setLang, t, tOr } from '../src/i18n';
import { LEVELS, WORLDS } from '../src/levels';
import { THEME_KEYS } from '../src/levels/themes';
import { ABILITY_IDS } from '../src/logic/abilities';
import { ACHIEVEMENTS } from '../src/logic/achievements';
import { EDITOR_TOOLS } from '../src/logic/editor';
import { SKINS, TRAILS } from '../src/logic/shop';
import { STAT_LABELS } from '../src/logic/stats';
import { MISSIONS } from '../src/logic/missions';

const { pt, en } = dictionaries();
/** Prefixos de textos que vêm dos dados em português (só precisam existir em inglês). */
const DATA_PREFIXES = ['level.', 'ach.', 'ability.', 'skin.', 'trail.', 'stat.', 'tool.', 'theme.', 'key.', 'world.', 'boss.'];
const isDataKey = (k: string) => DATA_PREFIXES.some((p) => k.startsWith(p)) && !k.startsWith('level.extraLife') && !['level.checkpoint', 'level.gameOver', 'level.noLives', 'level.fixLevel', 'level.clear', 'level.worldClear', 'level.time', 'level.coins', 'level.backEditor', 'level.winner', 'level.raceCoins', 'level.goodRace', 'level.bestTime', 'level.newRecord', 'level.bonusClear', 'level.bonusTime', 'level.bonusCoins'].includes(k);
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? sourceFiles(path) : path.endsWith('.ts') ? [path] : [];
  });
}

afterEach(() => setLang('pt'));

describe('traduções', () => {
  it('toda chave em português existe em inglês', () => {
    const missing = Object.keys(pt).filter((k) => !(k in en));
    expect(missing).toEqual([]);
  });

  it('toda chave de interface em inglês existe em português', () => {
    const missing = Object.keys(en).filter((k) => !(k in pt) && !isDataKey(k));
    expect(missing).toEqual([]);
  });

  it('os marcadores {x} são os mesmos nos dois idiomas', () => {
    for (const k of Object.keys(pt)) expect(placeholders(en[k] ?? ''), k).toEqual(placeholders(pt[k]));
  });

  it('nenhum texto está vazio', () => {
    for (const [k, v] of [...Object.entries(pt), ...Object.entries(en)]) expect(v.trim().length, k).toBeGreaterThan(0);
  });

  it('toda chave usada no código com t("...") existe nos dois idiomas', () => {
    const used = new Set<string>();
    for (const file of sourceFiles(fileURLToPath(new URL('../src', import.meta.url)))) {
      const src = readFileSync(file, 'utf8');
      for (const m of src.matchAll(/\bt\('([a-zA-Z0-9_-]+\.[a-zA-Z0-9_.-]+)'/g)) used.add(m[1]);
    }
    expect(used.size).toBeGreaterThan(150);
    const missing = [...used].filter((k) => !hasKey(k, 'pt') || !hasKey(k, 'en'));
    expect(missing).toEqual([]);
  });

  it('toda chave usada com tOr("...") tem versão em inglês', () => {
    const used = new Set<string>();
    for (const file of sourceFiles(fileURLToPath(new URL('../src', import.meta.url)))) {
      const src = readFileSync(file, 'utf8');
      for (const m of src.matchAll(/\btOr\('([a-zA-Z0-9_-]+\.[a-zA-Z0-9_.-]+)'/g)) used.add(m[1]);
    }
    expect(used.size).toBeGreaterThan(0);
    expect([...used].filter((k) => !hasKey(k, 'en'))).toEqual([]);
  });

  it('dados do jogo têm versão em inglês', () => {
    const need: string[] = [];
    for (const l of LEVELS) {
      need.push(`level.${l.id}.name`, `level.${l.id}.subtitle`);
      (l.hints ?? []).forEach((h, i) => {
        need.push(`level.${l.id}.hint.${i}`);
        if (h.touchText) need.push(`level.${l.id}.hintTouch.${i}`);
      });
    }
    WORLDS.forEach((w) => need.push(`world.${w.id}`));
    ACHIEVEMENTS.forEach((a) => need.push(`ach.${a.id}.name`, `ach.${a.id}.desc`));
    ABILITY_IDS.forEach((id) => need.push(...['name', 'description', 'keyboard', 'touch'].map((f) => `ability.${id}.${f}`)));
    SKINS.forEach((s) => need.push(`skin.${s.id}`));
    TRAILS.forEach((s) => need.push(`trail.${s.id}`));
    STAT_LABELS.forEach(([k]) => need.push(`stat.${k}`));
    THEME_KEYS.forEach((k) => need.push(`theme.${k}`));
    EDITOR_TOOLS.forEach((tool) => {
      const id = tool.char === '.' ? 'erase' : tool.char === '#' ? 'ground' : tool.char === '-' ? 'platform' : tool.char === '^' ? 'spikes' : tool.char;
      need.push(`tool.${id}`);
    });
    MISSIONS.forEach((m) => need.push(`mission.${m.id}.title`, `mission.${m.id}.offer`));
    expect(need.filter((k) => !hasKey(k, 'en'))).toEqual([]);
  });

  it('troca de idioma e usa parâmetros', () => {
    setLang('en');
    expect(t('menu.continue')).toBe('Continue');
    expect(t('menu.record', { score: '0000042' })).toBe('HIGH SCORE 0000042');
    expect(tOr('level.1.name', 'Campos Verdes')).toBe('Green Fields');
    setLang('pt');
    expect(t('menu.continue')).toBe('Continuar');
    expect(tOr('level.1.name', 'Campos Verdes')).toBe('Campos Verdes');
    expect(t('chave.que.nao.existe')).toBe('chave.que.nao.existe');
  });
});
