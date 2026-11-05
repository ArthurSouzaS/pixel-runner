import { type VolumeSettings, defaultVolumes } from '../logic/audioSettings';

/**
 * Efeitos sonoros e música gerados em tempo real com a Web Audio API.
 * Nenhum arquivo de áudio é carregado: tudo é sintetizado com osciladores e ruído.
 */

type Wave = OscillatorType;

interface ToneOptions {
  freq: number;
  to?: number;
  duration: number;
  type?: Wave;
  volume?: number;
  delay?: number;
  slide?: 'linear' | 'exp';
}

interface NoiseOptions {
  duration: number;
  volume?: number;
  delay?: number;
  filter?: number;
  filterTo?: number;
}

export type SfxName =
  | 'jump'
  | 'doubleJump'
  | 'dash'
  | 'coin'
  | 'stomp'
  | 'hurt'
  | 'checkpoint'
  | 'extraLife'
  | 'shoot'
  | 'bossHit'
  | 'bossLand'
  | 'explosion'
  | 'select'
  | 'confirm'
  | 'pause'
  | 'gate'
  | 'levelClear'
  | 'gameOver'
  | 'victory'
  | 'spring'
  | 'swim'
  | 'splash'
  | 'crumble'
  | 'thunder'
  | 'rush'
  | 'break'
  | 'clank'
  | 'ability';

// Notas (Hz) usadas nas melodias.
const N: Record<string, number> = {
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.0, A3: 220.0, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.0, C6: 1046.5,
  Bb2: 116.54, B2: 123.47, Eb3: 155.56, 'F#3': 185.0, Ab3: 207.65, Bb3: 233.08,
  Eb4: 311.13, 'F#4': 369.99, Ab4: 415.3, Bb4: 466.16, 'C#5': 554.37, Eb5: 622.25, 'F#5': 739.99, Ab5: 830.61, Bb5: 932.33, B5: 987.77, D6: 1174.66, E6: 1318.51,
};

type Pattern = (string | null)[];

interface Song {
  tempo: number;
  bass: Pattern;
  lead: Pattern;
  /** Arpejo/contracanto opcional (onda triangular suave). */
  arp?: Pattern;
  /** Bumbo nos passos marcados com 1. */
  kick?: number[];
}

const KICK_4 = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0];
const KICK_DRIVE = [1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 1, 0];

/** Padrões de música por tema: [baixo, melodia], 16 passos cada (null = pausa). */
const SONGS: Record<string, Song> = {
  menu: {
    tempo: 118,
    bass: ['C3', null, 'C3', null, 'A3', null, 'A3', null, 'F3', null, 'F3', null, 'G3', null, 'G3', null],
    lead: ['E5', null, 'G5', null, 'A5', 'G5', 'E5', null, 'C5', null, 'D5', 'E5', 'D5', null, null, null],
  },
  grass: {
    tempo: 132,
    bass: ['C3', null, 'G3', null, 'A3', null, 'E3', null, 'F3', null, 'C3', null, 'G3', null, 'G3', null],
    lead: ['C5', 'E5', 'G5', null, 'A5', null, 'G5', 'E5', 'F5', null, 'E5', 'D5', 'C5', null, 'D5', null],
  },
  cave: {
    tempo: 104,
    bass: ['A3', null, null, 'A3', 'E3', null, null, 'E3', 'F3', null, null, 'F3', 'E3', null, 'G3', null],
    lead: ['A4', null, 'C5', null, 'E5', null, null, 'D5', 'C5', null, 'B4', null, 'A4', null, null, null],
  },
  factory: {
    tempo: 140,
    bass: ['D3', 'D3', null, 'D3', 'F3', null, 'D3', null, 'C3', 'C3', null, 'C3', 'A3', null, 'G3', null],
    lead: ['D5', null, 'F5', 'D5', null, 'A4', null, 'D5', 'C5', null, 'E5', 'C5', null, 'G4', null, null],
  },
  ice: {
    tempo: 120,
    bass: ['E3', null, 'B3', null, 'C3', null, 'G3', null, 'A3', null, 'E3', null, 'B3', null, 'B3', null],
    lead: ['E5', null, 'B4', 'E5', 'G5', null, 'F5', null, 'E5', null, 'D5', null, 'B4', null, null, null],
  },
  castle: {
    tempo: 150,
    bass: ['A3', 'A3', 'A3', null, 'F3', 'F3', 'F3', null, 'G3', 'G3', 'G3', null, 'E3', 'E3', 'E3', null],
    lead: ['A4', 'C5', 'E5', 'A5', 'G5', null, 'E5', null, 'F5', 'E5', 'D5', 'C5', 'B4', null, 'E5', null],
    kick: KICK_4,
  },
  // ---- Mundo 2: Arquipélago Celeste (tons mais abertos, com arpejos) ----
  frost: {
    tempo: 112,
    bass: ['D3', null, 'A3', null, 'Bb2', null, 'F3', null, 'G3', null, 'D3', null, 'A3', null, 'A3', null],
    lead: ['F5', null, 'E5', 'D5', null, 'A4', null, 'D5', 'E5', null, 'F5', 'G5', 'A5', null, 'E5', null],
    arp: ['D5', 'F5', 'A5', 'F5', 'Bb4', 'D5', 'F5', 'D5', 'G4', 'Bb4', 'D5', 'Bb4', 'A4', 'C#5', 'E5', 'C#5'],
  },
  reef: {
    tempo: 100,
    bass: ['F3', null, null, 'C3', 'F3', null, 'A3', null, 'Bb3', null, null, 'F3', 'C3', null, 'E3', null],
    lead: ['A4', null, 'C5', 'F5', null, 'E5', 'C5', null, 'D5', null, 'F5', null, 'E5', 'C5', null, null],
    arp: [null, 'F4', 'A4', null, 'C5', null, 'A4', null, null, 'Bb4', 'D5', null, 'C5', null, 'G4', null],
  },
  ruins: {
    tempo: 128,
    bass: ['E3', 'E3', null, 'G3', 'A3', null, 'E3', null, 'C3', 'C3', null, 'D3', 'B2', null, 'B2', null],
    lead: ['E5', null, 'G5', 'F#5', 'E5', null, 'B4', null, 'C5', 'D5', 'E5', null, 'D5', null, 'B4', null],
    kick: KICK_4,
  },
  sky: {
    tempo: 136,
    bass: ['G3', null, 'D3', null, 'E3', null, 'B2', null, 'C3', null, 'G3', null, 'D3', null, 'D3', null],
    lead: ['B4', 'D5', 'G5', null, 'F#5', null, 'D5', 'B4', 'C5', 'E5', 'G5', null, 'A5', null, 'F#5', null],
    arp: ['G4', 'B4', 'D5', 'B4', 'E4', 'G4', 'B4', 'G4', 'C5', 'E5', 'G5', 'E5', 'D5', 'F#5', 'A5', 'F#5'],
    kick: KICK_4,
  },
  storm: {
    tempo: 146,
    bass: ['C3', 'C3', 'Eb3', 'C3', 'Ab3', null, 'G3', null, 'C3', 'C3', 'Eb3', 'F3', 'G3', null, 'B2', null],
    lead: ['C5', null, 'Eb5', 'G5', null, 'F5', 'Eb5', null, 'D5', null, 'Eb5', 'F5', 'G5', null, 'B4', null],
    kick: KICK_DRIVE,
  },
  // ---- Mundo 3: Fronteira Estelar (sintetizado, mais espaçoso) ----
  moon: {
    tempo: 92,
    bass: ['A3', null, null, null, 'F3', null, null, null, 'C3', null, null, null, 'G3', null, null, null],
    lead: ['E5', null, null, 'A5', null, 'G5', null, null, 'F5', null, 'E5', null, 'C5', null, null, null],
    arp: ['A4', 'C5', 'E5', 'C5', 'F4', 'A4', 'C5', 'A4', 'C4', 'E4', 'G4', 'E4', 'G4', 'B4', 'D5', 'B4'],
  },
  station: {
    tempo: 126,
    bass: ['E3', null, 'E3', 'G3', null, 'E3', 'D3', null, 'C3', null, 'C3', 'D3', null, 'E3', 'B2', null],
    lead: ['B4', 'E5', null, 'G5', 'F#5', null, 'E5', null, 'D5', null, 'E5', 'B4', null, 'G4', null, null],
    kick: KICK_4,
  },
  nebula: {
    tempo: 108,
    bass: ['D3', null, null, 'D3', 'Bb2', null, null, 'Bb2', 'C3', null, null, 'C3', 'A3', null, 'A3', null],
    lead: ['F5', null, 'A5', null, 'G5', 'F5', 'D5', null, 'E5', null, 'C5', 'D5', 'E5', null, 'C#5', null],
    arp: ['D4', 'F4', 'A4', 'D5', 'Bb3', 'D4', 'F4', 'Bb4', 'C4', 'E4', 'G4', 'C5', 'A3', 'C#5', 'E4', 'A4'],
  },
  belt: {
    tempo: 142,
    bass: ['G3', 'G3', null, 'Bb3', null, 'G3', 'F3', null, 'Eb3', 'Eb3', null, 'F3', null, 'D3', 'D3', null],
    lead: ['D5', null, 'G5', 'Bb5', null, 'A5', 'G5', null, 'F5', null, 'Eb5', 'D5', null, 'Bb4', null, null],
    kick: KICK_DRIVE,
  },
  citadel: {
    tempo: 120,
    bass: ['C3', null, 'G3', null, 'Ab3', null, 'Eb3', null, 'F3', null, 'C3', null, 'G3', null, 'B2', null],
    lead: ['G4', 'C5', 'Eb5', null, 'D5', null, 'C5', 'B4', 'C5', null, 'Ab4', null, 'G4', null, 'B4', null],
    arp: ['C4', 'Eb4', 'G4', 'Eb4', 'Ab3', 'C4', 'Eb4', 'C4', 'F3', 'Ab3', 'C4', 'Ab3', 'G3', 'B3', 'D4', 'B3'],
    kick: KICK_4,
  },
  boss3: {
    tempo: 180,
    bass: ['E3', 'E3', 'G3', 'E3', 'F3', 'E3', 'D3', 'B2', 'E3', 'E3', 'G3', 'A3', 'Bb3', 'A3', 'G3', 'F#3'],
    lead: ['E5', 'G5', 'B5', null, 'Bb5', null, 'A5', 'G5', 'F#5', null, 'G5', 'A5', 'B5', null, 'E6', null],
    arp: ['E4', 'B4', 'E5', 'B4', 'F4', 'C5', 'F5', 'C5', 'D5', 'A4', 'D5', 'A4', 'E5', 'B4', 'G4', 'B4'],
    kick: KICK_DRIVE,
  },
  ending: {
    tempo: 84,
    bass: ['F3', null, 'C3', null, 'D3', null, 'A3', null, 'Bb3', null, 'F3', null, 'C3', null, 'C3', null],
    lead: ['A5', null, 'G5', 'F5', 'E5', null, 'F5', null, 'D5', null, 'C5', 'Bb4', 'C5', null, null, null],
    arp: ['F4', 'A4', 'C5', 'F5', 'D4', 'F4', 'A4', 'D5', 'Bb3', 'D4', 'F4', 'Bb4', 'C4', 'E4', 'G4', 'C5'],
  },
  // ---- Chefes, mapa e créditos ----
  boss1: {
    tempo: 164,
    bass: ['A3', 'A3', 'C3', 'A3', 'Bb3', 'A3', 'G3', 'E3', 'A3', 'A3', 'C3', 'A3', 'F3', 'E3', 'Eb3', 'E3'],
    lead: ['A5', null, 'E5', null, 'F5', 'E5', 'D5', null, 'C5', null, 'D5', 'E5', 'C5', 'B4', null, 'E5'],
    kick: KICK_DRIVE,
  },
  boss2: {
    tempo: 172,
    bass: ['D3', 'D3', 'F3', 'D3', 'Eb3', 'D3', 'C3', 'A3', 'D3', 'D3', 'F3', 'G3', 'Ab3', 'G3', 'F3', 'Eb3'],
    lead: ['D5', 'F5', 'A5', null, 'Ab5', null, 'G5', 'F5', 'Eb5', null, 'F5', 'G5', 'A5', null, 'D6', null],
    arp: ['D4', 'A4', 'D5', 'A4', 'Eb4', 'Bb4', 'Eb5', 'Bb4', 'C5', 'G4', 'C5', 'G4', 'D5', 'A4', 'F#4', 'A4'],
    kick: KICK_DRIVE,
  },
  worldmap: {
    tempo: 96,
    bass: ['F3', null, 'C3', null, 'D3', null, 'A3', null, 'Bb3', null, 'F3', null, 'C3', null, 'C3', null],
    lead: ['A4', null, 'C5', null, 'F5', null, 'E5', 'D5', 'D5', null, 'C5', null, 'A4', 'Bb4', 'C5', null],
    arp: ['F4', 'A4', 'C5', 'A4', 'D4', 'F4', 'A4', 'F4', 'Bb3', 'D4', 'F4', 'D4', 'C4', 'E4', 'G4', 'E4'],
  },
  credits: {
    tempo: 104,
    bass: ['C3', null, 'G3', null, 'A3', null, 'E3', null, 'F3', null, 'C3', null, 'F3', null, 'G3', null],
    lead: ['E5', 'D5', 'C5', null, 'G5', null, 'E5', null, 'F5', 'E5', 'D5', null, 'C5', null, 'D5', null],
    arp: ['C4', 'E4', 'G4', 'C5', 'A3', 'C4', 'E4', 'A4', 'F3', 'A3', 'C4', 'F4', 'G3', 'B3', 'D4', 'G4'],
  },
};

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private volumes: VolumeSettings = defaultVolumes();
  private noiseBuffer: AudioBuffer | null = null;
  private muted = false;

  private songKey: string | null = null;
  private step = 0;
  private nextStepTime = 0;
  private timer: number | null = null;

  /** Cria/retoma o AudioContext. Precisa ser chamado após um gesto do usuário. */
  unlock(): void {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.connect(this.master);
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.connect(this.master);
      this.applyVolumes(true);
      this.noiseBuffer = this.createNoise();
      if (this.songKey) this.startScheduler();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.applyVolumes();
  }

  setVolumes(volumes: VolumeSettings): void {
    this.volumes = { ...volumes };
    this.applyVolumes();
  }

  private applyVolumes(immediate = false): void {
    if (!this.ctx || !this.master || !this.musicGain || !this.sfxBus) return;
    const t = this.ctx.currentTime;
    const set = (node: GainNode, value: number) => (immediate ? (node.gain.value = value) : node.gain.setTargetAtTime(value, t, 0.03));
    set(this.master, this.muted ? 0 : this.volumes.master * 0.65);
    set(this.musicGain, this.volumes.music * 0.35);
    set(this.sfxBus, this.volumes.sfx);
  }

  isMuted(): boolean {
    return this.muted;
  }

  private createNoise(): AudioBuffer | null {
    if (!this.ctx) return null;
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  private tone(o: ToneOptions, destination?: AudioNode): void {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime + (o.delay ?? 0);
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = o.type ?? 'square';
    osc.frequency.setValueAtTime(o.freq, t);
    if (o.to) {
      if (o.slide === 'linear') osc.frequency.linearRampToValueAtTime(o.to, t + o.duration);
      else osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.to), t + o.duration);
    }
    const vol = o.volume ?? 0.3;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + o.duration);
    osc.connect(gain).connect(destination ?? this.sfxBus ?? this.master);
    osc.start(t);
    osc.stop(t + o.duration + 0.02);
  }

  private noise(o: NoiseOptions): void {
    if (!this.ctx || !this.master || !this.noiseBuffer) return;
    const t = this.ctx.currentTime + (o.delay ?? 0);
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(o.filter ?? 2000, t);
    if (o.filterTo) filter.frequency.exponentialRampToValueAtTime(o.filterTo, t + o.duration);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(o.volume ?? 0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + o.duration);
    src.connect(filter).connect(gain).connect(this.sfxBus ?? this.master);
    src.start(t);
    src.stop(t + o.duration + 0.02);
  }

  private arpeggio(notes: string[], gap: number, duration: number, type: Wave = 'square', volume = 0.22): void {
    notes.forEach((n, i) => this.tone({ freq: N[n], duration, type, volume, delay: i * gap }));
  }

  play(name: SfxName): void {
    if (!this.ctx || this.muted) return;
    switch (name) {
      case 'jump':
        this.tone({ freq: 260, to: 620, duration: 0.14, type: 'square', volume: 0.18 });
        break;
      case 'doubleJump':
        this.tone({ freq: 420, to: 900, duration: 0.12, type: 'square', volume: 0.16 });
        this.tone({ freq: 620, to: 1200, duration: 0.1, type: 'triangle', volume: 0.12, delay: 0.05 });
        break;
      case 'dash':
        this.noise({ duration: 0.18, volume: 0.25, filter: 4000, filterTo: 400 });
        this.tone({ freq: 700, to: 200, duration: 0.15, type: 'sawtooth', volume: 0.08 });
        break;
      case 'coin':
        this.tone({ freq: 988, duration: 0.07, type: 'square', volume: 0.14 });
        this.tone({ freq: 1319, duration: 0.18, type: 'square', volume: 0.14, delay: 0.07 });
        break;
      case 'stomp':
        this.tone({ freq: 320, to: 80, duration: 0.16, type: 'square', volume: 0.25 });
        this.noise({ duration: 0.08, volume: 0.2, filter: 1500 });
        break;
      case 'hurt':
        this.tone({ freq: 440, to: 60, duration: 0.45, type: 'sawtooth', volume: 0.25 });
        this.noise({ duration: 0.25, volume: 0.2, filter: 1200, filterTo: 200 });
        break;
      case 'checkpoint':
        this.arpeggio(['C5', 'E5', 'G5', 'C6'], 0.07, 0.12, 'triangle', 0.25);
        break;
      case 'extraLife':
        this.arpeggio(['G4', 'C5', 'E5', 'G5', 'C6', 'G5', 'C6'], 0.06, 0.1, 'square', 0.16);
        break;
      case 'shoot':
        this.tone({ freq: 900, to: 300, duration: 0.12, type: 'square', volume: 0.1 });
        break;
      case 'bossHit':
        this.tone({ freq: 180, to: 40, duration: 0.35, type: 'square', volume: 0.3 });
        this.noise({ duration: 0.3, volume: 0.3, filter: 2500, filterTo: 300 });
        break;
      case 'bossLand':
        this.noise({ duration: 0.4, volume: 0.35, filter: 600, filterTo: 80 });
        this.tone({ freq: 90, to: 35, duration: 0.35, type: 'sine', volume: 0.4 });
        break;
      case 'explosion':
        this.noise({ duration: 0.8, volume: 0.45, filter: 3000, filterTo: 60 });
        this.tone({ freq: 150, to: 30, duration: 0.7, type: 'sawtooth', volume: 0.2 });
        break;
      case 'select':
        this.tone({ freq: 660, duration: 0.05, type: 'square', volume: 0.1 });
        break;
      case 'confirm':
        this.tone({ freq: 660, duration: 0.06, type: 'square', volume: 0.14 });
        this.tone({ freq: 990, duration: 0.12, type: 'square', volume: 0.14, delay: 0.06 });
        break;
      case 'pause':
        this.arpeggio(['E5', 'C5'], 0.08, 0.1, 'triangle', 0.2);
        break;
      case 'gate':
        this.noise({ duration: 0.5, volume: 0.35, filter: 800, filterTo: 100 });
        this.tone({ freq: 110, to: 55, duration: 0.5, type: 'square', volume: 0.2 });
        break;
      case 'levelClear':
        this.arpeggio(['C5', 'E5', 'G5', 'C6', 'G5', 'C6'], 0.1, 0.16, 'square', 0.18);
        this.arpeggio(['C3', 'G3', 'C4'], 0.2, 0.3, 'triangle', 0.25);
        break;
      case 'gameOver':
        this.arpeggio(['G4', 'E4', 'C4', 'G3'], 0.22, 0.3, 'triangle', 0.3);
        break;
      case 'victory':
        this.arpeggio(['C5', 'C5', 'C5', 'C5', 'A4', 'B4', 'C5', 'B4', 'C5'], 0.12, 0.18, 'square', 0.18);
        this.arpeggio(['C3', 'F3', 'G3', 'C4'], 0.3, 0.4, 'triangle', 0.25);
        break;
      case 'spring':
        this.tone({ freq: 200, to: 900, duration: 0.25, type: 'square', volume: 0.18, slide: 'linear' });
        this.tone({ freq: 400, to: 1400, duration: 0.2, type: 'triangle', volume: 0.12, delay: 0.04 });
        break;
      case 'swim':
        this.noise({ duration: 0.12, volume: 0.12, filter: 900, filterTo: 300 });
        this.tone({ freq: 300, to: 500, duration: 0.1, type: 'sine', volume: 0.12 });
        break;
      case 'splash':
        this.noise({ duration: 0.3, volume: 0.22, filter: 2500, filterTo: 400 });
        break;
      case 'crumble':
        this.noise({ duration: 0.25, volume: 0.18, filter: 900, filterTo: 150 });
        break;
      case 'rush':
        this.noise({ duration: 0.3, volume: 0.3, filter: 5000, filterTo: 300 });
        this.tone({ freq: 120, to: 600, duration: 0.25, type: 'sawtooth', volume: 0.15 });
        break;
      case 'break':
        this.noise({ duration: 0.35, volume: 0.35, filter: 2500, filterTo: 200 });
        this.tone({ freq: 160, to: 50, duration: 0.25, type: 'square', volume: 0.15 });
        break;
      case 'clank':
        this.tone({ freq: 1200, to: 800, duration: 0.08, type: 'square', volume: 0.15 });
        this.tone({ freq: 1500, to: 900, duration: 0.12, type: 'triangle', volume: 0.12, delay: 0.03 });
        break;
      case 'ability':
        this.arpeggio(['C5', 'E5', 'G5', 'C6', 'E5', 'G5', 'C6'], 0.08, 0.18, 'triangle', 0.25);
        this.arpeggio(['C4', 'G4', 'C5'], 0.18, 0.4, 'square', 0.1);
        break;
      case 'thunder':
        this.noise({ duration: 1, volume: 0.45, filter: 1200, filterTo: 40 });
        this.tone({ freq: 70, to: 30, duration: 0.9, type: 'sawtooth', volume: 0.2 });
        break;
    }
  }

  // -------------------------------------------------------------------------
  // Música (sequenciador simples com agendamento antecipado)
  // -------------------------------------------------------------------------

  playMusic(key: string): void {
    if (this.songKey === key) return;
    this.songKey = key in SONGS ? key : 'grass';
    this.step = 0;
    if (this.ctx) this.startScheduler();
  }

  stopMusic(): void {
    this.songKey = null;
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
  }

  private startScheduler(): void {
    if (!this.ctx) return;
    if (this.timer !== null) window.clearInterval(this.timer);
    this.nextStepTime = this.ctx.currentTime + 0.05;
    this.timer = window.setInterval(() => this.schedule(), 50);
  }

  private schedule(): void {
    if (!this.ctx || !this.songKey || !this.musicGain) return;
    const song = SONGS[this.songKey];
    const stepDur = 60 / song.tempo / 2;
    // Evita "rajadas" se a aba ficou em segundo plano.
    if (this.nextStepTime < this.ctx.currentTime - 0.5) this.nextStepTime = this.ctx.currentTime + 0.05;
    while (this.nextStepTime < this.ctx.currentTime + 0.2) {
      const delay = Math.max(0, this.nextStepTime - this.ctx.currentTime);
      const i = this.step % 16;
      const bass = song.bass[i];
      const lead = song.lead[i];
      if (!this.muted) {
        if (bass) this.tone({ freq: N[bass], duration: stepDur * 0.9, type: 'triangle', volume: 0.5, delay }, this.musicGain);
        if (lead) this.tone({ freq: N[lead], duration: stepDur * 0.8, type: 'square', volume: 0.16, delay }, this.musicGain);
        const arp = song.arp?.[i];
        if (arp) this.tone({ freq: N[arp], duration: stepDur * 0.6, type: 'triangle', volume: 0.12, delay }, this.musicGain);
        if (song.kick?.[i]) this.tone({ freq: 120, to: 40, duration: 0.12, type: 'sine', volume: 0.55, delay }, this.musicGain);
        if (i % 4 === 2) this.hat(delay);
      }
      this.step++;
      this.nextStepTime += stepDur;
    }
  }

  private hat(delay: number): void {
    if (!this.ctx || !this.noiseBuffer || !this.musicGain) return;
    const t = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 6000;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
    src.connect(filter).connect(gain).connect(this.musicGain);
    src.start(t);
    src.stop(t + 0.05);
  }
}

/** Instância única do motor de som, compartilhada entre as cenas. */
export const sfx = new SoundEngine();
