#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const home =
  process.env.CS_ZELLIJ_HOME ||
  path.join(os.homedir(), 'Library/Application Support/CREATE SOMETHING/Zellij');
const binDir = process.env.CS_ZELLIJ_BIN_DIR || path.join(os.homedir(), '.local/bin');
const wasm =
  'packages/zellij-cockpit/target/wasm32-wasip1/release/create-something-zellij-cockpit.wasm';
const files = ['scripts/zellij-cockpit.mjs', 'scripts/zellij-cockpit-hook.mjs', wasm];
const digest = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const quote = (value) => `'${String(value).replaceAll("'", "'\\''")}'`;
export function install({ source = root, destination = home, binaries = binDir, rollback } = {}) {
  const current = path.join(destination, 'current');
  const bin = path.join(binaries, 'cs-zellij');
  const marker = '# CREATE SOMETHING managed Zellij launcher';
  if (fs.existsSync(bin) && !fs.readFileSync(bin, 'utf8').includes(marker))
    throw new Error(`Unrecognized executable at ${bin}; refusing to overwrite`);
  let previous = null;
  try {
    if (!fs.lstatSync(current).isSymbolicLink())
      throw new Error('Current release path is not a symlink');
    previous = fs.readlinkSync(current);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  let releaseId;
  let release;
  let hashes;
  if (rollback) {
    if (!/^[a-f0-9]{16}$/.test(rollback))
      throw new Error('Rollback requires a recorded release ID');
    releaseId = rollback;
    release = path.join(destination, 'releases', releaseId);
    ({ hashes } = JSON.parse(fs.readFileSync(path.join(release, 'manifest.json'), 'utf8')));
    for (const file of files)
      if (digest(fs.readFileSync(path.join(release, file))) !== hashes[file])
        throw new Error('Rollback release checksum mismatch');
  } else {
    const contents = Object.fromEntries(
      files.map((file) => [file, fs.readFileSync(path.join(source, file))])
    );
    if (!contents[wasm].subarray(0, 8).equals(Buffer.from([0, 97, 115, 109, 1, 0, 0, 0])))
      throw new Error('Invalid WebAssembly artifact');
    hashes = Object.fromEntries(files.map((file) => [file, digest(contents[file])]));
    releaseId = digest(JSON.stringify(hashes)).slice(0, 16);
    release = path.join(destination, 'releases', releaseId);
    for (const file of files) {
      const dest = path.join(release, file);
      if (fs.existsSync(dest) && !fs.readFileSync(dest).equals(contents[file]))
        throw new Error('Immutable release collision');
    }
    for (const file of files) {
      const dest = path.join(release, file);
      fs.mkdirSync(path.dirname(dest), { recursive: true, mode: 0o700 });
      if (!fs.existsSync(dest)) fs.writeFileSync(dest, contents[file], { mode: 0o600 });
    }
    const manifest = path.join(release, 'manifest.json');
    if (!fs.existsSync(manifest))
      fs.writeFileSync(manifest, JSON.stringify({ releaseId, hashes }, null, 2), { mode: 0o600 });
  }
  fs.mkdirSync(binaries, { recursive: true });
  const wrapper = `#!/bin/sh\n${marker}\nexec ${quote(process.execPath)} ${quote(path.join(current, 'scripts/zellij-cockpit.mjs'))} "$@"\n`;
  const token = crypto.randomUUID();
  const tempBin = `${bin}.${token}.tmp`;
  fs.writeFileSync(tempBin, wrapper, { mode: 0o755 });
  const temp = path.join(destination, `current-${token}`);
  fs.symlinkSync(release, temp);
  fs.renameSync(tempBin, bin);
  fs.renameSync(temp, current);
  for (const file of files)
    if (digest(fs.readFileSync(path.join(current, file))) !== hashes[file])
      throw new Error('Installed checksum mismatch');
  const receipt = {
    releaseId,
    release,
    previous,
    hashes,
    installedAt: new Date().toISOString(),
    bin,
    rollback: Boolean(rollback)
  };
  const receiptDir = path.join(destination, 'installations');
  fs.mkdirSync(receiptDir, { recursive: true, mode: 0o700 });
  const receiptFile = path.join(receiptDir, `${token}.json`);
  fs.writeFileSync(receiptFile, JSON.stringify(receipt, null, 2), { mode: 0o600 });
  return { ...receipt, receiptFile };
}
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const args = process.argv.slice(2);
    if (args.length && (args.length !== 2 || args[0] !== '--rollback'))
      throw new Error('Usage: install [--rollback release-id]');
    console.log(JSON.stringify(install({ rollback: args[1] }), null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
