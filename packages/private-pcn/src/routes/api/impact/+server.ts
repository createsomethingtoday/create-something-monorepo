import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isReviewer } from '$lib/server/admission';
import { isSameOrigin } from '$lib/server/policy';
import { boundedText } from '$lib/server/body';
const surfaces = new Set([
  'home',
  'field',
  'apply',
  'start',
  'signup',
  'login',
  'collection',
  'workspace',
  'support',
  'network',
  'asset',
  'settings'
]);
export const POST: RequestHandler = async ({ platform, request }) => {
  if (!isSameOrigin(request))
    return json({ error: 'Same-origin request required.' }, { status: 403 });
  if (!platform?.env.DB) return new Response(null, { status: 503 });
  let body;
  try {
    body = JSON.parse(await boundedText(request, 2048));
  } catch {
    return json({ error: 'Invalid event.' }, { status: 400 });
  }
  if (!body || !['page_view', 'primary_action'].includes(body.event) || !surfaces.has(body.surface))
    return json({ error: 'Unknown engagement event.' }, { status: 400 });
  if (request.headers.get('DNT') === '1' || request.headers.get('Sec-GPC') === '1')
    return new Response(null, { status: 204 });
  await platform.env.DB.prepare(
    `INSERT INTO impact_daily(day,surface,event,count) VALUES(date('now'),?,?,1)
 ON CONFLICT(day,surface,event) DO UPDATE SET count=count+1`
  )
    .bind(body.surface, body.event)
    .run();
  await platform.env.DB.prepare("DELETE FROM impact_daily WHERE day<date('now','-90 days')").run();
  return new Response(null, { status: 204 });
};
export const GET: RequestHandler = async ({ locals, platform }) => {
  if (!platform?.env || !isReviewer(locals.identity, platform.env))
    return json({ error: 'Reviewer access required.' }, { status: 403 });
  const db = platform.env.DB;
  const [engagement, applications, trials, orders] = await Promise.all([
    db
      .prepare(
        "SELECT day,surface,event,count FROM impact_daily WHERE day>=date('now','-30 days') ORDER BY day DESC,surface,event"
      )
      .all(),
    db.prepare('SELECT status,COUNT(*) AS count FROM creator_applications GROUP BY status').all(),
    db.prepare('SELECT COUNT(*) AS count FROM creator_trials').first(),
    db.prepare('SELECT status,COUNT(*) AS count FROM asset_orders GROUP BY status').all()
  ]);
  return json({
    engagement: engagement.results,
    outcomes: { applications: applications.results, trials, orders: orders.results },
    note: 'Engagement counts are browser-reported, not unique people or verified competence. Outcomes come from server records.'
  });
};
