import type { AtlasSession, AtlasStoryCallout } from './types.js';

export type AtlasDatabaseHealthSignal = AtlasStoryCallout & { nodeLabel?: string };

export type AtlasDatabaseHealthCard = {
  observation?: string;
  proof: string;
  summary: string;
  title: string;
};

export type AtlasDatabaseHealthSummary = AtlasDatabaseHealthCard & {
  signals: AtlasDatabaseHealthSignal[];
};

export type AtlasDatabaseHealth = {
  organization: AtlasDatabaseHealthCard | null;
  performance: AtlasDatabaseHealthCard | null;
  sessionId: string;
  topology: AtlasDatabaseHealthSummary;
};

function observationText(session: AtlasSession, id: string, textPrefix: string): string | undefined {
  return session.observations.find(
    (observation) => observation.id === id || observation.text.includes(textPrefix)
  )?.text;
}

export function buildAtlasDatabaseHealth(
  session: AtlasSession,
  visibleNodeIds: Set<string> | null = null
): AtlasDatabaseHealth {
  const scopedNodes = visibleNodeIds
    ? session.canvas.nodes.filter((node) => visibleNodeIds.has(node.id))
    : session.canvas.nodes;
  const nodeLabelById = new Map(scopedNodes.map((node) => [node.id, node.label]));
  const diagnosticsStep =
    session.story?.steps.find((step) => step.id === 'topology-diagnostics') ??
    session.story?.steps.find((step) => step.title.toLowerCase().includes('health'));
  const performanceStep = session.story?.steps.find((step) => step.id === 'substrate-performance');
  const organizationStep = session.story?.steps.find((step) => step.id === 'organization-review');
  const signals = (session.story?.callouts ?? [])
    .filter((callout) => callout.id.startsWith('diagnostic_callout_'))
    .filter((callout) => !visibleNodeIds || !callout.nodeId || visibleNodeIds.has(callout.nodeId))
    .map((callout) => ({
      ...callout,
      nodeLabel: callout.nodeId ? nodeLabelById.get(callout.nodeId) : undefined
    }));

  return {
    organization: organizationStep
      ? {
          observation: observationText(
            session,
            'observation_organization_review',
            'Organization review:'
          ),
          proof: organizationStep.proof ?? 'No organization review proof is attached yet.',
          summary: organizationStep.summary,
          title: organizationStep.title
        }
      : null,
    performance: performanceStep
      ? {
          observation: observationText(
            session,
            'observation_performance_contract',
            'Substrate performance contract:'
          ),
          proof: performanceStep.proof ?? 'No performance proof is attached yet.',
          summary: performanceStep.summary,
          title: performanceStep.title
        }
      : null,
    sessionId: session.id,
    topology: {
      proof: diagnosticsStep?.proof ?? 'No topology diagnostics proof is attached yet.',
      signals,
      summary:
        diagnosticsStep?.summary ??
        'Run the Substrate topology diagnostics pass to surface gaps, overlap, and balance signals.',
      title: diagnosticsStep?.title ?? 'Business health'
    }
  };
}
