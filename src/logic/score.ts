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

export const START_LIVES = 5;
export const MAX_LIVES = 9;
export const COINS_PER_EXTRA_LIFE = 50;
export const TIME_BONUS_PER_SECOND = 20;
export const MAX_COMBO_MULTIPLIER = 8;

export interface RunState {
  /** Índice (base 0) da fase atual. */
  levelIndex: number;
  /** Vidas do jogador 1 (ou do único jogador). */
  lives: number;
  /** Vidas do jogador 2 — só existe no modo cooperativo (vidas separadas). */
  lives2?: number;
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

/** Partida cooperativa: cada jogador começa com as próprias vidas. */
export function createCoopRun(levelIndex = 0, lives = START_LIVES): RunState {
  const run = createRun(levelIndex, lives);
  return { ...run, lives2: run.lives };
}

/** Vidas de um jogador (0 = jogador 1, 1 = jogador 2). */
export function livesOf(run: RunState, player: number): number {
  return player === 1 && run.lives2 !== undefined ? run.lives2 : run.lives;
}

function withLives(run: RunState, player: number, lives: number): RunState {
  return player === 1 && run.lives2 !== undefined ? { ...run, lives2: clampLives(lives) } : { ...run, lives: clampLives(lives) };
}

/**
 * Coleta uma moeda; a cada {@link COINS_PER_EXTRA_LIFE} moedas quem pegou a moeda
 * ganha uma vida (no cooperativo, cada jogador tem as próprias vidas).
 */
export function collectCoin(run: RunState, player = 0): CoinResult {
  let coinBank = run.coinBank + 1;
  let lives = livesOf(run, player);
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
      ...withLives(run, player, lives),
      coinBank,
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

export interface PlayerLifeResult extends LifeResult {
  /** O jogador ficou sem vidas (no cooperativo, fica fora até o próximo checkpoint). */
  out: boolean;
}

export function loseLife(run: RunState, player = 0): PlayerLifeResult {
  const lives = Math.max(0, livesOf(run, player) - 1);
  const next = withLives(run, player, lives);
  const out = lives === 0;
  // Cooperativo: só acaba quando os dois jogadores estão sem vidas.
  const gameOver = next.lives2 !== undefined ? next.lives === 0 && next.lives2 === 0 : out;
  return { run: next, gameOver, out };
}

/** Cooperativo: quem estava sem vidas volta com uma (no checkpoint ou na fase seguinte). */
export function reviveOutPlayers(run: RunState): { run: RunState; revived: number[] } {
  if (run.lives2 === undefined) return { run, revived: [] };
  const revived = [run.lives, run.lives2].flatMap((l, i) => (l === 0 ? [i] : []));
  let next = run;
  for (const i of revived) next = withLives(next, i, 1);
  return { run: next, revived };
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

/** Tempo com centésimos, ex.: 1:05.42 (speedrun e desafio diário). */
export function formatTimePrecise(seconds: number): string {
  const total = Math.max(0, seconds);
  const m = Math.floor(total / 60);
  const s = Math.floor(total % 60);
  const cs = Math.floor((total * 100) % 100);
  return `${m}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

export function formatScore(score: number, digits = 7): string {
  return String(Math.max(0, Math.floor(score))).padStart(digits, '0');
}
