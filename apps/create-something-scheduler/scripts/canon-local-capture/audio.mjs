export const MAX_SECONDS = 600;
export function validMeetingURL(value) {
  try {
    const u = new URL(value);
    // One official Google Meet code, without invite credentials or query fragments.
    return u.protocol === 'https:' &&
      u.hostname === 'meet.google.com' &&
      !u.username &&
      !u.password &&
      !u.port &&
      !u.search &&
      !u.hash &&
      /^\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/.test(u.pathname)
      ? u.href
      : null;
  } catch {
    return null;
  }
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
