import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isReviewer } from '$lib/server/admission';
import { isSameOrigin } from '$lib/server/policy';
import { isOperatorActivity, operatorEmails, operatorSubjects } from '$lib/server/impact';
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
export const POST: RequestHandler = async ({ locals, platform, request }) => {
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
  if (isOperatorActivity(locals, platform.env)) return new Response(null, { status: 204 });
  if (request.headers.get('DNT') === '1' || request.headers.get('Sec-GPC') === '1')
    return new Response(null, { status: 204 });
  await platform.env.DB.prepare(
    `INSERT INTO customer_impact_daily(day,surface,event,count) VALUES(date('now'),?,?,1)
 ON CONFLICT(day,surface,event) DO UPDATE SET count=count+1`
  )
    .bind(body.surface, body.event)
    .run();
  await platform.env.DB.prepare(
    "DELETE FROM customer_impact_daily WHERE day<date('now','-90 days')"
  ).run();
  await platform.env.DB.prepare("DELETE FROM impact_daily WHERE day<date('now','-90 days')").run();
  return new Response(null, { status: 204 });
};
export const GET: RequestHandler = async ({ locals, platform }) => {
  if (!platform?.env || !isReviewer(locals.identity, platform.env))
    return json({ error: 'Reviewer access required.' }, { status: 403 });
  const db = platform.env.DB;
  const subjects = JSON.stringify(operatorSubjects(platform.env));
  const emails = JSON.stringify(operatorEmails(platform.env));
  const [engagement, legacy, applications, invitations, trials, orders, acquisitions] =
    await Promise.all([
      db
        .prepare(
          "SELECT day,surface,event,count FROM customer_impact_daily WHERE day>=date('now','-30 days') ORDER BY day DESC,surface,event"
        )
        .all(),
      db
        .prepare(
          "SELECT COALESCE(SUM(count),0) AS count FROM impact_daily WHERE day>=date('now','-30 days')"
        )
        .first(),
      db
        .prepare(
          `SELECT status,COUNT(*) AS count FROM creator_applications WHERE subject NOT IN (SELECT value FROM json_each(?)) AND lower(email) NOT IN (SELECT value FROM json_each(?)) GROUP BY status`
        )
        .bind(subjects, emails)
        .all(),
      db
        .prepare(
          `SELECT COUNT(*) AS issued,COALESCE(SUM(redeemed_by IS NOT NULL),0) AS redeemed FROM creator_invitations WHERE lower(recipient_email) NOT IN (SELECT value FROM json_each(?)) AND COALESCE(redeemed_by,'') NOT IN (SELECT value FROM json_each(?))`
        )
        .bind(emails, subjects)
        .first(),
      db
        .prepare(
          `SELECT COUNT(*) AS count FROM creator_trials t JOIN creator_applications a ON a.subject=t.subject WHERE t.subject NOT IN (SELECT value FROM json_each(?)) AND lower(a.email) NOT IN (SELECT value FROM json_each(?))`
        )
        .bind(subjects, emails)
        .first(),
      db
        .prepare(
          `SELECT o.status,COUNT(*) AS count FROM asset_orders o WHERE o.buyer_id NOT IN (SELECT value FROM json_each(?)) AND lower(o.buyer_email) NOT IN (SELECT value FROM json_each(?)) GROUP BY o.status`
        )
        .bind(subjects, emails)
        .all(),
      db
        .prepare(
          `SELECT e.source,e.status,COUNT(*) AS count FROM asset_entitlements e WHERE e.buyer_id NOT IN (SELECT value FROM json_each(?)) GROUP BY e.source,e.status`
        )
        .bind(subjects)
        .all()
    ]);
  return json({
    engagement: engagement.results,
    legacyEngagement: legacy,
    outcomes: {
      applications: applications.results,
      invitations,
      trials,
      orders: orders.results,
      acquisitions: acquisitions.results
    },
    note: 'Known operator accounts and impersonation engagement are excluded. Anonymous visits cannot be attributed to operators. Historical unclassified engagement is separate. Outcomes are lifetime record counts, not a cohort conversion rate, unique learners, installations or verified competence.'
  });
};
