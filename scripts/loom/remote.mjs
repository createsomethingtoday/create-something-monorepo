#!/usr/bin/env node

function usage() {
  console.log(`Usage:
  node scripts/loom/remote.mjs <command> [options]

Commands:
  ready [--json]
  list [--status <state>] [--label <label>] [--repo <repo>] [--json]
  get --task-id <id> [--json]
  create --title <title> [--description <text>] [--priority <critical|high|normal|low>] [--label <label> ...] [--json]
  claim --task-id <id> --agent <agent> [--json]
  release --task-id <id> [--json]
  complete --task-id <id> [--evidence <text>] [--json]
  summary [--label <label>] [--json]

Environment:
  LOOM_MCP_API_TOKEN   Required bearer token for remote Loom
  LOOM_REMOTE_ENDPOINT Optional MCP URL override
                       default: https://loom.mcp.createsomething.agency/mcp
`);
}

function parseArgs(argv) {
  const command = argv[2];
  const options = {
    labels: [],
    json: false,
  };

  if (!command || command === '--help' || command === '-h') {
    options.help = true;
    return { command: null, options };
  }

  for (let index = 3; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--json') {
      options.json = true;
      continue;
    }
    if (arg === '--status' && argv[index + 1]) {
      options.status = argv[++index];
      continue;
    }
    if (arg === '--label' && argv[index + 1]) {
      options.labels.push(argv[++index]);
      continue;
    }
    if (arg === '--repo' && argv[index + 1]) {
      options.repo = argv[++index];
      continue;
    }
    if (arg === '--task-id' && argv[index + 1]) {
      options.taskId = argv[++index];
      continue;
    }
    if (arg === '--agent' && argv[index + 1]) {
      options.agent = argv[++index];
      continue;
    }
    if (arg === '--title' && argv[index + 1]) {
      options.title = argv[++index];
      continue;
    }
    if (arg === '--description' && argv[index + 1]) {
      options.description = argv[++index];
      continue;
    }
    if (arg === '--priority' && argv[index + 1]) {
      options.priority = argv[++index];
      continue;
    }
    if (arg === '--evidence' && argv[index + 1]) {
      options.evidence = argv[++index];
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return { command, options };
}

function required(name, value) {
  if (!value) {
    throw new Error(`Missing required option: ${name}`);
  }
  return value;
}

function buildToolCall(command, options) {
  switch (command) {
    case 'ready':
      return { name: 'loom_ready', arguments: {} };
    case 'list':
      return {
        name: 'loom_list',
        arguments: {
          ...(options.status ? { status: options.status } : {}),
          ...(options.labels[0] ? { label: options.labels[0] } : {}),
          ...(options.repo ? { repo: options.repo } : {}),
        },
      };
    case 'get':
      return {
        name: 'loom_get',
        arguments: { task_id: required('--task-id', options.taskId) },
      };
    case 'create':
      return {
        name: 'loom_create',
        arguments: {
          title: required('--title', options.title),
          ...(options.description ? { description: options.description } : {}),
          ...(options.priority ? { priority: options.priority } : {}),
          ...(options.labels.length > 0 ? { labels: options.labels } : {}),
        },
      };
    case 'claim':
      return {
        name: 'loom_claim',
        arguments: {
          task_id: required('--task-id', options.taskId),
          agent: required('--agent', options.agent),
        },
      };
    case 'release':
      return {
        name: 'loom_release',
        arguments: { task_id: required('--task-id', options.taskId) },
      };
    case 'complete':
      return {
        name: 'loom_complete',
        arguments: {
          task_id: required('--task-id', options.taskId),
          ...(options.evidence ? { evidence: options.evidence } : {}),
        },
      };
    case 'summary':
      return {
        name: 'loom_summary',
        arguments: {
          ...(options.labels[0] ? { label: options.labels[0] } : {}),
        },
      };
    default:
      throw new Error(`Unknown command: ${command}`);
  }
}

function extractPayload(response) {
  if (!response || typeof response !== 'object') {
    throw new Error('Remote Loom returned an invalid response.');
  }
  if (response.error) {
    throw new Error(`Remote Loom error ${response.error.code}: ${response.error.message}`);
  }
  const result = response.result;
  if (!result || typeof result !== 'object') {
    throw new Error('Remote Loom result payload missing.');
  }
  if (result.isError) {
    const message = Array.isArray(result.content)
      ? result.content.find((entry) => typeof entry?.text === 'string')?.text
      : undefined;
    throw new Error(message || 'Remote Loom tool returned an error result.');
  }
  if (result.structuredContent && typeof result.structuredContent === 'object') {
    return result.structuredContent;
  }
  const text = Array.isArray(result.content)
    ? result.content.find((entry) => typeof entry?.text === 'string')?.text
    : undefined;
  if (!text) {
    return {};
  }
  return JSON.parse(text);
}

async function callRemoteLoom(toolCall) {
  const endpoint = process.env.LOOM_REMOTE_ENDPOINT || 'https://loom.mcp.createsomething.agency/mcp';
  const token = process.env.LOOM_MCP_API_TOKEN || '';
  if (!token) {
    throw new Error('LOOM_MCP_API_TOKEN is required.');
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: `${toolCall.name}-${Date.now()}`,
      method: 'tools/call',
      params: toolCall,
    }),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Remote Loom request failed with status ${response.status}: ${text}`);
  }
  return extractPayload(JSON.parse(text));
}

async function main() {
  const { command, options } = parseArgs(process.argv);
  if (!command || options.help) {
    usage();
    process.exit(options.help ? 0 : 1);
  }

  const payload = await callRemoteLoom(buildToolCall(command, options));
  console.log(JSON.stringify(payload, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
