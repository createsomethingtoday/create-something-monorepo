import { describe, expect, it, vi } from 'vitest';
import { load } from '../src/routes/+layout.server';

// SvelteKit tracks URL reads, not request.locals, to invalidate shared layouts.
// The hook resolves the network from pathname on each request.
describe('network navigation layout', () => {
  it('tracks pathname so client navigation refreshes the hook-selected network', async () => {
    const pathname = vi.fn(() => '/n/recipient-network/settings');
    const network = {
      id: 'recipient-network',
      slug: 'recipient-network',
      name: 'Recipient network',
      owner_id: 'recipient',
      description: '',
      format: 'academy',
      access_model: 'members',
      status: 'draft'
    };
    const result = await load({
      url: {
        get pathname() {
          return pathname();
        }
      },
      locals: { network, identity: null },
      platform: { env: {} }
    } as any);
    expect(pathname).toHaveBeenCalled();
    expect(result?.network).toMatchObject({ id: 'recipient-network', slug: 'recipient-network' });
    expect(result?.network).not.toHaveProperty('owner_id');
  });
});
