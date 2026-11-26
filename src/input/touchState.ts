/**
 * Estado dos botões virtuais da tela de toque.
 * O HUD escreve aqui e a cena da fase lê junto com o teclado.
 */
export const touchState = {
  left: false,
  right: false,
  jump: false,
  dash: false,
  charge: false,
  /** Pressionamentos ainda não consumidos pela fase (para "acabou de apertar"). */
  jumpQueued: false,
  dashQueued: false,
  pauseQueued: false,

  reset(): void {
    this.left = this.right = this.jump = this.dash = this.charge = false;
    this.jumpQueued = this.dashQueued = this.pauseQueued = false;
  },

  consume(flag: 'jumpQueued' | 'dashQueued' | 'pauseQueued'): boolean {
    const value = this[flag];
    this[flag] = false;
    return value;
  },
};

/** Detecta se o dispositivo é de toque (celular/tablet). */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.matchMedia?.('(pointer: coarse)').matches;
}

/**
 * Modo de toque: liga quando o jogador toca de verdade na tela e desliga ao usar
 * teclado ou gamepad. Os botões virtuais só aparecem nesse modo — antes eles
 * apareciam em qualquer PC com tela sensível ao toque, mesmo jogando no teclado.
 */
let touchMode = false;
const touchModeListeners = new Set<(active: boolean) => void>();

export function usingTouch(): boolean {
  return touchMode;
}

export function setTouchMode(active: boolean): void {
  if (touchMode === active) return;
  touchMode = active;
  for (const listener of touchModeListeners) listener(active);
}

export function onTouchModeChange(listener: (active: boolean) => void): () => void {
  touchModeListeners.add(listener);
  return () => touchModeListeners.delete(listener);
}

/** Liga a detecção (uma vez, no início do jogo). */
export function installTouchModeDetection(): void {
  if (typeof window === 'undefined') return;
  const opts = { capture: true, passive: true };
  window.addEventListener('touchstart', () => setTouchMode(true), opts);
  window.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch') setTouchMode(true);
  }, opts);
  // Só teclas de verdade: o gamepad simula teclas nos menus (eventos não confiáveis).
  window.addEventListener('keydown', (e) => {
    if (e.isTrusted) setTouchMode(false);
  }, opts);
}
