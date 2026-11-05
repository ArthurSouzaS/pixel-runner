/** Tipos das fases. As fases em si ficam em arquivos de dados (level1.ts ... level5.ts). */

export type ThemeKey = 'grass' | 'cave' | 'factory' | 'ice' | 'castle';

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
  name: string;
  subtitle: string;
  /** Tempo de referência para o bônus de tempo, em segundos. */
  par: number;
  theme: LevelTheme;
  /**
   * Mapa ASCII. Legenda:
   *  `#` chão  `X` bloco de pedra  `-` plataforma atravessável  `^` espinhos
   *  `o` moeda  `P` início  `K` checkpoint  `G` chegada
   *  `w` andarilho  `h` saltador  `b` morcego  `t` torreta  `B` chefe
   *  `|` portão da arena do chefe (fecha quando o jogador entra)
   *  `.` vazio
   */
  map: string[];
  movers?: MoverData[];
  hints?: HintData[];
}
