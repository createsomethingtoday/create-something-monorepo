import { describe, expect, it } from 'vitest';
import { getNextInteraction } from './guide.js';

describe('program guidance engine', () => {
  it('changes the help instruction from explicit coach context', () => {
    expect(getNextInteraction({ stage: 'help', helpSource: 'nail' }).instruction).toContain('Stop for touch');
    expect(getNextInteraction({ stage: 'help', helpSource: 'low-man' }).instruction).toContain('space the low man left');
  });
  it('stops on a pain signal without diagnosing', () => {
    const result = getNextInteraction({ stage: 'baseline', painSignal: true, observation: 'ankle pain' });
    expect(result.status).toBe('stop');
    expect(result.instruction).not.toContain('sprain');
  });
  it('keeps sourced evidence separate from inference and flags missing live context', () => {
    const result = getNextInteraction({ stage: 'advantage', artifacts: [{ id: 'a', kind: 'stat-line', title: 'College guard assist profile', sourceLabel: 'Official stats', sourceUrl: 'https://example.com/stats', level: 'college', observation: 'High assist-to-turnover ratio', capturedAt: '2026-07-11', verification: 'source-linked' }] });
    expect(result.evidence.sourcedArtifacts).toHaveLength(1);
    expect(result.evidence.inferences[0]).toContain('does not rank');
    expect(result.evidence.gaps[0]).toContain('coach observation');
  });
  it('does not request coach context again when a live observation was supplied', () => {
    const result = getNextInteraction({ stage: 'help', observation: 'Nail helper stepped early', artifacts: [{ id: 'a', kind: 'stat-line', title: 'Official college source', sourceLabel: 'NCAA', sourceUrl: 'https://www.ncaa.com/stats/basketball-men/d1', level: 'college', observation: 'Official source retained for review.', capturedAt: '2026-07-11', verification: 'source-linked' }] });
    expect(result.requestedContext).toContain('nail');
    expect(result.evidence.coachContext).toContain('Nail helper stepped early');
    expect(result.evidence.sourcedArtifacts).toHaveLength(1);
  });
});
