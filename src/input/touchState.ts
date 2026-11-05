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
