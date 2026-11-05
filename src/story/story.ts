/**
 * Dados do modo história: personagens, cenas entre os mundos e falas na vila.
 * Os textos ficam nos dicionários de idioma (chaves `story.*`).
 */

export type NpcId = 'elder' | 'lumi' | 'captain' | 'astro';
export type Speaker = NpcId | 'pix';

export interface DialogueLine {
  speaker: Speaker;
  /** Chave de tradução do texto. */
  key: string;
}

export interface NpcInfo {
  id: NpcId;
  /** Chave de tradução do nome. */
  nameKey: string;
  texture: string;
}

export const NPCS: Record<NpcId, NpcInfo> = {
  elder: { id: 'elder', nameKey: 'npc.elder', texture: 'npc-elder' },
  lumi: { id: 'lumi', nameKey: 'npc.lumi', texture: 'npc-lumi' },
  captain: { id: 'captain', nameKey: 'npc.captain', texture: 'npc-captain' },
  astro: { id: 'astro', nameKey: 'npc.astro', texture: 'npc-astro' },
};

export type CutsceneId = 'intro' | 'world1' | 'world2';

export interface Cutscene {
  id: CutsceneId;
  /** Índice da fase cujo tema serve de cenário. */
  backdrop: number;
  /** Personagens em cena (da esquerda para a direita). */
  cast: Speaker[];
  lines: DialogueLine[];
}

const line = (speaker: Speaker, key: string): DialogueLine => ({ speaker, key });

export const CUTSCENES: Record<CutsceneId, Cutscene> = {
  intro: {
    id: 'intro',
    backdrop: 0,
    cast: ['pix', 'elder', 'lumi'],
    lines: [
      line('elder', 'story.intro.1'),
      line('lumi', 'story.intro.2'),
      line('elder', 'story.intro.3'),
      line('pix', 'story.intro.4'),
      line('lumi', 'story.intro.5'),
    ],
  },
  world1: {
    id: 'world1',
    backdrop: 5,
    cast: ['pix', 'captain', 'lumi'],
    lines: [
      line('captain', 'story.world1.1'),
      line('lumi', 'story.world1.2'),
      line('captain', 'story.world1.3'),
      line('pix', 'story.world1.4'),
    ],
  },
  world2: {
    id: 'world2',
    backdrop: 10,
    cast: ['pix', 'astro', 'captain'],
    lines: [
      line('astro', 'story.world2.1'),
      line('captain', 'story.world2.2'),
      line('astro', 'story.world2.3'),
      line('pix', 'story.world2.4'),
      line('astro', 'story.world2.5'),
    ],
  },
};

/** Cena que acontece depois de concluir a fase `levelIndex` (fim de mundo), se houver. */
export function cutsceneAfterLevel(levelIndex: number): CutsceneId | null {
  if (levelIndex === 4) return 'world1';
  if (levelIndex === 9) return 'world2';
  return null;
}

/**
 * Fala de um NPC na vila conforme o progresso (fases liberadas).
 * Cada NPC tem falas por etapa: antes do Mundo 2, antes do Mundo 3 e depois.
 */
export function hubChatter(npc: NpcId, unlockedLevels: number, finished: boolean): DialogueLine[] {
  const stage = finished ? 3 : unlockedLevels > 10 ? 2 : unlockedLevels > 5 ? 1 : 0;
  return [line(npc, `story.hub.${npc}.${stage}`)];
}

/** Todas as chaves de texto usadas pela história (para conferir traduções). */
export function allStoryKeys(): string[] {
  const keys = new Set<string>();
  for (const c of Object.values(CUTSCENES)) c.lines.forEach((l) => keys.add(l.key));
  for (const npc of Object.keys(NPCS) as NpcId[]) {
    keys.add(NPCS[npc].nameKey);
    for (let stage = 0; stage <= 3; stage++) keys.add(`story.hub.${npc}.${stage}`);
  }
  return [...keys];
}
