import Stripe from 'stripe';
import { BillingError } from './billing';
import { commerceStripe, liveMode, now, PLATFORM_ACCOUNT_ID } from './seller-accounts';
type Env = App.Platform['env'];
export function validateSupportAccount(account: Stripe.V2.Core.Account, subject: string, env: Env) {
  if (
    account.closed ||
    account.livemode !== liveMode(env) ||
    account.metadata?.application !== 'private_pcn_support' ||
    account.metadata?.pcn_support_partner !== subject ||
    account.dashboard !== 'express' ||
    account.defaults?.responsibilities?.fees_collector !== 'application' ||
    account.defaults?.responsibilities?.losses_collector !== 'application'
  )
    throw new BillingError('Support payout account could not be verified.');
  return (
    account.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers?.status ===
    'active'
  );
}
export async function ensureSupportPartner(
  env: Env,
  identity: { subject: string; email: string },
  country: string,
  stripe = commerceStripe(env)
) {
  if (env.PCN_SUPPORT_CONNECT_ENABLED !== 'true')
    throw new BillingError('Support payout onboarding is not enabled yet.');
  const db = env.DB,
    subject = identity.subject;
  const application = await db
    .prepare(
      "SELECT a.display_name FROM creator_applications a JOIN support_partners p ON p.subject=a.subject WHERE a.subject=? AND a.status='approved' AND p.approved=1"
    )
    .bind(subject)
    .first<{ display_name: string }>();
  if (!application) throw new BillingError('Approved support partner access required.', 403);
  if (!/^[A-Z]{2}$/.test(country) || (await stripe.countrySpecs.retrieve(country)).id !== country)
    throw new BillingError('Select a supported business country.', 400);
  await db
    .prepare(
      'UPDATE support_partners SET country=COALESCE(country,?),creation_key=COALESCE(creation_key,?) WHERE subject=?'
    )
    .bind(country, crypto.randomUUID(), subject)
    .run();
  const lease = crypto.randomUUID();
  const row = await db
    .prepare(
      'UPDATE support_partners SET lease_id=?,lease_until=? WHERE subject=? AND approved=1 AND lease_until<? RETURNING *'
    )
    .bind(lease, now() + 120, subject, now())
    .first<{
      account_id: string | null;
      country: string;
      creation_key: string;
      creation_started: number;
    }>();
  if (!row) throw new BillingError('Payout setup is already in progress.', 409);
  try {
    if (row.account_id) {
      validateSupportAccount(
        await stripe.v2.core.accounts.retrieve(row.account_id, {
          include: ['configuration.recipient', 'defaults']
        }),
        subject,
        env
      );
      return row.account_id;
    }
    if (row.creation_started && now() - row.creation_started > 72000)
      throw new BillingError('Earlier payout setup needs reconciliation before retrying.', 409);
    if ((await stripe.accounts.retrieve(null)).id !== PLATFORM_ACCOUNT_ID)
      throw new BillingError('Platform payment account could not be verified.');
    await db
      .prepare(
        'UPDATE support_partners SET creation_started=CASE WHEN creation_started=0 THEN ? ELSE creation_started END WHERE subject=? AND lease_id=?'
      )
      .bind(now(), subject, lease)
      .run();
    const account = await stripe.v2.core.accounts.create(
      {
        contact_email: identity.email,
        display_name: application.display_name,
        identity: { country: row.country },
        dashboard: 'express',
        configuration: {
          recipient: { capabilities: { stripe_balance: { stripe_transfers: { requested: true } } } }
        },
        defaults: {
          currency: 'usd',
          responsibilities: { fees_collector: 'application', losses_collector: 'application' }
        },
        metadata: { application: 'private_pcn_support', pcn_support_partner: subject },
        include: ['configuration.recipient', 'defaults', 'requirements']
      },
      { idempotencyKey: `pcn-support-partner-${row.creation_key}` }
    );
    validateSupportAccount(account, subject, env);
    const saved = await db
      .prepare(
        'UPDATE support_partners SET account_id=? WHERE subject=? AND lease_id=? AND account_id IS NULL'
      )
      .bind(account.id, subject, lease)
      .run();
    if (saved.meta.changes !== 1)
      throw new BillingError('Payout setup changed. Refresh to reconcile.', 409);
    return account.id;
  } finally {
    await db
      .prepare(
        'UPDATE support_partners SET lease_id=NULL,lease_until=0 WHERE subject=? AND lease_id=?'
      )
      .bind(subject, lease)
      .run();
  }
}
export async function supportPartnerSession(
  env: Env,
  identity: { subject: string; email: string },
  country: string,
  stripe = commerceStripe(env)
) {
  if (
    typeof env.STRIPE_PUBLISHABLE_KEY !== 'string' ||
    !env.STRIPE_PUBLISHABLE_KEY.startsWith(liveMode(env) ? 'pk_live_' : 'pk_test_')
  )
    throw new BillingError('Support payout keys are not configured.');
  const account = await ensureSupportPartner(env, identity, country, stripe);
  const session = await stripe.accountSessions.create({
    account,
    components: {
      account_onboarding: { enabled: true },
      notification_banner: { enabled: true },
      account_management: { enabled: true },
      payouts: { enabled: true }
    }
  });
  if (session.account !== account || session.livemode !== liveMode(env))
    throw new BillingError('Payout session could not be verified.');
  return { clientSecret: session.client_secret, publishableKey: env.STRIPE_PUBLISHABLE_KEY };
}
