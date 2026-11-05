import { describe, expect, it } from 'vitest';
import {
  EDITOR_HEIGHT,
  EDITOR_MAX_WIDTH,
  EDITOR_MIN_WIDTH,
  EDITOR_STORAGE_KEY,
  EDITOR_TOOLS,
  countChar,
  createCustomLevel,
  deserializeCustomLevel,
  getCell,
  levelWidth,
  loadEditorSlots,
  resizeLevel,
  saveEditorSlot,
  serializeCustomLevel,
  setCell,
  toLevelData,
  validateCustomLevel,
} from '../src/logic/editor';
import { parseLevel } from '../src/logic/levelParser';
import type { StorageLike } from '../src/logic/save';

class MemoryStorage implements StorageLike {
  data = new Map<string, string>();
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
}

describe('editor: criação e edição', () => {
  it('cria uma fase jogável com chão, início e chegada', () => {
    const level = createCustomLevel(40);
    expect(level.map).toHaveLength(EDITOR_HEIGHT);
    expect(levelWidth(level)).toBe(40);
    expect(countChar(level, 'P')).toBe(1);
    expect(countChar(level, 'G')).toBe(1);
    expect(validateCustomLevel(level)).toEqual({ valid: true, errors: [] });
  });

  it('limita a largura', () => {
    expect(levelWidth(createCustomLevel(5))).toBe(EDITOR_MIN_WIDTH);
    expect(levelWidth(createCustomLevel(999))).toBe(EDITOR_MAX_WIDTH);
  });

  it('coloca e apaga elementos sem alterar o original', () => {
    const level = createCustomLevel(40);
    const edited = setCell(level, 10, 12, 'o');
    expect(getCell(edited, 10, 12)).toBe('o');
    expect(getCell(level, 10, 12)).toBe('.');
    expect(getCell(setCell(edited, 10, 12, '.'), 10, 12)).toBe('.');
  });

  it('ignora coordenadas fora do mapa e caracteres inválidos', () => {
    const level = createCustomLevel(40);
    expect(setCell(level, -1, 0, '#')).toBe(level);
    expect(setCell(level, 40, 0, '#')).toBe(level);
    expect(setCell(level, 1, 1, 'Z')).toBe(level);
    expect(setCell(level, 1, 1, 'B')).toBe(level);
  });

  it('mantém início e chegada únicos', () => {
    let level = createCustomLevel(40);
    level = setCell(level, 8, 14, 'P');
    level = setCell(level, 20, 14, 'G');
    expect(countChar(level, 'P')).toBe(1);
    expect(countChar(level, 'G')).toBe(1);
    expect(getCell(level, 8, 14)).toBe('P');
  });

  it('redimensiona estendendo o chão e recolocando a chegada', () => {
    const level = createCustomLevel(60);
    const bigger = resizeLevel(level, 80);
    expect(levelWidth(bigger)).toBe(80);
    expect(bigger.map[EDITOR_HEIGHT - 1].endsWith('#'.repeat(20))).toBe(true);
    const smaller = resizeLevel(level, 30);
    expect(levelWidth(smaller)).toBe(30);
    expect(countChar(smaller, 'G')).toBe(1);
    expect(validateCustomLevel(smaller).valid).toBe(true);
  });

  it('todas as ferramentas usam caracteres conhecidos pelo parser', () => {
    const chars = EDITOR_TOOLS.map((t) => t.char).filter((c) => c !== '.');
    let level = createCustomLevel(40);
    chars.forEach((ch, i) => {
      if (ch !== 'P' && ch !== 'G') level = setCell(level, 5 + i, 8, ch);
    });
    const parsed = parseLevel(level.map);
    expect(parsed.coins.length).toBe(1);
    expect(parsed.springs.length).toBe(1);
    expect(parsed.enemies.length).toBe(5);
  });
});

describe('editor: validação', () => {
  it('aponta início e chegada ausentes', () => {
    let level = createCustomLevel(40);
    level = setCell(level, 2, 14, '.');
    const result = validateCustomLevel(level);
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toContain('início');
  });

  it('exige chão sob o início e chegada à direita', () => {
    let level = createCustomLevel(40);
    level = setCell(level, 10, 3, 'P');
    expect(validateCustomLevel(level).errors).toContain('O início precisa ter chão logo abaixo.');
    level = setCell(createCustomLevel(40), 1, 14, 'G');
    expect(validateCustomLevel(level).errors).toContain('A chegada deve ficar à direita do início.');
  });

  it('valida nome, linhas e caracteres', () => {
    const base = createCustomLevel(40);
    expect(validateCustomLevel({ ...base, name: '  ' }).valid).toBe(false);
    expect(validateCustomLevel({ ...base, name: 'x'.repeat(40) }).valid).toBe(false);
    expect(validateCustomLevel({ ...base, map: base.map.slice(1) }).valid).toBe(false);
    expect(validateCustomLevel({ ...base, map: base.map.map((r, i) => (i === 3 ? r.replace('.', '@') : r)) }).valid).toBe(false);
    expect(validateCustomLevel({ ...base, map: base.map.map((r, i) => (i === 3 ? r + '.' : r)) }).valid).toBe(false);
  });

  it('gera dados de fase jogáveis', () => {
    const data = toLevelData({ ...createCustomLevel(50), theme: 'reef' });
    expect(data.theme.key).toBe('reef');
    expect(data.map).toHaveLength(EDITOR_HEIGHT);
    expect(data.par).toBeGreaterThanOrEqual(30);
  });
});

describe('editor: JSON', () => {
  it('exporta e importa sem perder nada', () => {
    let level = createCustomLevel(45, 'Teste', 'cave');
    level = setCell(level, 10, 12, 'w');
    const json = serializeCustomLevel(level);
    expect(JSON.parse(json).format).toBe('pixel-runner-level');
    const back = deserializeCustomLevel(json);
    expect(back).toEqual({ ok: true, level });
  });

  it('rejeita arquivos inválidos com mensagens claras', () => {
    expect(deserializeCustomLevel('{oops')).toEqual({ ok: false, error: 'O arquivo não é um JSON válido.' });
    expect(deserializeCustomLevel('{"format":"outro","map":[]}').ok).toBe(false);
    expect(deserializeCustomLevel('{"map":"abc"}').ok).toBe(false);
    const level = createCustomLevel(40);
    const noStart = { ...level, map: level.map.map((r) => r.replace('P', '.')) };
    const result = deserializeCustomLevel(JSON.stringify(noStart));
    expect(result.ok).toBe(false);
  });

  it('usa tema padrão quando o tema é desconhecido', () => {
    const level = createCustomLevel(40);
    const result = deserializeCustomLevel(JSON.stringify({ ...level, theme: 'lua' }));
    expect(result.ok && result.level.theme).toBe('grass');
  });
});

describe('editor: slots no localStorage', () => {
  it('começa vazio e salva em um slot', () => {
    const storage = new MemoryStorage();
    let slots = loadEditorSlots(storage);
    expect(slots).toEqual([null, null, null]);
    const level = createCustomLevel(40, 'Slot 2');
    slots = saveEditorSlot(storage, slots, 1, level);
    expect(loadEditorSlots(storage)).toEqual([null, level, null]);
  });

  it('ignora slots inválidos e dados corrompidos', () => {
    const storage = new MemoryStorage();
    storage.setItem(EDITOR_STORAGE_KEY, JSON.stringify([{ map: ['x'] }, 'lixo', createCustomLevel(40)]));
    const slots = loadEditorSlots(storage);
    expect(slots[0]).toBeNull();
    expect(slots[1]).toBeNull();
    expect(slots[2]?.name).toBe('Minha fase');
    storage.setItem(EDITOR_STORAGE_KEY, '{quebrado');
    expect(loadEditorSlots(storage)).toEqual([null, null, null]);
  });

  it('ignora índice de slot inválido', () => {
    const slots = loadEditorSlots(null);
    expect(saveEditorSlot(null, slots, 5, createCustomLevel())).toBe(slots);
  });
});
