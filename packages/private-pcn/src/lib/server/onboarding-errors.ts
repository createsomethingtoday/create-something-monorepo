import { BillingError } from './billing';
// Only definitive provider rejections can release the uncertain-creation window.
export function onboardingRejection(error: unknown): BillingError | null {
  const code = (error as { code?: string } | null)?.code;
  if (code === 'account_create_activation_required')
    return new BillingError(
      'CREATE SOMETHING is awaiting Stripe platform approval. Your setup is saved. Retry after platform approval; no bank details are needed yet.',
      503
    );
  if (code === 'forbidden')
    return new BillingError(
      'Stripe onboarding is unavailable because the platform payment key lacks permission. Contact CREATE SOMETHING; repeated setup attempts will not resolve this.',
      503
    );
  return null;
}
