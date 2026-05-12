#!/usr/bin/env node
// Sign a Core Ink firmware manifest with the ECDSA P-256 private JWK.
// Reads INK_FIRMWARE_SIGNING_PRIVATE_JWK from the environment (typical:
// `infisical run --env=prod --path=/ -- pnpm sign:manifest -- ...`).
//
// Usage:
//   pnpm --dir packages/calm-operator-ink-firmware sign:manifest -- \
//     --bin .pio/build/m5stack-coreink/firmware.bin \
//     --version 0.1.9 \
//     --url "https://ink.createsomething.agency/ink/firmware/binary?version=0.1.9" \
//     [--notes "Sync function review + 4 bug fixes"]
//
// Output: prints the signed manifest JSON to stdout, ready to feed to:
//   pnpm --dir packages/calm-operator-ink-bridge exec wrangler secret put INK_FIRMWARE_MANIFEST_JSON

import { webcrypto } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

function parseArgs(argv) {
  const out = {};
  const args = argv.slice(2).filter((a) => a !== '--');
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith('--') && i + 1 < args.length) out[a.slice(2)] = args[++i];
  }
  return out;
}

const args = parseArgs(process.argv);
for (const required of ['bin', 'version', 'url']) {
  if (!args[required]) {
    console.error(`Missing required --${required}`);
    process.exit(1);
  }
}

const privateJwkRaw = process.env.INK_FIRMWARE_SIGNING_PRIVATE_JWK?.trim();
if (!privateJwkRaw) {
  console.error('Missing env INK_FIRMWARE_SIGNING_PRIVATE_JWK.');
  console.error('Run inside `infisical run ...` or set the JWK in the environment.');
  process.exit(1);
}

let privateJwk;
try {
  privateJwk = JSON.parse(privateJwkRaw);
} catch (error) {
  console.error('INK_FIRMWARE_SIGNING_PRIVATE_JWK is not valid JSON.');
  process.exit(1);
}
if (privateJwk?.kty !== 'EC' || privateJwk?.crv !== 'P-256' || !privateJwk?.d) {
  console.error('JWK must be an ECDSA P-256 private key (kty=EC, crv=P-256, with d).');
  process.exit(1);
}

const binPath = resolve(args.bin);
const binBytes = await readFile(binPath);
const stats = await stat(binPath);
const size = stats.size;
if (binBytes.length !== size) {
  console.error(`Size mismatch reading ${binPath}`);
  process.exit(1);
}

const sha256Digest = await webcrypto.subtle.digest('SHA-256', binBytes);
const sha256Hex = Array.from(new Uint8Array(sha256Digest)).map((b) => b.toString(16).padStart(2, '0')).join('');

// Signing payload: the same canonical string the firmware will recompute
// before calling mbedtls_ecdsa_verify. Pipe separator avoids ambiguity for
// the three fixed components.
const payload = `${args.version}|${sha256Hex}|${size}`;
const payloadBytes = new TextEncoder().encode(payload);

const key = await webcrypto.subtle.importKey(
  'jwk',
  privateJwk,
  { name: 'ECDSA', namedCurve: 'P-256' },
  false,
  ['sign'],
);

// Web Crypto ECDSA produces raw r||s (64 bytes for P-256), which matches
// the on-device mbedtls path that reads two 32-byte big-endian MPIs.
const sigBytes = new Uint8Array(
  await webcrypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, payloadBytes),
);
if (sigBytes.length !== 64) {
  console.error(`Unexpected signature length ${sigBytes.length}; expected 64.`);
  process.exit(1);
}
const signatureBase64 = Buffer.from(sigBytes).toString('base64');

const manifest = {
  version: args.version,
  url: args.url,
  sha256: sha256Hex,
  size,
  signature: signatureBase64,
};
if (args.notes) manifest.notes = args.notes;

process.stdout.write(JSON.stringify(manifest, null, 2) + '\n');
