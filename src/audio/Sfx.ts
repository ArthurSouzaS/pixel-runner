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
};

/** Padrões de música por tema: [baixo, melodia], 16 passos cada (null = pausa). */
const SONGS: Record<string, { tempo: number; bass: (string | null)[]; lead: (string | null)[] }> = {
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
  },
};

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
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
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.22;
      this.musicGain.connect(this.master);
      this.noiseBuffer = this.createNoise();
      if (this.songKey) this.startScheduler();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(muted ? 0 : 0.5, this.ctx.currentTime, 0.02);
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
    osc.connect(gain).connect(destination ?? this.master);
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
    src.connect(filter).connect(gain).connect(this.master);
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
