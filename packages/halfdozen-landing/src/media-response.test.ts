import { describe, expect, it } from 'vitest';
import { createMediaResponse, parseByteRange } from './media-response';

const sourceBody = new TextEncoder().encode('0123456789');

function createSource(): Response {
  return new Response(sourceBody, {
    headers: {
      'Content-Type': 'video/mp4',
      ETag: '"hero-v1"',
      'Last-Modified': 'Thu, 09 Jul 2026 12:00:00 GMT'
    }
  });
}

describe('MP4 byte-range responses', () => {
  it('parses bounded, open-ended, and suffix byte ranges', () => {
    expect(parseByteRange('bytes=2-5', 10)).toEqual({ start: 2, end: 5 });
    expect(parseByteRange('bytes=7-', 10)).toEqual({ start: 7, end: 9 });
    expect(parseByteRange('bytes=-3', 10)).toEqual({ start: 7, end: 9 });
  });

  it('rejects unsupported or unsatisfiable ranges', () => {
    expect(parseByteRange('items=0-1', 10)).toBeNull();
    expect(parseByteRange('bytes=0-1,4-5', 10)).toBeNull();
    expect(parseByteRange('bytes=10-', 10)).toBeNull();
  });

  it('returns a standards-compliant partial response with the strong ETag', async () => {
    const response = await createMediaResponse(createSource(), 'bytes=2-5');

    expect(response.status).toBe(206);
    expect(response.headers.get('accept-ranges')).toBe('bytes');
    expect(response.headers.get('content-range')).toBe('bytes 2-5/10');
    expect(response.headers.get('content-length')).toBe('4');
    expect(response.headers.get('etag')).toBe('"hero-v1"');
    expect(await response.text()).toBe('2345');
  });

  it('supports Safari suffix requests and returns 416 for invalid ranges', async () => {
    const suffixResponse = await createMediaResponse(createSource(), 'bytes=-4');
    expect(suffixResponse.status).toBe(206);
    expect(suffixResponse.headers.get('content-range')).toBe('bytes 6-9/10');
    expect(await suffixResponse.text()).toBe('6789');

    const invalidResponse = await createMediaResponse(createSource(), 'bytes=12-');
    expect(invalidResponse.status).toBe(416);
    expect(invalidResponse.headers.get('content-range')).toBe('bytes */10');
  });

  it('returns the complete representation when If-Range no longer matches', async () => {
    const response = await createMediaResponse(createSource(), 'bytes=2-5', '"hero-v2"');

    expect(response.status).toBe(200);
    expect(response.headers.get('content-range')).toBeNull();
    expect(await response.text()).toBe('0123456789');
  });
});
