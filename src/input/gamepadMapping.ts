/**
 * Leitura de gamepads no "mapeamento padrão" do navegador. Módulo puro (testável).
 *
 * Botões: 0 = A (pular), 1 = B (investida), 2 = X (dash), 3 = Y (dash),
 * 8 = Select (voltar), 9 = Start (pausa), 12-15 = direcional.
 */
import type { GameMode } from './controls';
import { DEFAULT_PAD, type PadMap } from '../logic/accessibility';

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

/**
 * Direcional de controles fora do mapeamento padrão (genéricos USB/Bluetooth):
 * no Firefox/Linux ele vem nos eixos 6 e 7; no Chrome costuma vir como "hat" no eixo 9
 * (-1 = cima, girando no sentido horário em passos de 2/7; valores acima de 1 = solto).
 */
export function readHat(axes: readonly number[]): { left: boolean; right: boolean; up: boolean; down: boolean } {
  const out = { left: false, right: false, up: false, down: false };
  const h = axes[9];
  if (h !== undefined && Math.abs(h) <= 1.05) {
    const dir = ((Math.round((h + 1) / (2 / 7)) % 8) + 8) % 8; // 0 = cima, 2 = direita, 4 = baixo, 6 = esquerda
    out.up = dir === 7 || dir === 0 || dir === 1;
    out.right = dir >= 1 && dir <= 3;
    out.down = dir >= 3 && dir <= 5;
    out.left = dir >= 5 && dir <= 7;
  }
  const hx = axes[6] ?? 0;
  const hy = axes[7] ?? 0;
  out.left ||= hx < -0.5;
  out.right ||= hx > 0.5;
  out.up ||= hy < -0.5;
  out.down ||= hy > 0.5;
  return out;
}

/** Converte botões e eixos crus em ações do jogo. `standard` = mapeamento padrão do navegador. */
export function readPadButtons(buttons: readonly RawButton[], axes: readonly number[], map: PadMap = DEFAULT_PAD, standard = true): PadButtons {
  const b = (i: number): boolean => !!buttons[i]?.pressed || (buttons[i]?.value ?? 0) > 0.5;
  const any = (list: number[]): boolean => list.some(b);
  const ax = axes[0] ?? 0;
  const ay = axes[1] ?? 0;
  const hat = standard ? { left: false, right: false, up: false, down: false } : readHat(axes);
  return {
    left: b(14) || ax < -STICK_DEADZONE || hat.left,
    right: b(15) || ax > STICK_DEADZONE || hat.right,
    up: b(12) || ay < -STICK_DEADZONE || hat.up,
    down: b(13) || ay > STICK_DEADZONE || hat.down,
    jump: any(map.jump),
    dash: any(map.dash),
    charge: any(map.charge),
    start: any(map.pause),
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
