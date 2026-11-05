/**
 * Volumes do jogo (0 a 1), ajustados em passos de 10%. Módulo puro.
 */

export interface VolumeSettings {
  master: number;
  music: number;
  sfx: number;
}

export type VolumeChannel = keyof VolumeSettings;

export const VOLUME_STEP = 0.1;

export function defaultVolumes(): VolumeSettings {
  return { master: 0.8, music: 0.6, sfx: 0.8 };
}

export function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return 0;
  // Arredonda para o passo mais próximo, evitando 0.30000000000000004.
  return Math.round(Math.max(0, Math.min(1, value)) / VOLUME_STEP) * VOLUME_STEP;
}

/** Aumenta ou diminui um canal em um passo. */
export function stepVolume(settings: VolumeSettings, channel: VolumeChannel, direction: 1 | -1): VolumeSettings {
  return { ...settings, [channel]: Number(clampVolume(settings[channel] + direction * VOLUME_STEP).toFixed(1)) };
}

export function sanitizeVolumes(raw: unknown): VolumeSettings {
  const base = defaultVolumes();
  if (!raw || typeof raw !== 'object') return base;
  const data = raw as Record<string, unknown>;
  const read = (key: VolumeChannel): number => (typeof data[key] === 'number' ? Number(clampVolume(data[key] as number).toFixed(1)) : base[key]);
  return { master: read('master'), music: read('music'), sfx: read('sfx') };
}

/** Barrinha de volume em texto, ex.: "■■■■■■□□□□". */
export function volumeBar(value: number, size = 10): string {
  const filled = Math.round(clampVolume(value) * size);
  return '■'.repeat(filled) + '□'.repeat(size - filled);
}
