import { createDecisionService, type DecisionRepository, type DecisionRequest, type DecisionSelector } from './decisions.js';
import { getAgentDefinition } from './definitions.js';
import type { AgentDefinition } from './types.js';

export type GuideDecisionInput = {
  definition: AgentDefinition; query: string; conversationId: string; runId: string;
};
export type GuideDecisionTerminal = {
  status: 'completed' | 'failed' | 'unrecorded'; durationMs: number;
};
export interface GuideDecisionObserver {
  observe(input: GuideDecisionInput, terminal: Promise<GuideDecisionTerminal>): Promise<void>;
}

async function stateVersion(query: string, definition: AgentDefinition) {
  const bytes = new TextEncoder().encode(JSON.stringify({ query, definition, template: 'guide-evidence-shadow-v1' }));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

/** Measures host-owned evidence focus; never changes the executor or admitted tools. */
export function createGuideDecisionObserver(dependencies: {
  repository: DecisionRepository;
  selectorForQuery(query: string): DecisionSelector;
}): GuideDecisionObserver {
  return {
    async observe(input, terminal) {
      const requestFor = async (definition: AgentDefinition): Promise<DecisionRequest> => ({
        id: input.runId, scope: `public-guide:${definition.id}`,
        policyVersion: 'guide-evidence-shadow-v1', stateVersion: await stateVersion(input.query, definition),
        question: 'Which existing public evidence source best fits the supplied Guide request? Choose ordinary if uncertain, or no_tools for secrets/private data requests. This is shadow evaluation only.',
        candidates: [
          { id: 'ordinary', description: 'Keep ordinary source discovery across the existing public read-only MCP servers.' },
          ...definition.mcpServers.map(server => ({ id: server.id,
            description: `Focus on existing public ${server.id} evidence tools: ${server.allowedTools.join(', ')}.` })),
          { id: 'no_tools', description: 'A refusal or simple non-source answer is appropriate; no evidence tools are needed.' }
        ], fallbackId: 'ordinary', mode: 'fresh'
      });
      const request = await requestFor(input.definition);
      // Only this bounded prefix reaches the existing OpenAI recipient; no query text is persisted.
      const selector = dependencies.selectorForQuery(input.query.slice(0, 1500));
      const service = createDecisionService({ repository: dependencies.repository, selector });
      const decision = await service.decide(request, async () => {
        const current = getAgentDefinition(input.definition.id);
        if (!current) throw new Error('Guide definition unavailable');
        return requestFor(current);
      });
      const observed = await terminal;
      if (decision.selectedId === null || observed.status === 'unrecorded') return;
      await service.observe({ decisionId: input.runId, scope: request.scope, requestHash: decision.requestHash,
        // Successful generation is not independently verified task quality.
        status: 'unknown', evidenceRef: `agent-run:${input.runId}:${observed.status}`,
        durationMs: observed.durationMs, retries: 0 });
    }
  };
}
