/**
 * Orbes de energia nas lutas de chefe: aparecem de tempos em tempos numa plataforma
 * da arena (um por vez). Ao pegar, o orbe é lançado no chefe e causa o dano de um pisão.
 * Configurado nos dados da fase (`bossAssist`), para servir a qualquer chefe.
 * Módulo puro (sem Phaser), coberto por testes.
 */

export interface BossAssistSpot {
  /** Posição em tiles (o centro do orbe fica em x*16+8, y*16+8). Aceita meio tile. */
  x: number;
  y: number;
}

export interface BossAssistConfig {
  spots: BossAssistSpot[];
  /** Espera até o primeiro orbe, a partir do início da luta (ms). */
  firstMs?: number;
  /** Espera até o próximo orbe depois que o anterior foi pego (ms). */
  everyMs?: number;
}

export const BOSS_ASSIST_FIRST_MS = 4000;
export const BOSS_ASSIST_EVERY_MS = 9000;

export class BossAssistSchedule {
  /** Índice do lugar com orbe agora (null = nenhum). */
  active: number | null = null;
  private nextAt = Number.POSITIVE_INFINITY;
  private last = -1;
  private running = false;

  constructor(
    private readonly config: BossAssistConfig,
    private readonly random: () => number = Math.random,
  ) {}

  get isRunning(): boolean {
    return this.running;
  }

  /** Começa a contar quando a luta começa. */
  start(now: number): void {
    this.running = this.config.spots.length > 0;
    this.active = null;
    this.nextAt = now + (this.config.firstMs ?? BOSS_ASSIST_FIRST_MS);
  }

  /** Para tudo (chefe vencido ou luta reiniciada). */
  stop(): void {
    this.running = false;
    this.active = null;
    this.nextAt = Number.POSITIVE_INFINITY;
  }

  /** Chamado a cada quadro: devolve o lugar do novo orbe quando é hora de aparecer. */
  update(now: number): BossAssistSpot | null {
    if (!this.running || this.active !== null || now < this.nextAt) return null;
    const n = this.config.spots.length;
    let index = Math.floor(this.random() * n) % n;
    // Evita repetir a mesma plataforma duas vezes seguidas.
    if (n > 1 && index === this.last) index = (index + 1 + Math.floor(this.random() * (n - 1))) % n;
    this.active = index;
    this.last = index;
    return this.config.spots[index];
  }

  /** O jogador pegou o orbe: o próximo vem depois de `everyMs`. */
  collected(now: number): void {
    this.active = null;
    this.nextAt = now + (this.config.everyMs ?? BOSS_ASSIST_EVERY_MS);
  }
}
