import { z } from 'zod';

import { getAgentDefinition, listAgentDefinitions } from './definitions.js';
import type { AgentAdmission, AgentExecutor, AgentRunReceipt, AgentStore } from './types.js';

const messageInput = z.object({
  query: z.string().trim().min(1).max(20_000),
  conversation_id: z.string().min(1).max(128).optional()
});

type WorkerDependencies = {
  store: AgentStore;
  executor: AgentExecutor;
  admission?: AgentAdmission;
  id?: () => string;
  now?: () => Date;
};

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type'
};

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return Response.json(body, { status, headers: { ...corsHeaders, ...headers } });
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

      if (dependencies.admission) {
        try {
          const decision = await dependencies.admission.check({ request, agentId: definition.id });
          if (decision === 'rate_limited') {
            return json({ error: 'rate_limited' }, 429, { 'retry-after': '60' });
          }
        } catch {
          return json({ error: 'admission_unavailable' }, 503);
        }
      }

      const conversationId = parsed.data.conversation_id ?? id();
      const runId = id();
      let claim;
      try {
        claim = await dependencies.store.claimConversation({
          id: conversationId,
          agentId: definition.id,
          runId
        });
      } catch {
        return json({ error: 'state_unavailable' }, 503);
      }
      if (claim.status === 'agent_mismatch') {
        return json({ error: 'conversation_agent_mismatch' }, 409);
      }
      if (claim.status === 'busy') {
        return json({ error: 'conversation_busy' }, 409, { 'retry-after': '1' });
      }

      const existing = claim.conversation;
      const startedAt = now().toISOString();
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
            let completed = false;
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
              await dependencies.store.completeRun({
                conversation: {
                  id: conversationId,
                  agentId: definition.id,
                  previousResponseId: event.providerResponseId
                },
                runId,
                receipt
              });
              controller.enqueue(
                sse('message.completed', {
                  run_id: runId,
                  conversation_id: conversationId,
                  output: event.output,
                  receipt
                })
              );
              completed = true;
              break;
            }
            if (!completed) throw new Error('Agent executor ended without a completed event.');
          } catch (error) {
            void error;
            const publicError = 'agent_execution_failed';
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
              error: publicError
            };
            try {
              await dependencies.store.failRun({ conversationId, runId, receipt });
            } catch {
              controller.enqueue(
                sse('run.failed', {
                  run_id: runId,
                  conversation_id: conversationId,
                  error: 'state_unavailable'
                })
              );
              return;
            }
            controller.enqueue(
              sse('run.failed', {
                run_id: runId,
                conversation_id: conversationId,
                error: publicError
              })
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
