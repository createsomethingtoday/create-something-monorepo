import { beforeEach, describe, expect, it, vi } from 'vitest';

const consumeSessionHandoff = vi.fn();
const getSession = vi.fn();

vi.mock('$lib/server/kv', () => ({
  SESSION_COOKIE_NAME: 'session',
  SESSION_COOKIE_OPTIONS: {},
  consumeSessionHandoff,
  getSession
}));

const { load } = await import('./+page.server');

function run(returnCookie?: string, handoff = 'handoff-token') {
  const cookies = {
    get: vi.fn((name: string) => (name === 'wf_post_login_path' ? returnCookie : undefined)),
    set: vi.fn(),
    delete: vi.fn()
  };
  const result = load({
    url: new URL(`https://dashboard.example/auth/complete${handoff ? `?handoff=${handoff}` : ''}`),
    platform: { env: { SESSIONS: {} } },
    cookies
  } as unknown as Parameters<typeof load>[0]);
  return { result, cookies };
}

beforeEach(() => {
  vi.clearAllMocks();
  consumeSessionHandoff.mockResolvedValue({ sessionToken: 'session-token' });
  getSession.mockResolvedValue({ email: 'creator@example.com' });
});

describe('/auth/complete', () => {
  it('returns to the linked asset after sign-in and clears the remembered path', async () => {
    const { result, cookies } = run('/assets/recABCDEFGHIJKLMN?tab=timeline');

    await expect(result).rejects.toMatchObject({ status: 302, location: '/assets/recABCDEFGHIJKLMN?tab=timeline' });
    expect(cookies.set).toHaveBeenCalledWith('session', 'session-token', {});
    expect(cookies.delete).toHaveBeenCalledWith('wf_post_login_path', { path: '/' });
  });

  it('goes to the portfolio when nothing was remembered or the value is not an asset page', async () => {
    for (const value of [undefined, 'https://evil.example', '//evil.example', '/login']) {
      await expect(run(value).result).rejects.toMatchObject({ status: 302, location: '/dashboard' });
    }
  });

  it('never follows the remembered path without a valid sign-in', async () => {
    consumeSessionHandoff.mockResolvedValue(null);
    const { result, cookies } = run('/assets/recABCDEFGHIJKLMN');

    await expect(result).rejects.toMatchObject({ status: 302, location: '/login' });
    expect(cookies.set).not.toHaveBeenCalled();
  });
});
