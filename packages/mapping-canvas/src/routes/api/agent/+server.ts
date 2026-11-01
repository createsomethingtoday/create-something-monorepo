import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { relay, RelayError, type RelayInput } from '$lib/agent-relay';
import { consumePublishLimit } from '$lib/share';
import { readJsonBodyBounded, RequestBodyTooLargeError } from '$lib/request-body';
const headers = { 'Cache-Control': 'no-store, private', 'Referrer-Policy': 'no-referrer' };
export const POST: RequestHandler = async ({ request, platform, url, getClientAddress }) => {
  try {
    const db = platform?.env.DRAW_DB;
    if (!db) throw new RelayError('Agent connections are temporarily unavailable.', 503);
    const origin = request.headers.get('origin');
    if (origin && origin !== url.origin) throw new RelayError('Connection origin denied.', 403);
    const input = await readJsonBodyBounded(request, 750_000) as RelayInput;
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new RelayError('Invalid connection request.');
    if (['create','poll','result','revoke'].includes(String(input.action)) && origin !== url.origin) throw new RelayError('Use the Draw connection controls.', 403);
    if (input.action === 'create' || input.action === 'pair') {
      const secret = platform?.env.DRAW_SHARE_RATE_SECRET;
      if (!secret) throw new RelayError('Agent connections are temporarily unavailable.', 503);
      if (!await consumePublishLimit(db, `agent:${input.action}:${getClientAddress()}`, secret)) throw new RelayError('Too many connection attempts. Try again later.', 429);
    }
    const credential = request.headers.get('authorization')?.replace(/^Bearer /, '') ?? '';
    return json(await relay(db, input, credential), { headers });
  } catch (cause) {
    if (cause instanceof RelayError) return json({ error: cause.message }, { status: cause.status, headers });
    if (cause instanceof RequestBodyTooLargeError) return json({ error: 'Connection request too large.' }, { status: 413, headers });
    return json({ error: 'Connection request could not be processed.' }, { status: 400, headers });
  }
};
