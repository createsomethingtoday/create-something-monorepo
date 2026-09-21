import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireOwner } from '$lib/server/builder-assets';
import { isSameOrigin } from '$lib/server/policy';
import { BillingError } from '$lib/server/billing';
import { boundedText } from '$lib/server/body';
import { commerceStripe, readSeller, syncSeller, sellerSession, sellerCountries } from '$lib/server/seller-accounts';
export const GET: RequestHandler = async ({ locals, platform }) => {
  requireOwner(locals);
  if (!platform?.env.DB) return json({ error: 'Seller setup unavailable.' }, { status: 503 });
  try {
    const row = await readSeller(platform.env.DB, locals.identity!.subject);
    let countries: string[] = row?.country ? [row.country] : [];
    if (!row && platform.env.PCN_CONNECT_ENABLED === 'true') {
      countries = await sellerCountries(commerceStripe(platform.env));
    }
    return json({
      ...(row?.account_id
        ? await syncSeller(platform.env, locals.identity!.subject)
        : { state: 'not_started', chargesReady: false, payoutsReady: false }),
      countries,
      country: row?.country || null
    });
  } catch (e) {
    return json(
      {
        error:
          e instanceof BillingError
            ? e.message
            : 'Seller status could not be refreshed. Try again shortly.'
      },
      { status: e instanceof BillingError ? e.status : 503 }
    );
  }
};
export const POST: RequestHandler = async ({ request, locals, platform }) => {
  if (!isSameOrigin(request))
    return json({ error: 'Same-origin request required.' }, { status: 403 });
  requireOwner(locals);
  if (!platform?.env.DB) return json({ error: 'Seller setup unavailable.' }, { status: 503 });
  let body;
  try {
    body = JSON.parse(await boundedText(request));
  } catch {
    return json({ error: 'Select your business country.' }, { status: 400 });
  }
  try {
    return json(
      await sellerSession(
        platform.env,
        locals.identity!,
        locals.network!.name,
        typeof body?.country === 'string' ? body.country : ''
      )
    );
  } catch (e) {
    return json(
      {
        error:
          e instanceof BillingError
            ? e.message
            : 'Seller setup could not be confirmed. Refresh before trying again.'
      },
      { status: e instanceof BillingError ? e.status : 503 }
    );
  }
};
