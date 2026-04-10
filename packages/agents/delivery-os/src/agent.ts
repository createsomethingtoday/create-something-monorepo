import { Agent, fileSearchTool, hostedMcpTool, run, setDefaultOpenAIKey } from '@openai/agents';

import {
  buildDeliveryDirectorInstructions,
  buildPlatformSpecialistInstructions,
  buildProductSpecialistInstructions,
  buildSiteSpecialistInstructions,
  DEFAULT_DELIVERY_OS_MODEL
} from './prompt.js';
import { createDeliveryOsTools } from './tools.js';
import type { DeliveryOsAgentOptions } from './types.js';

function buildSharedToolset(options: DeliveryOsAgentOptions) {
  const tools: any[] = [...createDeliveryOsTools(options.store)];

  if (options.vectorStoreIds?.length) {
    tools.push(
      fileSearchTool(options.vectorStoreIds, {
        name: 'delivery_artifact_search',
        maxNumResults: 6,
        includeSearchResults: true
      })
    );
  }

  for (const server of options.hostedMcpServers ?? []) {
    const baseOptions = {
      serverLabel: server.serverLabel,
      serverUrl: server.serverUrl,
      allowedTools: server.allowedTools,
      headers: server.headers
    };

    if (!server.requireApproval || server.requireApproval === 'never') {
      tools.push(hostedMcpTool(baseOptions));
      continue;
    }

    tools.push(
      hostedMcpTool({
        ...baseOptions,
        requireApproval:
          server.requireApproval === 'always'
            ? 'always'
            : (() => {
                const approvals = Object.entries(server.requireApproval);
                const neverToolNames = approvals
                  .filter(([, mode]) => mode === 'never')
                  .map(([toolName]) => toolName);
                const alwaysToolNames = approvals
                  .filter(([, mode]) => mode === 'always')
                  .map(([toolName]) => toolName);

                return {
                  ...(neverToolNames.length ? { never: { toolNames: neverToolNames } } : {}),
                  ...(alwaysToolNames.length ? { always: { toolNames: alwaysToolNames } } : {})
                };
              })()
      })
    );
  }

  return tools;
}

export function createDeliveryOsAgent(options: DeliveryOsAgentOptions) {
  const model = options.model ?? DEFAULT_DELIVERY_OS_MODEL;
  const sharedTools = buildSharedToolset(options);

  const siteSpecialist = new Agent({
    name: 'Site Delivery Specialist',
    model,
    instructions: buildSiteSpecialistInstructions(),
    handoffDescription: 'Use for landing pages, site launch, analytics, domains, forms, and ad destinations.',
    tools: sharedTools
  });

  const platformSpecialist = new Agent({
    name: 'Platform Delivery Specialist',
    model,
    instructions: buildPlatformSpecialistInstructions(),
    handoffDescription: 'Use for authenticated workflows, operator journeys, access, support, and platform launch readiness.',
    tools: sharedTools
  });

  const productSpecialist = new Agent({
    name: 'Product Delivery Specialist',
    model,
    instructions: buildProductSpecialistInstructions(),
    handoffDescription: 'Use for MCP products, tool scope, auth, approval policy, and integration runtime questions.',
    tools: sharedTools
  });

  return Agent.create({
    name: options.name ?? 'Delivery OS Director',
    model,
    instructions: options.instructions ?? buildDeliveryDirectorInstructions(),
    tools: sharedTools,
    handoffs: [siteSpecialist, platformSpecialist, productSpecialist]
  });
}

export async function runDeliveryOsAgent(
  options: DeliveryOsAgentOptions & {
    input: string;
    apiKey?: string;
    maxTurns?: number;
  }
) {
  if (options.apiKey) {
    setDefaultOpenAIKey(options.apiKey);
  }

  const agent = createDeliveryOsAgent(options);
  return run(agent, options.input, { maxTurns: options.maxTurns ?? 12 });
}
