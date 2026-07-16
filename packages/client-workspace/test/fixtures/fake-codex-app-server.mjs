import readline from 'node:readline';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const input = readline.createInterface({ input: process.stdin });
const expectsEphemeralAuth = process.env.EXPECT_EPHEMERAL_CODEX_AUTH === '1';
let cachedEphemeralAuth = !expectsEphemeralAuth;

if (expectsEphemeralAuth) {
  try {
    cachedEphemeralAuth =
      !process.env.OPENAI_API_KEY &&
      readFileSync(join(process.env.CODEX_HOME, 'auth.json'), 'utf8').length > 0;
  } catch {
    cachedEphemeralAuth = false;
  }
}

function send(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

input.on('line', (line) => {
  const message = JSON.parse(line);
  if (message.method === 'initialize') {
    send({ id: message.id, result: { userAgent: 'fake-codex' } });
    return;
  }
  if (message.method === 'thread/start') {
    if (!cachedEphemeralAuth) {
      send({ id: message.id, error: { code: 'missing_ephemeral_auth' } });
      return;
    }
    send({ id: message.id, result: { thread: { id: 'thread-from-process' } } });
    return;
  }
  if (message.method === 'turn/start') {
    send({ id: message.id, result: { turn: { id: 'turn-from-process' } } });
    send({
      method: 'item/agentMessage/delta',
      params: { threadId: 'thread-from-process', turnId: 'turn-from-process', delta: 'Streaming.' }
    });
    send({
      method: 'turn/completed',
      params: {
        threadId: 'thread-from-process',
        turn: { id: 'turn-from-process', status: 'completed', error: null }
      }
    });
  }
});
