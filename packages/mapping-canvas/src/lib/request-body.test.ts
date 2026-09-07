import { describe, expect, it } from 'vitest';
import { readJsonBodyBounded, RequestBodyTooLargeError } from './request-body';

describe('bounded JSON request bodies', () => {
  it('parses a body without a content length', async () => {
    const body = new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode('{"ok":true}')); controller.close(); } });
    await expect(readJsonBodyBounded(new Request('https://draw.example/api', { method: 'PUT', body, duplex: 'half' } as RequestInit), 64)).resolves.toEqual({ ok: true });
  });

  it('stops a chunked body at the byte limit', async () => {
    const body = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(40)); controller.enqueue(new Uint8Array(40)); controller.close(); } });
    await expect(readJsonBodyBounded(new Request('https://draw.example/api', { method: 'PUT', body, duplex: 'half' } as RequestInit), 64)).rejects.toBeInstanceOf(RequestBodyTooLargeError);
  });

  it('rejects an oversized declared body before reading', async () => {
    const request = new Request('https://draw.example/api', { method: 'PUT', headers: { 'content-length': '65' }, body: '{}' });
    await expect(readJsonBodyBounded(request, 64)).rejects.toBeInstanceOf(RequestBodyTooLargeError);
  });
});
