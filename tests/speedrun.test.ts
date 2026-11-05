import { describe, expect, it } from 'vitest';
import {
  GhostPlayback,
  GhostRecorder,
  KEYFRAME_EVERY,
  decodeInput,
  encodeInput,
  expandRle,
  ghostPositionAt,
  isGhostData,
  type GhostInput,
} from '../src/logic/ghost';
import { defaultSave, sanitizeSave } from '../src/logic/save';
import {
  availableCategories,
  categoryFor,
  cumulative,
  finishRun,
  recordSegments,
  sanitizeSpeedrun,
  splitDelta,
  sumOfBest,
} from '../src/logic/speedrun';

const idle: GhostInput = { left: false, right: false, jumpHeld: false, jumpPressed: false, dashPressed: false, chargeHeld: false };

describe('speedrun: categorias e splits', () => {
  it('categorias por fase, mundo e jogo completo', () => {
    expect(categoryFor('level-3')?.levels).toEqual([3]);
    expect(categoryFor('world-2')?.levels).toEqual([5, 6, 7, 8, 9]);
    expect(categoryFor('all')?.levels).toHaveLength(15);
    expect(categoryFor('world-9')).toBeNull();
    expect(categoryFor('level-99')).toBeNull();
    expect(availableCategories(1)).toEqual(['level-0']);
    expect(availableCategories(6)).toEqual(['world-1', 'level-0', 'level-1', 'level-2', 'level-3', 'level-4', 'level-5']);
    expect(availableCategories(15)).toContain('all');
  });

  it('calcula splits acumulados e a diferença para o recorde', () => {
    expect(cumulative([10, 20, 5])).toEqual([10, 30, 35]);
    const first = finishRun(undefined, [10, 20, 5]);
    expect(first.isPb).toBe(true);
    expect(first.best).toEqual({ pb: 35, splits: [10, 30, 35], bestSegments: [10, 20, 5] });
    expect(splitDelta(first.best, 1, 28)).toBe(-2);
    expect(splitDelta(first.best, 1, 33)).toBe(3);
    expect(splitDelta(undefined, 0, 10)).toBeNull();
  });

  it('só troca o recorde se for mais rápido, mas guarda os melhores trechos', () => {
    const pb = finishRun(undefined, [10, 20, 5]).best;
    const slower = finishRun(pb, [8, 25, 6]);
    expect(slower.isPb).toBe(false);
    expect(slower.best.pb).toBe(35);
    expect(slower.best.bestSegments).toEqual([8, 20, 5]);
    expect(sumOfBest(slower.best, 3)).toBe(33);
    expect(sumOfBest(slower.best, 4)).toBeNull();
    expect(recordSegments(slower.best, [7]).bestSegments).toEqual([7, 20, 5]);
  });

  it('o save guarda os recordes e ignora categorias inválidas', () => {
    expect(defaultSave().speedrun).toEqual({});
    const s = sanitizeSpeedrun({ 'world-1': { pb: 90, splits: [10, 'x', 20], bestSegments: [-1, 5] }, xyz: { pb: 1 } });
    expect(s).toEqual({ 'world-1': { pb: 90, splits: [10, 20], bestSegments: [5] } });
    expect(sanitizeSave({ speedrun: { 'level-0': { pb: 0 } } }, 15).speedrun['level-0'].pb).toBeNull();
  });
});

describe('fantasma: gravar e reproduzir', () => {
  it('codifica e decodifica os comandos', () => {
    const input = { ...idle, right: true, jumpPressed: true, chargeHeld: true };
    expect(decodeInput(encodeInput(input))).toEqual(input);
    expect(encodeInput(idle)).toBe(0);
  });

  it('compacta comandos repetidos (RLE)', () => {
    const rec = new GhostRecorder();
    for (let i = 0; i < 100; i++) rec.push({ ...idle, right: true }, 16.7, i, 0, 0, false);
    for (let i = 0; i < 50; i++) rec.push({ ...idle, right: true, jumpHeld: true }, 16.7, 100 + i, 0, 0, false);
    const data = rec.finish(2.5, 150, 0, 0, false);
    expect(data.inputs).toHaveLength(2);
    expect(expandRle(data.inputs)).toHaveLength(150);
    expect(data.keys.length).toBe(Math.ceil(150 / KEYFRAME_EVERY) + 1);
    expect(isGhostData(JSON.parse(JSON.stringify(data)))).toBe(true);
  });

  it('a reprodução devolve exatamente os comandos gravados, no tempo certo', () => {
    const rec = new GhostRecorder();
    const script: GhostInput[] = [];
    for (let i = 0; i < 90; i++) {
      const input = { ...idle, right: i % 30 < 20, jumpPressed: i === 10 || i === 50, jumpHeld: i >= 10 && i < 25 };
      script.push(input);
      rec.push(input, 16, i * 2, 100 - i, i % 4, i > 60);
    }
    const playback = new GhostPlayback(rec.finish(1.44, 180, 10, 0, true));
    const replayed: GhostInput[] = [];
    for (let t = 0; t <= 90 * 16; t += 10) replayed.push(...playback.advance(t).map((s) => s.input));
    expect(replayed).toEqual(script);
    expect(playback.finished).toBe(true);
  });

  it('interpola a posição entre os quadros-chave', () => {
    const keys: [number, number, number, number, number][] = [
      [0, 0, 0, 0, 0],
      [100, 10, 20, 1, 1],
    ];
    expect(ghostPositionAt(keys, 50)).toEqual({ x: 5, y: 10, frame: 0, flip: false });
    expect(ghostPositionAt(keys, 500)).toEqual({ x: 10, y: 20, frame: 1, flip: true });
    expect(ghostPositionAt(keys, -5)).toEqual({ x: 0, y: 0, frame: 0, flip: false });
    expect(ghostPositionAt([], 10)).toBeNull();
  });

  it('rejeita fantasmas corrompidos', () => {
    expect(isGhostData({ version: 2 })).toBe(false);
    expect(isGhostData({ version: 1, time: 3, inputs: [[1]], steps: [], keys: [] })).toBe(false);
    expect(isGhostData(null)).toBe(false);
  });
});
