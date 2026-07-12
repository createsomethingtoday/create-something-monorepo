import {
  createPlayer,
  emptyReceipt,
  saveArtifact,
  saveEngagement,
  saveReceipt,
  updatePlayerProfile,
  validateArtifact,
  validateReceipt,
  type EvidenceDraft,
  type EngagementDraft,
  type LabState,
  type PlayerProfileInput,
  type ReceiptDraft
} from '../model.js';
import { labStore, type LabStore } from './store.js';

export type ServiceResult = { ok: true; workspace: LabState };

export class LabService {
  constructor(private readonly store: LabStore = labStore) {}

  async getWorkspace(): Promise<ServiceResult> {
    return { ok: true, workspace: await this.store.read() };
  }

  async getPlayerWorkspace(playerId: string): Promise<ServiceResult> {
    const workspace = await this.store.read();
    requirePlayer(workspace, playerId);
    return { ok: true, workspace: scopeWorkspace(workspace, playerId) };
  }

  async createPlayer(name: string, profile: PlayerProfileInput = {}): Promise<ServiceResult> {
    const clean = name.trim();
    if (!clean) throw new Error('Player name is required.');
    return { ok: true, workspace: await this.store.mutate((state) => createPlayer(state, clean, undefined, undefined, profile)) };
  }

  async selectPlayer(playerId: string): Promise<ServiceResult> {
    return { ok: true, workspace: await this.store.mutate((state) => {
      requirePlayer(state, playerId);
      return { ...state, selectedPlayerId: playerId };
    }) };
  }

  async updatePlayerProfile(playerId: string, profile: PlayerProfileInput): Promise<ServiceResult> {
    return { ok: true, workspace: await this.store.mutate((state) => {
      requirePlayer(state, playerId);
      return updatePlayerProfile(state, playerId, profile);
    }) };
  }

  async saveReceipt(playerId: string, input: Pick<ReceiptDraft, 'date' | 'strength' | 'nextFocus' | 'playerWords'> & Partial<Pick<ReceiptDraft, 'session' | 'evidence'>>): Promise<ServiceResult> {
    return { ok: true, workspace: await this.store.mutate((state) => {
      requirePlayer(state, playerId);
      const base = emptyReceipt(input.date);
      const draft: ReceiptDraft = { ...base, ...input, evidence: input.evidence ?? base.evidence };
      const issues = validateReceipt(draft);
      if (issues.length) throw new Error(issues.join(' '));
      return saveReceipt({ ...state, selectedPlayerId: playerId }, draft);
    }) };
  }

  async registerEvidence(playerId: string, draft: EvidenceDraft): Promise<ServiceResult> {
    return { ok: true, workspace: await this.store.mutate((state) => {
      requirePlayer(state, playerId);
      const issues = validateArtifact(draft);
      if (issues.length) throw new Error(issues.join(' '));
      return saveArtifact({ ...state, selectedPlayerId: playerId }, draft);
    }) };
  }

  async recordEngagement(playerId: string, draft: EngagementDraft): Promise<ServiceResult> {
    if (!draft.note.trim()) throw new Error('Engagement note is required.');
    return { ok: true, workspace: await this.store.mutate((state) => {
      requirePlayer(state, playerId);
      return saveEngagement({ ...state, selectedPlayerId: playerId }, draft);
    }) };
  }

  async reset(): Promise<ServiceResult> {
    return { ok: true, workspace: await this.store.reset() };
  }
}

export function requirePlayer(state: LabState, playerId: string) {
  if (!state.players.some((player) => player.id === playerId)) throw new Error('The assigned player profile does not exist.');
}

export function scopeWorkspace(state: LabState, playerId: string): LabState {
  requirePlayer(state, playerId);
  return {
    ...state,
    selectedPlayerId: playerId,
    players: state.players.filter((player) => player.id === playerId),
    receipts: state.receipts.filter((receipt) => receipt.playerId === playerId),
    artifacts: state.artifacts.filter((artifact) => artifact.playerId === playerId),
    engagements: state.engagements.filter((event) => event.playerId === playerId)
  };
}

export const labService = new LabService();
