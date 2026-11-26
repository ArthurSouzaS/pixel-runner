import { describe, expect, it } from 'vitest';
import { defaultAccess, sanitizeAccess } from '../src/logic/accessibility';
import {
  TOUCH_BUTTON_IDS,
  TOUCH_SCALE_MAX,
  TOUCH_SCALE_MIN,
  TOUCH_TOP_LIMIT,
  defaultTouchLayout,
  moveTouchButton,
  resizeTouchButton,
  sanitizeTouchLayout,
  touchRadius,
} from '../src/logic/touchLayout';
import { readHat, readPadButtons } from '../src/input/gamepadMapping';

describe('botões de toque configuráveis', () => {
  it('o padrão é o layout original e cabe na tela', () => {
    const l = defaultTouchLayout();
    expect(l.jump).toEqual({ x: 440, y: 222, scale: 1 });
    expect(l.left).toEqual({ x: 38, y: 234, scale: 1 });
    for (const id of TOUCH_BUTTON_IDS) {
      const r = touchRadius(id, l);
      expect(l[id].x - r).toBeGreaterThanOrEqual(0);
      expect(l[id].x + r).toBeLessThanOrEqual(480);
      expect(l[id].y + r).toBeLessThanOrEqual(270);
    }
  });

  it('mover mantém o botão inteiro na tela e abaixo do HUD', () => {
    let l = moveTouchButton(defaultTouchLayout(), 'jump', 9999, -50);
    expect(l.jump.x).toBe(480 - 26);
    expect(l.jump.y).toBe(TOUCH_TOP_LIMIT + 26);
    l = moveTouchButton(l, 'left', 200.6, 150.2);
    expect(l.left).toEqual({ x: 201, y: 150, scale: 1 });
    // Os outros botões não mudam.
    expect(l.dash).toEqual(defaultTouchLayout().dash);
  });

  it('o tamanho tem limites e o botão continua dentro da tela ao crescer', () => {
    let l = defaultTouchLayout();
    for (let i = 0; i < 20; i++) l = resizeTouchButton(l, 'jump', 0.1);
    expect(l.jump.scale).toBe(TOUCH_SCALE_MAX);
    expect(l.jump.x + touchRadius('jump', l)).toBeLessThanOrEqual(480);
    expect(l.jump.y + touchRadius('jump', l)).toBeLessThanOrEqual(270);
    for (let i = 0; i < 20; i++) l = resizeTouchButton(l, 'jump', -0.1);
    expect(l.jump.scale).toBe(TOUCH_SCALE_MIN);
  });

  it('dados inválidos do save viram o padrão; valores fora do limite são corrigidos', () => {
    expect(sanitizeTouchLayout(null)).toEqual(defaultTouchLayout());
    expect(sanitizeTouchLayout('x')).toEqual(defaultTouchLayout());
    const l = sanitizeTouchLayout({ jump: { x: 300, y: 100, scale: 9 }, dash: { x: 'a' }, left: 5 });
    expect(l.jump).toEqual({ x: 300, y: 100, scale: TOUCH_SCALE_MAX });
    expect(l.dash).toEqual(defaultTouchLayout().dash);
    expect(l.left).toEqual(defaultTouchLayout().left);
  });

  it('saves antigos ganham o layout padrão e a vibração ligada', () => {
    const old = sanitizeAccess({ colorblind: 'off', shake: true, keys: {}, pad: {} });
    expect(old.touch).toEqual(defaultTouchLayout());
    expect(old.rumble).toBe(true);
    expect(sanitizeAccess({ rumble: false }).rumble).toBe(false);
    expect(defaultAccess().touch).toEqual(defaultTouchLayout());
    // Layout personalizado sobrevive ao salvar e ler.
    const custom = { ...defaultAccess(), touch: moveTouchButton(defaultTouchLayout(), 'jump', 300, 120) };
    expect(sanitizeAccess(JSON.parse(JSON.stringify(custom))).touch.jump).toEqual({ x: 300, y: 120, scale: 1 });
  });
});

describe('controles genéricos (fora do mapeamento padrão)', () => {
  it('lê o direcional "hat" do eixo 9', () => {
    const axes = (h: number) => [0, 0, 0, 0, 0, 0, 0, 0, 0, h];
    expect(readHat(axes(-1))).toEqual({ up: true, right: false, down: false, left: false });
    expect(readHat(axes(-3 / 7))).toEqual({ up: false, right: true, down: false, left: false });
    expect(readHat(axes(1 / 7))).toEqual({ up: false, right: false, down: true, left: false });
    expect(readHat(axes(5 / 7))).toEqual({ up: false, right: false, down: false, left: true });
    expect(readHat(axes(-5 / 7))).toMatchObject({ up: true, right: true });
    expect(readHat(axes(3.28))).toEqual({ up: false, right: false, down: false, left: false });
  });

  it('lê o direcional nos eixos 6 e 7', () => {
    expect(readHat([0, 0, 0, 0, 0, 0, -1, 0])).toMatchObject({ left: true, right: false });
    expect(readHat([0, 0, 0, 0, 0, 0, 0, 1])).toMatchObject({ down: true, up: false });
  });

  it('só usa esses eixos em controles fora do padrão', () => {
    const buttons = Array.from({ length: 17 }, () => ({ pressed: false }));
    const axes = [0, 0, 0, 0, 0, 0, 1, 0, 0, 3.28];
    expect(readPadButtons(buttons, axes, undefined, false).right).toBe(true);
    // Num controle padrão os eixos 6+ podem ser gatilhos analógicos: ignorados.
    expect(readPadButtons(buttons, axes, undefined, true).right).toBe(false);
  });
});

describe('joystick virtual', async () => {
  const { stickInput, STICK_DEADZONE, visibleTouchIds } = await import('../src/logic/touchLayout');

  it('zona morta: deslocamentos pequenos não andam', () => {
    expect(stickInput(5, 0, 32)).toMatchObject({ left: false, right: false });
    expect(stickInput(32 * STICK_DEADZONE + 1, 0, 32).right).toBe(true);
    expect(stickInput(-20, 3, 32).left).toBe(true);
  });

  it('o pino não passa da borda do joystick', () => {
    const r = stickInput(300, 400, 32);
    expect(Math.hypot(r.knobX, r.knobY)).toBeCloseTo(32);
    expect(r.right).toBe(true);
  });

  it('o modo joystick troca esquerda/direita pelo joystick', () => {
    expect(visibleTouchIds(true)).toContain('stick');
    expect(visibleTouchIds(true)).not.toContain('left');
    expect(visibleTouchIds(false)).toEqual(expect.arrayContaining(['left', 'right']));
    expect(visibleTouchIds(false)).not.toContain('stick');
  });

  it('saves antigos ficam com botões (sem joystick) e ganham a posição padrão do joystick', () => {
    const a = sanitizeAccess({ touch: { jump: { x: 300, y: 120, scale: 1 } } });
    expect(a.touchStick).toBe(false);
    expect(a.touch.stick).toEqual(defaultTouchLayout().stick);
    expect(sanitizeAccess({ touchStick: true }).touchStick).toBe(true);
  });
});

describe('controles de toque para 2 jogadores', async () => {
  const { twoPlayerTouchLayout } = await import('../src/logic/touchLayout');
  const [p1, p2] = twoPlayerTouchLayout();
  const circles = (c: typeof p1) => [c.stick, c.jump, c.dash, c.charge];

  it('cada jogador fica de um lado da tela, espelhados', () => {
    for (const c of circles(p1)) expect(c.x).toBeLessThan(240);
    for (const c of circles(p2)) expect(c.x).toBeGreaterThan(240);
    expect(p2.stick.x).toBe(480 - p1.stick.x);
    expect(p2.jump.y).toBe(p1.jump.y);
  });

  it('tudo cabe na tela, abaixo do HUD, sem botões sobrepostos', () => {
    const all = [...circles(p1), ...circles(p2)];
    for (const c of all) {
      expect(c.x - c.r).toBeGreaterThanOrEqual(0);
      expect(c.x + c.r).toBeLessThanOrEqual(480);
      expect(c.y + c.r).toBeLessThanOrEqual(270);
      expect(c.y - c.r).toBeGreaterThan(TOUCH_TOP_LIMIT);
    }
    for (let i = 0; i < all.length; i++)
      for (let j = i + 1; j < all.length; j++) expect(Math.hypot(all[i].x - all[j].x, all[i].y - all[j].y)).toBeGreaterThan(all[i].r + all[j].r);
  });
});
