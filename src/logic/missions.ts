/**
 * Missões dadas pelos NPCs da vila. Módulo puro (sem Phaser), coberto por testes.
 *
 * Ciclo: (bloqueada) → disponível → ativa → concluída → recompensa recebida.
 * No save guardamos só as missões ativas, concluídas e recebidas; "disponível" é calculado.
 */
import type { NpcId } from '../story/story';

export type MissionItem = 'gear' | 'shell' | 'shard';

export type Objective =
  | { kind: 'clear'; level: number }
  | { kind: 'noDamage'; level: number }
  | { kind: 'time'; level: number; seconds: number }
  | { kind: 'collect'; item: MissionItem; count: number }
  | { kind: 'coins'; count: number };

export interface Mission {
  id: string;
  type: 'main' | 'side';
  giver: NpcId;
  objective: Objective;
  reward: { coins: number; skin?: string };
  /** Fases liberadas necessárias para a missão aparecer. */
  minUnlocked: number;
  /** Missão que precisa ter a recompensa recebida antes. */
  after?: string;
}

export const MISSIONS: readonly Mission[] = [
  { id: 'main-1', type: 'main', giver: 'elder', objective: { kind: 'clear', level: 4 }, reward: { coins: 100 }, minUnlocked: 1 },
  { id: 'main-2', type: 'main', giver: 'elder', objective: { kind: 'clear', level: 9 }, reward: { coins: 150 }, minUnlocked: 6, after: 'main-1' },
  { id: 'main-3', type: 'main', giver: 'elder', objective: { kind: 'clear', level: 14 }, reward: { coins: 300, skin: 'stellar' }, minUnlocked: 11, after: 'main-2' },
  { id: 'gears', type: 'side', giver: 'lumi', objective: { kind: 'collect', item: 'gear', count: 5 }, reward: { coins: 80, skin: 'lantern' }, minUnlocked: 1 },
  { id: 'flawless-3', type: 'side', giver: 'lumi', objective: { kind: 'noDamage', level: 2 }, reward: { coins: 60 }, minUnlocked: 3 },
  { id: 'savings', type: 'side', giver: 'elder', objective: { kind: 'coins', count: 150 }, reward: { coins: 100 }, minUnlocked: 2, after: 'main-1' },
  { id: 'speed-2', type: 'side', giver: 'captain', objective: { kind: 'time', level: 1, seconds: 60 }, reward: { coins: 60 }, minUnlocked: 6 },
  { id: 'shells', type: 'side', giver: 'captain', objective: { kind: 'collect', item: 'shell', count: 4 }, reward: { coins: 80, skin: 'sailor' }, minUnlocked: 6 },
  { id: 'speed-8', type: 'side', giver: 'captain', objective: { kind: 'time', level: 7, seconds: 100 }, reward: { coins: 100 }, minUnlocked: 9 },
  { id: 'shards', type: 'side', giver: 'astro', objective: { kind: 'collect', item: 'shard', count: 5 }, reward: { coins: 120, skin: 'astronaut' }, minUnlocked: 11 },
  { id: 'flawless-13', type: 'side', giver: 'astro', objective: { kind: 'noDamage', level: 12 }, reward: { coins: 120 }, minUnlocked: 13 },
];

/**
 * Onde os itens de missão aparecem: no lugar da N-ésima moeda de uma fase
 * (assim ficam sempre em lugares alcançáveis).
 */
export const MISSION_ITEMS: readonly { item: MissionItem; level: number; coin: number }[] = [
  { item: 'gear', level: 0, coin: 20 },
  { item: 'gear', level: 1, coin: 12 },
  { item: 'gear', level: 2, coin: 25 },
  { item: 'gear', level: 3, coin: 15 },
  { item: 'gear', level: 4, coin: 10 },
  { item: 'shell', level: 5, coin: 20 },
  { item: 'shell', level: 6, coin: 10 },
  { item: 'shell', level: 6, coin: 40 },
  { item: 'shell', level: 7, coin: 30 },
  { item: 'shard', level: 10, coin: 20 },
  { item: 'shard', level: 11, coin: 10 },
  { item: 'shard', level: 12, coin: 30 },
  { item: 'shard', level: 13, coin: 15 },
  { item: 'shard', level: 14, coin: 12 },
];

export type MissionStatus = 'active' | 'done' | 'claimed';

export interface MissionProgress {
  status: MissionStatus;
  progress: number;
}

export interface MissionState {
  missions: Record<string, MissionProgress>;
  /** Itens já coletados, no formato "item:fase:moeda". */
  items: string[];
}

export function emptyMissionState(): MissionState {
  return { missions: {}, items: [] };
}

export function findMission(id: string): Mission | undefined {
  return MISSIONS.find((m) => m.id === id);
}

/** Quanto falta: o alvo numérico de cada objetivo. */
export function objectiveTarget(o: Objective): number {
  return o.kind === 'collect' || o.kind === 'coins' ? o.count : 1;
}

export type DisplayStatus = 'locked' | 'available' | MissionStatus;

export function missionStatus(state: MissionState, mission: Mission, unlockedLevels: number): DisplayStatus {
  const saved = state.missions[mission.id];
  if (saved) return saved.status;
  if (unlockedLevels < mission.minUnlocked) return 'locked';
  if (mission.after && state.missions[mission.after]?.status !== 'claimed') return 'locked';
  return 'available';
}

export function availableFor(state: MissionState, npc: NpcId, unlockedLevels: number): Mission[] {
  return MISSIONS.filter((m) => m.giver === npc && missionStatus(state, m, unlockedLevels) === 'available');
}

export function doneFor(state: MissionState, npc: NpcId): Mission[] {
  return MISSIONS.filter((m) => m.giver === npc && state.missions[m.id]?.status === 'done');
}

export function accept(state: MissionState, id: string): MissionState {
  if (state.missions[id] || !findMission(id)) return state;
  return { ...state, missions: { ...state.missions, [id]: { status: 'active', progress: 0 } } };
}

export interface ClaimResult {
  state: MissionState;
  reward: Mission['reward'] | null;
}

export function claim(state: MissionState, id: string): ClaimResult {
  const m = findMission(id);
  const saved = state.missions[id];
  if (!m || saved?.status !== 'done') return { state, reward: null };
  return { state: { ...state, missions: { ...state.missions, [id]: { ...saved, status: 'claimed' } } }, reward: m.reward };
}

export type MissionEvent =
  | { type: 'levelClear'; level: number; seconds: number; deaths: number }
  | { type: 'item'; item: MissionItem; key: string }
  | { type: 'coin' };

export interface EventResult {
  state: MissionState;
  /** Missões que acabaram de ser concluídas. */
  completed: Mission[];
}

/** Aplica um acontecimento do jogo às missões ativas. */
export function applyEvent(state: MissionState, event: MissionEvent): EventResult {
  let items = state.items;
  if (event.type === 'item') {
    if (items.includes(event.key)) return { state, completed: [] };
    items = [...items, event.key];
  }
  const missions = { ...state.missions };
  const completed: Mission[] = [];
  for (const [id, prog] of Object.entries(state.missions)) {
    if (prog.status !== 'active') continue;
    const m = findMission(id);
    if (!m) continue;
    const o = m.objective;
    let progress = prog.progress;
    if (event.type === 'levelClear') {
      if (o.kind === 'clear' && o.level === event.level) progress = 1;
      if (o.kind === 'noDamage' && o.level === event.level && event.deaths === 0) progress = 1;
      if (o.kind === 'time' && o.level === event.level && event.seconds <= o.seconds) progress = 1;
    } else if (event.type === 'item' && o.kind === 'collect' && o.item === event.item) {
      progress += 1;
    } else if (event.type === 'coin' && o.kind === 'coins') {
      progress += 1;
    }
    if (progress === prog.progress) continue;
    const done = progress >= objectiveTarget(o);
    missions[id] = { status: done ? 'done' : 'active', progress: Math.min(progress, objectiveTarget(o)) };
    if (done) completed.push(m);
  }
  return { state: { missions, items }, completed };
}

/** Itens de missão que devem aparecer nesta fase agora (missão ativa e item ainda não pego). */
export function itemsToSpawn(state: MissionState, level: number): { item: MissionItem; coin: number; key: string }[] {
  const wanted = new Set(
    MISSIONS.filter((m) => m.objective.kind === 'collect' && state.missions[m.id]?.status === 'active').map((m) => (m.objective as { item: MissionItem }).item),
  );
  return MISSION_ITEMS.filter((i) => i.level === level && wanted.has(i.item))
    .map((i) => ({ item: i.item, coin: i.coin, key: `${i.item}:${i.level}:${i.coin}` }))
    .filter((i) => !state.items.includes(i.key));
}

export function sanitizeMissions(raw: unknown): MissionState {
  const state = emptyMissionState();
  if (!raw || typeof raw !== 'object') return state;
  const data = raw as { missions?: unknown; items?: unknown };
  if (data.missions && typeof data.missions === 'object') {
    for (const [id, value] of Object.entries(data.missions as Record<string, unknown>)) {
      const m = findMission(id);
      const v = value as Partial<MissionProgress> | null;
      if (!m || !v || !['active', 'done', 'claimed'].includes(v.status as string)) continue;
      const progress = typeof v.progress === 'number' && Number.isFinite(v.progress) ? Math.max(0, Math.min(objectiveTarget(m.objective), Math.floor(v.progress))) : 0;
      state.missions[id] = { status: v.status as MissionStatus, progress };
    }
  }
  if (Array.isArray(data.items)) state.items = [...new Set(data.items.filter((i): i is string => typeof i === 'string'))];
  return state;
}
