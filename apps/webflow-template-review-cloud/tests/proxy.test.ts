import { describe, expect, it, vi } from 'vitest';

import { proxyTemplateReviewRequest } from '../src/proxy.js';

describe('Template Review Cloud public proxy', () => {
  it('routes authenticated Access traffic to the signed-assertion origin without forwarding the bearer', async () => {
    let closeStream: (() => void) | undefined;
    let forwarded: Request | undefined;
    const upstreamStream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('event: ready\n'));
        closeStream = () => controller.close();
      }
    });
    const fetchUpstream = vi.fn(async (request: Request) => {
      forwarded = request;
      return new Response(upstreamStream, {
        status: 202,
        headers: {
          'Content-Type': 'text/event-stream',
          'Mcp-Session-Id': 'session-from-worker'
        }
      });
    });
    const request = new Request('https://template-review.webflow.io/mcp?cursor=next', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer cloudflare-managed-oauth-token',
        'Cf-Access-Jwt-Assertion': 'signed-webflow-access-assertion',
        'Content-Type': 'application/json',
        'Mcp-Session-Id': 'session-from-client',
        'X-Forwarded-Email': 'attacker-controlled@example.com'
      },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'tools/list', id: 1 })
    });

    const response = await Promise.race([
      proxyTemplateReviewRequest(request, { fetch: fetchUpstream }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('proxy buffered the stream')), 100)
      )
    ]);

    expect(fetchUpstream).toHaveBeenCalledOnce();
    if (!forwarded) throw new Error('upstream request was not captured');
    expect(forwarded.url).toBe(
      'https://webflow-template-review-mcp.createsomething.workers.dev/access/mcp?cursor=next'
    );
    expect(forwarded.method).toBe('POST');
    expect(forwarded.headers.get('Authorization')).toBeNull();
    expect(forwarded.headers.get('Cf-Access-Jwt-Assertion')).toBe(
      'signed-webflow-access-assertion'
    );
    expect(forwarded.headers.get('Mcp-Session-Id')).toBe('session-from-client');
    expect(forwarded.headers.get('X-Forwarded-Email')).toBeNull();
    expect(await forwarded.json()).toEqual({ jsonrpc: '2.0', method: 'tools/list', id: 1 });
    expect(response.status).toBe(202);
    expect(response.headers.get('Mcp-Session-Id')).toBe('session-from-worker');

    const reader = response.body?.getReader();
    expect(new TextDecoder().decode((await reader?.read())?.value)).toBe('event: ready\n');
    closeStream?.();
    await reader?.cancel();
  });

  it('fails closed before the origin when an MCP request has no Access assertion', async () => {
    const fetchUpstream = vi.fn();
    const response = await proxyTemplateReviewRequest(
      new Request('https://template-review-mcp-access.wf.app/mcp', {
        headers: { Authorization: 'Bearer untrusted-token' }
      }),
      { fetch: fetchUpstream }
    );

    expect(fetchUpstream).not.toHaveBeenCalled();
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: 'unauthorized',
      message: 'Missing Cloudflare Access application assertion.'
    });
  });

  it('rewrites OAuth discovery and bearer challenges to the public Cloud origin', async () => {
    const upstreamOrigin = 'https://webflow-template-review-mcp.createsomething.workers.dev';
    const publicOrigin = 'https://template-review-mcp-access.wf.app';
    const discoveryFetch = vi.fn(async () =>
      Response.json({
        resource: `${upstreamOrigin}/mcp`,
        authorization_servers: ['https://id.createsomething.space'],
        scopes_supported: ['template-review:read']
      })
    );

    const discovery = await proxyTemplateReviewRequest(
      new Request(`${publicOrigin}/.well-known/oauth-protected-resource`),
      { fetch: discoveryFetch }
    );

    expect(await discovery.json()).toEqual({
      resource: `${publicOrigin}/mcp`,
      authorization_servers: ['https://id.createsomething.space'],
      scopes_supported: ['template-review:read']
    });

    const challengeFetch = vi.fn(async () =>
      Response.json(
        { ok: false, error: { code: 'UNAUTHORIZED' } },
        {
          status: 401,
          headers: {
            'WWW-Authenticate': `Bearer resource_metadata="${upstreamOrigin}/.well-known/oauth-protected-resource"`
          }
        }
      )
    );
    const challenge = await proxyTemplateReviewRequest(
      new Request(`${publicOrigin}/mcp`, {
        headers: { 'Cf-Access-Jwt-Assertion': 'signed-access-assertion' }
      }),
      { fetch: challengeFetch }
    );

    expect(challenge.status).toBe(401);
    expect(challenge.headers.get('WWW-Authenticate')).toBe(
      `Bearer resource_metadata="${publicOrigin}/.well-known/oauth-protected-resource"`
    );
    expect(await challenge.json()).toEqual({ ok: false, error: { code: 'UNAUTHORIZED' } });
  });
});
