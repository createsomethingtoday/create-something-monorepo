import { Effect } from 'effect';
import {
  CallbackTransportError, DEADLINE_MS, MAX_RESPONSE_BYTES, validatePayload,
} from '../sender/policy.mjs';

export { CallbackTransportError, validateCallback as validateCallbackUrl } from '../sender/policy.mjs';

export interface CallbackSenderEnv {
  CALLBACK_SENDER: {
    idFromName(name: string): DurableObjectId;
    get(id: DurableObjectId): { fetch(request: Request): Promise<Response> };
  };
  CALLBACK_SENDER_TOKEN: string;
}

async function readBounded(response: Response, limit: number, signal: AbortSignal): Promise<string> {
  if (!response.body) throw new CallbackTransportError('callback_sender_failed');
  const reader = response.body.getReader();
  const onAbort = () => { void reader.cancel().catch(() => undefined); };
  signal.addEventListener('abort', onAbort, { once: true });
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (signal.aborted) throw new CallbackTransportError('callback_deadline_exceeded');
      if (done) break;
      length += value.byteLength;
      if (length > limit) throw new CallbackTransportError('callback_sender_failed');
      chunks.push(value);
    }
  } finally {
    signal.removeEventListener('abort', onAbort);
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
  const result = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(result);
}

/** The exact signed UTF-8 body is transported unchanged; signing lives upstream. */
export async function callbackPost(
  env: CallbackSenderEnv, url: string, body: string, headers: Record<string, string>,
): Promise<{ status: number; body: string }> {
  const payload = validatePayload(url, body, headers);
  if (!env.CALLBACK_SENDER || !/^[A-Za-z0-9_-]{32,256}$/u.test(env.CALLBACK_SENDER_TOKEN ?? '')) {
    throw new CallbackTransportError('callback_sender_not_configured');
  }
  const operation = Effect.tryPromise({
    try: async (signal) => {
      const deadlineAt = Date.now() + DEADLINE_MS;
      const stub = env.CALLBACK_SENDER.get(env.CALLBACK_SENDER.idFromName('callback-egress-v1'));
      const response = await stub.fetch(new Request('http://callback-sender/send', {
        method: 'POST', signal,
        headers: { 'content-type': 'application/json', authorization: `Bearer ${env.CALLBACK_SENDER_TOKEN}`, 'x-a2a-deadline-at': String(deadlineAt) },
        body: JSON.stringify({ url: payload.endpoint.href, body, headers: payload.headers }),
      }));
      const text = await readBounded(response, MAX_RESPONSE_BYTES * 6 + 16 * 1024, signal);
      let value: unknown;
      try { value = JSON.parse(text); } catch { throw new CallbackTransportError('callback_sender_failed'); }
      if (response.status !== 200 || !value || typeof value !== 'object' || !('status' in value) || !('body' in value) ||
          typeof value.status !== 'number' || !Number.isInteger(value.status) || value.status < 200 || value.status > 599 ||
          typeof value.body !== 'string' || new TextEncoder().encode(value.body).byteLength > MAX_RESPONSE_BYTES) {
        throw new CallbackTransportError('callback_sender_failed');
      }
      return { status: value.status, body: value.body };
    },
    catch: (error) => error instanceof CallbackTransportError ? error : new CallbackTransportError('callback_sender_failed'),
  }).pipe(Effect.timeoutFail({ duration: DEADLINE_MS, onTimeout: () => new CallbackTransportError('callback_deadline_exceeded') }));
  const result = await Effect.runPromise(Effect.either(operation));
  if (result._tag === 'Left') throw result.left;
  return result.right;
}
