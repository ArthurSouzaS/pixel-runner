import { describe, expect, it } from 'vitest';
import { DAILY_BOARD_SIZE, addAttempt, addDailyEntry, dailySeed, emptyDaily, rollDaily, sanitizeDaily, todayString } from '../src/logic/daily';
import { generateDaily, isCompletable } from '../src/logic/procgen';
import { formatTimePrecise } from '../src/logic/score';
import { defaultSave, sanitizeSave } from '../src/logic/save';

describe('desafio diário', () => {
  it('usa a data em UTC e uma seed por dia', () => {
    expect(todayString(new Date('2026-11-05T23:30:00-03:00'))).toBe('2026-11-06');
    expect(dailySeed('2026-11-05')).toBe('D20261105');
  });

  it('a fase do dia é igual para todo mundo e muda a cada dia', () => {
    expect(generateDaily('2026-11-05')).toEqual(generateDaily('2026-11-05'));
    expect(generateDaily('2026-11-05').level.map).not.toEqual(generateDaily('2026-11-06').level.map);
  });

  it('a fase do dia é sempre possível de terminar', () => {
    const start = new Date('2026-01-01T12:00:00Z').getTime();
    for (let d = 0; d < 120; d++) {
      const date = todayString(new Date(start + d * 86_400_000));
      expect(isCompletable(generateDaily(date).level.map), date).toBe(true);
    }
  });

  it('placar ordena pelo tempo e limita o tamanho', () => {
    let s = emptyDaily('2026-11-05');
    s = addDailyEntry(s, '2026-11-05', { name: 'ANA', time: 80, coins: 10 }).state;
    const r = addDailyEntry(s, '2026-11-05', { name: 'PIX', time: 60.5, coins: 3 });
    expect(r.rank).toBe(0);
    s = r.state;
    expect(s.entries.map((e) => e.name)).toEqual(['PIX', 'ANA']);
    for (let i = 0; i < 20; i++) s = addDailyEntry(s, '2026-11-05', { name: 'X', time: 100 + i, coins: 0 }).state;
    expect(s.entries).toHaveLength(DAILY_BOARD_SIZE);
    expect(addDailyEntry(s, '2026-11-05', { name: 'LENTO', time: 999, coins: 0 }).rank).toBe(-1);
  });

  it('na virada do dia arquiva o melhor tempo e zera o placar', () => {
    let s = addAttempt(emptyDaily(), '2026-11-05');
    s = addDailyEntry(s, '2026-11-05', { name: 'PIX', time: 70, coins: 5 }).state;
    expect(s.attempts).toBe(1);
    const next = rollDaily(s, '2026-11-06');
    expect(next).toMatchObject({ date: '2026-11-06', attempts: 0, entries: [], history: [{ date: '2026-11-05', time: 70 }] });
    expect(rollDaily(next, '2026-11-06')).toBe(next);
  });

  it('o save guarda o desafio e o nome, e aceita saves antigos', () => {
    expect(defaultSave().daily).toEqual(emptyDaily());
    expect(sanitizeSave({}, 15).playerName).toBe('PIX');
    expect(sanitizeSave({ playerName: ' ana maria ' }, 15).playerName).toBe('ANA MARI');
    expect(sanitizeDaily({ date: 'ontem', attempts: -2, entries: [{ name: 'A', time: -1 }, { name: 'B', time: 50, coins: 2.5 }] })).toEqual({
      date: '',
      attempts: 0,
      entries: [{ name: 'B', time: 50, coins: 2 }],
      history: [],
    });
  });

  it('formata o tempo com centésimos', () => {
    expect(formatTimePrecise(65.426)).toBe('1:05.42');
    expect(formatTimePrecise(0)).toBe('0:00.00');
  });
});
