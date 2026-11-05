/**
 * Regras de pontuação e vidas do Pixel Runner.
 * Módulo puro: não depende do Phaser e é coberto por testes no Vitest.
 */

export const POINTS = {
  coin: 10,
  enemy: 100,
  bossHit: 250,
  boss: 2000,
  checkpoint: 50,
  allCoins: 500,
  levelClear: 1000,
} as const;

export const START_LIVES = 3;
export const MAX_LIVES = 9;
export const COINS_PER_EXTRA_LIFE = 50;
export const TIME_BONUS_PER_SECOND = 20;
export const MAX_COMBO_MULTIPLIER = 8;

export interface RunState {
  /** Índice (base 0) da fase atual. */
  levelIndex: number;
  lives: number;
  score: number;
  /** Moedas acumuladas para a próxima vida extra. */
  coinBank: number;
  /** Total de moedas coletadas na partida. */
  totalCoins: number;
}

export function createRun(levelIndex = 0, lives = START_LIVES): RunState {
  return {
    levelIndex: Math.max(0, Math.floor(levelIndex)),
    lives: clampLives(lives),
    score: 0,
    coinBank: 0,
    totalCoins: 0,
  };
}

export function clampLives(lives: number): number {
  return Math.max(0, Math.min(MAX_LIVES, Math.floor(lives)));
}

export function addPoints(run: RunState, points: number): RunState {
  if (!Number.isFinite(points) || points <= 0) return run;
  return { ...run, score: run.score + Math.floor(points) };
}

export interface CoinResult {
  run: RunState;
  extraLife: boolean;
}

/** Coleta uma moeda; a cada {@link COINS_PER_EXTRA_LIFE} moedas o jogador ganha uma vida. */
export function collectCoin(run: RunState): CoinResult {
  let coinBank = run.coinBank + 1;
  let lives = run.lives;
  let extraLife = false;
  if (coinBank >= COINS_PER_EXTRA_LIFE) {
    coinBank -= COINS_PER_EXTRA_LIFE;
    if (lives < MAX_LIVES) {
      lives += 1;
      extraLife = true;
    }
  }
  return {
    run: {
      ...run,
      coinBank,
      lives,
      totalCoins: run.totalCoins + 1,
      score: run.score + POINTS.coin,
    },
    extraLife,
  };
}

/**
 * Pontos por derrotar um inimigo. Pisões seguidos sem tocar o chão
 * formam um combo que dobra os pontos até {@link MAX_COMBO_MULTIPLIER}x.
 */
export function enemyPoints(combo: number): number {
  const step = Math.max(1, Math.floor(combo));
  const multiplier = Math.min(MAX_COMBO_MULTIPLIER, 2 ** (step - 1));
  return POINTS.enemy * multiplier;
}

export interface LifeResult {
  run: RunState;
  gameOver: boolean;
}

export function loseLife(run: RunState): LifeResult {
  const lives = Math.max(0, run.lives - 1);
  return { run: { ...run, lives }, gameOver: lives === 0 };
}

/** Bônus por terminar antes do tempo de referência ("par") da fase. */
export function timeBonus(seconds: number, parSeconds: number): number {
  if (!Number.isFinite(seconds) || seconds < 0) return 0;
  const remaining = Math.floor(parSeconds - seconds);
  return remaining > 0 ? remaining * TIME_BONUS_PER_SECOND : 0;
}

export interface LevelClearInput {
  seconds: number;
  parSeconds: number;
  coinsCollected: number;
  coinsTotal: number;
}

export interface LevelClearBreakdown {
  clear: number;
  time: number;
  coins: number;
  total: number;
}

export function levelClearBonus(input: LevelClearInput): LevelClearBreakdown {
  const clear = POINTS.levelClear;
  const time = timeBonus(input.seconds, input.parSeconds);
  const coins = input.coinsTotal > 0 && input.coinsCollected >= input.coinsTotal ? POINTS.allCoins : 0;
  return { clear, time, coins, total: clear + time + coins };
}

/** Formata segundos como m:ss para o HUD. */
export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

export function formatScore(score: number, digits = 7): string {
  return String(Math.max(0, Math.floor(score))).padStart(digits, '0');
}
