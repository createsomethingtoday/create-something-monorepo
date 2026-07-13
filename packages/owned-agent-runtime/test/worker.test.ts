import assert from 'node:assert/strict';
import test from 'node:test';

import { createOwnedAgentWorker, type AgentExecutor, type AgentStore } from '../src/index.js';

class MemoryStore implements AgentStore {
  conversations = new Map<string, { id: string; agentId: string; previousResponseId?: string }>();
  receipts: unknown[] = [];

  async getConversation(id: string) {
    return this.conversations.get(id) ?? null;
  }

  async saveConversation(input: { id: string; agentId: string; previousResponseId?: string }) {
    this.conversations.set(input.id, input);
  }

  async saveReceipt(receipt: unknown) {
    this.receipts.push(receipt);
  }
}

function parseSse(body: string): Array<{ event: string; data: Record<string, unknown> }> {
  return body
    .trim()
    .split('\n\n')
    .map((block) => {
      const lines = block.split('\n');
      return {
        event: lines[0].replace('event: ', ''),
        data: JSON.parse(lines[1].replace('data: ', '')) as Record<string, unknown>
      };
    });
}

test('streams the public Guide Agent and resumes its owned conversation', async () => {
  const store = new MemoryStore();
  const calls: Array<{ previousResponseId?: string; allowedTools: string[] }> = [];
  const executor: AgentExecutor = {
    async *run(input) {
      calls.push({
        previousResponseId: input.previousResponseId,
        allowedTools: input.definition.allowedTools
      });
      yield { type: 'text_delta', delta: 'Public ' };
      yield { type: 'text_delta', delta: 'guidance' };
      yield {
        type: 'completed',
        output: 'Public guidance',
        providerResponseId: calls.length === 1 ? 'resp-1' : 'resp-2',
        toolCalls: [{ server: 'playbook', tool: 'get_playbook', status: 'completed' }],
        connectedServers: ['playbook']
      };
    }
  };
  const worker = createOwnedAgentWorker({ store, executor, id: () => 'fixed-id' });

  const first = await worker.fetch(
    new Request('https://agent.example/v1/agents/create-something-guide-agent/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'What is CREATE SOMETHING?' })
    })
  );
  assert.equal(first.status, 200);
  assert.match(first.headers.get('content-type') ?? '', /text\/event-stream/);
  const firstEvents = parseSse(await first.text());
  assert.deepEqual(
    firstEvents.map((event) => event.event),
    ['run.started', 'message.delta', 'message.delta', 'message.completed']
  );
  assert.equal(firstEvents[0].data.conversation_id, 'fixed-id');
  assert.equal(firstEvents[3].data.output, 'Public guidance');
  assert.ok(calls[0].allowedTools.includes('playbook:get_playbook'));
  assert.equal(store.receipts.length, 1);

  await worker
    .fetch(
      new Request('https://agent.example/v1/agents/create-something-guide-agent/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: 'Continue.', conversation_id: 'fixed-id' })
      })
    )
    .then((response) => response.text());

  assert.equal(calls[1].previousResponseId, 'resp-1');
  assert.equal(store.conversations.get('fixed-id')?.previousResponseId, 'resp-2');
});

test('rejects unknown agents, invalid input, and cross-agent conversations before execution', async () => {
  const store = new MemoryStore();
  store.conversations.set('other-agent-thread', {
    id: 'other-agent-thread',
    agentId: 'private-agent'
  });
  let executions = 0;
  const executor: AgentExecutor = {
    async *run() {
      executions += 1;
      yield { type: 'completed', output: 'never', toolCalls: [], connectedServers: [] };
    }
  };
  const worker = createOwnedAgentWorker({ store, executor });

  const unknown = await worker.fetch(
    new Request('https://agent.example/v1/agents/not-real/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'hello' })
    })
  );
  assert.equal(unknown.status, 404);

  const invalid = await worker.fetch(
    new Request('https://agent.example/v1/agents/create-something-guide-agent/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: '' })
    })
  );
  assert.equal(invalid.status, 400);

  const mismatch = await worker.fetch(
    new Request('https://agent.example/v1/agents/create-something-guide-agent/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'hello', conversation_id: 'other-agent-thread' })
    })
  );
  assert.equal(mismatch.status, 409);
  assert.equal(executions, 0);
});

test('exposes health and the provider-neutral public agent contract', async () => {
  const worker = createOwnedAgentWorker({
    store: new MemoryStore(),
    executor: {
      async *run() {
        yield { type: 'completed', output: '', toolCalls: [], connectedServers: [] };
      }
    }
  });

  const health = await worker.fetch(new Request('https://agent.example/health'));
  assert.deepEqual(await health.json(), { ok: true, service: 'owned-agent-runtime' });

  const agents = await worker.fetch(new Request('https://agent.example/v1/agents'));
  const body = (await agents.json()) as { agents: Array<Record<string, unknown>> };
  assert.equal(body.agents[0].id, 'create-something-guide-agent');
  assert.equal(body.agents[0].provider, undefined);
  assert.equal(body.agents[0].access, 'public_read_only');
});
