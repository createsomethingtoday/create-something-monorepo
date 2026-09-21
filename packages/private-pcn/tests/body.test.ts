import { describe, expect, it } from 'vitest';
import { boundedText } from '../src/lib/server/body';

describe('bounded request body', () => {
  it('counts actual bytes when content-length is absent', async () => {
    const request = new Request('https://example.test', { method: 'POST', body: 'é'.repeat(10) });
    await expect(boundedText(request, 19)).rejects.toThrow(RangeError);
  });
  it('decodes valid UTF-8 across chunks and rejects invalid UTF-8', async () => {
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array([0xc3]));
        controller.enqueue(new Uint8Array([0xa9]));
        controller.close();
      }
    });
    await expect(
      boundedText(
        new Request('https://example.test', {
          method: 'POST',
          body,
          duplex: 'half'
        } as RequestInit),
        2
      )
    ).resolves.toBe('é');
    await expect(
      boundedText(
        new Request('https://example.test', { method: 'POST', body: new Uint8Array([0xff]) })
      )
    ).rejects.toThrow();
  });
});
