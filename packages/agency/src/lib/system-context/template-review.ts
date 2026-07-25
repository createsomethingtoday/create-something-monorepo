import {
  projectOperatingSlice,
  type DatabaseLayerSystemContextLens,
  type DatabaseLayerSystemContextNode,
  type DatabaseLayerSystemContextProjection,
  type DatabaseLayerSystemContextSource,
  type DatabaseLayerTopologyAuthorityState,
  type DatabaseLayerTopologyChangeState,
  type DatabaseLayerTopologyHealthState,
  type DatabaseLayerTopologyProofState,
  type DatabaseLayerTopologyProvenanceKind,
  type DatabaseLayerTopologyVerificationState
} from '@create-something/database-layer';

type NodeInput = {
  id: string;
  label: string;
  kind: DatabaseLayerSystemContextNode['kind'];
  summary: string;
  owner: string;
  authority: DatabaseLayerTopologyAuthorityState;
  verification: DatabaseLayerTopologyVerificationState;
  health: DatabaseLayerTopologyHealthState;
  proof: DatabaseLayerTopologyProofState;
  change: DatabaseLayerTopologyChangeState;
  provenance: DatabaseLayerTopologyProvenanceKind;
  evidence?: string[];
  recovery: string;
};

function contextNode(input: NodeInput): DatabaseLayerSystemContextNode {
  return {
    id: input.id,
    label: input.label,
    kind: input.kind,
    summary: input.summary,
    semantics: {
      coverage: 'mapped',
      verification: input.verification,
      health: input.health,
      authority: input.authority,
      proof: input.proof,
      freshness: 'current',
      change: input.change
    },
    provenance: {
      kind: input.provenance,
      sourceLabel: input.provenance === 'observed' ? 'Template Review Field Report' : 'Public workflow definition',
      explanation:
        input.provenance === 'observed'
          ? 'This claim is attached to the dated public field report.'
          : 'This is a declared workflow boundary, not a live runtime claim.'
    },
    owner: input.owner,
    evidence: input.evidence ?? [],
    recovery: input.recovery,
    visibility: 'public'
  };
}

export const TEMPLATE_REVIEW_SYSTEM_CONTEXT: DatabaseLayerSystemContextSource = {
  version: 'system-context.operating-slice.v1',
  id: 'public-template-review-evidence-preparation',
  audience: 'public',
  reviewStatus: 'reviewed_public_example',
  workflow: {
    label: 'Template review evidence preparation',
    summary: 'Evidence moves through a bounded preparation lane. Official judgment remains with the human reviewer.',
    boundary: 'Public worked example. No production tools or private client records.'
  },
  source: {
    kind: 'observed',
    label: 'Template Review Field Report',
    href: '/field-reports/template-review',
    checkedAt: '2026-07-22T23:00:00-05:00',
    reviewBy: '2026-08-21T23:00:00-05:00',
    freshness: 'current'
  },
  comparison: {
    label: 'Before bounded evidence preparation',
    checkedAt: '2026-07-10T12:00:00-05:00'
  },
  nodes: [
    contextNode({ id: 'review-owner', label: 'Review queue owner', kind: 'actor', summary: 'Owns assignment, interpretation, and creator communication.', owner: 'Review operations', authority: 'wait', verification: 'declared', health: 'unknown', proof: 'attached', change: 'unchanged', provenance: 'declared', evidence: ['Owner role named'], recovery: 'Return unresolved ownership to the review operations lead.' }),
    contextNode({ id: 'asset-packet', label: 'Submitted asset packet', kind: 'data', summary: 'Submission context, validation output, policy flags, and reviewer notes.', owner: 'Review operations', authority: 'run', verification: 'verified', health: 'healthy', proof: 'attached', change: 'changed', provenance: 'observed', evidence: ['49 / 50 packet completion'], recovery: 'Keep the case in human review when packet preparation is incomplete.' }),
    contextNode({ id: 'validation-checks', label: 'Validation checks', kind: 'system', summary: 'Collect objective evidence and flag missing or contradictory context.', owner: 'Evidence preparation', authority: 'run', verification: 'verified', health: 'healthy', proof: 'attached', change: 'changed', provenance: 'observed', evidence: ['Dated collection result'], recovery: 'Stop the preparation lane and preserve the incomplete packet.' }),
    contextNode({ id: 'reviewer-brief', label: 'Reviewer brief', kind: 'ai', summary: 'Summarizes evidence and questions without making the official decision.', owner: 'Evidence preparation', authority: 'run', verification: 'declared', health: 'unknown', proof: 'attached', change: 'added', provenance: 'derived', evidence: ['Brief attached to packet'], recovery: 'Discard the brief and review source evidence directly.' }),
    contextNode({ id: 'reviewer-decision', label: 'Reviewer decision', kind: 'human', summary: 'A person decides approve, reject, request changes, or escalate ambiguity.', owner: 'Human reviewer', authority: 'wait', verification: 'verified', health: 'healthy', proof: 'attached', change: 'unchanged', provenance: 'observed', evidence: ['Judgment promotion remains blocked'], recovery: 'Escalate policy ambiguity and keep the case in human review.' }),
    contextNode({ id: 'ungrounded-approval-stop', label: 'No ungrounded approval', kind: 'constraint', summary: 'Stop before approval, rejection, security claims, or timeline promises without evidence.', owner: 'Review policy', authority: 'stop', verification: 'verified', health: 'healthy', proof: 'attached', change: 'unchanged', provenance: 'observed', evidence: ['Promotion blocked'], recovery: 'Return the decision to the named reviewer with the source packet.' }),
    contextNode({ id: 'evidence-record', label: 'Evidence record', kind: 'touchpoint', summary: 'Preserves source evidence, reviewer state, bounded claims, and remaining unknowns.', owner: 'CREATE SOMETHING', authority: 'run', verification: 'verified', health: 'healthy', proof: 'attached', change: 'changed', provenance: 'observed', evidence: ['Dated source list', 'Measurement boundaries'], recovery: 'Use source records rather than the summary when a claim is disputed.' }),
    contextNode({ id: 'recovery-path', label: 'Human review recovery', kind: 'touchpoint', summary: 'Returns incomplete, ambiguous, or unsupported work to a named human owner.', owner: 'Human reviewer', authority: 'wait', verification: 'declared', health: 'unknown', proof: 'not-required', change: 'added', provenance: 'declared', recovery: 'Keep the case in human review until evidence and authority are clear.' })
  ],
  relationships: [
    { id: 'owner-submission', source: 'review-owner', target: 'asset-packet', relation: 'owns', provenance: 'declared' },
    { id: 'submission-checks', source: 'asset-packet', target: 'validation-checks', relation: 'feeds', provenance: 'observed' },
    { id: 'checks-brief', source: 'validation-checks', target: 'reviewer-brief', relation: 'supports', provenance: 'derived' },
    { id: 'brief-decision', source: 'reviewer-brief', target: 'reviewer-decision', relation: 'informs', provenance: 'declared' },
    { id: 'checks-decision', source: 'validation-checks', target: 'reviewer-decision', relation: 'informs', provenance: 'observed' },
    { id: 'stop-decision', source: 'ungrounded-approval-stop', target: 'reviewer-decision', relation: 'governs', provenance: 'observed' },
    { id: 'decision-evidence', source: 'reviewer-decision', target: 'evidence-record', relation: 'records', provenance: 'declared' },
    { id: 'stop-recovery', source: 'ungrounded-approval-stop', target: 'recovery-path', relation: 'routes', provenance: 'declared' },
    { id: 'evidence-recovery', source: 'evidence-record', target: 'recovery-path', relation: 'supports', provenance: 'declared' }
  ],
  lenses: {
    dependencies: ['review-owner', 'asset-packet', 'validation-checks', 'reviewer-brief', 'reviewer-decision', 'evidence-record', 'recovery-path'],
    authority: ['validation-checks', 'reviewer-brief', 'reviewer-decision', 'ungrounded-approval-stop', 'recovery-path'],
    change: ['asset-packet', 'validation-checks', 'reviewer-brief', 'evidence-record', 'recovery-path'],
    proof: ['asset-packet', 'validation-checks', 'reviewer-decision', 'ungrounded-approval-stop', 'evidence-record', 'recovery-path']
  },
  receipt: {
    sourceLabel: 'Template Review Field Report',
    lastCheckedLabel: 'Checked Jul 22, 2026',
    changeLabel: 'Evidence preparation bounded; human judgment retained',
    recoveryLabel: 'Return unsupported work to human review'
  }
};

export function getTemplateReviewSystemContext(
  lens: DatabaseLayerSystemContextLens = 'authority',
  now = new Date().toISOString()
): DatabaseLayerSystemContextProjection {
  return projectOperatingSlice(TEMPLATE_REVIEW_SYSTEM_CONTEXT, {
    audience: 'public',
    lens,
    maxNodes: 8,
    now
  });
}
