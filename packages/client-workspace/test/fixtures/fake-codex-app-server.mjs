import readline from 'node:readline';

const input = readline.createInterface({ input: process.stdin });

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
