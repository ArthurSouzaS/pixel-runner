import { describe, expect, it } from 'vitest';
import { STICK_DEADZONE, emptyButtons, justPressed, padForPlayer, readPadButtons, type RawButton } from '../src/input/gamepadMapping';

function buttons(pressed: number[]): RawButton[] {
  return Array.from({ length: 17 }, (_, i) => ({ pressed: pressed.includes(i), value: pressed.includes(i) ? 1 : 0 }));
}

describe('gamepad: leitura', () => {
  it('nada apertado', () => {
    expect(readPadButtons(buttons([]), [0, 0])).toEqual(emptyButtons());
  });

  it('mapeia botões do layout padrão', () => {
    const b = readPadButtons(buttons([0, 2, 1, 9, 8]), [0, 0]);
    expect(b).toMatchObject({ jump: true, dash: true, charge: true, start: true, back: true });
    expect(readPadButtons(buttons([3]), []).dash).toBe(true);
  });

  it('direcional e analógico com zona morta', () => {
    expect(readPadButtons(buttons([14]), [0, 0]).left).toBe(true);
    expect(readPadButtons(buttons([15, 12]), [0, 0])).toMatchObject({ right: true, up: true });
    expect(readPadButtons(buttons([]), [STICK_DEADZONE - 0.1, 0]).right).toBe(false);
    expect(readPadButtons(buttons([]), [0.9, -0.9])).toMatchObject({ right: true, up: true, left: false, down: false });
    expect(readPadButtons(buttons([]), [-0.8, 0.8])).toMatchObject({ left: true, down: true });
  });

  it('aceita gatilhos analógicos pelo valor', () => {
    const raw = buttons([]);
    raw[2] = { pressed: false, value: 0.8 };
    expect(readPadButtons(raw, []).dash).toBe(true);
  });

  it('detecta apenas a borda de subida', () => {
    const before = { ...emptyButtons(), jump: true };
    const now = { ...emptyButtons(), jump: true, dash: true };
    expect(justPressed(now, before)).toMatchObject({ jump: false, dash: true });
  });
});

describe('gamepad: qual controle comanda cada jogador', () => {
  it('um jogador usa qualquer controle', () => {
    expect(padForPlayer('single', 0, 2)).toBe('any');
    expect(padForPlayer('single', 0, 0)).toBeNull();
  });

  it('dois jogadores com dois controles', () => {
    expect(padForPlayer('coop', 0, 2)).toBe(0);
    expect(padForPlayer('race', 1, 2)).toBe(1);
  });

  it('com um só controle, ele fica com o jogador 2', () => {
    expect(padForPlayer('coop', 0, 1)).toBeNull();
    expect(padForPlayer('coop', 1, 1)).toBe(0);
  });
});
