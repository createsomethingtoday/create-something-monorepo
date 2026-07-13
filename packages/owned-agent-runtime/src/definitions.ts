import guideAgent from '../../../config/owned-agents/create-something-guide-agent.json';

import type { AgentDefinition } from './types.js';

function normalizeDefinition(raw: typeof guideAgent): AgentDefinition {
  const mcpServers = raw.mcp_servers.map((server) => ({
    id: server.id,
    url: server.url,
    allowedTools: server.allowed_tools
  }));
  const toolNames = mcpServers.flatMap((server) => server.allowedTools);
  const duplicate = toolNames.find((tool, index) => toolNames.indexOf(tool) !== index);
  if (duplicate) {
    throw new Error(`Agent ${raw.id} exposes duplicate MCP tool name: ${duplicate}`);
  }

  return {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    access: raw.access as AgentDefinition['access'],
    model: raw.model,
    maxTurns: raw.max_turns,
    instructions: raw.instructions,
    mcpServers,
    allowedTools: mcpServers.flatMap((server) =>
      server.allowedTools.map((tool) => `${server.id}:${tool}`)
    )
  };
}

const definitions = [normalizeDefinition(guideAgent)];

export function listAgentDefinitions(): AgentDefinition[] {
  return definitions;
}

export function getAgentDefinition(id: string): AgentDefinition | undefined {
  return definitions.find((definition) => definition.id === id);
}
