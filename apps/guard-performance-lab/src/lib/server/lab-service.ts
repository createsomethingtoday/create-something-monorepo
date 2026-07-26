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
import type { CapturedFilmAnalysis, FilmCorrectionDraft } from '../film.js';
import { validateFilmPlayReviewPacket, type FilmPlayReviewPacket } from '../film-play-review.js';
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

  async attachFilmAnalysis(playerId: string, title: string, analysis: CapturedFilmAnalysis): Promise<ServiceResult> {
    const cleanTitle = title.trim();
    if (!cleanTitle) throw new Error('Film analysis title is required.');
    if (analysis.analysis.executionCount !== 1) throw new Error('Captured film analysis must contain exactly one inference execution.');
    return { ok: true, workspace: await this.store.mutate((state) => {
      requirePlayer(state, playerId);
      const duplicate = state.filmAnalyses.some((record) => record.playerId === playerId
        && record.source.sha256 === analysis.source.sha256
        && record.profile === analysis.profile
        && record.analysis.revision === analysis.analysis.revision
        && (record.analysis.playStateVerification?.ledgerFingerprint ?? null) === (analysis.analysis.playStateVerification?.ledgerFingerprint ?? null));
      if (duplicate) throw new Error('This source and analysis revision is already captured for the player.');
      const now = new Date().toISOString();
      return {
        ...state,
        filmAnalyses: [...state.filmAnalyses, { ...analysis, id: crypto.randomUUID(), playerId, title: cleanTitle, createdAt: now, corrections: [], playReviews: [] }]
      };
    }) };
  }

  async attachFilmPlayReview(playerId: string, analysisId: string, review: FilmPlayReviewPacket): Promise<ServiceResult> {
    return { ok: true, workspace: await this.store.mutate((state) => {
      requirePlayer(state, playerId);
      const analysis = state.filmAnalyses.find((record) => record.id === analysisId && record.playerId === playerId);
      if (!analysis) throw new Error('The player film analysis does not exist.');
      const validation = validateFilmPlayReviewPacket(review, {
        sourceSha256: analysis.source.sha256,
        sourceDurationMs: analysis.source.durationMs,
        analysisRevision: analysis.analysis.revision,
        analysisExecutionCount: analysis.analysis.executionCount
      });
      if (!validation.ok) throw new Error(`The play review failed source and privacy verification. ${validation.issues.join(' ')}`);
      if ((analysis.playReviews ?? []).some((packet) => packet.profile === review.profile && packet.sourceSha256 === review.sourceSha256)) {
        throw new Error('This source-bound play review is already attached.');
      }
      return {
        ...state,
        filmAnalyses: state.filmAnalyses.map((record) => record.id === analysisId
          ? { ...record, playReviews: [...(record.playReviews ?? []), review] }
          : record)
      };
    }) };
  }

  async correctFilmAnalysis(playerId: string, analysisId: string, correction: FilmCorrectionDraft): Promise<ServiceResult> {
    if (!correction.reason.trim()) throw new Error('Film correction reason is required.');
    if (correction.court && (correction.court[0] < 0 || correction.court[0] > 94 || correction.court[1] < 0 || correction.court[1] > 50)) throw new Error('Film correction is outside the 94 by 50 foot court.');
    return { ok: true, workspace: await this.store.mutate((state) => {
      requirePlayer(state, playerId);
      const analysis = state.filmAnalyses.find((record) => record.id === analysisId && record.playerId === playerId);
      if (!analysis) throw new Error('The player film analysis does not exist.');
      const status = correction.targetStatus ?? (correction.court ? 'resolved' : 'unresolved');
      if (correction.timeMs > analysis.source.durationMs || !analysis.frames.some((frame) => Math.abs(frame.timeMs - correction.timeMs) <= 500)) throw new Error('Film correction time is outside the captured revision.');
      if (status === 'resolved' && !correction.court) throw new Error('A resolved film correction requires a court position.');
      if (status !== 'resolved' && correction.court) throw new Error('An unresolved or out-of-frame correction cannot contain a court position.');
      const entry = { ...correction, trackId: correction.trackId ?? '13', id: crypto.randomUUID(), createdAt: new Date().toISOString() };
      return { ...state, filmAnalyses: state.filmAnalyses.map((record) => record.id === analysisId ? { ...record, corrections: [...record.corrections, entry] } : record) };
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
    engagements: state.engagements.filter((event) => event.playerId === playerId),
    filmAnalyses: state.filmAnalyses.filter((analysis) => analysis.playerId === playerId).map((analysis) => ({
      ...analysis,
      source: { ...analysis.source, linkedPath: '[private linked source]' }
    }))
  };
}

export const labService = new LabService();
