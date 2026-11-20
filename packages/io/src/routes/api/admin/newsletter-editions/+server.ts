import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { handleNewsletterAction, readNewsletterWorkflow } from '$lib/server/newsletter-workflow';
import { getNewsletterSource } from '$lib/server/newsletter-workflow-sources';
const headers = { 'Cache-Control': 'private, no-store' };
export const GET: RequestHandler = async ({ platform, locals }) => {
  if (locals.user?.role !== 'admin')
    return json({ error: 'Unauthorized' }, { status: 401, headers });
  if (!platform?.env?.DB) return json({ error: 'Database unavailable' }, { status: 503, headers });
  try {
    return json(await readNewsletterWorkflow(platform.env.DB), { headers });
  } catch {
    return json(
      { error: 'Newsletter workflow unavailable; check the edition migration.' },
      { status: 503, headers }
    );
  }
};
export const POST: RequestHandler = async ({ request, url, platform, locals }) => {
  if (locals.user?.role !== 'admin')
    return json({ error: 'Unauthorized' }, { status: 401, headers });
  if (request.headers.get('Origin') !== url.origin)
    return json({ error: 'Same-origin request required' }, { status: 403, headers });
  if (!request.headers.get('content-type')?.startsWith('application/json'))
    return json({ error: 'JSON required' }, { status: 415, headers });
  if (Number(request.headers.get('content-length') ?? 0) > 400000)
    return json({ error: 'Request too large' }, { status: 413, headers });
  if (!platform?.env?.DB) return json({ error: 'Database unavailable' }, { status: 503, headers });
  try {
    const raw = await request.text();
    if (raw.length > 400000) return json({ error: 'Request too large' }, { status: 413, headers });
    let body = JSON.parse(raw) as Record<string, unknown>;
    if (body.action === 'import')
      body = { action: 'prepare', edition: getNewsletterSource(String(body.slug ?? '')) };
    return json(
      await handleNewsletterAction(platform.env.DB, body, locals.user, {
        apiKey: platform.env.RESEND_API_KEY,
        fetcher: fetch
      }),
      { headers }
    );
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : 'Newsletter action failed' },
      { status: 400, headers }
    );
  }
};
