import { inflateRawSync } from 'node:zlib';
import { BundleError, MAX_UPLOAD_BYTES } from './bundle-contract';

export type ArchiveFile = {
  path: string;
  sizeBytes: number;
  readable: boolean;
  truncated: boolean;
  text?: string;
};
const MAX_FILES = 500;
const MAX_INFLATED = 40 * 1024 * 1024;
const MAX_ENTRY = 8 * 1024 * 1024;
const MAX_TEXT_FILE = 256 * 1024;
const MAX_TEXT_TOTAL = 3 * 1024 * 1024;
const textExtension =
  /\.(?:[cm]?[jt]sx?|json|html?|css|scss|sass|less|md|txt|yaml|yml|toml|xml|svg|map|svelte|vue|lock)$/i;
const crcTable = Array.from({ length: 256 }, (_, value) => {
  for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0);
  return value >>> 0;
});
export function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 0xff];
  return (crc ^ 0xffffffff) >>> 0;
}

/** Inspect ZIP bytes only. No code is executed and nothing is written to a filesystem. */
export function inspectZip(bytes: Uint8Array): ArchiveFile[] {
  const reject = (message: string): never => {
    throw new BundleError('INVALID_ARCHIVE', message);
  };
  if (bytes.length > MAX_UPLOAD_BYTES)
    throw new BundleError('TOO_LARGE', 'ZIP files must be at most 20 MB.', 413);
  if (bytes.length < 22) return reject('This is not a complete ZIP archive.');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (
      view.getUint32(i, true) === 0x06054b50 &&
      i + 22 + view.getUint16(i + 20, true) === bytes.length
    ) {
      end = i;
      break;
    }
  }
  if (end < 0) return reject('ZIP end directory was not found.');
  if (view.getUint16(end + 4, true) || view.getUint16(end + 6, true))
    return reject('Multi-disk ZIP files are not supported.');
  const count = view.getUint16(end + 10, true);
  const directorySize = view.getUint32(end + 12, true);
  let at = view.getUint32(end + 16, true);
  const directoryStart = at;
  if (count < 1 || count > MAX_FILES || count !== view.getUint16(end + 8, true))
    return reject('ZIP must contain between 1 and 500 entries.');
  if (directorySize === 0xffffffff || at === 0xffffffff || at + directorySize !== end)
    return reject('Unsupported or inconsistent ZIP directory.');
  const decoder = new TextDecoder('utf-8', { fatal: true });
  const paths = new Set<string>();
  let totalInflated = 0;
  let textTotal = 0;
  const files: ArchiveFile[] = [];
  const ranges: Array<[number, number]> = [];
  for (let i = 0; i < count; i++) {
    if (at + 46 > end || view.getUint32(at, true) !== 0x02014b50)
      return reject('ZIP directory is damaged.');
    const flags = view.getUint16(at + 8, true);
    const method = view.getUint16(at + 10, true);
    const crc = view.getUint32(at + 16, true);
    const compressed = view.getUint32(at + 20, true);
    const expanded = view.getUint32(at + 24, true);
    const nameLength = view.getUint16(at + 28, true);
    const extraLength = view.getUint16(at + 30, true);
    const commentLength = view.getUint16(at + 32, true);
    const local = view.getUint32(at + 42, true);
    const mode = (view.getUint32(at + 38, true) >>> 16) & 0xf000;
    if (at + 46 + nameLength + extraLength + commentLength > end)
      return reject('ZIP entry is incomplete.');
    if (flags & (1 | 64) || ![0, 8].includes(method))
      return reject('Encrypted or unsupported compression in ZIP.');
    if ([compressed, expanded, local].includes(0xffffffff) || mode === 0xa000)
      return reject('ZIP64 archives and symbolic links are not supported.');
    let path: string;
    try {
      path = decoder.decode(bytes.subarray(at + 46, at + 46 + nameLength));
    } catch {
      return reject('ZIP filenames must use UTF-8.');
    }
    if (
      !path ||
      path.length > 512 ||
      /[\\\x00-\x1f\x7f]/.test(path) ||
      path.startsWith('/') ||
      /^[a-z]:/i.test(path) ||
      path.split('/').some((segment) => segment === '..' || segment === '.')
    )
      return reject('ZIP contains an unsafe filename.');
    if (paths.has(path)) return reject('ZIP contains duplicate filenames.');
    paths.add(path);
    totalInflated += expanded;
    if (
      expanded > MAX_ENTRY ||
      totalInflated > MAX_INFLATED ||
      (expanded > 1024 * 1024 && expanded > Math.max(1, compressed) * 200)
    )
      return reject('ZIP exceeds safe expansion limits (8 MB per file, 40 MB total).');
    if (local + 30 > directoryStart || view.getUint32(local, true) !== 0x04034b50)
      return reject('ZIP local entry is invalid.');
    if (view.getUint16(local + 6, true) !== flags || view.getUint16(local + 8, true) !== method)
      return reject('ZIP local and directory metadata disagree.');
    const localNameLength = view.getUint16(local + 26, true);
    const localExtraLength = view.getUint16(local + 28, true);
    const dataAt = local + 30 + localNameLength + localExtraLength;
    if (dataAt + compressed > directoryStart || dataAt < local)
      return reject('ZIP entry overlaps its directory.');
    let localPath: string;
    try {
      localPath = decoder.decode(bytes.subarray(local + 30, local + 30 + localNameLength));
    } catch {
      return reject('ZIP local filename must use UTF-8.');
    }
    if (localPath !== path) return reject('ZIP filenames disagree between headers.');
    if (ranges.some(([start, stop]) => local < stop && dataAt + compressed > start))
      return reject('ZIP entries overlap.');
    ranges.push([local, dataAt + compressed]);
    at += 46 + nameLength + extraLength + commentLength;
    if (path.endsWith('/')) continue;
    const file: ArchiveFile = { path, sizeBytes: expanded, readable: false, truncated: false };
    if (
      textExtension.test(path) ||
      /(?:^|\/)(?:LICENSE|Dockerfile|\.gitignore|\.env(?:\..*)?)$/i.test(path)
    ) {
      // A full bounded inflate validates the actual size and CRC before any source is returned.
      let raw: Uint8Array;
      try {
        raw =
          method === 0
            ? bytes.subarray(dataAt, dataAt + compressed)
            : inflateRawSync(bytes.subarray(dataAt, dataAt + compressed), {
                maxOutputLength: Math.min(MAX_ENTRY, expanded) + 1
              });
      } catch {
        return reject('A source file cannot be safely decompressed.');
      }
      if (raw.byteLength !== expanded || crc32(raw) !== crc)
        return reject('ZIP source integrity check failed.');
      const budget = Math.max(0, Math.min(MAX_TEXT_FILE, MAX_TEXT_TOTAL - textTotal));
      const slice = raw.subarray(0, budget);
      if (!slice.includes(0) && budget > 0) {
        file.text = new TextDecoder().decode(slice);
        file.readable = true;
        file.truncated = raw.byteLength > budget;
        textTotal += slice.length;
      } else file.truncated = true;
    }
    files.push(file);
  }
  if (at !== end || files.length === 0)
    return reject('ZIP directory is incomplete or has no files.');
  return files;
}
