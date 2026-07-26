import type { CapturedFilmAnalysis, FilmCorrection } from './film.js';
import type { FilmPlayReviewPacket } from './film-play-review.js';

export const STORAGE_KEY = 'guard-performance-lab:v5';
export const STATE_VERSION = 5;

export type EvidenceSignal = 'scan' | 'angle' | 'security' | 'finish' | 'explain';
export type EvidenceValue = 'emerging' | 'usable' | 'repeatable';

export type PlayerProfile = {
  age: number | null;
  gender: 'male' | 'female' | 'nonbinary' | 'self-described' | null;
  primaryPosition: 'guard' | 'wing' | 'post' | null;
  preferredName: string;
  dominantHand: 'left' | 'right' | 'both' | null;
  height: string;
  goals: string;
  experienceLevel: string;
  jurisdiction: string;
  notes: string;
};
export type PlayerProfileInput = Partial<PlayerProfile>;
export type Player = { id: string; name: string; profile: PlayerProfile; createdAt: string };
export type ProgramStage = 'prepare' | 'connect' | 'baseline' | 'advantage' | 'help' | 'misdirection' | 'live' | 'receipt';
export type EngagementEvent = {
  id: string;
  playerId: string;
  stage: ProgramStage;
  status: 'planned' | 'active' | 'paused' | 'completed';
  source: 'system' | 'coach' | 'player';
  note: string;
  recordedAt: string;
};
export type EvidenceArtifact = {
  id: string;
  playerId: string;
  kind: 'stat-line' | 'video-highlight' | 'rules-source' | 'coach-observation';
  title: string;
  sourceLabel: string;
  sourceUrl?: string;
  level: 'youth' | 'high-school' | 'college' | 'nba' | 'general';
  jurisdiction?: string;
  observation: string;
  capturedAt: string;
  verification: 'unverified' | 'source-linked' | 'reviewed';
};
export type Receipt = {
  id: string;
  playerId: string;
  session: string;
  date: string;
  strength: string;
  nextFocus: string;
  playerWords: string;
  evidence: Record<EvidenceSignal, EvidenceValue>;
  createdAt: string;
};
export type FilmAnalysisRecord = CapturedFilmAnalysis & {
  id: string;
  playerId: string;
  title: string;
  createdAt: string;
  corrections: FilmCorrection[];
  playReviews?: FilmPlayReviewPacket[];
};
export type LabState = {
  version: 5;
  revision: number;
  selectedPlayerId: string;
  players: Player[];
  receipts: Receipt[];
  artifacts: EvidenceArtifact[];
  engagements: EngagementEvent[];
  filmAnalyses: FilmAnalysisRecord[];
};

const evidence = (): Receipt['evidence'] => ({
  scan: 'emerging', angle: 'emerging', security: 'emerging', finish: 'emerging', explain: 'emerging'
});

export const emptyPlayerProfile = (): PlayerProfile => ({
  age: null,
  gender: null,
  primaryPosition: null,
  preferredName: '',
  dominantHand: null,
  height: '',
  goals: '',
  experienceLevel: '',
  jurisdiction: '',
  notes: ''
});

function normalizePlayerProfile(input: unknown): PlayerProfile {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return emptyPlayerProfile();
  const value = input as Record<string, unknown>;
  return {
    age: typeof value.age === 'number' && Number.isInteger(value.age) && value.age >= 5 && value.age <= 99 ? value.age : null,
    gender: ['male', 'female', 'nonbinary', 'self-described'].includes(String(value.gender)) ? value.gender as PlayerProfile['gender'] : null,
    primaryPosition: ['guard', 'wing', 'post'].includes(String(value.primaryPosition)) ? value.primaryPosition as PlayerProfile['primaryPosition'] : null,
    preferredName: typeof value.preferredName === 'string' ? value.preferredName.trim().slice(0, 100) : '',
    dominantHand: ['left', 'right', 'both'].includes(String(value.dominantHand)) ? value.dominantHand as PlayerProfile['dominantHand'] : null,
    height: typeof value.height === 'string' ? value.height.trim().slice(0, 40) : '',
    goals: typeof value.goals === 'string' ? value.goals.trim().slice(0, 800) : '',
    experienceLevel: typeof value.experienceLevel === 'string' ? value.experienceLevel.trim().slice(0, 120) : '',
    jurisdiction: typeof value.jurisdiction === 'string' ? value.jurisdiction.trim().slice(0, 120) : '',
    notes: typeof value.notes === 'string' ? value.notes.trim().slice(0, 800) : ''
  };
}

export function createInitialState(now = new Date().toISOString()): LabState {
  return {
    version: STATE_VERSION,
    revision: 0,
    selectedPlayerId: 'developing-guard',
    players: [{ id: 'developing-guard', name: 'Developing Guard', profile: emptyPlayerProfile(), createdAt: now }],
    receipts: [],
    artifacts: [],
    engagements: [],
    filmAnalyses: []
  };
}

export function parseState(raw: string | null): LabState {
  if (!raw) return createInitialState();
  try {
    const value = JSON.parse(raw) as Partial<LabState>;
    if (![2, 3, 4, STATE_VERSION].includes(value.version as number) || !Array.isArray(value.players) || value.players.length === 0 || value.players.some((player) => !player || typeof player.id !== 'string' || typeof player.name !== 'string')) return createInitialState();
    const selected = value.players.some((p) => p.id === value.selectedPlayerId) ? value.selectedPlayerId! : value.players[0]!.id;
    const players = value.players.map((player) => ({ ...player, profile: normalizePlayerProfile(player.profile) }));
    return {
      version: STATE_VERSION,
      revision: typeof value.revision === 'number' ? value.revision : 0,
      selectedPlayerId: selected,
      players,
      receipts: Array.isArray(value.receipts) ? value.receipts : [],
      artifacts: Array.isArray(value.artifacts) ? value.artifacts : [],
      engagements: Array.isArray(value.engagements) ? value.engagements : [],
      filmAnalyses: Array.isArray(value.filmAnalyses)
        ? value.filmAnalyses.map((analysis) => ({ ...analysis, playReviews: Array.isArray(analysis.playReviews) ? analysis.playReviews : [] }))
        : []
    };
  } catch {
    return createInitialState();
  }
}

export function parseAuthoritativeState(raw: string): LabState {
  let value: Record<string, unknown>;
  try { value = JSON.parse(raw) as Record<string, unknown>; }
  catch { throw new Error('The authoritative workspace contains invalid JSON. Restore or reset it explicitly.'); }
  if (![2, 3, 4, STATE_VERSION].includes(value.version as number) || !Array.isArray(value.players) || value.players.length === 0 || !Array.isArray(value.receipts) || !Array.isArray(value.artifacts)) throw new Error('The authoritative workspace has an invalid schema. Restore or reset it explicitly.');
  if (typeof value.selectedPlayerId !== 'string' || !value.players.some((player) => typeof player === 'object' && player !== null && (player as { id?: unknown }).id === value.selectedPlayerId)) throw new Error('The authoritative workspace has an invalid selected player. Restore or reset it explicitly.');
  return parseState(raw);
}

export function createPlayer(state: LabState, name: string, id: string = crypto.randomUUID(), now = new Date().toISOString(), profile: PlayerProfileInput = {}): LabState {
  const clean = name.trim();
  if (!clean) return state;
  return { ...state, selectedPlayerId: id, players: [...state.players, { id, name: clean, profile: normalizePlayerProfile(profile), createdAt: now }] };
}

export function updatePlayerProfile(state: LabState, playerId: string, profile: PlayerProfileInput): LabState {
  return {
    ...state,
    players: state.players.map((player) => player.id === playerId
      ? { ...player, profile: normalizePlayerProfile({ ...player.profile, ...profile }) }
      : player)
  };
}

export type ReceiptDraft = Omit<Receipt, 'id' | 'playerId' | 'createdAt'>;

export function emptyReceipt(date = new Date().toISOString().slice(0, 10)): ReceiptDraft {
  return { session: 'Session 01 / Create the first advantage', date, strength: '', nextFocus: '', playerWords: '', evidence: evidence() };
}

export function validateReceipt(draft: ReceiptDraft): string[] {
  const errors: string[] = [];
  if (!draft.date) errors.push('Add the session date.');
  if (!draft.strength.trim()) errors.push('Name one observable strength first.');
  if (!draft.nextFocus.trim()) errors.push('Name one next focus.');
  if (!draft.playerWords.trim()) errors.push('Capture the player’s words.');
  return errors;
}

export function saveReceipt(state: LabState, draft: ReceiptDraft, id: string = crypto.randomUUID(), now = new Date().toISOString()): LabState {
  if (validateReceipt(draft).length) return state;
  const receipt: Receipt = { ...draft, id, playerId: state.selectedPlayerId, createdAt: now };
  return { ...state, receipts: [receipt, ...state.receipts] };
}

export function receiptsForSelected(state: LabState): Receipt[] {
  return state.receipts.filter((receipt) => receipt.playerId === state.selectedPlayerId);
}

export function latestFilmAnalysisForPlayer(state: LabState, playerId: string): FilmAnalysisRecord | undefined {
  return state.filmAnalyses
    .filter((analysis) => analysis.playerId === playerId)
    .toSorted((a, b) => b.analysis.revision - a.analysis.revision
      || Number(Boolean(b.analysis.playStateVerification)) - Number(Boolean(a.analysis.playStateVerification))
      || b.createdAt.localeCompare(a.createdAt))[0];
}

export type EvidenceDraft = Omit<EvidenceArtifact, 'id' | 'playerId' | 'capturedAt' | 'verification'>;

export function validateArtifact(draft: EvidenceDraft): string[] {
  const errors: string[] = [];
  if (!draft.title.trim()) errors.push('Name the evidence artifact.');
  if (!draft.sourceLabel.trim()) errors.push('Name the source or observer.');
  if (draft.kind !== 'coach-observation' && !draft.sourceUrl?.trim()) errors.push('Add a source link for external evidence.');
  if (!draft.observation.trim()) errors.push('Record what is directly observable.');
  if (draft.kind === 'video-highlight' && !draft.jurisdiction?.trim()) errors.push('Add the state or jurisdiction for film context.');
  return errors;
}

export function saveArtifact(state: LabState, draft: EvidenceDraft, id: string = crypto.randomUUID(), now = new Date().toISOString()): LabState {
  if (validateArtifact(draft).length) return state;
  const verification = draft.kind === 'coach-observation' ? 'unverified' : 'source-linked';
  const artifact: EvidenceArtifact = { ...draft, id, playerId: state.selectedPlayerId, capturedAt: now, verification };
  return { ...state, artifacts: [artifact, ...state.artifacts] };
}

export function artifactsForSelected(state: LabState): EvidenceArtifact[] {
  return state.artifacts.filter((artifact) => artifact.playerId === state.selectedPlayerId);
}

export type EngagementDraft = Pick<EngagementEvent, 'stage' | 'status' | 'source' | 'note'>;

export function saveEngagement(state: LabState, draft: EngagementDraft, id: string = crypto.randomUUID(), recordedAt = new Date().toISOString()): LabState {
  const cleanNote = draft.note.trim();
  if (!cleanNote) return state;
  const engagement: EngagementEvent = { ...draft, note: cleanNote, id, playerId: state.selectedPlayerId, recordedAt };
  return { ...state, engagements: [engagement, ...state.engagements] };
}

export function engagementsForSelected(state: LabState): EngagementEvent[] {
  return state.engagements.filter((event) => event.playerId === state.selectedPlayerId);
}
