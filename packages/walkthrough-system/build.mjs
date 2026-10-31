import { readFile, writeFile, copyFile, mkdir, mkdtemp, rm, rename, lstat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { validateManifest } from './player.js';
import { HOSTING_HEADERS } from './hosting-headers.mjs';

export const STATIC_FILES = Object.freeze(['index.html', 'player.js', 'style.css', 'manifest.json', 'screen.mp4', 'walkthrough.mp4', 'poster.jpg']);
export const MOBILE_FILES = Object.freeze(['screen-mobile.mp4', 'walkthrough-mobile.mp4', 'poster-mobile.jpg']);
const packageRoot = dirname(fileURLToPath(import.meta.url));
const RENDERED_FILES = ['screen.mp4', 'walkthrough.mp4', 'poster.jpg'];
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
async function fileHash(filename) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(filename)) hash.update(chunk);
  return hash.digest('hex');
}

/** Validate first, then create a standalone allowlisted static bundle. */
export async function build(root = packageRoot, { renameDirectory = rename } = {}) {
  root = resolve(root);
  const lock = join(root, '.walkthrough-operation.lock');
  try { await mkdir(lock); }
  catch (error) {
    if (error.code === 'EEXIST') throw new Error(`A render or build is in progress. Inspect prior outputs before removing an interrupted operation's stale lock: ${lock}`);
    throw error;
  }
  try { return await buildLocked(root, renameDirectory); }
  finally { await rm(lock, { recursive: true }); }
}

async function buildLocked(root, renameDirectory) {
  const manifestBytes = await readFile(join(root, 'manifest.json'));
  const manifest = validateManifest(JSON.parse(manifestBytes.toString('utf8')));
  const staticFiles = [...STATIC_FILES, ...(manifest.mobile ? MOBILE_FILES : [])];
  const renderedFiles = [...RENDERED_FILES, ...(manifest.mobile ? MOBILE_FILES : [])];
  if (manifest.source.file !== 'screen.mp4') throw new Error('The static bundle expects source.file to be screen.mp4.');
  let receipt;
  try {
    const receiptInfo = await lstat(join(root, 'render-receipt.json'));
    if (!receiptInfo.isFile()) throw new Error('Receipt must be a regular file.');
    receipt = JSON.parse(await readFile(join(root, 'render-receipt.json'), 'utf8'));
  } catch {
    throw new Error('A valid render-receipt.json is required. Render the walkthrough before building.');
  }
  if (receipt?.manifest_sha256 !== sha256(manifestBytes)) throw new Error('The manifest has changed since rendering. Render again before building.');
  for (const name of staticFiles) {
    const info = await lstat(join(root, name));
    if (!info.isFile() || info.size === 0) throw new Error(`${name} must be a non-empty regular file; symlinks are not included.`);
    if (name.endsWith('.mp4')) {
      const { open } = await import('node:fs/promises');
      const handle = await open(join(root, name), 'r');
      try {
        const header = Buffer.alloc(12);
        await handle.read(header, 0, 12, 0);
        if (header.toString('ascii', 4, 8) !== 'ftyp') throw new Error(`${name} is not an MP4 artifact.`);
      } finally { await handle.close(); }
    }
  }
  for (const name of renderedFiles) {
    if (receipt.output_sha256?.[name] !== await fileHash(join(root, name))) throw new Error(`${name} does not match the render receipt. Render again before building.`);
  }
  const transaction = await mkdtemp(join(root, '.dist-build-'));
  const staging = join(transaction, 'public');
  const backup = join(transaction, 'previous');
  const destination = join(root, 'dist');
  let preserveBackup = false;
  await mkdir(staging);
  try {
    for (const name of staticFiles) {
      if (name !== 'manifest.json') await copyFile(join(root, name), join(staging, name));
    }
    for (const name of renderedFiles) {
      if (receipt.output_sha256[name] !== await fileHash(join(staging, name))) throw new Error(`${name} changed during the build. Render again before building.`);
    }
    // Keep acquisition paths and source hashes in the authoring manifest only.
    const publicManifest = {
      version: manifest.version || 1,
      title: manifest.title,
      description: manifest.description || '',
      source: { file: manifest.source.file, duration: manifest.source.duration, attribution: manifest.source.attribution || '' },
      scenes: manifest.scenes.map(({ id, start, end, label, title, prompt, evidence }) => ({ id, start, end, label, title, prompt, evidence }))
    };
    if (manifest.mobile) publicManifest.mobile = {file: manifest.mobile.file, poster: manifest.mobile.poster, width: manifest.mobile.width, height: manifest.mobile.height, shots: manifest.mobile.shots.map(({start, end, crop, label}) => ({start, end, crop, label}))};
    if (manifest.mobile?.presentation) publicManifest.mobile.presentation = manifest.mobile.presentation;
    await writeFile(join(staging, 'manifest.json'), `${JSON.stringify(publicManifest, null, 2)}\n`);
    // Static Assets omits Content-Length from binding responses; publish exact
    // video sizes with the same verified bundle so streaming ranges stay aligned.
    let headers = HOSTING_HEADERS;
    for (const name of staticFiles.filter(name => name.endsWith('.mp4'))) {
      headers += `\n/${name}\n  X-Walkthrough-Bytes: ${(await lstat(join(staging, name))).size}\n`;
    }
    await writeFile(join(staging, '_headers'), headers);
    let hadPrevious = false;
    try {
      const info = await lstat(destination);
      if (!info.isDirectory() || info.isSymbolicLink()) throw new Error('dist must be a regular directory.');
      await renameDirectory(destination, backup);
      hadPrevious = true;
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
    try { await renameDirectory(staging, destination); }
    catch (error) {
      if (hadPrevious) {
        try { await renameDirectory(backup, destination); }
        catch (rollbackError) {
          preserveBackup = true;
          throw new Error(`Bundle rollback incomplete. Recover the previous bundle from ${backup}: ${rollbackError.message}`, { cause: error });
        }
      }
      throw error;
    }
    return { destination, files: [...staticFiles, '_headers'], published: false };
  } finally {
    if (!preserveBackup) await rm(transaction, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(JSON.stringify(await build(), null, 2)); }
  catch (error) { console.error(`Build failed: ${error.message}`); process.exitCode = 1; }
}
