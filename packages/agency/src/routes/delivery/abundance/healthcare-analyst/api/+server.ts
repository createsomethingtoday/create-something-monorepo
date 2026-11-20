import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireNpgUser, requireChat, requireSameOrigin } from '$lib/server/npg/access';
import { NpgError, NpgStore } from '$lib/server/npg/store';
import { executeCommand, parseCommand } from '$lib/server/npg/runner';
import { createProviders } from '$lib/server/npg/providers';
const headers = {
  'Cache-Control': 'private, no-store',
  'Referrer-Policy': 'same-origin',
  'X-Robots-Tag': 'noindex, nofollow'
};
export const GET: RequestHandler = async ({ locals, platform, url }) => {
  const owner = requireNpgUser(locals, platform),
    env = requireChat(platform),
    store = new NpgStore(env.DB);
  try {
    return json(
      url.searchParams.has('id')
        ? await store.view(owner, url.searchParams.get('id')!)
        : { conversations: await store.list(owner) },
      { headers }
    );
  } catch (cause) {
    return failure(cause);
  }
};
export const POST: RequestHandler = async ({ locals, platform, request, url }) => {
  const owner = requireNpgUser(locals, platform),
    env = requireChat(platform);
  requireSameOrigin(request, url);
  // Bound the actual stream, not only a client-controlled Content-Length.
  const reader = request.body?.getReader();
  if (!reader) throw error(400, 'Request body required.');
  let text = '',
    bytes = 0;
  const decoder = new TextDecoder();
  try {
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      bytes += part.value.byteLength;
      if (bytes > 16000) throw error(413, 'Request is too large.');
      text += decoder.decode(part.value, { stream: true });
    }
    text += decoder.decode();
  } finally {
    await reader.cancel().catch(() => {});
  }
  let command;
  try {
    command = parseCommand(JSON.parse(text));
  } catch (cause) {
    return failure(cause instanceof SyntaxError ? new NpgError(400, 'Invalid request.') : cause);
  }
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const store = new NpgStore(env.DB);
    const action =
      command.type === 'approve' ? await store.action(owner, command.actionId) : undefined;
    // The source may use 300s. Include catalog/preflight and persistence headroom
    // within the combined action's 450s lease. Read the tool from the owned review.
    const combined =
      command.type === 'approve' &&
      action?.conversation_id === command.id &&
      action.tool === 'enrich_candidate_complete_profile';
    timer = setTimeout(() => controller.abort(), combined ? 410000 : 110000);
    return json(
      await executeCommand(store, owner, command, () => createProviders(env, controller.signal)),
      { headers }
    );
  } catch (cause) {
    return failure(cause);
  } finally {
    if (timer) clearTimeout(timer);
  }
};
function failure(cause: unknown) {
  return json(
    {
      error:
        cause instanceof NpgError
          ? cause.message
          : 'The request could not be completed. Refresh the history before trying again.'
    },
    { status: cause instanceof NpgError ? cause.status : 503, headers }
  );
}
