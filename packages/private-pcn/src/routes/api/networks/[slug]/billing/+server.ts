import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isSameOrigin } from '$lib/server/policy';
import { boundedText } from '$lib/server/body';
import { BillingError, checkout, portal, refreshBilling } from '$lib/server/billing';
export const POST: RequestHandler = async ({ locals, platform, request, url }) => {
  if (!isSameOrigin(request))
    return json({ error: 'Same-origin request required.' }, { status: 403 });
  if (!locals.identity || !locals.network || locals.network.owner_id !== locals.identity.subject)
    return json({ error: 'Network owner access required.' }, { status: 403 });
  if (!platform?.env) return json({ error: 'Billing unavailable.' }, { status: 503 });
  let body;
  try {
    body = JSON.parse(await boundedText(request));
  } catch {
    return json({ error: 'Invalid request.' }, { status: 400 });
  }
  try {
    if (body?.action === 'checkout')
      return json(await checkout(platform.env, locals.network, locals.identity.email, url.origin));
    if (body?.action === 'portal')
      return json(await portal(platform.env, locals.network, url.origin));
    if (body?.action === 'refresh') {
      const row = await refreshBilling(platform.env, locals.network);
      return json({
        status: row.status,
        periodEnd: row.period_end,
        cancelAtPeriodEnd: !!row.cancel_at_period_end
      });
    }
    return json({ error: 'Choose a billing action.' }, { status: 400 });
  } catch (e) {
    return json(
      {
        error:
          e instanceof BillingError
            ? e.message
            : 'Billing is temporarily unavailable. Please try again.'
      },
      { status: e instanceof BillingError ? e.status : 503 }
    );
  }
};
