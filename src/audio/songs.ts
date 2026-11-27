/**
 * Trilhas dos mundos e dos chefes, escritas numa notação compacta e convertidas para
 * padrões do sequenciador. Módulo puro (sem Web Audio), coberto por testes.
 *
 * Notação da melodia: notas separadas por espaço (`E5`, `F#4`, `Bb3`), `.` = pausa,
 * `-` = segura a nota anterior. Cada passo é uma colcheia; um compasso tem 8 passos.
 * Baixo, arpejo e acordes de fundo saem da sequência de acordes (um acorde por compasso).
 */

/** Passo de um padrão: nota, pausa (null) ou continuação da nota anterior ('-'). */
export type Step = string | null;
export type Pattern = Step[];

export interface Song {
  tempo: number;
  bass: Pattern;
  lead: Pattern;
  /** Arpejo/contracanto opcional. */
  arp?: Pattern;
  /** Acordes de fundo (notas unidas por `+`), suaves e longos. */
  pad?: Pattern;
  /** Bateria: 1 nos passos com bumbo, caixa ou chimbal. */
  kick?: number[];
  snare?: number[];
  hat?: number[];
  leadWave?: OscillatorType;
  bassWave?: OscillatorType;
  leadVolume?: number;
}

export const STEPS_PER_BAR = 8;

const NOTE_INDEX: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** Número MIDI de uma nota (`A4` = 69). Aceita sustenidos e bemóis. */
export function noteNumber(name: string): number {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  if (!m) throw new Error(`nota inválida: ${name}`);
  const accidental = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  return (Number(m[3]) + 1) * 12 + NOTE_INDEX[m[1]] + accidental;
}

/** Frequência (Hz) de uma nota. */
export function noteFreq(name: string): number {
  return 440 * 2 ** ((noteNumber(name) - 69) / 12);
}

function noteName(midi: number): string {
  return `${SHARP_NAMES[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
}

/** Converte a notação da melodia em passos. Barras `|` são só para leitura. */
export function seq(text: string): Pattern {
  return text
    .split(/\s+/)
    .filter((t) => t && t !== '|')
    .map((t) => (t === '.' ? null : t));
}

/** Notas (fundamental, terça, quinta) de um acorde como `Am`, `F#`, `Bb` ou `Dm`, numa oitava. */
export function chordNotes(chord: string, octave: number): [string, string, string] {
  const m = /^([A-G][#b]?)(m?)$/.exec(chord);
  if (!m) throw new Error(`acorde inválido: ${chord}`);
  const root = noteNumber(`${m[1]}${octave}`);
  const third = root + (m[2] === 'm' ? 3 : 4);
  return [noteName(root), noteName(third), noteName(root + 7)];
}

export interface Accompaniment {
  /** Ritmo do baixo num compasso: `R` fundamental, `5` quinta, `O` oitava, `.` pausa, `-` segura. */
  bass: string;
  bassOctave: number;
  /** Ritmo do arpejo: índices 0/1/2 das notas do acorde (3 = fundamental uma oitava acima). */
  arp?: string;
  arpOctave?: number;
  /** Acorde de fundo segurado o compasso todo. */
  pad?: boolean;
  padOctave?: number;
  /** Bateria de um compasso (8 passos) com `x` onde toca. */
  kick?: string;
  snare?: string;
  hat?: string;
}

function bar(rhythm: string): string[] {
  const steps = rhythm.split(/\s+/).filter(Boolean);
  if (steps.length !== STEPS_PER_BAR) throw new Error(`ritmo precisa de ${STEPS_PER_BAR} passos: ${rhythm}`);
  return steps;
}

function drum(rhythm: string | undefined, bars: number): number[] | undefined {
  if (!rhythm) return undefined;
  const one = bar(rhythm).map((s) => (s === 'x' ? 1 : 0));
  return Array.from({ length: bars }, () => one).flat();
}

/** Monta uma música: melodia + acordes (um por compasso) + estilo do acompanhamento. */
export function compose(opts: { tempo: number; chords: string[]; melody: string; style: Accompaniment; leadWave?: OscillatorType; bassWave?: OscillatorType; leadVolume?: number }): Song {
  const { chords, style } = opts;
  const lead = seq(opts.melody);
  const total = chords.length * STEPS_PER_BAR;
  if (lead.length !== total) throw new Error(`melodia com ${lead.length} passos; esperado ${total} (${chords.length} compassos)`);
  const bass: Pattern = [];
  const arp: Pattern = [];
  const pad: Pattern = [];
  for (const chord of chords) {
    const [r, , f] = chordNotes(chord, style.bassOctave);
    const octaveUp = noteName(noteNumber(r) + 12);
    for (const s of bar(style.bass)) bass.push(s === 'R' ? r : s === '5' ? f : s === 'O' ? octaveUp : s === '-' ? '-' : null);
    if (style.arp) {
      const tones = chordNotes(chord, style.arpOctave ?? 4);
      const top = noteName(noteNumber(tones[0]) + 12);
      for (const s of bar(style.arp)) arp.push(s === '.' ? null : s === '-' ? '-' : s === '3' ? top : tones[Number(s)]);
    }
    if (style.pad) {
      pad.push(chordNotes(chord, style.padOctave ?? 3).join('+'));
      for (let i = 1; i < STEPS_PER_BAR; i++) pad.push('-');
    }
  }
  return {
    tempo: opts.tempo,
    lead,
    bass,
    arp: style.arp ? arp : undefined,
    pad: style.pad ? pad : undefined,
    kick: drum(style.kick, chords.length),
    snare: drum(style.snare, chords.length),
    hat: drum(style.hat, chords.length),
    leadWave: opts.leadWave,
    bassWave: opts.bassWave,
    leadVolume: opts.leadVolume,
  };
}

/** Quantos passos uma nota dura (ela mesma + os `-` seguintes). */
export function noteLength(pattern: Pattern, index: number): number {
  let n = 1;
  while (pattern[index + n] === '-') n++;
  return n;
}

// ---------------------------------------------------------------------------
// Mundos (uma trilha por mundo, 16 compassos: parte A e parte B)
// ---------------------------------------------------------------------------

/** Mundo 1 — Terras de Pix: alegre e saltitante, em dó maior. */
const world1 = compose({
  tempo: 132,
  chords: ['C', 'G', 'Am', 'F', 'C', 'G', 'F', 'G', 'Am', 'F', 'C', 'G', 'Am', 'F', 'Dm', 'G'],
  melody: `
    E5 . G5 . C6 . G5 E5 | D5 . G5 . B5 . A5 G5 | C5 . E5 . A5 - G5 E5 | F5 . A5 . C6 . A5 F5
    G5 - E5 . C5 . E5 G5 | B5 - A5 G5 D5 . G5 . | A5 . C6 . A5 G5 F5 E5 | D5 - - . G4 . . .
    A4 . C5 . E5 - D5 C5 | F4 . A4 . C5 - A4 F4 | G4 . C5 . E5 - G5 E5 | D5 . G5 . B5 - A5 G5
    C6 - B5 A5 E5 . A5 . | C6 - A5 F5 C5 . F5 . | D5 F5 A5 D6 C6 A5 F5 D5 | B4 . D5 . G5 - - .`,
  style: { bass: 'R . R . 5 . R 5', bassOctave: 3, arp: '0 1 2 1 0 1 2 1', arpOctave: 4, kick: 'x . . . x . . .', snare: '. . x . . . x .', hat: '. x . x . x . x' },
});

/** Mundo 2 — Arquipélago Celeste: leve e aéreo, em ré maior, com acordes de fundo. */
const world2 = compose({
  tempo: 112,
  chords: ['D', 'A', 'Bm', 'G', 'D', 'A', 'G', 'A', 'Em', 'G', 'D', 'A', 'Em', 'G', 'Bm', 'A'],
  melody: `
    F#5 - - A5 - - F#5 E5 | E5 - - C#5 - - A4 . | D5 - - F#5 - - B5 A5 | B5 - - - G5 - - .
    A5 - F#5 - D5 - F#5 A5 | C#6 - - B5 A5 - E5 . | D5 - E5 - F#5 - G5 - | E5 - - - - - . .
    G5 - - E5 - - B4 . | D5 - - B4 - - G4 . | A4 - D5 - F#5 - A5 - | C#5 - E5 - A5 - - .
    B5 - - G5 - E5 - . | D6 - - B5 - G5 - . | F#5 - D5 - B4 - D5 F#5 | E5 - - - C#5 - - .`,
  style: { bass: 'R - - . 5 - - .', bassOctave: 3, arp: '0 2 3 2 1 2 3 2', arpOctave: 5, pad: true, padOctave: 4, kick: 'x . . . . . . .', hat: '. . . x . . . x' },
  leadWave: 'triangle',
  leadVolume: 0.22,
});

/** Mundo 3 — Fronteira Estelar: espacial e calmo, em lá menor, com notas longas. */
const world3 = compose({
  tempo: 100,
  chords: ['Am', 'F', 'C', 'G', 'Am', 'F', 'Em', 'E', 'F', 'G', 'Em', 'Am', 'F', 'G', 'E', 'E'],
  melody: `
    A4 - - - E5 - - - | F5 - E5 - C5 - - - | E5 - - - G5 - - - | D5 - - - B4 - - -
    A5 - G5 - E5 - C5 - | F5 - - - A5 - - - | G5 - F#5 - E5 - B4 - | G#5 - - - - - . .
    C6 - - - A5 - - - | B5 - - - G5 - D5 - | E5 - G5 - B5 - - - | A5 - - - - - . .
    A5 - C6 - A5 - F5 - | G5 - B5 - D6 - B5 - | B5 - G#5 - E5 - D5 - | E5 - - - - - . .`,
  style: { bass: 'R - - - R - 5 -', bassOctave: 2, arp: '0 1 2 3 2 1 2 3', arpOctave: 4, pad: true, padOctave: 3, kick: 'x . . . . x . .', hat: '. . x . . . x .' },
  leadWave: 'sawtooth',
  bassWave: 'sine',
  leadVolume: 0.1,
});

/** Mundo 4 — Vale Vulcânico: pesado e acelerado, em ré menor. */
const world4 = compose({
  tempo: 148,
  chords: ['Dm', 'Dm', 'Bb', 'C', 'Dm', 'Dm', 'Bb', 'A', 'Gm', 'Gm', 'Dm', 'Dm', 'Bb', 'C', 'A', 'A'],
  melody: `
    D5 . D5 F5 . A5 . G5 | F5 . E5 D5 . . A4 . | Bb4 . D5 . F5 . D5 Bb4 | C5 . E5 . G5 - E5 .
    D6 . A5 . F5 . D5 . | E5 F5 G5 A5 . . D5 . | F5 . D5 . Bb4 . D5 F5 | E5 - - C#5 - - A4 .
    G5 . Bb5 . D6 . Bb5 G5 | A5 . G5 F5 . . D5 . | F5 . A5 . D6 - C6 A5 | F5 - E5 - D5 . . .
    D5 . F5 . Bb5 - A5 G5 | E5 . G5 . C6 - Bb5 A5 | C#6 - A5 - E5 - C#5 - | A4 - - - . . . .`,
  style: { bass: 'R R . R R . 5 R', bassOctave: 2, kick: 'x . . x x . . .', snare: '. . x . . . x .', hat: 'x x x x x x x x' },
  bassWave: 'sawtooth',
});

// ---------------------------------------------------------------------------
// Chefes (rápidas e intensas, 8 compassos)
// ---------------------------------------------------------------------------

const BOSS_STYLE: Accompaniment = { bass: 'R R O R R R O 5', bassOctave: 2, kick: 'x . x . x . x .', snare: '. . x . . . x x', hat: 'x x x x x x x x' };

/** Núcleo Ancestral (fase 5). */
const boss1 = compose({
  tempo: 166,
  chords: ['Am', 'Am', 'F', 'E', 'Am', 'Am', 'Dm', 'E'],
  melody: `
    A5 . E5 . A5 C6 B5 A5 | G#5 . E5 . B4 . E5 . | F5 . A5 . C6 . A5 F5 | E5 - G#5 - B5 - E6 .
    A5 . C6 . E6 . C6 A5 | B5 . A5 G#5 A5 . E5 . | D5 . F5 . A5 . D6 C6 | B5 - G#5 - E5 - . .`,
  style: BOSS_STYLE,
  bassWave: 'sawtooth',
});

/** Tempestade Rubra (fase 10). */
const boss2 = compose({
  tempo: 174,
  chords: ['Dm', 'Bb', 'Gm', 'A', 'Dm', 'Bb', 'Eb', 'A'],
  melody: `
    D5 F5 A5 D6 . A5 F5 D5 | Bb4 D5 F5 Bb5 . F5 D5 Bb4 | G4 Bb4 D5 G5 . D5 Bb4 G4 | A4 C#5 E5 A5 - - G5 E5
    F5 . A5 . D6 - C6 A5 | Bb5 . F5 . D5 - F5 Bb5 | G5 . Eb5 . Bb4 . Eb5 G5 | C#6 - A5 - E5 - C#5 -`,
  style: { ...BOSS_STYLE, arp: '0 1 2 3 2 1 2 1', arpOctave: 4 },
  bassWave: 'sawtooth',
});

/** Eclipse (chefe final, fase 15): épico, com acordes de fundo. */
const boss3 = compose({
  tempo: 180,
  chords: ['Em', 'C', 'D', 'B', 'Em', 'C', 'Am', 'B'],
  melody: `
    E5 . G5 . B5 - A5 G5 | E5 . G5 . C6 - B5 A5 | F#5 . A5 . D6 - C6 B5 | D#6 - - B5 - - F#5 .
    G5 . B5 . E6 - D6 B5 | G5 . C6 . E6 - D6 C6 | A5 . C6 . E6 . D6 C6 | B5 - D#6 - F#6 - - .`,
  style: { ...BOSS_STYLE, pad: true, padOctave: 3 },
  bassWave: 'sawtooth',
});

/** Guardiões do planeta secreto (reservada para os chefes que estão por vir). */
const bossSecret = compose({
  tempo: 188,
  chords: ['Bm', 'G', 'A', 'F#', 'Bm', 'G', 'Em', 'F#'],
  melody: `
    B4 D5 F#5 B5 . F#5 D5 B4 | G4 B4 D5 G5 . D5 B4 G4 | A4 C#5 E5 A5 . E5 C#5 A4 | F#4 A#4 C#5 F#5 - - . .
    D6 . B5 . F#5 . B5 D6 | D6 . B5 . G5 . B5 D6 | E6 . B5 . G5 . E5 G5 | F#5 - A#5 - C#6 - F#6 -`,
  style: { ...BOSS_STYLE, arp: '0 2 1 3 0 2 1 3', arpOctave: 4, pad: true, padOctave: 3 },
  bassWave: 'sawtooth',
});

/** Trilhas novas, por chave do sequenciador. */
export const WORLD_SONGS: Record<string, Song> = {
  world1,
  world2,
  world3,
  world4,
  boss1,
  boss2,
  boss3,
  bossSecret,
};

/** Música de uma fase oficial (uma por mundo). */
export function worldSongKey(world: number): string {
  return `world${Math.min(4, Math.max(1, world))}`;
}
