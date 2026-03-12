import { appendFileSync } from 'node:fs';

const scenario = process.argv[2] ?? 'normal';
const logFile = process.env.FAKE_APP_SERVER_LOG ?? '';

let buffer = '';
let approvalSeen = false;
let toolSeen = false;
let nextTurn = 1;

function log(entry) {
  if (!logFile) return;
  appendFileSync(logFile, `${JSON.stringify(entry)}\n`);
}

function send(message, split = false) {
  const payload = `${JSON.stringify(message)}\n`;
  if (!split) {
    process.stdout.write(payload);
    return;
  }

  const midpoint = Math.max(1, Math.floor(payload.length / 2));
  process.stdout.write(payload.slice(0, midpoint));
  setTimeout(() => process.stdout.write(payload.slice(midpoint)), 5);
}

function respond(id, result) {
  send({ id, result });
}

function maybeCompleteTurn() {
  if (scenario !== 'approval-tool') return;
  if (!approvalSeen || !toolSeen) return;

  send({
    method: 'turn/completed',
    params: {
      turn: { id: 'turn-1', status: 'completed' },
    },
  });
}

async function handleMessage(message) {
  log({ direction: 'in', message });

  if (typeof message.id === 'number' && message.method === 'initialize') {
    respond(message.id, {});
    return;
  }

  if (typeof message.id === 'number' && message.method === 'thread/start') {
    respond(message.id, { thread: { id: 'thread-1' } });
    return;
  }

  if (typeof message.id === 'number' && message.method === 'turn/start') {
    const turnId = `turn-${nextTurn++}`;
    respond(message.id, { turn: { id: turnId } });

    if (scenario === 'normal') {
      send({
        method: 'item/started',
        params: {
          item: { id: 'agent-1', type: 'agentMessage', text: '' },
        },
      });
      send(
        {
          method: 'item/agentMessage/delta',
          params: {
            itemId: 'agent-1',
            delta: 'Working in progress',
          },
        },
        true
      );
      setTimeout(() => {
        send({
          method: 'thread/tokenUsage/updated',
          params: {
            input_tokens: 7,
            output_tokens: 5,
            total_tokens: 12,
            rate_limits: { remaining_requests: 99 },
          },
        });
        send({
          method: 'item/completed',
          params: {
            item: { id: 'agent-1', type: 'agentMessage', text: 'Working in progress' },
          },
        });
        send({
          method: 'turn/completed',
          params: {
            turn: { id: turnId, status: 'completed' },
          },
        });
      }, 15);
      return;
    }

    if (scenario === 'approval-tool') {
      send({
        id: 900,
        method: 'item/commandExecution/requestApproval',
        params: {
          itemId: 'cmd-1',
          reason: 'write file',
        },
      });
      send({
        id: 901,
        method: 'item/tool/call',
        params: {
          name: 'unsupported',
          arguments: {},
        },
      });
      return;
    }

    if (scenario === 'user-input') {
      send({
        id: 902,
        method: 'item/tool/requestUserInput',
        params: {
          prompt: 'Need human input',
        },
      });
    }
    return;
  }

  if (typeof message.id === 'number' && message.result) {
    if (message.id === 900) approvalSeen = true;
    if (message.id === 901) toolSeen = true;
    maybeCompleteTurn();
  }
}

process.stdin.on('data', (chunk) => {
  buffer += String(chunk);
  while (true) {
    const newline = buffer.indexOf('\n');
    if (newline === -1) break;
    const line = buffer.slice(0, newline).trim();
    buffer = buffer.slice(newline + 1);
    if (!line) continue;
    handleMessage(JSON.parse(line)).catch((error) => {
      process.stderr.write(`${error.stack ?? error.message}\n`);
      process.exitCode = 1;
    });
  }
});
