import { describe, expect, it } from 'vitest';
import { clampVolume, defaultVolumes, sanitizeVolumes, stepVolume, volumeBar } from '../src/logic/audioSettings';
import { defaultSave, sanitizeSave } from '../src/logic/save';

describe('volumes', () => {
  it('limita e arredonda em passos de 10%', () => {
    expect(clampVolume(1.7)).toBe(1);
    expect(clampVolume(-1)).toBe(0);
    expect(clampVolume(0.34)).toBeCloseTo(0.3);
    expect(clampVolume(Number.NaN)).toBe(0);
  });

  it('sobe e desce um passo sem passar dos limites', () => {
    let v = defaultVolumes();
    v = stepVolume(v, 'music', 1);
    expect(v.music).toBe(0.7);
    for (let i = 0; i < 20; i++) v = stepVolume(v, 'music', 1);
    expect(v.music).toBe(1);
    for (let i = 0; i < 20; i++) v = stepVolume(v, 'sfx', -1);
    expect(v.sfx).toBe(0);
  });

  it('desenha a barra', () => {
    expect(volumeBar(0.6)).toBe('■■■■■■□□□□');
    expect(volumeBar(0, 4)).toBe('□□□□');
  });

  it('é salvo e validado no save', () => {
    expect(defaultSave().volumes).toEqual(defaultVolumes());
    expect(sanitizeVolumes({ master: 3, music: 'alto' })).toEqual({ master: 1, music: defaultVolumes().music, sfx: defaultVolumes().sfx });
    expect(sanitizeSave({ volumes: { master: 0.2, music: 0.4, sfx: 0.9 } }, 10).volumes).toEqual({ master: 0.2, music: 0.4, sfx: 0.9 });
  });
});
