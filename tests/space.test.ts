import { describe, expect, it } from 'vitest';
import { LASER_WARNING_MS, laserStateAt } from '../src/logic/laser';

describe('lasers temporizados', () => {
  const laser = { on: 1000, off: 1500, offset: 0 };

  it('fica ligado no começo do ciclo', () => {
    expect(laserStateAt(laser, 0)).toBe('on');
    expect(laserStateAt(laser, 999)).toBe('on');
  });

  it('desliga e avisa antes de religar', () => {
    expect(laserStateAt(laser, 1000)).toBe('off');
    expect(laserStateAt(laser, 2500 - LASER_WARNING_MS - 1)).toBe('off');
    expect(laserStateAt(laser, 2500 - LASER_WARNING_MS)).toBe('warning');
    expect(laserStateAt(laser, 2500)).toBe('on');
  });

  it('respeita o atraso e tempos negativos', () => {
    expect(laserStateAt({ ...laser, offset: 1000 }, 0)).toBe('off');
    expect(laserStateAt(laser, -100)).toBe('warning');
  });
});
