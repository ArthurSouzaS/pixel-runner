import { describe, expect, it } from 'vitest';
import { STEPS_PER_BAR, WORLD_SONGS, chordNotes, noteFreq, noteLength, seq, worldSongKey } from '../src/audio/songs';
import { LEVELS } from '../src/levels';

describe('músicas dos mundos e dos chefes', () => {
  it('converte notas em frequências (lá 440)', () => {
    expect(noteFreq('A4')).toBeCloseTo(440);
    expect(noteFreq('A5')).toBeCloseTo(880);
    expect(noteFreq('C#5')).toBeCloseTo(noteFreq('Db5'));
    expect(noteFreq('C4')).toBeCloseTo(261.63, 1);
    expect(() => noteFreq('H2')).toThrow();
  });

  it('monta acordes maiores e menores', () => {
    expect(chordNotes('Am', 3)).toEqual(['A3', 'C4', 'E4']);
    expect(chordNotes('F#', 4)).toEqual(['F#4', 'A#4', 'C#5']);
    expect(chordNotes('Bb', 2)).toEqual(['A#2', 'D3', 'F3']);
  });

  it('a notação aceita pausas, barras e notas seguradas', () => {
    const p = seq('C5 - . | E5 - - G5');
    expect(p).toEqual(['C5', '-', null, 'E5', '-', '-', 'G5']);
    expect(noteLength(p, 0)).toBe(2);
    expect(noteLength(p, 3)).toBe(3);
    expect(noteLength(p, 6)).toBe(1);
  });

  it('cada mundo tem a sua trilha e cada chefe a sua', () => {
    for (const w of [1, 2, 3, 4]) expect(WORLD_SONGS[worldSongKey(w)], `mundo ${w}`).toBeDefined();
    for (const b of ['boss1', 'boss2', 'boss3', 'bossSecret']) expect(WORLD_SONGS[b], b).toBeDefined();
    // As 20 fases oficiais caem em 4 trilhas, 5 fases por mundo.
    const keys = LEVELS.map((l) => worldSongKey(l.world));
    expect(new Set(keys).size).toBe(4);
    for (const k of new Set(keys)) expect(keys.filter((x) => x === k)).toHaveLength(5);
    // Músicas diferentes de verdade: melodias e andamentos distintos.
    const worlds = [1, 2, 3, 4].map((w) => WORLD_SONGS[worldSongKey(w)]);
    expect(new Set(worlds.map((s) => s.lead.join(' '))).size).toBe(4);
    expect(new Set(worlds.map((s) => s.tempo)).size).toBe(4);
  });

  it('todas as faixas estão bem formadas', () => {
    for (const [key, song] of Object.entries(WORLD_SONGS)) {
      expect(song.tempo, key).toBeGreaterThan(60);
      const tracks = [song.lead, song.bass, song.arp, song.pad].filter((t): t is NonNullable<typeof t> => !!t);
      for (const track of tracks) {
        expect(track.length % STEPS_PER_BAR, key).toBe(0);
        expect(track.length, key).toBe(song.lead.length);
        expect(track[0], `${key} começa segurando nada`).not.toBe('-');
        for (const step of track) {
          if (!step || step === '-') continue;
          for (const n of step.split('+')) expect(Number.isFinite(noteFreq(n)), `${key} ${n}`).toBe(true);
        }
      }
      for (const drum of [song.kick, song.snare, song.hat]) if (drum) expect(drum.length, key).toBe(song.lead.length);
    }
  });
});
