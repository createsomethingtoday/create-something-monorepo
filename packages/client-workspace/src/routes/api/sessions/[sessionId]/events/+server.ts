import type { RequestHandler } from './$types';

import { workspaceErrorResponse } from '$lib/server/http-error.js';
import { clientWorkspaceRuntime } from '$lib/server/runtime.js';

const encoder = new TextEncoder();

export const GET: RequestHandler = ({ request, params }) => {
  try {
    clientWorkspaceRuntime.service.receipt(params.sessionId);
    let unsubscribe: (() => void) | undefined;
    let keepAlive: ReturnType<typeof setInterval> | undefined;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const close = () => {
          if (keepAlive) clearInterval(keepAlive);
          unsubscribe?.();
          try {
            controller.close();
          } catch {
            // Stream may already be closed by the client.
          }
        };
        unsubscribe = clientWorkspaceRuntime.service.subscribe(params.sessionId, (event) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        });
        keepAlive = setInterval(() => controller.enqueue(encoder.encode(': keep-alive\n\n')), 15_000);
        request.signal.addEventListener('abort', close, { once: true });
      },
      cancel() {
        if (keepAlive) clearInterval(keepAlive);
        unsubscribe?.();
      }
    });
    return new Response(stream, {
      headers: {
        'cache-control': 'no-cache, no-transform',
        'content-type': 'text/event-stream; charset=utf-8',
        connection: 'keep-alive',
        'x-accel-buffering': 'no'
      }
    });
  } catch (error) {
    return workspaceErrorResponse(error);
  }
};
