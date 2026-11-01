import { describe, it, expect, vi } from 'vitest';
import { newProject } from '../animation/model';
import { createMotionGenerator, KIMI_MODEL } from './motion-generation';

const url = new URL('http://127.0.0.1:5183/api/motion/proposals');
const request = (origin = url.origin) => new Request(url, { method: 'POST', headers: { origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ project: newProject(), prompt: 'Draw a curve', editableIds: [] }) });
describe('local generation boundary', () => {
  it('denies production and cross-origin calls before any inference', async () => {
    const provider = vi.fn();
    const generate = createMotionGenerator(provider);
    expect((await generate(request(), url, { dev: false, token: 'unit-test', accountId: 'a'.repeat(32) })).status).toBe(404);
    expect((await generate(request('https://external.invalid'), url, { dev: true, token: 'unit-test', accountId: 'a'.repeat(32) })).status).toBe(403);
    expect((await generate(request(), new URL('https://draw.createsomething.agency/api/motion/proposals'), { dev: true, token: 'unit-test', accountId: 'a'.repeat(32) })).status).toBe(404);
    expect((await generate(request(), url, { dev: true })).status).toBe(503);
    expect(provider).not.toHaveBeenCalled();
  });
  it('returns a validated intent with actual provider identity and never forwards credentials', async () => {
    const intent = { version: 'draw.motion-intent.v1', summary: 'Caption', additions: [{ name: 'Caption', color: '#225588', weight: 30,
      geometry: { type: 'text', text: 'Hello', width: 180 }, poses: [{ time: 0, x: 100, y: 100 }] }], edits: [] };
    const provider = vi.fn().mockResolvedValue(Response.json({ success: true, result: { model: KIMI_MODEL, choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(intent) } }], usage: { prompt_tokens: 10, completion_tokens: 20 } } }));
    const response = await createMotionGenerator(provider)(request(), url, { dev: true, token: 'unit-test-secret', accountId: 'a'.repeat(32) });
    expect(response.status).toBe(200);
    const body = await response.text(); expect(body).toContain(KIMI_MODEL); expect(body).not.toContain('unit-test-secret');
    expect(provider).toHaveBeenCalledTimes(1);
  });
  it('rejects incomplete/wrong-model output and does not retry provider failures', async () => {
    for (const result of [
      { model: 'another-model', choices: [{ finish_reason: 'stop', message: { content: '{}' } }] },
      { model: KIMI_MODEL, choices: [{ finish_reason: 'length', message: { content: '{}' } }] }
    ]) {
      const provider = vi.fn().mockResolvedValue(Response.json({ success: true, result }));
      const response = await createMotionGenerator(provider)(request(), url, { dev: true, token: 'test', accountId: 'a'.repeat(32) });
      expect(response.status).toBe(502); expect(provider).toHaveBeenCalledTimes(1);
    }
    const provider = vi.fn().mockResolvedValue(new Response('private provider details', { status: 401 }));
    const response = await createMotionGenerator(provider)(request(), url, { dev: true, token: 'test', accountId: 'a'.repeat(32) });
    expect(response.status).toBe(502); expect(await response.text()).not.toContain('private provider details');
    expect(provider).toHaveBeenCalledTimes(1);
  });
  it('holds one inference slot and releases it after completion', async () => {
    let resolve!: (response: Response) => void;
    const provider = vi.fn(() => new Promise<Response>(r => { resolve = r; }));
    const generate = createMotionGenerator(provider), config = { dev: true, token: 'test', accountId: 'a'.repeat(32) };
    const first = generate(request(), url, config);
    await vi.waitFor(() => expect(provider).toHaveBeenCalledTimes(1));
    expect((await generate(request(), url, config)).status).toBe(429);
    resolve(new Response('', { status: 503 })); expect((await first).status).toBe(502);
    const next = generate(request(), url, config);
    await vi.waitFor(() => expect(provider).toHaveBeenCalledTimes(2));
    resolve(new Response('', { status: 503 })); await next;
  });
  it('rejects oversized request bodies before inference', async () => {
    const provider = vi.fn();
    const large = new Request(url, { method: 'POST', headers: { origin: url.origin }, body: 'x'.repeat(500_001) });
    expect((await createMotionGenerator(provider)(large, url, { dev: true, token: 'test', accountId: 'a'.repeat(32) })).status).toBe(400);
    expect(provider).not.toHaveBeenCalled();
  });
  it('aborts the provider on cancellation without retrying and releases the slot', async () => {
    const provider = vi.fn((_url: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_, reject) => {
      init!.signal!.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
    }));
    const controller = new AbortController(), generate = createMotionGenerator(provider);
    const config = { dev: true, token: 'test', accountId: 'a'.repeat(32) };
    const pending = generate(new Request(request(), { signal: controller.signal }), url, config);
    await vi.waitFor(() => expect(provider).toHaveBeenCalledTimes(1));
    controller.abort();
    const response = await pending;
    expect(response.status).toBe(504);
    expect(await response.text()).toContain('not retried');
    expect(provider).toHaveBeenCalledTimes(1);
    provider.mockResolvedValueOnce(new Response('', { status: 503 }));
    expect((await generate(request(), url, config)).status).toBe(502);
  });
});
