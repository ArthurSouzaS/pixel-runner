import type { BossAssistConfig } from '../logic/bossAssist';
import type { AbilityId } from '../logic/abilities';

/** Tipos das fases. As fases em si ficam em arquivos de dados (level1.ts ... level5.ts). */

export type ThemeKey =
  | 'grass'
  | 'cave'
  | 'factory'
  | 'ice'
  | 'castle'
  | 'frost'
  | 'reef'
  | 'ruins'
  | 'sky'
  | 'storm'
  | 'moon'
  | 'station'
  | 'nebula'
  | 'belt'
  | 'citadel'
  | 'ash'
  | 'forge'
  | 'magma'
  | 'obsidian'
  | 'caldera';

export type BossKind = 'core' | 'storm' | 'eclipse';

export interface LevelTheme {
  key: ThemeKey;
  /** Cor do topo e da base do céu (gradiente). */
  skyTop: number;
  skyBottom: number;
  /** Cor das montanhas distantes e próximas (parallax). */
  farHills: number;
  nearHills: number;
}

/** Plataforma móvel, em coordenadas de tile. Vai e volta entre (x, y) e (x + dx, y + dy). */
export interface MoverData {
  x: number;
  y: number;
  width: number;
  dx: number;
  dy: number;
  /** Duração de uma ida e volta completa, em segundos. */
  period: number;
}

/** Retângulo em coordenadas de tile. */
export interface TileRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Zona de vento: empurra o jogador. `vx` desloca a velocidade horizontal (px/s)
 * e `vy` é uma aceleração vertical (negativa = corrente de ar para cima).
 */
export interface WindZone extends TileRect {
  vx: number;
  vy: number;
}

/** Par de portais ligados (coordenadas de tile da base de cada portal). */
export interface PortalData {
  ax: number;
  ay: number;
  bx: number;
  by: number;
}

/** Asteroide que vai e volta entre (x, y) e (x + dx, y + dy). Encostar machuca. */
export interface AsteroidData {
  x: number;
  y: number;
  dx: number;
  dy: number;
  /** Ida e volta, em segundos. */
  period: number;
  /** 1 = pequeno, 2 = grande. */
  size: number;
}

/** Laser temporizado: liga por `on` ms e desliga por `off` ms (com aviso antes de ligar). */
export interface LaserData {
  x: number;
  y: number;
  /** Comprimento em tiles (para a direita ou para baixo). */
  length: number;
  vertical: boolean;
  on: number;
  off: number;
  /** Atraso inicial do ciclo (ms), para dessincronizar lasers. */
  offset: number;
}

/** Texto de tutorial exibido no cenário (coordenadas de tile). */
export interface HintData {
  x: number;
  y: number;
  text: string;
  /** Versão do texto para quem joga pela tela de toque. */
  touchText?: string;
}

export interface LevelData {
  id: number;
  /** Mundo ao qual a fase pertence (1 ou 2). */
  world: number;
  name: string;
  subtitle: string;
  /** Tempo de referência para o bônus de tempo, em segundos. */
  par: number;
  theme: LevelTheme;
  /**
   * Mapa ASCII. Legenda:
   *  `#` chão  `X` bloco de pedra  `-` plataforma atravessável  `^` espinhos
   *  `o` moeda  `P` início  `K` checkpoint  `G` chegada
   *  `w` andarilho  `h` saltador  `b` morcego  `t` torreta  `f` peixe  `B` chefe
   *  `I` bloco de gelo (escorregadio)  `S` mola  `F` plataforma que cai
   *  `Q` bloco rachado (quebra com a investida)  `a` inimigo blindado  `A` orbe de habilidade
   *  `V` inversor de gravidade  `d` drone
   *  `L` lava (mata ao encostar)  `e` brasa (salta da lava; não pode ser pisada)
   *  `|` portão da arena do chefe (fecha quando o jogador entra)
   *  `.` vazio
   */
  map: string[];
  movers?: MoverData[];
  hints?: HintData[];
  /** Regiões de água (nado). */
  water?: TileRect[];
  /** Zonas de vento. */
  winds?: WindZone[];
  /** Tipo de chefe, se a fase tiver um (`B` no mapa). */
  boss?: BossKind;
  /** Orbes de energia na luta contra o chefe (lançados nele ao serem pegos). */
  bossAssist?: BossAssistConfig;
  /** Habilidade concedida pelo orbe `A` desta fase. */
  ability?: AbilityId;
  /** Multiplicador da gravidade (1 = normal; < 1 = gravidade baixa). */
  gravity?: number;
  portals?: PortalData[];
  asteroids?: AsteroidData[];
  lasers?: LaserData[];
  /** Gêiseres de fogo temporizados (Mundo 4). */
  geysers?: GeyserData[];
  /** Esteiras que empurram quem está em cima (Mundo 4). */
  conveyors?: ConveyorData[];
  /** Maré de lava que sobe e desce por toda a fase (Mundo 4). */
  lavaTide?: LavaTideData;
  /** Parede de lava que avança da esquerda para a direita (fuga da fase final do Mundo 4). */
  lavaChase?: LavaChaseData;
}

/** Gêiser: jato de fogo que sobe a partir de `y` (linha do bico) por `height` tiles. */
export interface GeyserData {
  x: number;
  y: number;
  height: number;
  /** Tempo ligado e desligado (ms); o aviso aparece pouco antes de ligar. */
  on: number;
  off: number;
  offset: number;
}

/** Esteira de `width` tiles com o topo na linha `y`. `speed` em px/s (negativo = para a esquerda). */
export interface ConveyorData {
  x: number;
  y: number;
  width: number;
  speed: number;
}

/** Superfície da lava oscilando entre as linhas `low` (mais baixa) e `high` (mais alta). */
export interface LavaTideData {
  low: number;
  high: number;
  /** Duração de um ciclo completo (s). */
  period: number;
  /** Atraso do ciclo (s). */
  offset?: number;
}

/** Parede de lava: começa a andar depois de `delay` (s) a `speed` px/s. */
export interface LavaChaseData {
  speed: number;
  delay: number;
  /** Ao renascer num checkpoint, a parede volta para esta distância (tiles) atrás dele. */
  gap: number;
}
