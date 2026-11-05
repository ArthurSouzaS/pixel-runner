/** Evento de instalação do PWA (Chrome/Edge/Android). */
export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const installPrompt: { event: BeforeInstallPromptEvent | null } = { event: null };

/** Mostra o convite de instalação, se o navegador ofereceu um. */
export async function promptInstall(): Promise<boolean> {
  const e = installPrompt.event;
  if (!e) return false;
  installPrompt.event = null;
  await e.prompt();
  return (await e.userChoice).outcome === 'accepted';
}

/** Já está rodando como app instalado? */
export function isStandalone(): boolean {
  return window.matchMedia?.('(display-mode: standalone)').matches || window.matchMedia?.('(display-mode: fullscreen)').matches;
}
