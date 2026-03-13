#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function parseArgs(argv) {
  const args = {
    snapshot: 'tmp/loom-migration-snapshot.json',
    healthUrl: 'https://loom.mcp.createsomething.agency/health',
    mcpUrl: 'https://loom.mcp.createsomething.agency/mcp',
    token: process.env.LOOM_MCP_API_TOKEN ?? '',
    sampleTasks: 10,
    sampleSessions: 5,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--snapshot' && argv[i + 1]) {
      args.snapshot = argv[++i];
      continue;
    }
    if (arg === '--health-url' && argv[i + 1]) {
      args.healthUrl = argv[++i];
      continue;
    }
    if (arg === '--mcp-url' && argv[i + 1]) {
      args.mcpUrl = argv[++i];
      continue;
    }
    if (arg === '--token' && argv[i + 1]) {
      args.token = argv[++i];
      continue;
    }
    if (arg === '--sample-tasks' && argv[i + 1]) {
      args.sampleTasks = Number(argv[++i]);
      continue;
    }
    if (arg === '--sample-sessions' && argv[i + 1]) {
      args.sampleSessions = Number(argv[++i]);
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      console.log(`Usage:\n  node scripts/loom/validate-remote-cutover.mjs [--snapshot tmp/loom-migration-snapshot.json] [--health-url https://loom.mcp.createsomething.agency/health] [--mcp-url https://loom.mcp.createsomething.agency/mcp] [--token <LOOM_MCP_API_TOKEN>] [--sample-tasks 10] [--sample-sessions 5]`);
      process.exit(0);
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return args;
}

function headersWithAuth(token) {
  return token
    ? {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      }
    : {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      };
}

async function mcpCall({ mcpUrl, token, id, name, args }) {
  const payload = {
    jsonrpc: '2.0',
    id,
    method: 'tools/call',
    params: {
      name,
      arguments: args ?? {},
    },
  };

  const response = await fetch(mcpUrl, {
    method: 'POST',
    headers: headersWithAuth(token),
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`MCP call failed (${response.status}) for ${name}: ${text}`);
  }

  const json = JSON.parse(text);
  const result = json?.result;
  if (result?.isError === true) {
    const contentText = result?.content?.[0]?.text ?? JSON.stringify(result);
    throw new Error(`${name} returned isError for args ${JSON.stringify(args)}: ${contentText}`);
  }

  if (result?.content?.[0]?.text) {
    try {
      return JSON.parse(result.content[0].text);
    } catch {
      return result;
    }
  }

  return result;
}

async function main() {
  const args = parseArgs(process.argv);
  const snapshot = JSON.parse(readFileSync(resolve(args.snapshot), 'utf8'));
  const payload = snapshot.payload ?? {};

  const expectedCounts = {
    tasks: (payload.tasks ?? []).length,
    dependencies: (payload.dependencies ?? []).length,
    sessions: (payload.sessions ?? []).length,
    checkpoints: (payload.checkpoints ?? []).length,
    agent_executions: (payload.agentExecutions ?? []).length,
    agent_profiles: (payload.agentProfiles ?? []).length,
    runtime_settings: Object.keys(payload.runtimeSettings ?? {}).length + (payload.dispatchConfig ? 1 : 0) + (payload.modelsConfig ? 1 : 0),
  };

  const healthResponse = await fetch(args.healthUrl, { headers: args.token ? { Authorization: `Bearer ${args.token}` } : {} });
  const healthText = await healthResponse.text();
  if (!healthResponse.ok) {
    throw new Error(`Health check failed (${healthResponse.status}): ${healthText}`);
  }

  const health = JSON.parse(healthText);
  const remoteCounts = health.counts ?? {};

  const mismatches = [];
  for (const key of Object.keys(expectedCounts)) {
    const expected = expectedCounts[key];
    const remote = Number(remoteCounts[key] ?? 0);
    if (expected !== remote) {
      mismatches.push(`${key}: local=${expected} remote=${remote}`);
    }
  }

  const sampledTaskIds = (payload.tasks ?? []).slice(0, Math.max(0, args.sampleTasks)).map((task) => task.id);
  for (let i = 0; i < sampledTaskIds.length; i += 1) {
    const taskId = sampledTaskIds[i];
    const result = await mcpCall({
      mcpUrl: args.mcpUrl,
      token: args.token,
      id: `task-${i + 1}`,
      name: 'loom_get',
      args: { task_id: taskId },
    });

    if (result?.id !== taskId) {
      mismatches.push(`task-id-parity: expected ${taskId}, received ${result?.id ?? 'null'}`);
    }
  }

  const sampledSessionIds = (payload.sessions ?? []).slice(0, Math.max(0, args.sampleSessions)).map((session) => session.id);
  for (let i = 0; i < sampledSessionIds.length; i += 1) {
    const sessionId = sampledSessionIds[i];
    const result = await mcpCall({
      mcpUrl: args.mcpUrl,
      token: args.token,
      id: `session-${i + 1}`,
      name: 'loom_get_resume_brief',
      args: { session_id: sessionId },
    });

    if (result?.session_id !== sessionId) {
      mismatches.push(`session-id-parity: expected ${sessionId}, received ${result?.session_id ?? 'null'}`);
    }
  }

  const agentsResult = await mcpCall({
    mcpUrl: args.mcpUrl,
    token: args.token,
    id: 'agents-1',
    name: 'loom_agents',
    args: {},
  });
  const remoteAgentIds = new Set((agentsResult?.items ?? []).map((item) => item.id));
  for (const agentProfile of (payload.agentProfiles ?? []).slice(0, 10)) {
    if (!remoteAgentIds.has(agentProfile.id)) {
      mismatches.push(`agent-profile-parity: expected ${agentProfile.id} in loom_agents output`);
    }
  }

  const formulasResult = await mcpCall({
    mcpUrl: args.mcpUrl,
    token: args.token,
    id: 'formulas-1',
    name: 'loom_formulas',
    args: {},
  });
  const formulaNames = new Set((formulasResult?.items ?? []).map((item) => item.name));
  for (const requiredFormula of ['basic-task', 'feature', 'bug-fix', 'refactor', 'cs-feature', 'cs-worker', 'fleet-deploy', 'mcp-gate']) {
    if (!formulaNames.has(requiredFormula)) {
      mismatches.push(`formula-parity: missing ${requiredFormula}`);
    }
  }

  if (payload.runtimeSettings?.notion?.databaseId) {
    const notionStatus = await mcpCall({
      mcpUrl: args.mcpUrl,
      token: args.token,
      id: 'notion-1',
      name: 'loom_notion_status',
      args: {},
    });
    if (notionStatus?.database_id !== payload.runtimeSettings.notion.databaseId) {
      mismatches.push(
        `notion-database-parity: expected ${payload.runtimeSettings.notion.databaseId}, received ${notionStatus?.database_id ?? 'null'}`,
      );
    }
  }

  console.log('Expected counts:', expectedCounts);
  console.log('Remote counts:', {
    tasks: Number(remoteCounts.tasks ?? 0),
    dependencies: Number(remoteCounts.dependencies ?? 0),
    sessions: Number(remoteCounts.sessions ?? 0),
    checkpoints: Number(remoteCounts.checkpoints ?? 0),
    agent_executions: Number(remoteCounts.agent_executions ?? 0),
    agent_profiles: Number(remoteCounts.agent_profiles ?? 0),
    runtime_settings: Number(remoteCounts.runtime_settings ?? 0),
  });
  console.log(`Sampled tasks checked: ${sampledTaskIds.length}`);
  console.log(`Sampled sessions checked: ${sampledSessionIds.length}`);

  if (mismatches.length > 0) {
    console.error('Cutover validation failed:');
    for (const mismatch of mismatches) {
      console.error(`- ${mismatch}`);
    }
    process.exit(1);
  }

  console.log('Cutover validation passed.');
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
