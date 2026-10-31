// Minimal ZIP reader: central directory inventory plus entry extraction for
// stored (0) and deflated (8) entries. Enough to inspect a Designer Extension
// bundle without a dependency.
import { inflateRawSync } from 'node:zlib';

/** Submitted bundles are untrusted; a 5 MB zip may inflate to gigabytes. Per-entry cap. */
export const MAX_ENTRY_BYTES = 64 * 1024 * 1024;
/** And across the whole archive: many small highly compressible entries add up. */
export const MAX_TOTAL_BYTES = 256 * 1024 * 1024;

const EOCD_SIG = 0x06054b50;
const CEN_SIG = 0x02014b50;
const LOC_SIG = 0x04034b50;

export function readZip(buffer) {
  const eocd = findEocd(buffer);
  if (eocd < 0) throw new Error('Not a zip archive (no end-of-central-directory record)');
  const entryCount = buffer.readUInt16LE(eocd + 10);
  const cdOffset = buffer.readUInt32LE(eocd + 16);

  const entries = [];
  let p = cdOffset;
  for (let i = 0; i < entryCount; i += 1) {
    if (buffer.readUInt32LE(p) !== CEN_SIG) throw new Error('Corrupt central directory');
    const method = buffer.readUInt16LE(p + 10);
    const compressedSize = buffer.readUInt32LE(p + 20);
    const size = buffer.readUInt32LE(p + 24);
    const nameLength = buffer.readUInt16LE(p + 28);
    const extraLength = buffer.readUInt16LE(p + 30);
    const commentLength = buffer.readUInt16LE(p + 32);
    const localOffset = buffer.readUInt32LE(p + 42);
    const name = buffer.toString('utf8', p + 46, p + 46 + nameLength);
    entries.push({ name, method, compressedSize, size, localOffset, isDirectory: name.endsWith('/') });
    p += 46 + nameLength + extraLength + commentLength;
  }

  const declaredTotal = entries.reduce((n, e) => n + e.size, 0);
  if (declaredTotal > MAX_TOTAL_BYTES) throw new Error(`Archive declares ${declaredTotal} bytes uncompressed (limit ${MAX_TOTAL_BYTES}); refusing to inflate`);
  let inflated = 0;
  const account = (buf) => {
    inflated += buf.length;
    if (inflated > MAX_TOTAL_BYTES) throw new Error(`Archive inflates past ${MAX_TOTAL_BYTES} bytes in total; refusing to inflate`);
    return buf;
  };

  const read = (entry) => {
    const q = entry.localOffset;
    if (buffer.readUInt32LE(q) !== LOC_SIG) throw new Error(`Corrupt local header for ${entry.name}`);
    const nameLength = buffer.readUInt16LE(q + 26);
    const extraLength = buffer.readUInt16LE(q + 28);
    const start = q + 30 + nameLength + extraLength;
    const data = buffer.subarray(start, start + entry.compressedSize);
    if (entry.method === 0) return account(Buffer.from(data));
    if (entry.method === 8) {
      if (entry.size > MAX_ENTRY_BYTES) throw new Error(`${entry.name} declares ${entry.size} bytes uncompressed (limit ${MAX_ENTRY_BYTES}); refusing to inflate`);
      try {
        return account(inflateRawSync(data, { maxOutputLength: MAX_ENTRY_BYTES }));
      } catch (err) {
        if (err?.code === 'ERR_BUFFER_TOO_LARGE') throw new Error(`${entry.name} inflates past ${MAX_ENTRY_BYTES} bytes; refusing to inflate`);
        throw err;
      }
    }
    throw new Error(`Unsupported compression method ${entry.method} for ${entry.name}`);
  };

  return {
    entries,
    files: entries.filter((e) => !e.isDirectory),
    read,
    readText: (entry) => read(entry).toString('utf8'),
  };
}

function findEocd(buffer) {
  const min = Math.max(0, buffer.length - 22 - 0xffff);
  for (let i = buffer.length - 22; i >= min; i -= 1) {
    if (buffer.readUInt32LE(i) === EOCD_SIG) return i;
  }
  return -1;
}
