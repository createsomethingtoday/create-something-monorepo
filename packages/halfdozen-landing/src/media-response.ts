export type ByteRange = {
  start: number;
  end: number;
};

export function parseByteRange(value: string, length: number): ByteRange | null {
  if (!Number.isSafeInteger(length) || length <= 0 || !value.startsWith('bytes=') || value.includes(',')) {
    return null;
  }

  const match = /^bytes=(\d*)-(\d*)$/.exec(value.trim());
  if (!match) return null;

  const [, startValue, endValue] = match;
  if (!startValue && !endValue) return null;

  if (!startValue) {
    const suffixLength = Number(endValue);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) return null;

    return {
      start: Math.max(length - suffixLength, 0),
      end: length - 1
    };
  }

  const start = Number(startValue);
  const requestedEnd = endValue ? Number(endValue) : length - 1;
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(requestedEnd) ||
    start < 0 ||
    start >= length ||
    requestedEnd < start
  ) {
    return null;
  }

  return { start, end: Math.min(requestedEnd, length - 1) };
}

function ifRangeMatches(headers: Headers, ifRange: string | null): boolean {
  if (!ifRange) return true;

  const etag = headers.get('etag');
  const lastModified = headers.get('last-modified');
  return (!ifRange.startsWith('W/') && ifRange === etag) || ifRange === lastModified;
}

export async function createMediaResponse(
  source: Response,
  rangeHeader: string | null,
  ifRangeHeader: string | null = null
): Promise<Response> {
  const body = await source.arrayBuffer();
  const headers = new Headers(source.headers);
  const length = body.byteLength;

  headers.set('Accept-Ranges', 'bytes');
  headers.set('Content-Type', headers.get('content-type') || 'video/mp4');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.delete('Content-Range');

  if (!rangeHeader || !ifRangeMatches(headers, ifRangeHeader)) {
    headers.set('Content-Length', String(length));
    return new Response(body, { status: source.status, statusText: source.statusText, headers });
  }

  const range = parseByteRange(rangeHeader, length);
  if (!range) {
    headers.set('Content-Length', '0');
    headers.set('Content-Range', `bytes */${length}`);
    return new Response(null, { status: 416, headers });
  }

  const partialBody = body.slice(range.start, range.end + 1);
  headers.set('Content-Length', String(partialBody.byteLength));
  headers.set('Content-Range', `bytes ${range.start}-${range.end}/${length}`);

  return new Response(partialBody, { status: 206, headers });
}
