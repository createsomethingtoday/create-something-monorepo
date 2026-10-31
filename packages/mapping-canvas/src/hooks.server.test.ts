import { describe, expect, it } from 'vitest';
import { handle } from './hooks.server';
import type { RequestEvent, ResolveOptions } from '@sveltejs/kit';

async function headers(path: string) {
  const response = await handle({
    event: { url: new URL(path, 'https://draw.createsomething.agency') } as RequestEvent,
    resolve: async (_event: RequestEvent, _options?: ResolveOptions) => new Response('canvas')
  });
  return response.headers;
}

describe('Agency mapping embed boundary', () => {
  it('allows only the Agency origin to frame the explicitly embedded root canvas', async () => {
    const result = await headers('/?embed=agency');
    expect(result.get('Content-Security-Policy')).toContain('frame-ancestors https://createsomething.agency;');
    expect(result.has('X-Frame-Options')).toBe(false);
    expect(result.get('Content-Security-Policy')).toContain("object-src 'none'");
  });
  it.each(['/', '/?embed=other', '/animate?embed=agency', '/s/example?embed=agency', '/download?embed=agency'])(
    'retains the framing denial on %s', async (path) => {
      const result = await headers(path);
      expect(result.get('Content-Security-Policy')).toContain("frame-ancestors 'none'");
      expect(result.get('X-Frame-Options')).toBe('DENY');
    }
  );
});
