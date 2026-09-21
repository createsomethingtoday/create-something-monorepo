import { it, expect, vi } from 'vitest';
const list = vi.hoisted(() => vi.fn());
vi.mock('../src/lib/server/seller-accounts', async (original) => ({
  ...(await original<typeof import('../src/lib/server/seller-accounts')>()),
  commerceStripe: () => ({ countrySpecs: { list } })
}));
import { GET } from '../src/routes/api/support/payouts/+server';
it('offers all country pages to an approved partner before account creation', async () => {
  list
    .mockResolvedValueOnce({ data: [{ id: 'CA' }], has_more: true })
    .mockResolvedValueOnce({ data: [{ id: 'US' }], has_more: false });
  const response = await GET({
    locals: { identity: { subject: 'partner' } },
    platform: {
      env: {
        PCN_SUPPORT_CONNECT_ENABLED: 'true',
        DB: {
          prepare: () => ({
            bind: () => ({ first: async () => ({ account_id: null, country: null }) })
          })
        }
      }
    }
  } as any);
  expect(response.status).toBe(200);
  expect((await response.json()).countries).toEqual(['CA', 'US']);
  expect(list).toHaveBeenLastCalledWith({ limit: 100, starting_after: 'CA' });
});
