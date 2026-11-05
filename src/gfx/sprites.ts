/**
 * Sprites originais do Pixel Runner, desenhados como pixel art em texto.
 * Cada letra é uma cor de `PALETTE` e `.` é transparente.
 *
 * Protagonista: "Pix", um pequeno robô corredor de capacete verde e cachecol laranja.
 */
import type { PixelArt } from './pixelArt';

// ---------------------------------------------------------------------------
// Pix (16x16) — corpo (12 linhas) + pernas (4 linhas)
// ---------------------------------------------------------------------------

const PIX_HEAD = [
  '......kkkkk.....',
  '.....kttttlk....',
  '....ktttttttk...',
  '....ktkkkkkkk...',
  '....ktkBwBBwk...',
  '....ktkkkkkkk...',
  '...okttttttTk...',
  '.oookooooooook..',
  'oo..kttttttTk...',
  '....kTtttttTk...',
  '....kTTtttTTk...',
  '.....kkkkkkk....',
];

const PIX_HEAD_BLINK = PIX_HEAD.map((row, i) => (i === 4 ? '....ktkBkBBkk...' : row));
const PIX_HEAD_HURT = PIX_HEAD.map((row, i) => (i === 4 ? '....ktkrwrrwk...' : row));
const PIX_HEAD_DASH = PIX_HEAD.map((row, i) => {
  if (i === 6) return 'ooookttttttTk...';
  if (i === 7) return 'ooookooooooook..';
  if (i === 8) return '....kttttttTk...';
  return row;
});

const LEGS = {
  idle: ['......kGk.kGk...', '......kGk.kGk...', '.....kGGk.kGGk..', '.....kkkk.kkkk..'],
  runA: ['......kGk..kGk..', '.....kGk....kGk.', '....kGGk....kGGk', '....kkkk....kkkk'],
  runB: ['......kGkkGk....', '......kGGGk.....', '.....kGGGk......', '.....kkkkk......'],
  runC: ['......kGk.kGk...', '.....kGk...kGk..', '....kGGk...kGGk.', '....kkkk...kkkk.'],
  runD: ['.......kGkGk....', '.......kGGGk....', '......kGGGk.....', '......kkkkk.....'],
  jump: ['......kGkkGk....', '......kGGGGk....', '......kkkkkk....', '................'],
  fall: ['......kGk.kGk...', '......kGk.kGk...', '......kkk.kkk...', '................'],
};

const PIX_HEAD_GLIDE = PIX_HEAD.map((row, i) => {
  if (i === 5) return 'o...ktkkkkkkk..o';
  if (i === 6) return 'oo.okttttttTk.oo';
  if (i === 7) return 'oooookooooooooko';
  if (i === 8) return '....kttttttTk...';
  return row;
});

const frame = (head: string[], legs: string[]): PixelArt => [...head, ...legs];

/** Frames: 0-1 parado, 2-5 correndo, 6 pulo, 7 queda, 8 dash, 9 dano, 10 planando, 11 escalando. */
export const PIX_FRAMES: PixelArt[] = [
  frame(PIX_HEAD, LEGS.idle),
  frame(PIX_HEAD_BLINK, LEGS.idle),
  frame(PIX_HEAD, LEGS.runA),
  frame(PIX_HEAD, LEGS.runB),
  frame(PIX_HEAD, LEGS.runC),
  frame(PIX_HEAD, LEGS.runD),
  frame(PIX_HEAD, LEGS.jump),
  frame(PIX_HEAD, LEGS.fall),
  frame(PIX_HEAD_DASH, LEGS.jump),
  frame(PIX_HEAD_HURT, LEGS.fall),
  frame(PIX_HEAD_GLIDE, LEGS.fall),
  frame(PIX_HEAD, ['......kGkkGk....', '.......kGGk.....', '......kGk.......', '......kkk.......']),
];

// ---------------------------------------------------------------------------
// Inimigos (16x16)
// ---------------------------------------------------------------------------

/** Gosma: anda de um lado para o outro e vira nas beiradas. */
export const WALKER_FRAMES: PixelArt[] = [
  [
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '......kkkk......',
    '....kkrrrrkk....',
    '...krrrrrrrork..',
    '..krrwkrrwkrrrk.',
    '..krrwkrrwkrrrk.',
    '..krrrrrrrrrrrk.',
    '.krrrrkkkkrrrrrk',
    '.krpprrrrrrrpprk',
    '.krrpppppppppprk',
    '..kkkkkkkkkkkkk.',
  ],
  [
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '.....kkkkkk.....',
    '...kkrrrrrrkk...',
    '..krrrrrrrrrork.',
    '.krrwkrrrwkrrrk.',
    '.krrwkrrrwkrrrrk',
    'krrrrrkkkkrrrrrk',
    'krpprrrrrrrrpprk',
    'krrppppppppppprk',
    '.kkkkkkkkkkkkkk.',
  ],
];

/** Saltador: robô-mola que pula na direção do jogador. */
export const HOPPER_FRAMES: PixelArt[] = [
  [
    '................',
    '................',
    '................',
    '................',
    '................',
    '.....kkkkkk.....',
    '....kbbbbbBk....',
    '...kbbbbbbbBk...',
    '...kbkwkbkwbk...',
    '...kbkwkbkwbk...',
    '...kbbbbbbbbk...',
    '....kkkkkkkk....',
    '.....kgkkgk.....',
    '....kgkggkgk....',
    '...kGGk..kGGk...',
    '...kkkk..kkkk...',
  ],
  [
    '................',
    '.....kkkkkk.....',
    '....kbbbbbBk....',
    '...kbbbbbbbBk...',
    '...kbkwkbkwbk...',
    '...kbkwkbkwbk...',
    '...kbbbbbbbbk...',
    '....kkkkkkkk....',
    '......kgk.......',
    '.....kgk........',
    '......kgk.......',
    '.....kgk........',
    '......kgk.......',
    '.....kGGk.......',
    '....kGGGGk......',
    '....kkkkkk......',
  ],
];

/** Morcego: voa em ondas. */
export const BAT_FRAMES: PixelArt[] = [
  [
    '................',
    '................',
    'kk............kk',
    'kpk..........kpk',
    'kppk..k..k..kppk',
    '.kppkkpkkpkkppk.',
    '.kpppppppppppk..',
    '..kppkwppwkppk..',
    '...kkpwppwpkk...',
    '.....kpppk......',
    '......kyyk......',
    '.......kk.......',
    '................',
    '................',
    '................',
    '................',
  ],
  [
    '................',
    '................',
    '................',
    '................',
    '......k..k......',
    '.....kpkkpk.....',
    '....kpppppk.....',
    '..kkkpwppwpkkk..',
    '.kpppkwppwkpppk.',
    'kppkkpppppkkppk.',
    'kpk..kpyypk..kpk',
    'kk....kkkk....kk',
    '................',
    '................',
    '................',
    '................',
  ],
];

/** Torreta: atira projéteis quando o jogador está perto. */
export const TURRET_FRAMES: PixelArt[] = [
  [
    '................',
    '................',
    '................',
    '.....kkkkkk.....',
    '....kGggggGk....',
    '...kGgkkkkgGk...',
    '...kGkrrrrkGk...',
    'kkkkGkrwrrkGk...',
    'kddddkrrrrkGk...',
    'kkkkGgkkkkgGk...',
    '...kGGggggGGk...',
    '...kkkkkkkkkk...',
    '..kdGGGGGGGGdk..',
    '..kdddddddddk...',
    '.kGGGGGGGGGGGGk.',
    '.kkkkkkkkkkkkkk.',
  ],
  [
    '................',
    '................',
    '................',
    '.....kkkkkk.....',
    '....kGggggGk....',
    '...kGgkkkkgGk...',
    '...kGkyyyykGk...',
    'kkkkGkywyykGk...',
    'kyyykkyyyykGk...',
    'kkkkGgkkkkgGk...',
    '...kGGggggGGk...',
    '...kkkkkkkkkk...',
    '..kdGGGGGGGGdk..',
    '..kdddddddddk...',
    '.kGGGGGGGGGGGGk.',
    '.kkkkkkkkkkkkkk.',
  ],
];

/** Chefe "Núcleo Ancestral" (16x16, desenhado em escala 2x = 32x32). */
const BOSS_BASE = [
  '...kkkkkkkkkk...',
  '..kGggggggggGk..',
  '.kGgkkkkkkkkgGk.',
  'kGgkdddddddddgGk',
  'kGkdkkkkkkkkdkGk',
  'kGkdkrrrrrrkdkGk',
  'kGkdkrryyrrkdkGk',
  'kGkdkrywwyrkdkGk',
  'kGkdkrrwwrrkdkGk',
  'kGkdkrrrrrrkdkGk',
  'kGkdkkkkkkkkdkGk',
  'kGgkdddddddddgGk',
  '.kGgkkkkkkkkgGk.',
  'kkGGggggggggGGkk',
  'kGGkkGGkkGGkkGGk',
  'kkkk.kkkkkk.kkkk',
];

export const BOSS_FRAMES: PixelArt[] = [
  BOSS_BASE,
  BOSS_BASE.map((row) => row.replace(/r/g, 'o').replace(/y/g, 'w')),
  BOSS_BASE.map((row) => row.replace(/[rGgd]/g, 'w')),
];

// ---------------------------------------------------------------------------
// Itens e objetos
// ---------------------------------------------------------------------------

export const COIN_FRAMES: PixelArt[] = [
  ['..kkkk..', '.kyyyyk.', 'kyywyyyk', 'kywyyyok', 'kyyyyook', 'kyyyoook', '.kooook.', '..kkkk..'],
  ['...kk...', '..kyyk..', '.kywyyk.', '.kwyyok.', '.kyyook.', '.kyoook.', '..kook..', '...kk...'],
  ['...kk...', '...kyk..', '...kwk..', '...kyk..', '...kyk..', '...kok..', '...kok..', '...kk...'],
  ['...kk...', '..kyyk..', '.kyywyk.', '.kyyywk.', '.koyyyk.', '.kooyyk.', '..kook..', '...kk...'],
];

export const SPIKE_ART: PixelArt = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '...k.......k....',
  '..kwk.....kwk...',
  '..kgk..k..kgk..k',
  '.kwggk.kk.kwggkk',
  '.kggGkkwk.kggGkw',
  'kwgGGkkgGkwgGGkg',
  'kgGGGGkgGkgGGGGk',
  'kkkkkkkkkkkkkkkk',
];

/** Checkpoint: 0 inativo, 1 e 2 ativo (bandeira tremulando). */
export const CHECKPOINT_FRAMES: PixelArt[] = [
  [
    '..k.............',
    '.kgk............',
    '.kgkkkkk........',
    '.kgkGGGGkk......',
    '.kgkGGGGGGk.....',
    '.kgkGGGGkk......',
    '.kgkkkkk........',
    '.kgk............',
    '.kgk............',
    '.kgk............',
    '.kgk............',
    '.kgk............',
    '.kgk............',
    'kdddk...........',
    'kGGGk...........',
    'kkkkk...........',
  ],
  [
    '..k.............',
    '.kyk............',
    '.kgkkkkk........',
    '.kgkltttkk......',
    '.kgklttttTk.....',
    '.kgkltttkk......',
    '.kgkkkkk........',
    '.kgk............',
    '.kgk............',
    '.kgk............',
    '.kgk............',
    '.kgk............',
    '.kgk............',
    'kdddk...........',
    'kGGGk...........',
    'kkkkk...........',
  ],
  [
    '..k.............',
    '.kyk............',
    '.kgkkkk.........',
    '.kgklttkkk......',
    '.kgkltttTTk.....',
    '.kgklttkkk......',
    '.kgkkkk.........',
    '.kgk............',
    '.kgk............',
    '.kgk............',
    '.kgk............',
    '.kgk............',
    '.kgk............',
    'kdddk...........',
    'kGGGk...........',
    'kkkkk...........',
  ],
];

/** Portal de chegada (16x32), 2 frames. */
const PORTAL_A = [
  '.....kkkkkk.....',
  '...kkyyyyyykk...',
  '..kyyokkkkoyyk..',
  '.kyokcccccckoyk.',
  '.kykccBBBBcckyk.',
  'kyokcBBwwBBckoyk',
  'kykcBBwccwBBckyk',
  'kykcBwcBBcwBckyk',
  'kykcBwcBBcwBckyk',
  'kykcBBwccwBBckyk',
  'kykcBBBwwBBBckyk',
  'kykcBBBBBBBBckyk',
  'kykcBBwBBBBBckyk',
  'kykcBBBBBBwBckyk',
  'kykcBBBBBBBBckyk',
  'kykcBwBBBBBBckyk',
  'kykcBBBBBwBBckyk',
  'kykcBBBBBBBBckyk',
  'kykcBBBwBBBBckyk',
  'kykcBBBBBBBBckyk',
  'kykcBBBBBBBwckyk',
  'kykcBwBBBBBBckyk',
  'kykcBBBBBBBBckyk',
  'kykcBBBBwBBBckyk',
  'kykcBBBBBBBBckyk',
  'kykcBBBBBBBBckyk',
  'kyokccccccccokyk',
  'kyyokkkkkkkkoyyk',
  'kGyyyyyyyyyyyyGk',
  'kGGGGGGGGGGGGGGk',
  'kddddddddddddddk',
  'kkkkkkkkkkkkkkkk',
];
/** O segundo frame desloca o brilho interno do portal para cima, criando a animação. */
const shiftPortal = (art: string[], offset: number): string[] =>
  art.map((row, i) => {
    if (i < 11 || i > 25) return row;
    const source = art[((i - 11 + offset) % 15) + 11];
    return row.slice(0, 4) + source.slice(4, 12) + row.slice(12);
  });
export const PORTAL_FRAMES: PixelArt[] = [PORTAL_A, shiftPortal(PORTAL_A, 3), shiftPortal(PORTAL_A, 7)];

export const BULLET_ART: PixelArt = ['.kkkk.', 'kyyyok', 'kywyok', 'kyyyok', 'kooook', '.kkkk.'];

export const HEART_ART: PixelArt = [
  '.kk.kk..',
  'krrkrrk.',
  'krwrrrk.',
  'krrrrrk.',
  '.krrrk..',
  '..krk...',
  '...k....',
  '........',
];

export const COIN_ICON_ART: PixelArt = COIN_FRAMES[0];

export const LOCK_ART: PixelArt = [
  '...kkkk...',
  '..kgkkgk..',
  '..kk..kk..',
  '..kk..kk..',
  '.kkkkkkkk.',
  '.kyyyyyyk.',
  '.kyyokyyk.',
  '.kyyokyyk.',
  '.kooooook.',
  '.kkkkkkkk.',
];

export const STAR_ART: PixelArt = ['..k..', '.kyk.', 'kyyyk', '.kyk.', '..k..'];

// ---------------------------------------------------------------------------
// Mundo 2
// ---------------------------------------------------------------------------

/** Mola: 0 parada, 1 comprimida. */
export const SPRING_FRAMES: PixelArt[] = [
  [
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '..kkkkkkkkkkkk..',
    '..krrrrrrrrrrk..',
    '..kkkkkkkkkkkk..',
    '....kgk..kgk....',
    '.....kgkkgk.....',
    '....kgk..kgk....',
    '.....kgkkgk.....',
    '....kgk..kgk....',
    '..kGGGGGGGGGGk..',
    '..kkkkkkkkkkkk..',
  ],
  [
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '..kkkkkkkkkkkk..',
    '..koooooooooork.',
    '..kkkkkkkkkkkk..',
    '....kgkkkkgk....',
    '....kgkggkgk....',
    '..kGGGGGGGGGGk..',
    '..kkkkkkkkkkkk..',
  ],
];

/** Plataforma que desmorona (16x8). */
export const FALLER_ART: PixelArt = [
  'kkkkkkkkkkkkkkkk',
  'kyyyoyyyykyyoyyk',
  'kouuuouuukuouuuk',
  'kuUuukuuUkuuuUuk',
  'kkuUkkkuUkkuUkkk',
  '.kkk..kkk..kkk..',
  '..k....k....k...',
  '................',
];

/** Peixe-espinho: nada de um lado para o outro na água. */
export const FISH_FRAMES: PixelArt[] = [
  [
    '................',
    '................',
    '................',
    '........k.k.....',
    '.......kok.k....',
    '.kk...koooook...',
    'kook.kooooowkk..',
    'koookoooooookwk.',
    '.kooooooooooooky',
    'koookoooooookkk.',
    'kook.kyoooyokk..',
    '.kk...kkyyykk...',
    '........kkk.....',
    '................',
    '................',
    '................',
  ],
  [
    '................',
    '................',
    '................',
    '........k.k.....',
    '.......kok.k....',
    '......koooook...',
    '.kk..kooooowkk..',
    'kookkoooooookwk.',
    'koooooooooooooky',
    'kookkoooooookkk.',
    '.kk..kyoooyokk..',
    '......kkyyykk...',
    '........kkk.....',
    '................',
    '................',
    '................',
  ],
];

/** Chefe "Tempestade Rubra" (16x16 em escala 2x): 0 normal, 1 furioso, 2 atingido. */
const STORM_BASE = [
  '....kkkkkkkk....',
  '..kkggwwwwggkk..',
  '.kgwwwggggwwwgk.',
  'kgwwgkkkkkkgwwgk',
  'kgwgkrrrrrrkgwgk',
  'kwwkrryyyyrrkwwk',
  'kwgkryywwyyrkgwk',
  'kwgkryywkyyrkgwk',
  'kwgkrryyyyrrkgwk',
  'kgwgkrrrrrrkgwgk',
  'kgwwgkkkkkkgwwgk',
  '.kgwwwggggwwwgk.',
  '..kkgwwgwwgkk...',
  '...k.kyk.kyk....',
  '.....kyk..kyk...',
  '......k....k....',
];

export const STORM_FRAMES: PixelArt[] = [
  STORM_BASE,
  STORM_BASE.map((row) => row.replace(/g/g, 'G').replace(/w/g, 'g').replace(/y/g, 'o')),
  STORM_BASE.map((row) => row.replace(/[rGgyo]/g, 'w')),
];

/** Fragmento de gelo (projétil do chefe do Mundo 2). */
export const SHARD_ART: PixelArt = ['..kk..', '.kwck.', '.kcBk.', 'kcBBbk', '.kBbk.', '..kk..'];

/** Gosma blindada: só a investida consegue derrotá-la. */
export const ARMORED_FRAMES: PixelArt[] = WALKER_FRAMES.map((art) =>
  art.map((row, i) => {
    if (i === 4) return '....k..k..k.....';
    if (i === 5) return '...kgkkgkkgk....';
    if (i === 6) return '..kgggggggggk...';
    if (i === 7) return '..kGGGGGGGGGGk..';
    return row.replace(/r/g, 'G').replace(/p/g, 'd').replace(/o/g, 'g');
  }),
);

/** Orbe de habilidade (a cor é aplicada com tint). */
export const ORB_FRAMES: PixelArt[] = [
  [
    '.....kkkkkk.....',
    '...kkwwwwwwkk...',
    '..kwwwggggwwwk..',
    '.kwwgggggggwwgk.',
    '.kwggwwgggggggk.',
    'kwgggwwggggggggk',
    'kwgggggggggggggk',
    'kwgggggggggggggk',
    'kwgggggggggggGgk',
    'kwgggggggggggGgk',
    'kwggggggggggGGgk',
    '.kgggggggggGGgk.',
    '.kggggggggGGggk.',
    '..kgggGGGGGggk..',
    '...kkggggggkk...',
    '.....kkkkkk.....',
  ],
];
