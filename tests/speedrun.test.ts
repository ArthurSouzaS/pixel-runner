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

describe('fantasma: gravação longa com quadros irregulares', () => {
  it('sobrevive ao JSON e reproduz tudo, mesmo avançando em saltos irregulares', () => {
    const random = mulberry(7);
    const rec = new GhostRecorder();
    const script: { input: GhostInput; ms: number }[] = [];
    for (let i = 0; i < 2000; i++) {
      const input: GhostInput = {
        left: random() < 0.2,
        right: random() < 0.6,
        jumpHeld: random() < 0.3,
        jumpPressed: random() < 0.05,
        dashPressed: random() < 0.02,
        chargeHeld: random() < 0.1,
      };
      // Quadros de 8 a 33 ms (celular lento, monitor de 120 Hz...).
      const ms = 8 + Math.floor(random() * 26);
      script.push({ input, ms });
      rec.push(input, ms, i, i * 2, i % 7, i % 2 === 0);
    }
    const data = JSON.parse(JSON.stringify(rec.finish(33.3, 1, 2, 0, false))) as unknown;
    expect(isGhostData(data)).toBe(true);
    if (!isGhostData(data)) return;
    expect(data.keys.length).toBe(Math.ceil(2000 / KEYFRAME_EVERY) + 1);

    const playback = new GhostPlayback(data);
    const replayed: { input: GhostInput; ms: number }[] = [];
    let t = 0;
    while (!playback.finished) {
      t += 5 + Math.floor(random() * 60);
      replayed.push(...playback.advance(t));
    }
    expect(replayed).toEqual(script);
  });

  it('rejeita fantasmas com quadros inconsistentes ou absurdos', () => {
    const base = { version: 1, time: 3, keys: [[0, 0, 0, 0, 0]] };
    expect(isGhostData({ ...base, inputs: [[1, 10]], steps: [[16, 10]] })).toBe(true);
    expect(isGhostData({ ...base, inputs: [[1, 10]], steps: [[16, 9]] })).toBe(false);
    expect(isGhostData({ ...base, inputs: [[1, 1e12]], steps: [[16, 1e12]] })).toBe(false);
    expect(isGhostData({ ...base, inputs: [[1, -2]], steps: [[16, -2]] })).toBe(false);
    expect(isGhostData({ ...base, inputs: [[1, 1.5]], steps: [[16, 1.5]] })).toBe(false);
  });
});

function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
