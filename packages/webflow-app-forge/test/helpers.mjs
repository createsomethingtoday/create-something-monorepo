// Test fixtures built on the fly: a stored-only zip writer and a tiny PNG
// encoder, so the repo holds no binary blobs.
import { deflateRawSync, deflateSync } from 'node:zlib';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** files: [{ name, data: Buffer|string }] -> zip Buffer (stored entries). */
export function writeZip(files) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const f of files) {
    const raw = Buffer.isBuffer(f.data) ? f.data : Buffer.from(String(f.data), 'utf8');
    // deflate: true writes a method-8 entry; declaredSize lies about the uncompressed size (zip-bomb shape).
    const data = f.deflate ? deflateRawSync(raw) : raw;
    const method = f.deflate ? 8 : 0;
    const declared = f.declaredSize ?? raw.length;
    const name = Buffer.from(f.name, 'utf8');
    const crc = crc32(raw);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(declared, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, name, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(declared, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, name);
    offset += local.length + name.length + data.length;
  }
  const cd = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(cd.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);
  return Buffer.concat([...locals, cd, eocd]);
}

/** Solid-color RGB PNG of the given size. Compresses to a few KB. */
export function writePng(width, height, rgb = [30, 30, 30]) {
  const row = Buffer.alloc(1 + width * 3);
  for (let x = 0; x < width; x += 1) {
    row[1 + x * 3] = rgb[0];
    row[2 + x * 3] = rgb[1];
    row[3 + x * 3] = rgb[2];
  }
  const raw = Buffer.concat(Array.from({ length: height }, () => row));
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
    return Buffer.concat([len, typeBuf, data, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

export function tmp(prefix = 'wf-forge-') {
  return mkdtempSync(join(tmpdir(), prefix));
}

export const GOOD_MANIFEST = JSON.stringify({ name: 'Section Namer', publicDir: 'public', size: 'default', apiVersion: '2' });
export const GOOD_HTML = '<!doctype html><html lang="en"><head><meta charset="UTF-8" /><title>Section Namer</title><link href="./styles.css" rel="stylesheet" /></head><body><div id="root"></div><script src="./bundle.js"></script></body></html>';
export const GOOD_JS = '(()=>{"use strict";const e=document.getElementById("root");webflow.subscribe("selectedelement",async t=>{const n=t?await t.getTag():null;e.textContent=n==="section"?"section":"other"});})();';
export const GOOD_MAP = JSON.stringify({ version: 3, file: 'bundle.js', sources: ['webpack:///./src/index.tsx'], names: [], mappings: 'AAAA' });

/** Writes a complete good project (bundle.zip + review-artifacts) into dir. */
export function writeGoodProject(dir, overrides = {}) {
  const files = [
    { name: 'webflow.json', data: overrides.manifest ?? GOOD_MANIFEST },
    { name: 'index.html', data: overrides.html ?? GOOD_HTML },
    { name: 'bundle.js', data: overrides.js ?? GOOD_JS },
    { name: 'styles.css', data: 'body{margin:0}' },
    ...(overrides.extraFiles || []),
  ];
  writeFileSync(join(dir, 'bundle.zip'), writeZip(files));
  if (overrides.map !== null) {
    mkdirSync(join(dir, 'review-artifacts'), { recursive: true });
    writeFileSync(join(dir, 'review-artifacts', 'bundle.js.map'), overrides.map ?? GOOD_MAP);
  }
  return dir;
}

/** Writes example listing assets and a listing.json into dir; returns the json path. */
export function writeGoodListing(dir, listingOverrides = {}) {
  mkdirSync(join(dir, 'assets'), { recursive: true });
  writeFileSync(join(dir, 'assets', 'icon.png'), writePng(900, 900, [0, 106, 204]));
  for (let i = 1; i <= 3; i += 1) writeFileSync(join(dir, 'assets', `screenshot-${i}.png`), writePng(1280, 846, [46, 46, 46]));
  const listing = {
    appName: 'Section Namer',
    appCapabilities: 'Designer Extension',
    clientId: '',
    creatorName: 'Acme Studio',
    shortDescription: 'Name every section on the page in one pass, from the Designer.',
    longDescription:
      'Section Namer reads the sections on the current page and lets you give each one a clear name without leaving the Designer.\n\nIt lists every section, lets you rename one in a click, and shows which sections still carry a default name. Nothing changes until you click Apply, and the App makes no network requests.',
    features: ['Lists every section on the page', 'One-click rename', 'Flags default names'],
    categories: ['Design', 'Utilities'],
    paymentType: ['Free'],
    websiteUrl: 'https://sectionnamer.example.com',
    documentationUrl: 'https://sectionnamer.example.com/docs',
    privacyPolicyUrl: 'https://sectionnamer.example.com/privacy',
    termsUrl: 'https://sectionnamer.example.com/terms',
    supportEmail: 'support@sectionnamer.example.com',
    demoVideoUrl: 'https://www.loom.com/share/00000000000000000000000000000000',
    testingSiteUrl: 'https://section-namer-review.webflow.io',
    accessCredentials: 'No account needed. The App works on any site once installed.',
    developerNotes: 'Designer Extension only. No Data API calls, no analytics, no external requests.',
    icon: { path: './assets/icon.png', altText: 'Section Namer logomark: three stacked bars' },
    screenshots: [
      { path: './assets/screenshot-1.png', altText: 'Section Namer panel listing five sections on the home page' },
      { path: './assets/screenshot-2.png', altText: 'Renaming the hero section inline' },
      { path: './assets/screenshot-3.png', altText: 'Default-named sections flagged in yellow' },
    ],
    ...listingOverrides,
  };
  const path = join(dir, 'listing.json');
  writeFileSync(path, JSON.stringify(listing, null, 2));
  return path;
}
