import { describe, expect, it } from 'vitest';
import {
  DEFAULT_KEYS,
  DEFAULT_PAD,
  assignKey,
  assignPadButton,
  daltonizeMatrix,
  defaultAccess,
  keyLabel,
  sanitizeAccess,
  toColorMatrix,
} from '../src/logic/accessibility';
import { readPadButtons } from '../src/input/gamepadMapping';
import { sanitizeSave } from '../src/logic/save';

const apply = (m: number[], rgb: [number, number, number]) => [0, 1, 2].map((r) => m[r * 3] * rgb[0] + m[r * 3 + 1] * rgb[1] + m[r * 3 + 2] * rgb[2]);

describe('acessibilidade: opções', () => {
  it('padrão: efeitos ligados, 100% e texto normal', () => {
    expect(defaultAccess()).toMatchObject({ colorblind: 'off', shake: true, flash: true, speed: 1, textScale: 1 });
  });

  it('corrige valores inválidos e aceita saves antigos', () => {
    const a = sanitizeAccess({ colorblind: 'roxo', shake: false, speed: 0.5, textScale: 1.25, keys: { jump: ['KeyJ', 'KeyJ', 7] }, pad: { dash: [40, 2] } });
    expect(a.colorblind).toBe('off');
    expect(a.shake).toBe(false);
    expect(a.flash).toBe(true);
    expect(a.speed).toBe(1);
    expect(a.textScale).toBe(1.25);
    expect(a.keys.jump).toEqual(['KeyJ']);
    expect(a.keys.left).toEqual(DEFAULT_KEYS.left);
    expect(a.pad.dash).toEqual([2]);
    expect(sanitizeSave({ version: 2 }, 15).access).toEqual(defaultAccess());
    expect(sanitizeAccess({ speed: 0.75 }).speed).toBe(0.75);
  });
});

describe('acessibilidade: remapear', () => {
  it('troca a tecla de uma ação', () => {
    const keys = assignKey(DEFAULT_KEYS, 'jump', 'KeyJ');
    expect(keys.jump).toEqual(['KeyJ']);
    expect(DEFAULT_KEYS.jump).toContain('Space');
  });

  it('tira a tecla de outra ação e troca se ela ficaria sem nenhuma', () => {
    let keys = assignKey(DEFAULT_KEYS, 'dash', 'KeyX');
    keys = assignKey(keys, 'jump', 'KeyX');
    expect(keys.jump).toEqual(['KeyX']);
    expect(keys.dash).toEqual(['Space']);
  });

  it('remapeia botões do gamepad e o leitor usa o novo mapa', () => {
    const pad = assignPadButton(DEFAULT_PAD, 'jump', 2);
    expect(pad.jump).toEqual([2]);
    expect(pad.dash).not.toContain(2);
    const buttons = Array.from({ length: 16 }, (_, i) => ({ pressed: i === 2 }));
    expect(readPadButtons(buttons, [0, 0], pad)).toMatchObject({ jump: true, dash: false });
    expect(readPadButtons(buttons, [0, 0])).toMatchObject({ jump: false, dash: true });
  });

  it('mostra nomes curtos das teclas', () => {
    expect(keyLabel('KeyJ')).toBe('J');
    expect(keyLabel('ArrowUp')).toBe('Seta C');
    expect(keyLabel('Space')).toBe('Espaço');
    expect(keyLabel('Numpad5')).toBe('Numpad5');
  });
});

describe('acessibilidade: daltonismo', () => {
  it('sem filtro é a identidade', () => {
    expect(daltonizeMatrix('off')).toEqual([1, 0, 0, 0, 1, 0, 0, 0, 1]);
  });

  it('não mexe em tons de cinza (preserva brilho de branco e preto)', () => {
    for (const mode of ['protanopia', 'deuteranopia', 'tritanopia'] as const) {
      const m = daltonizeMatrix(mode);
      for (const v of apply(m, [1, 1, 1])) expect(v).toBeCloseTo(1, 1);
      for (const v of apply(m, [0, 0, 0])) expect(v).toBeCloseTo(0, 5);
    }
  });

  it('aumenta a diferença entre vermelho e verde para protanopia/deuteranopia', () => {
    for (const mode of ['protanopia', 'deuteranopia'] as const) {
      const m = daltonizeMatrix(mode);
      const red = apply(m, [0.7, 0.24, 0.33]);
      const green = apply(m, [0.22, 0.72, 0.39]);
      // O canal azul passa a separar as duas cores.
      expect(Math.abs(red[2] - green[2])).toBeGreaterThan(Math.abs(0.33 - 0.39));
    }
  });

  it('gera a matriz 4x5 da ColorMatrix', () => {
    const cm = toColorMatrix(daltonizeMatrix('tritanopia'));
    expect(cm).toHaveLength(20);
    expect(cm.slice(15)).toEqual([0, 0, 0, 1, 0]);
  });
});
