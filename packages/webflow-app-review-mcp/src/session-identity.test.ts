import { describe, it, expect } from 'vitest';
import { reviewerSession } from './session-identity.js';
describe('reviewer session identity', () => {
  it('rejects legacy sessions even when they carry operator identity', () => {
    expect(
      reviewerSession({ authMode: 'legacy', accountId: 'operator', email: 'micah@webflow.com' }).ok
    ).toBe(false);
    expect(reviewerSession(undefined).ok).toBe(false);
    expect(reviewerSession({ authMode: 'cloudflare-access', email: 'micah@webflow.com' }).ok).toBe(
      false
    );
  });
  it('returns only identity from the current verified session', () => {
    expect(
      reviewerSession({ authMode: 'cloudflare-access', accountId: 'one', email: 'one@webflow.com' })
    ).toEqual({
      ok: true,
      data: {
        accountId: 'one',
        email: 'one@webflow.com',
        name: null,
        authMode: 'cloudflare-access'
      }
    });
    expect(
      reviewerSession({ authMode: 'cloudflare-access', accountId: 'two', email: 'two@webflow.com' })
    ).toMatchObject({ data: { accountId: 'two', email: 'two@webflow.com' } });
  });
});
