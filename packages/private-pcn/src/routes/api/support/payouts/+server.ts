import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isSameOrigin } from '$lib/server/policy';
import { boundedText } from '$lib/server/body';
import { BillingError } from '$lib/server/billing';
import { commerceStripe } from '$lib/server/seller-accounts';
import { supportPartnerSession, validateSupportAccount } from '$lib/server/support-payments';
export const GET: RequestHandler = async ({ locals, platform }) => {
  if (!locals.identity || !platform?.env.DB)
    return json({ error: 'Sign in to continue.' }, { status: 401 });
  const env = platform.env,
    subject = locals.identity.subject;
  const row = await env.DB.prepare(
    "SELECT p.account_id,p.country FROM support_partners p JOIN creator_applications a ON a.subject=p.subject WHERE p.subject=? AND p.approved=1 AND a.status='approved'"
  )
    .bind(subject)
    .first<{ account_id: string | null; country: string | null }>();
  if (!row) return json({ error: 'Approved support partner access required.' }, { status: 403 });
  if (env.PCN_SUPPORT_CONNECT_ENABLED !== 'true')
    return json({ state: 'not_enabled', countries: [], country: row.country });
  try {
    const stripe = commerceStripe(env);
    const specs = await stripe.countrySpecs.list({ limit: 100 });
    if (specs.has_more) throw new Error('Incomplete country list');
    const ready = row.account_id
      ? validateSupportAccount(
          await stripe.v2.core.accounts.retrieve(row.account_id, {
            include: ['configuration.recipient', 'defaults']
          }),
          subject,
          env
        )
      : false;
    return json({
      state: ready ? 'ready' : 'requirements_due',
      payoutsReady: ready,
      countries: specs.data.map((c) => c.id),
      country: row.country
    });
  } catch {
    return json({ error: 'Payout status is temporarily unavailable.' }, { status: 503 });
  }
};
export const POST: RequestHandler = async ({ locals, platform, request }) => {
  if (!isSameOrigin(request))
    return json({ error: 'Same-origin request required.' }, { status: 403 });
  if (!locals.identity || !platform?.env.DB)
    return json({ error: 'Sign in to continue.' }, { status: 401 });
  let b;
  try {
    b = JSON.parse(await boundedText(request));
  } catch {
    return json({ error: 'Select a business country.' }, { status: 400 });
  }
  try {
    return json(
      await supportPartnerSession(
        platform.env,
        locals.identity,
        typeof b?.country === 'string' ? b.country : ''
      )
    );
  } catch (e) {
    return json(
      {
        error:
          e instanceof BillingError
            ? e.message
            : 'Payout setup could not be confirmed. Refresh before retrying.'
      },
      { status: e instanceof BillingError ? e.status : 503 }
    );
  }
};
