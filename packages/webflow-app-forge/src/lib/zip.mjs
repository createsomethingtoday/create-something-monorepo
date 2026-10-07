// Minimal ZIP reader: central directory inventory plus entry extraction for
// stored (0) and deflated (8) entries. Enough to inspect a Designer Extension
// bundle without a dependency.
import { inflateRawSync } from 'node:zlib';

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

  const read = (entry) => {
    const q = entry.localOffset;
    if (buffer.readUInt32LE(q) !== LOC_SIG) throw new Error(`Corrupt local header for ${entry.name}`);
    const nameLength = buffer.readUInt16LE(q + 26);
    const extraLength = buffer.readUInt16LE(q + 28);
    const start = q + 30 + nameLength + extraLength;
    const data = buffer.subarray(start, start + entry.compressedSize);
    if (entry.method === 0) return Buffer.from(data);
    if (entry.method === 8) return inflateRawSync(data);
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
