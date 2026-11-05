import { describe, expect, it } from 'vitest';
import {
  COINS_PER_EXTRA_LIFE,
  MAX_LIVES,
  POINTS,
  START_LIVES,
  addPoints,
  collectCoin,
  createRun,
  enemyPoints,
  formatScore,
  formatTime,
  levelClearBonus,
  loseLife,
  timeBonus,
} from '../src/logic/score';

describe('createRun', () => {
  it('começa com vidas padrão e pontuação zerada', () => {
    const run = createRun();
    expect(run).toEqual({ levelIndex: 0, lives: START_LIVES, score: 0, coinBank: 0, totalCoins: 0 });
  });

  it('respeita a fase inicial e limita as vidas', () => {
    expect(createRun(3).levelIndex).toBe(3);
    expect(createRun(0, 99).lives).toBe(MAX_LIVES);
    expect(createRun(-2).levelIndex).toBe(0);
  });
});

describe('addPoints', () => {
  it('soma pontos positivos e ignora valores inválidos', () => {
    const run = createRun();
    expect(addPoints(run, 150).score).toBe(150);
    expect(addPoints(run, -10)).toBe(run);
    expect(addPoints(run, Number.NaN)).toBe(run);
  });

  it('não altera o estado original', () => {
    const run = createRun();
    addPoints(run, 100);
    expect(run.score).toBe(0);
  });
});

describe('collectCoin', () => {
  it('soma pontos e contadores de moedas', () => {
    const { run, extraLife } = collectCoin(createRun());
    expect(run.score).toBe(POINTS.coin);
    expect(run.coinBank).toBe(1);
    expect(run.totalCoins).toBe(1);
    expect(extraLife).toBe(false);
  });

  it(`dá uma vida extra a cada ${COINS_PER_EXTRA_LIFE} moedas`, () => {
    let run = createRun();
    let lifeEvents = 0;
    for (let i = 0; i < COINS_PER_EXTRA_LIFE * 2; i++) {
      const result = collectCoin(run);
      run = result.run;
      if (result.extraLife) lifeEvents++;
    }
    expect(lifeEvents).toBe(2);
    expect(run.lives).toBe(START_LIVES + 2);
    expect(run.coinBank).toBe(0);
    expect(run.totalCoins).toBe(COINS_PER_EXTRA_LIFE * 2);
  });

  it('não ultrapassa o máximo de vidas', () => {
    let run = { ...createRun(), lives: MAX_LIVES, coinBank: COINS_PER_EXTRA_LIFE - 1 };
    const result = collectCoin(run);
    run = result.run;
    expect(result.extraLife).toBe(false);
    expect(run.lives).toBe(MAX_LIVES);
  });
});

describe('enemyPoints', () => {
  it('dobra a cada pisão em sequência até o limite', () => {
    expect(enemyPoints(1)).toBe(POINTS.enemy);
    expect(enemyPoints(2)).toBe(POINTS.enemy * 2);
    expect(enemyPoints(3)).toBe(POINTS.enemy * 4);
    expect(enemyPoints(4)).toBe(POINTS.enemy * 8);
    expect(enemyPoints(10)).toBe(POINTS.enemy * 8);
  });

  it('trata combos inválidos como o primeiro', () => {
    expect(enemyPoints(0)).toBe(POINTS.enemy);
    expect(enemyPoints(-3)).toBe(POINTS.enemy);
  });
});

describe('loseLife', () => {
  it('perde uma vida e sinaliza game over ao chegar a zero', () => {
    let result = loseLife({ ...createRun(), lives: 2 });
    expect(result.run.lives).toBe(1);
    expect(result.gameOver).toBe(false);
    result = loseLife(result.run);
    expect(result.run.lives).toBe(0);
    expect(result.gameOver).toBe(true);
  });

  it('nunca fica negativo', () => {
    expect(loseLife({ ...createRun(), lives: 0 }).run.lives).toBe(0);
  });
});

describe('bônus de fase', () => {
  it('dá bônus apenas pelo tempo que sobrou', () => {
    expect(timeBonus(30, 90)).toBe(60 * 20);
    expect(timeBonus(90, 90)).toBe(0);
    expect(timeBonus(120, 90)).toBe(0);
    expect(timeBonus(-1, 90)).toBe(0);
  });

  it('soma conclusão, tempo e todas as moedas', () => {
    const full = levelClearBonus({ seconds: 80, parSeconds: 90, coinsCollected: 20, coinsTotal: 20 });
    expect(full).toEqual({ clear: POINTS.levelClear, time: 200, coins: POINTS.allCoins, total: POINTS.levelClear + 200 + POINTS.allCoins });

    const partial = levelClearBonus({ seconds: 200, parSeconds: 90, coinsCollected: 5, coinsTotal: 20 });
    expect(partial.total).toBe(POINTS.levelClear);
  });
});

describe('formatação', () => {
  it('formata tempo como m:ss', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(65.9)).toBe('1:05');
    expect(formatTime(-5)).toBe('0:00');
  });

  it('formata pontuação com zeros à esquerda', () => {
    expect(formatScore(1234)).toBe('0001234');
    expect(formatScore(42, 3)).toBe('042');
  });
});
