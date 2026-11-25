export const MAX_SECONDS = 3600;
// Return only a credential-free reference. Never persist a caller's raw URL.
export function validMeetingURL(value) {
  try {
    const u = new URL(value);
    if (u.protocol !== 'https:' || u.username || u.password || u.port || u.hash) return null;
    if (u.hostname === 'meet.google.com')
      return !u.search && /^\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/.test(u.pathname) ? u.href : null;
    // Zoom-owned DNS suffix, with valid DNS labels; excludes suffix lookalikes.
    if (!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*zoom\.us$/.test(u.hostname)) return null;
    const match = u.pathname.match(
      /^\/(?:j\/(\d{9,11})|wc\/(\d{9,11})\/join|wc\/join\/(\d{9,11}))$/
    );
    if (!match) return null;
    // Only the documented embedded join passcode is ignored. Unknown URL state fails closed.
    // Its value is never returned, logged or written to local storage.
    if (
      [...u.searchParams.keys()].some((key) => key !== 'pwd') ||
      u.searchParams.getAll('pwd').length > 1
    )
      return null;
    return `${u.origin}/j/${match[1] || match[2] || match[3]}`;
  } catch {
    return null;
  }
}
export function matchesCaptureSource(value, reference) {
  // Signed-in Meet adds a numeric account selector to its joined tab.
  // Keep the stored reference credential-free and validate every other URL component.
  let source = value;
  if (typeof value === 'string' && value.startsWith('https://meet.google.com/')) {
    source = value.replace(/\?authuser=\d+$/, '');
  }
  const canonical = validMeetingURL(source);
  if (!canonical || canonical !== reference) return false;
  // The Zoom /j route can launch the native application: only an already joined web client is a source.
  return (
    canonical.startsWith('https://meet.google.com/') || new URL(value).pathname.startsWith('/wc/')
  );
}
export function encodeWav(chunks, sampleRate) {
  const count = chunks.reduce((n, c) => n + c.length, 0);
  if (
    !Number.isInteger(sampleRate) ||
    sampleRate < 8000 ||
    sampleRate > 192000 ||
    count > sampleRate * MAX_SECONDS
  )
    throw new Error('Invalid or excessive audio.');
  const buffer = new ArrayBuffer(44 + count * 2);
  const view = new DataView(buffer);
  const ascii = (offset, text) =>
    [...text].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
  ascii(0, 'RIFF');
  view.setUint32(4, 36 + count * 2, true);
  ascii(8, 'WAVE');
  ascii(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  ascii(36, 'data');
  view.setUint32(40, count * 2, true);
  let offset = 44;
  for (const chunk of chunks)
    for (const sample of chunk) {
      const x = Math.max(-1, Math.min(1, Number.isFinite(sample) ? sample : 0));
      view.setInt16(offset, x < 0 ? x * 32768 : x * 32767, true);
      offset += 2;
    }
  return buffer;
}

// At most one second of pending PCM may wait for local disk. Slow storage fails closed.
export class StreamingWav {
  constructor(writer, sampleRate) {
    encodeWav([], sampleRate); // Validate rate before opening the capture path.
    this.writer = writer;
    this.sampleRate = sampleRate;
    this.count = 0;
    this.pending = 0;
    this.failure = null;
    this.queue = Promise.resolve();
  }
  async begin() {
    await this.writer.write(encodeWav([], this.sampleRate));
  }
  append(samples) {
    if (this.failure) throw this.failure;
    const remaining = this.sampleRate * MAX_SECONDS - this.count;
    const chunk = samples.subarray(0, remaining);
    if (this.pending + chunk.length > this.sampleRate)
      throw new Error('Local disk cannot keep up.');
    const pcm = encodeWav([chunk], this.sampleRate).slice(44);
    this.count += chunk.length;
    this.pending += chunk.length;
    this.queue = this.queue.then(async () => {
      if (this.failure) return;
      try {
        await this.writer.write(pcm);
      } catch (error) {
        this.failure = error;
      } finally {
        this.pending -= chunk.length;
      }
    });
    return this.count === this.sampleRate * MAX_SECONDS;
  }
  async finish(shouldSave = () => true) {
    await this.queue;
    if (this.failure) throw this.failure;
    if (!shouldSave()) throw new Error('Source changed before save.');
    const header = encodeWav([], this.sampleRate);
    const view = new DataView(header);
    view.setUint32(4, 36 + this.count * 2, true);
    view.setUint32(40, this.count * 2, true);
    await this.writer.write({ type: 'write', position: 0, data: header });
    if (!shouldSave()) throw new Error('Source changed before save.');
    await this.writer.close();
  }
  async abort() {
    await this.queue;
    await this.writer.abort().catch(() => {});
  }
}
