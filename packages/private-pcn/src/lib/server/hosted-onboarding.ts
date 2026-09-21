import type Stripe from 'stripe';
export async function hostedOnboarding(
  stripe: Stripe,
  account: string,
  configuration: 'merchant' | 'recipient',
  returnUrl: string,
  live: boolean
) {
  const destination = new URL(returnUrl);
  if (
    ![
      'https://private.createsomething.agency',
      'https://cs-private-pcn-preview.createsomething.workers.dev'
    ].includes(destination.origin)
  )
    throw new Error('Unrecognized onboarding origin');
  const link = await stripe.v2.core.accountLinks.create({
    account,
    use_case: {
      type: 'account_onboarding',
      account_onboarding: {
        configurations: [configuration],
        refresh_url: destination.href,
        return_url: destination.href
      }
    }
  });
  if (
    link.account !== account ||
    link.livemode !== live ||
    new URL(link.url).origin !== 'https://connect.stripe.com'
  )
    throw new Error('Onboarding link could not be verified');
  return { url: link.url };
}
