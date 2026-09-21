import { it, expect, vi } from 'vitest';
import { hostedOnboarding } from '../src/lib/server/hosted-onboarding';
it('creates an account-bound hosted fallback on an approved PRIVATE origin', async () => {
  const create = vi.fn(async (_params: any) => ({
    account: 'acct_test',
    livemode: false,
    url: 'https://connect.stripe.com/setup/test'
  }));
  const stripe: any = { v2: { core: { accountLinks: { create } } } };
  expect(
    await hostedOnboarding(
      stripe,
      'acct_test',
      'recipient',
      'https://private.createsomething.agency/support/partner',
      false
    )
  ).toEqual({ url: 'https://connect.stripe.com/setup/test' });
  expect(create.mock.calls[0][0].use_case.account_onboarding.configurations).toEqual(['recipient']);
  await expect(
    hostedOnboarding(
      stripe,
      'acct_test',
      'recipient',
      'https://evil.example/support/partner',
      false
    )
  ).rejects.toThrow('origin');
});
