import { describe, expect, it } from 'vitest';
import {
  evaluateVjepaPlayStateCandidate,
  filmVjepaPlayStateCandidateSchema
} from './film-vjepa.js';

describe('V-JEPA play-state candidate evidence', () => {
  it('requires the candidate to disclaim identity, position, and auto-apply authority', () => {
    const candidate = {
      version: 1,
      profile: 'guard-vjepa-play-state-candidate-v1',
      sourceSha256: 'a'.repeat(64),
      input: { binding: 'exact-source-bytes', sha256: 'a'.repeat(64) },
      model: {
        family: 'V-JEPA 2.1',
        architecture: 'vit_base_384',
        codeSha256: 'c'.repeat(64),
        checkpointSha256: 'd'.repeat(64),
        device: 'mps'
      },
      labels: ['live-basketball', 'stopped-basketball'],
      windows: []
    };

    expect(filmVjepaPlayStateCandidateSchema.safeParse(candidate).success).toBe(false);
  });

  it('rejects predictions from a different source film', () => {
    const ledger = {
      version: 1,
      profile: 'guard-player-play-state-v1',
      sourceSha256: 'a'.repeat(64),
      intervals: [
        {
          id: 'live-1',
          startMs: 0,
          endMs: 3999,
          state: 'live-defense',
          evidence: {
            method: 'source-review',
            reviewer: 'codex',
            note: 'Reviewed live possession.'
          }
        }
      ]
    };
    const candidate = {
      version: 1,
      profile: 'guard-vjepa-play-state-candidate-v1',
      sourceSha256: 'b'.repeat(64),
      input: { binding: 'exact-source-bytes', sha256: 'b'.repeat(64) },
      model: {
        family: 'V-JEPA 2.1',
        architecture: 'vit_base_384',
        codeSha256: 'c'.repeat(64),
        checkpointSha256: 'd'.repeat(64),
        device: 'mps'
      },
      authority: { identity: 'none', positions: 'none', autoApply: false },
      labels: ['live-basketball', 'stopped-basketball'],
      windows: []
    };

    expect(() => evaluateVjepaPlayStateCandidate(candidate, ledger)).toThrow(
      'V-JEPA candidate source hash does not match the reviewed play-state ledger.'
    );
  });

  it('rejects an interval reused for both training and held-out scoring', () => {
    const sourceSha256 = 'a'.repeat(64);
    const ledger = {
      version: 1,
      profile: 'guard-player-play-state-v1',
      sourceSha256,
      intervals: [
        {
          id: 'live-1',
          startMs: 0,
          endMs: 3999,
          state: 'live-defense',
          evidence: {
            method: 'source-review',
            reviewer: 'codex',
            note: 'Reviewed live possession.'
          }
        }
      ]
    };
    const candidate = {
      version: 1,
      profile: 'guard-vjepa-play-state-candidate-v1',
      sourceSha256,
      input: { binding: 'exact-source-bytes', sha256: sourceSha256 },
      model: {
        family: 'V-JEPA 2.1',
        architecture: 'vit_base_384',
        codeSha256: 'c'.repeat(64),
        checkpointSha256: 'd'.repeat(64),
        device: 'mps'
      },
      authority: { identity: 'none', positions: 'none', autoApply: false },
      labels: ['live-basketball', 'stopped-basketball'],
      windows: [
        {
          id: 'train',
          intervalId: 'live-1',
          startMs: 0,
          endMs: 1999,
          split: 'train',
          predictedLabel: 'live-basketball',
          confidence: 0.9,
          embeddingSha256: 'e'.repeat(64)
        },
        {
          id: 'held-out',
          intervalId: 'live-1',
          startMs: 2000,
          endMs: 3999,
          split: 'heldout',
          predictedLabel: 'live-basketball',
          confidence: 0.9,
          embeddingSha256: 'f'.repeat(64)
        }
      ]
    };

    expect(() => evaluateVjepaPlayStateCandidate(candidate, ledger)).toThrow(
      'V-JEPA training and held-out intervals overlap: live-1.'
    );
  });

  it('rejects a training window that crosses its reviewed interval boundary', () => {
    const sourceSha256 = 'a'.repeat(64);
    const ledger = {
      version: 1,
      profile: 'guard-player-play-state-v1',
      sourceSha256,
      intervals: [
        {
          id: 'live-1',
          startMs: 1000,
          endMs: 2999,
          state: 'live-defense',
          evidence: {
            method: 'source-review',
            reviewer: 'codex',
            note: 'Reviewed live possession.'
          }
        }
      ]
    };
    const candidate = {
      version: 1,
      profile: 'guard-vjepa-play-state-candidate-v1',
      sourceSha256,
      input: { binding: 'exact-source-bytes', sha256: sourceSha256 },
      model: {
        family: 'V-JEPA 2.1',
        architecture: 'vit_base_384',
        codeSha256: 'c'.repeat(64),
        checkpointSha256: 'd'.repeat(64),
        device: 'mps'
      },
      authority: { identity: 'none', positions: 'none', autoApply: false },
      labels: ['live-basketball', 'stopped-basketball'],
      windows: [
        {
          id: 'train',
          intervalId: 'live-1',
          startMs: 0,
          endMs: 1999,
          split: 'train',
          predictedLabel: 'live-basketball',
          confidence: 0.9,
          embeddingSha256: 'e'.repeat(64)
        }
      ]
    };

    expect(() => evaluateVjepaPlayStateCandidate(candidate, ledger)).toThrow(
      'V-JEPA window train crosses its reviewed play-state interval boundary.'
    );
  });

  it('recommends only assistive proposals after independent held-out intervals clear the quality floors', () => {
    const sourceSha256 = 'a'.repeat(64);
    const states = [
      ['live-train', 'live-defense'],
      ['stop-train', 'dead-ball'],
      ['live-test-1', 'live-defense'],
      ['live-test-2', 'transition-offense'],
      ['stop-test-1', 'dead-ball'],
      ['stop-test-2', 'substitution']
    ] as const;
    const ledger = {
      version: 1,
      profile: 'guard-player-play-state-v1',
      sourceSha256,
      intervals: states.map(([id, state], index) => ({
        id,
        startMs: index * 2000,
        endMs: index * 2000 + 1999,
        state,
        evidence: { method: 'source-review', reviewer: 'codex', note: `Reviewed ${state}.` }
      }))
    };
    const labelFor = (state: string) =>
      state.startsWith('live-') || state.startsWith('transition-')
        ? ('live-basketball' as const)
        : ('stopped-basketball' as const);
    const candidate = {
      version: 1,
      profile: 'guard-vjepa-play-state-candidate-v1',
      sourceSha256,
      input: { binding: 'exact-source-bytes', sha256: sourceSha256 },
      model: {
        family: 'V-JEPA 2.1',
        architecture: 'vit_base_384',
        codeSha256: 'c'.repeat(64),
        checkpointSha256: 'd'.repeat(64),
        device: 'mps'
      },
      authority: { identity: 'none', positions: 'none', autoApply: false },
      labels: ['live-basketball', 'stopped-basketball'],
      windows: states.map(([intervalId, state], index) => ({
        id: `window-${index}`,
        intervalId,
        startMs: index * 2000,
        endMs: index * 2000 + 1999,
        split: index < 2 ? ('train' as const) : ('heldout' as const),
        predictedLabel: labelFor(state),
        confidence: 0.95,
        embeddingSha256: String(index + 1).repeat(64)
      }))
    };

    expect(evaluateVjepaPlayStateCandidate(candidate, ledger)).toEqual({
      ok: true,
      metrics: { heldOutWindowCount: 4, macroF1: 1, liveRecall: 1, stoppedRecall: 1 },
      decision: {
        adoptAssistiveProposals: true,
        disposition: 'assistive-play-state-proposals',
        identityAuthority: 'none',
        positionAuthority: 'none',
        autoApply: false
      }
    });

    const failedCandidate = {
      ...candidate,
      windows: candidate.windows.map((window) => ({
        ...window,
        predictedLabel: 'live-basketball' as const
      }))
    };
    expect(evaluateVjepaPlayStateCandidate(failedCandidate, ledger).decision).toMatchObject({
      adoptAssistiveProposals: false,
      disposition: 'retain-manual-review',
      identityAuthority: 'none',
      positionAuthority: 'none',
      autoApply: false
    });
  });
});
