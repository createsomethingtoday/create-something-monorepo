import { describe, expect, it, vi } from 'vitest';
const { action, report } = vi.hoisted(() => ({
  action: vi.fn(async (..._args: unknown[]) => ({ editions: [] })),
  report: vi.fn(async () => ({ editions: [] }))
}));
vi.mock('$lib/server/newsletter-workflow', () => ({
  handleNewsletterAction: action,
  readNewsletterWorkflow: report
}));
vi.mock('$lib/server/newsletter-workflow-sources', () => ({
  getNewsletterSource: (slug: string) => ({ slug })
}));
import { GET, POST } from '../src/routes/api/admin/newsletter-editions/+server';
function event(
  body: unknown,
  origin = 'https://createsomething.io',
  role: string | null = 'admin'
) {
  return {
    request: new Request('https://createsomething.io/api/admin/newsletter-editions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: origin },
      body: JSON.stringify(body)
    }),
    url: new URL('https://createsomething.io/api/admin/newsletter-editions'),
    locals: { user: role ? { id: 'admin-1', email: 'operator@example.com', role } : undefined },
    platform: { env: { DB: {}, RESEND_API_KEY: 'test' } }
  } as never;
}
describe('newsletter admin boundary', () => {
  it('rejects unauthenticated reads and cross-origin mutations without execution', async () => {
    action.mockClear();
    report.mockClear();
    expect((await GET(event({}, undefined, null))).status).toBe(401);
    expect(
      (await POST(event({ action: 'send', slug: 'test' }, 'https://untrusted.example'))).status
    ).toBe(403);
    expect(action).not.toHaveBeenCalled();
    expect(report).not.toHaveBeenCalled();
  });
  it('uses authenticated actor rather than body-supplied approval identity', async () => {
    action.mockClear();
    const response = await POST(
      event({ action: 'approve', slug: 'test', approved_by: 'forged@example.com' })
    );
    expect(response.status).toBe(200);
    expect(action.mock.calls[0][2]).toEqual({
      id: 'admin-1',
      email: 'operator@example.com',
      role: 'admin'
    });
    expect(response.headers.get('cache-control')).toBe('private, no-store');
  });
});
