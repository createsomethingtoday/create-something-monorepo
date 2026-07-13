import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createOwnedAgentWorker,
  type AgentConversation,
  type AgentExecutor,
  type AgentRunReceipt,
  type AgentStore
} from '../src/index.js';

class MemoryStore implements AgentStore {
  conversations = new Map<string, { id: string; agentId: string; previousResponseId?: string }>();
  receipts: AgentRunReceipt[] = [];
  activeRuns = new Map<string, string>();

  async claimConversation(input: { id: string; agentId: string; runId: string }) {
    const existing = this.conversations.get(input.id);
    if (existing?.agentId !== undefined && existing.agentId !== input.agentId) {
      return { status: 'agent_mismatch' as const };
    }
    if (this.activeRuns.has(input.id)) return { status: 'busy' as const };
    const conversation = existing ?? { id: input.id, agentId: input.agentId };
    this.conversations.set(input.id, conversation);
    this.activeRuns.set(input.id, input.runId);
    return { status: 'claimed' as const, conversation };
  }

  async completeRun(input: {
    conversation: AgentConversation;
    runId: string;
    receipt: AgentRunReceipt;
  }) {
    assert.equal(this.activeRuns.get(input.conversation.id), input.runId);
    this.conversations.set(input.conversation.id, input.conversation);
    this.receipts.push(input.receipt);
    this.activeRuns.delete(input.conversation.id);
  }

  async failRun(input: { conversationId: string; runId: string; receipt: AgentRunReceipt }) {
    assert.equal(this.activeRuns.get(input.conversationId), input.runId);
    this.receipts.push(input.receipt);
    this.activeRuns.delete(input.conversationId);
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

test('rejects a concurrent continuation before a second execution can start', async () => {
  const store = new MemoryStore();
  let releaseFirst: (() => void) | undefined;
  const firstCanComplete = new Promise<void>((resolve) => {
    releaseFirst = resolve;
  });
  let executions = 0;
  const worker = createOwnedAgentWorker({
    store,
    executor: {
      async *run() {
        executions += 1;
        await firstCanComplete;
        yield {
          type: 'completed',
          output: 'done',
          providerResponseId: 'resp-1',
          toolCalls: [],
          connectedServers: []
        };
      }
    },
    id: () => `run-${executions + 1}`
  });
  const message = () =>
    new Request('https://agent.example/v1/agents/create-something-guide-agent/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'continue', conversation_id: 'shared-conversation' })
    });

  const first = await worker.fetch(message());
  const second = await worker.fetch(message());
  releaseFirst?.();
  assert.equal(second.status, 409);
  assert.deepEqual(await second.json(), { error: 'conversation_busy' });
  assert.equal(executions, 1);
  const firstEvents = parseSse(await first.text());
  assert.equal(firstEvents.at(-1)?.event, 'message.completed');
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

test('enforces admission before conversation state or paid execution', async () => {
  const store = new MemoryStore();
  let executions = 0;
  const worker = createOwnedAgentWorker({
    store,
    admission: {
      async check() {
        return 'rate_limited';
      }
    },
    executor: {
      async *run() {
        executions += 1;
        yield { type: 'completed', output: 'never', toolCalls: [], connectedServers: [] };
      }
    }
  });

  const limited = await worker.fetch(
    new Request('https://agent.example/v1/agents/create-something-guide-agent/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'hello' })
    })
  );
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get('retry-after'), '60');
  assert.deepEqual(await limited.json(), { error: 'rate_limited' });
  assert.equal(store.conversations.size, 0);
  assert.equal(executions, 0);

  const unavailable = createOwnedAgentWorker({
    store,
    admission: {
      async check() {
        throw new Error('rate limit backend unavailable');
      }
    },
    executor: workerExecutorThatMustNotRun()
  });
  const failedClosed = await unavailable.fetch(
    new Request('https://agent.example/v1/agents/create-something-guide-agent/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'hello' })
    })
  );
  assert.equal(failedClosed.status, 503);
  assert.deepEqual(await failedClosed.json(), { error: 'admission_unavailable' });
});

function workerExecutorThatMustNotRun(): AgentExecutor {
  return {
    async *run() {
      assert.fail('executor must not run when admission is unavailable');
    }
  };
}

test('normalizes upstream failures before emitting or storing a receipt', async () => {
  const store = new MemoryStore();
  const worker = createOwnedAgentWorker({
    store,
    executor: {
      async *run() {
        throw new Error('OPENAI_API_KEY=private-value failed at https://private.example');
      }
    },
    id: () => 'fixed-id'
  });

  const response = await worker.fetch(
    new Request('https://agent.example/v1/agents/create-something-guide-agent/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'hello' })
    })
  );
  const events = parseSse(await response.text());
  const failure = events.find((event) => event.event === 'run.failed');
  assert.equal(failure?.data.error, 'agent_execution_failed');
  assert.doesNotMatch(JSON.stringify(events), /private-value|private\.example/);
  assert.equal(store.receipts.length, 1);
  assert.deepEqual(store.receipts[0], {
    id: 'fixed-id',
    conversationId: 'fixed-id',
    agentId: 'create-something-guide-agent',
    provider: 'openai',
    model: 'gpt-4.1-mini',
    status: 'failed',
    toolCalls: [],
    connectedServers: [],
    startedAt: (store.receipts[0] as { startedAt: string }).startedAt,
    completedAt: (store.receipts[0] as { completedAt: string }).completedAt,
    error: 'agent_execution_failed'
  });
});

test('records a failed terminal event when the executor ends without completion', async () => {
  const store = new MemoryStore();
  const worker = createOwnedAgentWorker({
    store,
    executor: {
      async *run() {
        return;
      }
    },
    id: () => 'fixed-id'
  });

  const response = await worker.fetch(
    new Request('https://agent.example/v1/agents/create-something-guide-agent/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'hello' })
    })
  );
  const events = parseSse(await response.text());
  assert.deepEqual(
    events.map((event) => event.event),
    ['run.started', 'run.failed']
  );
  assert.equal(events[1].data.error, 'agent_execution_failed');
  assert.equal(store.receipts.length, 1);
  assert.equal((store.receipts[0] as { status: string }).status, 'failed');
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
