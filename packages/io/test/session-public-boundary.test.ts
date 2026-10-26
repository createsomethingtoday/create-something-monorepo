import { expect, it, vi } from 'vitest';
import { handle } from '../src/hooks.server.js';

function anonymousEvent(path: string) {
  return {
    url: new URL(`https://createsomething.io${path}`),
    cookies: { get: () => undefined, set() {}, delete() {} },
    locals: {} as { user?: unknown },
    platform: { env: { ENVIRONMENT: 'production' } }
  };
}

it('allows an anonymous public page without attaching an identity', async () => {
  const event = anonymousEvent('/papers');
  const resolve = vi.fn(async () => new Response('public'));
  const response = await handle({ event, resolve } as never);
  expect(response.status).toBe(200);
  expect(await response.text()).toBe('public');
  expect(event.locals.user).toBeUndefined();
  expect(resolve).toHaveBeenCalledTimes(1);
});

it('rejects anonymous admin API access before resolving protected content', async () => {
  const event = anonymousEvent('/api/admin/analytics');
  const resolve = vi.fn(async () => new Response('protected'));
  const response = await handle({ event, resolve } as never);
  expect(response.status).toBe(401);
  expect(event.locals.user).toBeUndefined();
  expect(resolve).not.toHaveBeenCalled();
  expect(await response.text()).not.toContain('protected');
});
