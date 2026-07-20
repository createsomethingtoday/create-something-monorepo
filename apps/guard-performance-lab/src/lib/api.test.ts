import { describe, expect, it } from 'vitest';
import { guideResponse, programResponse } from './api.js';
import { programMap } from './data.js';

describe('guide API contract', () => {
  it('returns structured guidance', async () => {
    const response = await guideResponse(new Request('http://local/api/guide', { method: 'POST', body: JSON.stringify({ stage: 'help', helpSource: 'nail' }) }));
    expect(response.status).toBe(200);
    expect((await response.json()).output.requestedContext).toContain('help');
  });
  it('returns actionable schema issues', async () => {
    const response = await guideResponse(new Request('http://local/api/guide', { method: 'POST', body: JSON.stringify({ stage: 'invented' }) }));
    expect(response.status).toBe(400);
    expect((await response.json()).issues[0].path).toBe('stage');
  });
});

describe('program map API contract', () => {
  it('returns the same complete canonical map used by MCP and the app', async () => {
    const response = programResponse();
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(await response.json()).toEqual({ ok: true, program: programMap });
  });
});
