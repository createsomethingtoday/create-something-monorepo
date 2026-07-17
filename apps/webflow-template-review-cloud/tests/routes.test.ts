import { afterEach, describe, expect, it, vi } from 'vitest';

import { DELETE, GET, OPTIONS, POST } from '../src/app/mcp/route.js';
import { POST as POST_MCP_SUBPATH } from '../src/app/mcp/[...path]/route.js';
import { GET as GET_SSE } from '../src/app/sse/route.js';
import { GET as GET_SSE_SUBPATH } from '../src/app/sse/[...path]/route.js';
import { GET as GET_DISCOVERY } from '../src/app/.well-known/oauth-protected-resource/route.js';
import { GET as GET_DISCOVERY_SUBPATH } from '../src/app/.well-known/oauth-protected-resource/[...path]/route.js';
import { GET as GET_HEALTH } from '../src/app/health/route.js';

describe('public MCP route', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('exposes every Streamable HTTP method through the Cloud adapter', async () => {
    const fetchUpstream = vi.fn(
      async (request: Request) =>
        new Response(request.method, {
          status: request.method === 'POST' ? 202 : 200
        })
    );
    vi.stubGlobal('fetch', fetchUpstream);

    const handlers = { GET, POST, DELETE, OPTIONS };
    for (const [method, handler] of Object.entries(handlers)) {
      const response = await handler(
        new Request('https://template-review-mcp-access.wf.app/mcp', {
          method,
          headers: { 'Cf-Access-Jwt-Assertion': 'signed-access-assertion' },
          ...(method === 'POST' ? { body: '{}' } : {})
        })
      );
      expect(await response.text()).toBe(method);
    }

    expect(fetchUpstream).toHaveBeenCalledTimes(4);
  });

  it('exposes MCP subpaths, SSE, and OAuth discovery at the public origin', async () => {
    const seenUrls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (request: Request) => {
        seenUrls.push(request.url);
        if (request.url.includes('oauth-protected-resource')) {
          return Response.json({
            resource: 'https://webflow-template-review-mcp.createsomething.workers.dev/mcp'
          });
        }
        return new Response('ok');
      })
    );

    await POST_MCP_SUBPATH(
      new Request('https://template-review-mcp-access.wf.app/mcp/messages?session=1', {
        method: 'POST',
        headers: { 'Cf-Access-Jwt-Assertion': 'signed-access-assertion' },
        body: '{}'
      })
    );
    await GET_SSE(
      new Request('https://template-review-mcp-access.wf.app/sse', {
        headers: { 'Cf-Access-Jwt-Assertion': 'signed-access-assertion' }
      })
    );
    await GET_SSE_SUBPATH(
      new Request('https://template-review-mcp-access.wf.app/sse/messages', {
        headers: { 'Cf-Access-Jwt-Assertion': 'signed-access-assertion' }
      })
    );
    const discovery = await GET_DISCOVERY(
      new Request('https://template-review-mcp-access.wf.app/.well-known/oauth-protected-resource')
    );
    const pathDiscovery = await GET_DISCOVERY_SUBPATH(
      new Request(
        'https://template-review-mcp-access.wf.app/.well-known/oauth-protected-resource/sse'
      )
    );

    expect(seenUrls).toEqual([
      'https://webflow-template-review-mcp.createsomething.workers.dev/access/mcp/messages?session=1',
      'https://webflow-template-review-mcp.createsomething.workers.dev/access/sse',
      'https://webflow-template-review-mcp.createsomething.workers.dev/access/sse/messages',
      'https://webflow-template-review-mcp.createsomething.workers.dev/.well-known/oauth-protected-resource',
      'https://webflow-template-review-mcp.createsomething.workers.dev/.well-known/oauth-protected-resource/sse'
    ]);
    expect((await discovery.json()).resource).toBe('https://template-review-mcp-access.wf.app/mcp');
    expect((await pathDiscovery.json()).resource).toBe(
      'https://template-review-mcp-access.wf.app/mcp'
    );
  });

  it('discloses the upstream dependency and reports its live health', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({
          name: 'webflow-template-review-mcp',
          version: '1.0.0'
        })
      )
    );

    const response = await GET_HEALTH(
      new Request('https://template-review-mcp-access.wf.app/health')
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      name: 'webflow-template-review-cloud',
      status: 'ok',
      adapter: 'transparent-proxy',
      publicOrigin: 'https://template-review-mcp-access.wf.app',
      upstream: {
        origin: 'https://webflow-template-review-mcp.createsomething.workers.dev',
        status: 200,
        health: {
          name: 'webflow-template-review-mcp',
          version: '1.0.0'
        }
      },
      endpoints: {
        mcp: '/mcp',
        sse: '/sse',
        discovery: '/.well-known/oauth-protected-resource'
      }
    });
  });
});
