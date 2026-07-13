import { z } from 'zod';

import { getAgentDefinition, listAgentDefinitions } from './definitions.js';
import type { AgentExecutor, AgentRunReceipt, AgentStore } from './types.js';

const messageInput = z.object({
  query: z.string().trim().min(1).max(20_000),
  conversation_id: z.string().min(1).max(128).optional()
});

type WorkerDependencies = {
  store: AgentStore;
  executor: AgentExecutor;
  id?: () => string;
  now?: () => Date;
};

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type'
};

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: corsHeaders });
}

function sse(event: string, data: unknown): Uint8Array {
  return new TextEncoder().encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export function createOwnedAgentWorker(dependencies: WorkerDependencies) {
  const id = dependencies.id ?? (() => crypto.randomUUID());
  const now = dependencies.now ?? (() => new Date());

  return {
    async fetch(request: Request): Promise<Response> {
      if (request.method === 'OPTIONS')
        return new Response(null, { status: 204, headers: corsHeaders });
      const url = new URL(request.url);

      if (request.method === 'GET' && url.pathname === '/health') {
        return json({ ok: true, service: 'owned-agent-runtime' });
      }
      if (request.method === 'GET' && url.pathname === '/v1/agents') {
        return json({
          agents: listAgentDefinitions().map(
            ({ id: agentId, name, description, access, allowedTools }) => ({
              id: agentId,
              name,
              description,
              access,
              allowed_tools: allowedTools
            })
          )
        });
      }

      const route = url.pathname.match(/^\/v1\/agents\/([^/]+)\/messages$/);
      if (request.method !== 'POST' || !route) return json({ error: 'not_found' }, 404);
      const definition = getAgentDefinition(decodeURIComponent(route[1]));
      if (!definition) return json({ error: 'agent_not_found' }, 404);

      const parsed = messageInput.safeParse(await request.json().catch(() => null));
      if (!parsed.success)
        return json({ error: 'invalid_request', issues: parsed.error.issues }, 400);

      const existing = parsed.data.conversation_id
        ? await dependencies.store.getConversation(parsed.data.conversation_id)
        : null;
      if (existing && existing.agentId !== definition.id) {
        return json({ error: 'conversation_agent_mismatch' }, 409);
      }

      const conversationId = existing?.id ?? parsed.data.conversation_id ?? id();
      const runId = id();
      const startedAt = now().toISOString();
      await dependencies.store.saveConversation({
        id: conversationId,
        agentId: definition.id,
        previousResponseId: existing?.previousResponseId
      });
      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          controller.enqueue(
            sse('run.started', {
              run_id: runId,
              conversation_id: conversationId,
              agent_id: definition.id
            })
          );
          try {
            for await (const event of dependencies.executor.run({
              definition,
              query: parsed.data.query,
              previousResponseId: existing?.previousResponseId,
              conversationId
            })) {
              if (event.type === 'text_delta') {
                controller.enqueue(sse('message.delta', { delta: event.delta }));
                continue;
              }

              await dependencies.store.saveConversation({
                id: conversationId,
                agentId: definition.id,
                previousResponseId: event.providerResponseId
              });
              const receipt: AgentRunReceipt = {
                id: runId,
                conversationId,
                agentId: definition.id,
                provider: 'openai',
                model: definition.model,
                status: 'completed',
                toolCalls: event.toolCalls,
                connectedServers: event.connectedServers,
                startedAt,
                completedAt: now().toISOString()
              };
              await dependencies.store.saveReceipt(receipt);
              controller.enqueue(
                sse('message.completed', {
                  run_id: runId,
                  conversation_id: conversationId,
                  output: event.output,
                  receipt
                })
              );
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Agent execution failed.';
            const receipt: AgentRunReceipt = {
              id: runId,
              conversationId,
              agentId: definition.id,
              provider: 'openai',
              model: definition.model,
              status: 'failed',
              toolCalls: [],
              connectedServers: [],
              startedAt,
              completedAt: now().toISOString(),
              error: message
            };
            await dependencies.store.saveReceipt(receipt);
            controller.enqueue(
              sse('run.failed', { run_id: runId, conversation_id: conversationId, error: message })
            );
          } finally {
            controller.close();
          }
        }
      });

      return new Response(stream, {
        headers: {
          ...corsHeaders,
          'content-type': 'text/event-stream; charset=utf-8',
          'cache-control': 'no-cache, no-transform'
        }
      });
    }
  };
}
