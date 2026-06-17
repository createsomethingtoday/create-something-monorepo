import { applyProductionBindings, type AtlasProductionBindingProfile } from './production-bindings.js';
import { readSession, writeSession } from './store.js';
import type {
  AtlasCanvasNode,
  AtlasPrimitiveBinding,
  AtlasPrimitiveBindingKind,
  AtlasPrimitiveBindingCheck,
  AtlasSessionActor,
  AtlasSession,
  AtlasWritebackAction,
  AtlasWritebackActionStatus,
  AtlasWritebackProposal,
  AtlasWritebackProposalStatus,
  AtlasWritebackProposalSummary,
  AtlasWritebackRisk
} from './types.js';

export type AtlasWritebackProposalResult = {
  profile: AtlasProductionBindingProfile;
  proposal: AtlasWritebackProposal;
  summary: AtlasWritebackProposalSummary;
  session: AtlasSession;
};

export type AtlasWritebackActionReviewResult = {
  action: AtlasWritebackAction;
  proposal: AtlasWritebackProposal;
  summary: AtlasWritebackProposalSummary;
  session: AtlasSession;
};

export type AtlasWritebackHandoffOptions = {
  proposalId?: string;
};

const APPROVAL_KINDS = new Set<AtlasPrimitiveBindingKind>([
  'airtable_table',
  'cloudflare_d1',
  'cloudflare_r2',
  'cloudflare_worker',
  'webflow_cloud_app'
]);

const REVIEW_KINDS = new Set<AtlasPrimitiveBindingKind>([
  'config',
  'dify_agent',
  'mcp_server',
  'script',
  'webflow_code_component'
]);

function idPart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 42);
}

function riskForBindingKind(kind: AtlasPrimitiveBindingKind): AtlasWritebackRisk {
  if (APPROVAL_KINDS.has(kind)) return 'approval';
  if (REVIEW_KINDS.has(kind)) return 'review';
  return 'safe';
}

function highestRisk(bindings: AtlasPrimitiveBinding[]): AtlasWritebackRisk {
  if (bindings.some((binding) => riskForBindingKind(binding.kind) === 'approval')) {
    return 'approval';
  }
  if (bindings.some((binding) => riskForBindingKind(binding.kind) === 'review')) {
    return 'review';
  }
  return 'safe';
}

function riskRequirements(risk: AtlasWritebackRisk): string[] {
  if (risk === 'approval') {
    return [
      'Operator approval before any production mutation.',
      'Validation evidence from the owning package or platform.',
      'Rollback note for the affected primitive.'
    ];
  }
  if (risk === 'review') {
    return [
      'Operator review before applying.',
      'Package-local validation or agent smoke evidence.'
    ];
  }
  return ['Normal code review and package-local validation.'];
}

function checksForNode(node: AtlasCanvasNode): AtlasPrimitiveBindingCheck[] {
  return node.sync?.checks ?? [];
}

function driftCount(node: AtlasCanvasNode): number {
  return checksForNode(node).filter((check) => check.status !== 'synced').length;
}

function nodeIntent(node: AtlasCanvasNode): string {
  return node.notes || node.evidence || 'No node notes have been captured yet.';
}

function actionSummary(node: AtlasCanvasNode, bindingCount: number): string {
  const drift = driftCount(node);
  if (!bindingCount) {
    return 'No production primitive is bound yet. Bind this node before treating it as a write target.';
  }
  if (drift) {
    return `${drift} of ${bindingCount} production primitive bindings need attention before edits should ripple through.`;
  }
  const noun = `production primitive${bindingCount === 1 ? '' : 's'}`;
  const verb = bindingCount === 1 ? 'is' : 'are';
  const target = bindingCount === 1 ? 'a write-back target' : 'write-back targets';
  return `${bindingCount} ${noun} ${verb} synced and can be reviewed as ${target}.`;
}

function suggestedChange(node: AtlasCanvasNode, bindings: AtlasPrimitiveBinding[]): string {
  const sources = Array.from(new Set(bindings.map((binding) => binding.source)));
  const sourceList = sources.length ? sources.join(', ') : 'a production primitive binding';
  const sync = node.sync?.status ?? 'unbound';
  return [
    `Use Atlas node "${node.label}" as the change request source.`,
    `Current sync status: ${sync}.`,
    `Review ${sourceList} against this mapped intent: ${nodeIntent(node)}`
  ].join(' ');
}

function actionTitle(node: AtlasCanvasNode): string {
  return /^review\b/i.test(node.label) ? `Align ${node.label}` : `Review ${node.label}`;
}

function actionForNode(node: AtlasCanvasNode, index: number, proposalSeed: string): AtlasWritebackAction {
  const bindings = node.bindings ?? [];
  const risk = bindings.length ? highestRisk(bindings) : 'review';
  const bindingKinds = Array.from(new Set(bindings.map((binding) => binding.kind)));
  const sources = Array.from(new Set(bindings.map((binding) => binding.source)));
  return {
    id: `action_${proposalSeed}_${String(index + 1).padStart(2, '0')}_${idPart(node.id)}`,
    nodeId: node.id,
    risk,
    target: {
      nodeId: node.id,
      nodeLabel: node.label,
      bindingIds: bindings.map((binding) => binding.id),
      bindingKinds,
      sources
    },
    title: actionTitle(node),
    summary: actionSummary(node, bindings.length),
    suggestedChange: suggestedChange(node, bindings),
    requires: riskRequirements(risk),
    status: 'proposed'
  };
}

function summarizeActions(actions: AtlasWritebackAction[], nodes: AtlasCanvasNode[]): AtlasWritebackProposalSummary {
  return {
    total: actions.length,
    safe: actions.filter((action) => action.risk === 'safe').length,
    review: actions.filter((action) => action.risk === 'review').length,
    approval: actions.filter((action) => action.risk === 'approval').length,
    drift: nodes.filter((node) => driftCount(node) > 0 || node.sync?.status === 'unbound').length,
    proposed: actions.filter((action) => action.status === 'proposed').length,
    approved: actions.filter((action) => action.status === 'approved').length,
    applied: actions.filter((action) => action.status === 'applied').length,
    rejected: actions.filter((action) => action.status === 'rejected').length
  };
}

function proposalStatusForActions(actions: AtlasWritebackAction[]): AtlasWritebackProposalStatus {
  if (!actions.length) return 'proposed';
  if (actions.every((action) => action.status === 'applied')) return 'applied';
  if (actions.every((action) => action.status === 'rejected')) return 'rejected';
  if (actions.every((action) => action.status === 'approved' || action.status === 'rejected')) {
    return 'approved';
  }
  return 'proposed';
}

function reviewObservationText(action: AtlasWritebackAction, status: AtlasWritebackActionStatus): string {
  if (status === 'approved') return `Write-back action approved: ${action.title}.`;
  if (status === 'rejected') return `Write-back action rejected: ${action.title}.`;
  if (status === 'proposed') return `Write-back action returned to proposed: ${action.title}.`;
  return `Write-back action marked ${status}: ${action.title}.`;
}

function markdownList(items: string[]): string[] {
  return items.length ? items.map((item) => `  - ${item}`) : ['  - None recorded.'];
}

function formatAction(action: AtlasWritebackAction): string[] {
  return [
    `### ${action.title}`,
    '',
    `- Action ID: ${action.id}`,
    `- Node ID: ${action.nodeId}`,
    `- Risk: ${action.risk}`,
    `- Status: ${action.status}`,
    `- Summary: ${action.summary}`,
    `- Suggested change: ${action.suggestedChange}`,
    '- Target sources:',
    ...markdownList(action.target.sources),
    '- Required evidence:',
    ...markdownList(action.requires),
    action.reviewNote ? `- Review note: ${action.reviewNote}` : null,
    ''
  ].filter((line): line is string => line !== null);
}

function latestProposal(session: AtlasSession): AtlasWritebackProposal | undefined {
  return session.proposals?.[0];
}

function proposalForHandoff(
  session: AtlasSession,
  options: AtlasWritebackHandoffOptions = {}
): AtlasWritebackProposal {
  const proposal = options.proposalId
    ? session.proposals?.find((item) => item.id === options.proposalId)
    : latestProposal(session);
  if (!proposal) {
    throw new Error(options.proposalId ? `Unknown write-back proposal: ${options.proposalId}` : 'No write-back proposal exists for this session.');
  }
  return proposal;
}

export function exportWritebackProposalHandoff(
  session: AtlasSession,
  options: AtlasWritebackHandoffOptions = {}
): string {
  const proposal = proposalForHandoff(session, options);
  const approved = proposal.actions.filter((action) => action.status === 'approved');
  const pending = proposal.actions.filter((action) => action.status === 'proposed');
  const rejected = proposal.actions.filter((action) => action.status === 'rejected');
  const lines = [
    `# ${session.client} - Atlas Write-back Handoff`,
    '',
    `Workflow: ${session.workflow}`,
    session.owner ? `Owner: ${session.owner}` : null,
    `Session: ${session.id}`,
    `Proposal: ${proposal.id}`,
    `Proposal status: ${proposal.status}`,
    `Updated: ${session.updatedAt}`,
    '',
    '## Safety Boundary',
    '',
    'This handoff is a review artifact. It does not authorize production mutation by itself.',
    'Only actions in Approved Implementation Candidates should be implemented, and those still require the owning validation and promotion workflow.',
    '',
    '## Proposal Summary',
    '',
    `- Total: ${proposal.summary.total}`,
    `- Safe: ${proposal.summary.safe}`,
    `- Review: ${proposal.summary.review}`,
    `- Approval: ${proposal.summary.approval}`,
    `- Drift: ${proposal.summary.drift}`,
    `- Proposed: ${proposal.summary.proposed}`,
    `- Approved: ${proposal.summary.approved}`,
    `- Rejected: ${proposal.summary.rejected}`,
    '',
    '## Approved Implementation Candidates',
    '',
    ...(approved.length ? approved.flatMap(formatAction) : ['No actions have been approved yet.', '']),
    '## Pending Review',
    '',
    ...(pending.length ? pending.flatMap(formatAction) : ['No actions are pending review.', '']),
    '## Rejected',
    '',
    ...(rejected.length ? rejected.flatMap(formatAction) : ['No actions have been rejected.', ''])
  ].filter((line): line is string => line !== null);
  return `${lines.join('\n')}\n`;
}

export async function exportWritebackProposalHandoffForSession(
  sessionId: string,
  options: AtlasWritebackHandoffOptions & { cwd?: string } = {}
): Promise<string> {
  const session = await readSession(sessionId, options.cwd ?? process.cwd());
  return exportWritebackProposalHandoff(session, options);
}

export async function createWritebackProposal(
  sessionId: string,
  options: { profile?: AtlasProductionBindingProfile; cwd?: string } = {}
): Promise<AtlasWritebackProposalResult> {
  const cwd = options.cwd ?? process.cwd();
  const profile = options.profile ?? 'template-system';
  const session = await readSession(sessionId, cwd);
  const healed = await applyProductionBindings(session, { cwd, profile });
  const createdAt = new Date().toISOString();
  const proposalSeed = Date.now().toString(36);
  const actions = healed.session.canvas.nodes.map((node, index) =>
    actionForNode(node, index, proposalSeed)
  );
  const summary = summarizeActions(actions, healed.session.canvas.nodes);
  const proposal: AtlasWritebackProposal = {
    id: `proposal_${proposalSeed}`,
    profile,
    createdAt,
    status: 'proposed',
    summary,
    actions
  };
  const next: AtlasSession = {
    ...healed.session,
    observations: [
      {
        id: `observation_proposal_${proposalSeed}`,
        source: 'agent',
        text: `Write-back proposal generated with ${summary.total} actions: ${summary.safe} safe, ${summary.review} review, ${summary.approval} approval.`,
        createdAt
      },
      ...healed.session.observations
    ],
    proposals: [proposal, ...(healed.session.proposals ?? [])].slice(0, 10)
  };
  const written = await writeSession(next, cwd);
  return {
    profile,
    proposal,
    summary,
    session: written
  };
}

export async function reviewWritebackProposalAction(
  sessionId: string,
  input: {
    actionId: string;
    proposalId: string;
    status: Exclude<AtlasWritebackActionStatus, 'applied'>;
    actor?: AtlasSessionActor;
    note?: string;
  },
  cwd = process.cwd()
): Promise<AtlasWritebackActionReviewResult> {
  const session = await readSession(sessionId, cwd);
  const proposals = session.proposals ?? [];
  const proposalIndex = proposals.findIndex((proposal) => proposal.id === input.proposalId);
  if (proposalIndex === -1) {
    throw new Error(`Unknown write-back proposal: ${input.proposalId}`);
  }

  const proposal = proposals[proposalIndex];
  const actionIndex = proposal.actions.findIndex((action) => action.id === input.actionId);
  if (actionIndex === -1) {
    throw new Error(`Unknown write-back action: ${input.actionId}`);
  }

  const reviewedAt = new Date().toISOString();
  const current = proposal.actions[actionIndex];
  const action: AtlasWritebackAction = {
    ...current,
    status: input.status,
    reviewedAt,
    reviewedBy: input.actor ?? 'operator',
    reviewNote: input.note
  };
  const actions = proposal.actions.map((item, index) => (index === actionIndex ? action : item));
  const summary = summarizeActions(actions, session.canvas.nodes);
  const updatedProposal: AtlasWritebackProposal = {
    ...proposal,
    actions,
    status: proposalStatusForActions(actions),
    summary
  };
  const updatedProposals = proposals.map((item, index) =>
    index === proposalIndex ? updatedProposal : item
  );
  const next: AtlasSession = {
    ...session,
    observations: [
      {
        id: `observation_proposal_review_${Date.now().toString(36)}`,
        source: input.actor ?? 'operator',
        text: input.note
          ? `${reviewObservationText(action, input.status)} Note: ${input.note}`
          : reviewObservationText(action, input.status),
        createdAt: reviewedAt
      },
      ...session.observations
    ],
    proposals: updatedProposals
  };
  const written = await writeSession(next, cwd);
  return {
    action,
    proposal: updatedProposal,
    summary,
    session: written
  };
}
