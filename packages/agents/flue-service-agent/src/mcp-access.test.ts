import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import fixture from '../fixtures/mcp-access-runtime-routing.json';
import {
  MCP_ACCESS_REVIEW_RUNTIME,
  createMcpAccessPrompt,
  createMcpAccessReport,
  parseMcpAccessPayload,
  validateMcpAccessReport,
} from './mcp-access.js';

function repoFile(path: string): string {
  return readFileSync(resolve(process.cwd(), '../../..', path), 'utf8');
}

function registryJson(): unknown {
  return JSON.parse(repoFile('config/mcp-hub/registry.json'));
}

describe('MCP access adapter', () => {
  it('returns ready for brokered hub access declared in the contract bundle', () => {
    const input = parseMcpAccessPayload({
      ...fixture,
      contract: {
        agentContractPath: 'templates/agent_contract.yaml',
        agentContractText: repoFile('templates/agent_contract.yaml'),
      },
      hubRegistry: {
        registryPath: 'config/mcp-hub/registry.json',
        registryJson: registryJson(),
      },
    });

    const report = validateMcpAccessReport(createMcpAccessReport(input));

    expect(report.readiness).toBe('ready');
    expect(report.score).toBe(1);
    expect(report.allowedServers).toEqual([
      'create-something',
      'playbook',
      'three-tier-framework',
    ]);
    expect(report.evidence.endpointPattern).toBe(MCP_ACCESS_REVIEW_RUNTIME.endpointPattern);
    expect(report.evidence.accessPolicy).toEqual({
      discoveryMode: 'brokered',
      hubRuntime: 'create-something-hub',
      proxyToolPattern: '<server>__<tool>',
      directServerAccessAllowed: false,
    });
  });

  it('blocks missing brokered discovery mode', () => {
    const contractText = repoFile('templates/agent_contract.yaml').replace(
      'discovery_mode: "brokered"',
      'discovery_mode: "direct_allowlist"',
    );
    const input = parseMcpAccessPayload({
      ...fixture,
      contract: {
        agentContractPath: 'templates/agent_contract.yaml',
        agentContractText: contractText,
      },
      hubRegistry: {
        registryPath: 'config/mcp-hub/registry.json',
        registryJson: registryJson(),
      },
    });

    const report = createMcpAccessReport(input);

    expect(report.readiness).toBe('blocked');
    expect(report.missingEvidence).toContain('runtime_integrations.mcp_access.discovery_mode');
  });

  it('blocks required servers that are missing from the contract allowlist', () => {
    const input = parseMcpAccessPayload({
      ...fixture,
      requiredServers: ['create-something', 'missing-server'],
      contract: {
        agentContractPath: 'templates/agent_contract.yaml',
        agentContractText: repoFile('templates/agent_contract.yaml'),
      },
      hubRegistry: {
        registryPath: 'config/mcp-hub/registry.json',
        registryJson: registryJson(),
      },
    });

    const report = createMcpAccessReport(input);

    expect(report.readiness).toBe('blocked');
    expect(report.checks).toContainEqual({
      id: 'required-servers-allowlisted',
      result: 'block',
      notes: 'Required servers missing from contract allowlist: missing-server.',
    });
  });

  it('creates a prompt without raw registry contents or credential values', () => {
    const input = parseMcpAccessPayload({
      ...fixture,
      contract: {
        agentContractPath: 'templates/agent_contract.yaml',
        agentContractText: repoFile('templates/agent_contract.yaml'),
      },
      hubRegistry: {
        registryPath: 'config/mcp-hub/registry.json',
        registryJson: registryJson(),
      },
    });

    const prompt = createMcpAccessPrompt(input);

    expect(prompt).toContain('Baseline MCP access report');
    expect(prompt).toContain('/agents/mcp-access-review/:id');
    expect(prompt).toContain('hub_search_proxy_tools');
    expect(prompt).not.toContain('bearer_token_env_var');
    expect(prompt).not.toContain('sk-test');
    expect(prompt).not.toContain('gateway-secret');
  });
});
