import {
  computePublicAtlasReadiness,
  createPublicAtlasGraphArtifact,
  summarizePublicAtlasCanvas,
  type PublicAtlasCanvas,
  type PublicAtlasGraphArtifact,
  type PublicAtlasNodeKind,
  type PublicAtlasReadiness
} from './headless.js';

export type PublicAtlasDevelopmentHandoffLane = 'claim-worktree' | 'research/no-edit';

export type PublicAtlasDevelopmentHandoff = {
  title: string;
  tier: 'mixed';
  lane: PublicAtlasDevelopmentHandoffLane;
  goal: string;
  packet: string;
  linear_create_command: string;
};

export type PublicAtlasDevelopmentHandoffInput = {
  sessionId: string;
  canvas: PublicAtlasCanvas;
  source?: string | null;
  summary?: string | null;
  mapLabel?: string | null;
};

const ATLAS_KIND_LABELS: Record<PublicAtlasNodeKind, string> = {
  actor: 'Actor',
  human: 'Human task',
  ai: 'AI task',
  system: 'System operation',
  data: 'Data artifact',
  constraint: 'Constraint',
  touchpoint: 'Touchpoint'
};

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\"'\"'")}'`;
}

function labelsByKind(
  artifact: PublicAtlasGraphArtifact,
  kinds: PublicAtlasNodeKind[],
  fallback: string
): string {
  const labels = artifact.nodes
    .filter((node) => kinds.includes(node.kind))
    .map((node) => {
      const status = node.status === 'unknown' ? '' : ` (${node.status})`;
      return `${ATLAS_KIND_LABELS[node.kind]}: ${node.label}${status}`;
    });
  return labels.length ? labels.join('; ') : fallback;
}

function firstAtlasWorkflowLabel(artifact: PublicAtlasGraphArtifact): string {
  return (
    artifact.nodes.find((node) => node.kind === 'data')?.label ??
    artifact.nodes.find((node) => node.kind === 'actor')?.label ??
    'Captured Atlas workflow'
  );
}

function titleizeAtlasStarterId(canvasId: string): string | null {
  const match = canvasId.match(/^public_atlas_([a-z0-9-]+)_/);
  if (!match?.[1]) return null;
  const words = match[1].split('-');
  return words
    .map((word, index) => (index === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(' ');
}

function handoffLaneForReadiness(
  readiness: PublicAtlasReadiness
): PublicAtlasDevelopmentHandoffLane {
  return readiness.slug === 'needs-shape' ? 'research/no-edit' : 'claim-worktree';
}

export function createPublicAtlasDevelopmentHandoff(
  input: PublicAtlasDevelopmentHandoffInput
): PublicAtlasDevelopmentHandoff {
  const readiness = computePublicAtlasReadiness(input.canvas);
  const artifact = createPublicAtlasGraphArtifact(input.canvas, readiness);
  const workflowLabel = firstAtlasWorkflowLabel(artifact);
  const mapLabel =
    input.mapLabel?.trim() || titleizeAtlasStarterId(input.canvas.id) || workflowLabel;
  const lane = handoffLaneForReadiness(readiness);
  const title = `Implement Atlas handoff: ${mapLabel}`;
  const goal =
    readiness.slug === 'needs-shape'
      ? `Clarify ${mapLabel} until the owner, durable record, approval boundary, and first stop condition are explicit.`
      : `Turn ${mapLabel} into the next reviewed development slice with explicit state, execution, and judgment boundaries.`;
  const database = labelsByKind(
    artifact,
    ['data', 'touchpoint'],
    'No durable data artifact or inspection touchpoint mapped yet.'
  );
  const automation = labelsByKind(
    artifact,
    ['system', 'ai'],
    'No run path or bounded AI task mapped yet.'
  );
  const judgment = labelsByKind(
    artifact,
    ['actor', 'human', 'constraint'],
    'No owner, approval, or stop condition mapped yet.'
  );
  const handoffs = artifact.edges.length
    ? artifact.edges
        .map((edge) => `${edge.source} -> ${edge.target} (${edge.relationship})`)
        .join('; ')
    : 'No handoffs mapped yet.';
  const summary = input.summary ?? summarizePublicAtlasCanvas(input.canvas, readiness);
  const packet = [
    `Atlas session: ${input.sessionId}`,
    `Atlas map: ${mapLabel}`,
    `Source: ${input.source ?? 'agency-public-atlas'}`,
    `Readiness: ${readiness.level} (${readiness.score}/100)`,
    `Lane: ${lane}`,
    `Tier: mixed`,
    `Goal: ${goal}`,
    '',
    'Database:',
    `- ${database}`,
    '',
    'Automation:',
    `- ${automation}`,
    '',
    'Judgment:',
    `- ${judgment}`,
    '',
    'Acceptance criteria:',
    '- Development scope names the durable record, run path, approval point, stop condition, and proof surface.',
    '- Implementation preserves the public Atlas boundary: no production writes, credential capture, or third-party mutation without an owning promotion workflow.',
    '- Operator evidence can be recorded in Linear or a PR body before promotion.',
    '',
    'Verification:',
    '- Add or update the nearest route/unit test for the selected slice.',
    '- Run the package-local test/check command that covers the touched surface.',
    '- Smoke the public or admin route if the change is promoted.',
    '',
    'Stop conditions:',
    '- Pause if the map requires credentials, PHI/PII export, production writes, or unclear approval authority.',
    '- Pause if the owning data source or runtime binding is unavailable.',
    '',
    `Handoffs: ${handoffs}`,
    '',
    'Canvas summary:',
    summary
  ].join('\n');

  return {
    title,
    tier: 'mixed',
    lane,
    goal,
    packet,
    linear_create_command: `pnpm linear:create -- --title ${shellQuote(title)} --description '<paste handoff packet>' --label code-quality`
  };
}
