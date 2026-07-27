import { describe, expect, it } from 'vitest';

import { retiredContainerResponse, retiredResponse } from './retired-response.js';

describe('retired analyzer response', () => {
  it('keeps health checks readable without reviving the analyzer', async () => {
    const response = retiredResponse(new Request('https://analyzer.example/health'));

    expect(response.status).toBe(200);
    expect(response.headers.get('x-webflow-site-analyzer-host')).toBe('retired');
    await expect(response.json()).resolves.toMatchObject({
      name: 'webflow-site-analyzer-mcp-remote',
      path: '/health',
      replacementService: 'webflow-template-review-mcp',
      status: 'retired'
    });
  });

  it('rejects retired MCP traffic with a stable 410 contract', async () => {
    const response = retiredResponse(
      new Request('https://analyzer.example/mcp', {
        method: 'POST',
        headers: { Authorization: 'Bearer historical-client' }
      })
    );

    expect(response.status).toBe(410);
    await expect(response.json()).resolves.toMatchObject({
      error: 'retired_mcp_runtime',
      path: '/mcp',
      status: 'retired'
    });
  });

  it('answers CORS preflight without forwarding the request', () => {
    const response = retiredResponse(
      new Request('https://analyzer.example/mcp', { method: 'OPTIONS' })
    );

    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-methods')).toBe('GET,POST,OPTIONS');
  });

  it('keeps legacy Durable Object callbacks quarantined', async () => {
    const response = retiredContainerResponse(
      new Request('https://analyzer.example/container/callback')
    );

    expect(response.status).toBe(410);
    await expect(response.json()).resolves.toMatchObject({
      error: 'retired_container_runtime',
      status: 'retired'
    });
  });
});
