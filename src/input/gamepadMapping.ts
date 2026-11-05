/**
 * Leitura de gamepads no "mapeamento padrão" do navegador. Módulo puro (testável).
 *
 * Botões: 0 = A (pular), 1 = B (investida), 2 = X (dash), 3 = Y (dash),
 * 8 = Select (voltar), 9 = Start (pausa), 12-15 = direcional.
 */
import type { GameMode } from './controls';

export const STICK_DEADZONE = 0.4;

export interface PadButtons {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  jump: boolean;
  dash: boolean;
  charge: boolean;
  start: boolean;
  back: boolean;
}

export interface RawButton {
  pressed: boolean;
  value?: number;
}

export function emptyButtons(): PadButtons {
  return { left: false, right: false, up: false, down: false, jump: false, dash: false, charge: false, start: false, back: false };
}

/** Converte botões e eixos crus em ações do jogo. */
export function readPadButtons(buttons: readonly RawButton[], axes: readonly number[]): PadButtons {
  const b = (i: number): boolean => !!buttons[i]?.pressed || (buttons[i]?.value ?? 0) > 0.5;
  const ax = axes[0] ?? 0;
  const ay = axes[1] ?? 0;
  return {
    left: b(14) || ax < -STICK_DEADZONE,
    right: b(15) || ax > STICK_DEADZONE,
    up: b(12) || ay < -STICK_DEADZONE,
    down: b(13) || ay > STICK_DEADZONE,
    jump: b(0),
    dash: b(2) || b(3) || b(5),
    charge: b(1) || b(4),
    start: b(9),
    back: b(8),
  };
}

/** Botões que acabaram de ser apertados (borda de subida). */
export function justPressed(now: PadButtons, before: PadButtons): PadButtons {
  const out = emptyButtons();
  for (const key of Object.keys(out) as (keyof PadButtons)[]) out[key] = now[key] && !before[key];
  return out;
}

/**
 * Qual controle (posição na lista de conectados) comanda cada jogador.
 * Um jogador: qualquer controle. Dois jogadores: com 2 controles, um para cada;
 * com só 1 controle, ele fica com o jogador 2 (o jogador 1 usa o teclado).
 * Retorna `'any'`, um índice, ou `null` se o jogador não tem controle.
 */
export function padForPlayer(mode: GameMode, playerIndex: number, connected: number): number | 'any' | null {
  if (connected === 0) return null;
  if (mode === 'single') return playerIndex === 0 ? 'any' : null;
  if (connected >= 2) return playerIndex < connected ? playerIndex : null;
  return playerIndex === 1 ? 0 : null;
}

/** Teclas simuladas nos menus a partir do controle. */
export const MENU_KEYS: Partial<Record<keyof PadButtons, { key: string; code: string; keyCode: number }>> = {
  up: { key: 'ArrowUp', code: 'ArrowUp', keyCode: 38 },
  down: { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40 },
  left: { key: 'ArrowLeft', code: 'ArrowLeft', keyCode: 37 },
  right: { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39 },
  jump: { key: 'Enter', code: 'Enter', keyCode: 13 },
  start: { key: 'Enter', code: 'Enter', keyCode: 13 },
  charge: { key: 'Escape', code: 'Escape', keyCode: 27 },
  back: { key: 'Escape', code: 'Escape', keyCode: 27 },
};
