// Static Assets currently ignores Range on these MP4s. Keep all other assets native.
const VIDEOS = new Set(['/screen.mp4', '/walkthrough.mp4', '/screen-mobile.mp4', '/walkthrough-mobile.mp4']);
function bounds(value, size) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(value);
  if (!match || (!match[1] && !match[2])) return null;
  let start, end;
  if (!match[1]) {
    const suffix = Number(match[2]);
    if (!Number.isSafeInteger(suffix) || suffix <= 0) return null;
    start = Math.max(0, size - suffix); end = size - 1;
  } else {
    start = Number(match[1]); end = match[2] ? Number(match[2]) : size - 1;
  }
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= size || start > end) return null;
  return [start, Math.min(end, size - 1)];
}
function matchesValidator(value, headers) {
  if (value.startsWith('"')) return value === headers.get('etag');
  if (value.startsWith('W/')) return false;
  const date = Date.parse(value), modified = Date.parse(headers.get('last-modified') || '');
  return Number.isFinite(date) && Number.isFinite(modified) && date === modified;
}
function sliceStream(body, start, end) {
  const reader = body.getReader();
  let offset = 0;
  return new ReadableStream({
    async pull(controller) {
      try {
        while (true) {
          const {value, done} = await reader.read();
          if (done) { controller.error(new Error('Asset ended before requested byte range')); return; }
          const chunkStart = offset; offset += value.byteLength;
          if (offset <= start) continue;
          controller.enqueue(value.subarray(Math.max(0, start - chunkStart), Math.min(value.byteLength, end + 1 - chunkStart)));
          if (offset > end) { await reader.cancel(); controller.close(); }
          return;
        }
      } catch (error) { controller.error(error); await reader.cancel(error); }
    },
    cancel(reason) { return reader.cancel(reason); },
  }, {highWaterMark: 0});
}
export default {
  async fetch(request, env, ctx) {
    const response = await env.ASSETS.fetch(request);
    const range = request.headers.get('range');
    if (!VIDEOS.has(new URL(request.url).pathname) || response.status !== 200) return response;
    if (!range || request.method === 'HEAD') {
      const headers = new Headers(response.headers); headers.set('accept-ranges', 'bytes');
      const size = response.headers.get('x-walkthrough-bytes');
      if (!headers.has('content-length') && size != null) headers.set('content-length', String(size));
      return new Response(response.body, {status: response.status, headers});
    }
    if (request.method !== 'GET' || !response.body) return response;
    const validator = request.headers.get('if-range');
    if (validator && !matchesValidator(validator, response.headers)) return response;
    const length = response.headers.get('content-length') ?? response.headers.get('x-walkthrough-bytes');
    const size = Number(length);
    if (!length || !Number.isSafeInteger(size) || size < 0 || response.headers.has('content-encoding')) return response;
    const selected = bounds(range, size);
    const headers = new Headers(response.headers);
    headers.set('accept-ranges', 'bytes');
    if (!selected) {
      await response.body.cancel();
      headers.set('content-range', `bytes */${size}`); headers.set('content-length', '0');
      return new Response(null, {status: 416, headers});
    }
    const [start, end] = selected;
    headers.set('content-range', `bytes ${start}-${end}/${size}`);
    headers.set('content-length', String(end - start + 1));
    let body = sliceStream(response.body, start, end);
    // workerd requires a known-length stream to retain Content-Length on the wire.
    if (typeof FixedLengthStream !== 'undefined') {
      const fixed = new FixedLengthStream(end - start + 1);
      ctx.waitUntil(body.pipeTo(fixed.writable));
      body = fixed.readable;
    }
    return new Response(body, {status: 206, headers});
  },
};
