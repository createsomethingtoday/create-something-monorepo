import { createHash } from 'node:crypto';

import {
  compileTranscriptSrt,
  compileTranscriptTimeline,
  type TranscriptEditorProject
} from '@create-something/atlas-composition';

export type PrepareManagedCodexProposalInput = {
  id: string;
  prompt: string;
  includeAcceptedTranscript: boolean;
};

export type ManagedCodexProposalPreparation = {
  schema: 'create-something/atlas-managed-codex-proposal@1';
  id: string;
  projectId: string;
  revisionId: string;
  prompt: string;
  status: 'consent-required' | 'ready-for-local-dispatch';
  dispatch: 'not-started';
  proposalPolicy: 'return-local-edit-proposal-only';
  context: {
    acceptedTimelineDurationUs: number;
    acceptedTranscriptSha256: string;
  };
  transfer: {
    includesAcceptedTranscript: boolean;
    transcriptDispatched: false;
    accountCredentialsRead: false;
  };
};

/**
 * Builds a local, receipt-bearing handoff for a future Codex App Server adapter.
 * This seam deliberately does not start a process, read credentials, or expose
 * private transcript text. Any later adapter must revalidate the revision/hash
 * and return its result through the ordinary local edit-proposal boundary.
 */
export function prepareManagedCodexProposal(
  project: TranscriptEditorProject,
  input: PrepareManagedCodexProposalInput
): ManagedCodexProposalPreparation {
  const id = input.id.trim();
  const prompt = input.prompt.trim();
  if (!id) throw new Error('Managed Codex proposal preparation requires an id.');
  if (!prompt) throw new Error('Managed Codex proposal preparation requires an edit instruction.');
  const timeline = compileTranscriptTimeline(project);
  const acceptedTranscriptSha256 = createHash('sha256')
    .update(compileTranscriptSrt(project))
    .digest('hex');
  const includesAcceptedTranscript = input.includeAcceptedTranscript === true;
  return {
    schema: 'create-something/atlas-managed-codex-proposal@1',
    id,
    projectId: project.id,
    revisionId: project.currentRevisionId,
    prompt,
    status: includesAcceptedTranscript ? 'ready-for-local-dispatch' : 'consent-required',
    dispatch: 'not-started',
    proposalPolicy: 'return-local-edit-proposal-only',
    context: {
      acceptedTimelineDurationUs: timeline.durationUs,
      acceptedTranscriptSha256
    },
    transfer: {
      includesAcceptedTranscript,
      transcriptDispatched: false,
      accountCredentialsRead: false
    }
  };
}
