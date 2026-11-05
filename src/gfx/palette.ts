/** Paleta de 16 cores usada em todos os sprites do jogo. */
export const PALETTE: Record<string, string> = {
  k: '#1a1c2c', // contorno
  p: '#5d275d', // roxo
  r: '#b13e53', // vermelho
  o: '#ef7d57', // laranja
  y: '#ffcd75', // amarelo
  l: '#a7f070', // verde claro
  t: '#38b764', // verde
  T: '#257179', // verde-petróleo
  n: '#29366f', // azul-marinho
  b: '#3b5dc9', // azul
  B: '#41a6f6', // azul claro
  c: '#73eff7', // ciano
  w: '#f4f4f4', // branco
  g: '#94b0c2', // cinza claro
  G: '#566c86', // cinza
  d: '#333c57', // cinza escuro
  u: '#8b5a3c', // terra
  U: '#5e3a28', // terra escura
};

export const COLORS = {
  ink: 0x1a1c2c,
  white: 0xf4f4f4,
  yellow: 0xffcd75,
  orange: 0xef7d57,
  red: 0xb13e53,
  green: 0x38b764,
  lightGreen: 0xa7f070,
  cyan: 0x73eff7,
  blue: 0x41a6f6,
  gray: 0x94b0c2,
  darkGray: 0x333c57,
  purple: 0x5d275d,
} as const;

export const hex = (color: number): string => `#${color.toString(16).padStart(6, '0')}`;
