import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { lstat, open, opendir, realpath } from 'node:fs/promises';
import { isAbsolute, join, relative } from 'node:path';

const MAX_FILE_BYTES = 1024 * 1024;
const MAX_TOTAL_BYTES = 16 * 1024 * 1024;
const MAX_DIRECTORY_ENTRIES = 4096;
const hash = (value) => `sha256:${createHash('sha256').update(value).digest('hex')}`;
const canonical = (value) =>
  Array.isArray(value)
    ? value.map(canonical)
    : value && typeof value === 'object'
      ? Object.fromEntries(
          Object.keys(value)
            .sort()
            .map((key) => [key, canonical(value[key])])
        )
      : value;
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const order = (left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0);

/** Bounded, read-only inventory. Commands and raw package contents never leave this module. */
export async function scanRepository(repoRoot, { maximumSources = 512 } = {}) {
  if (!Number.isSafeInteger(maximumSources) || maximumSources < 1 || maximumSources > 4096)
    throw new TypeError('maximumSources must be an integer between 1 and 4096');
  const root = await realpath(repoRoot);
  let sourceCount = 0;
  let totalBytes = 0;
  let directoryEntries = 0;
  const packages = [];
  const workflows = [];
  const githubWorkflows = [];
  const fail = (code, path) => {
    throw new Error(`Workflow discovery ${code}: ${path}`);
  };
  async function metadata(path, optional = false) {
    try {
      const info = await lstat(join(root, path));
      if (info.isSymbolicLink()) fail('unsafe symlink', path);
      const resolved = await realpath(join(root, path));
      const inside = relative(root, resolved);
      if (
        inside === '..' ||
        inside.startsWith('../') ||
        inside.startsWith('..\\') ||
        isAbsolute(inside)
      )
        fail('unsafe source path', path);
      return info;
    } catch (error) {
      if (optional && error.code === 'ENOENT') return undefined;
      // Preserve our bounded diagnostics; never echo underlying file content.
      if (error.message?.startsWith('Workflow discovery ')) throw error;
      fail('source unavailable', path);
    }
  }
  async function directories(path, optional = true) {
    const info = await metadata(path, optional);
    if (!info) return [];
    if (!info.isDirectory()) fail('invalid directory', path);
    const result = [];
    const directory = await opendir(join(root, path));
    for await (const entry of directory) {
      if (++directoryEntries > MAX_DIRECTORY_ENTRIES) fail('directory entry limit exceeded', path);
      if (entry.isSymbolicLink()) fail('unsafe symlink', `${path}/${entry.name}`);
      result.push({ name: entry.name, isDirectory: entry.isDirectory(), isFile: entry.isFile() });
    }
    return result.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  }
  async function readSource(path, optional = false) {
    const info = await metadata(path, optional);
    if (!info) return undefined;
    if (!info.isFile()) fail('invalid source file', path);
    if (++sourceCount > maximumSources) fail('source count limit exceeded', path);
    if (info.size > MAX_FILE_BYTES) fail('per-file byte limit exceeded', path);
    let handle;
    try {
      handle = await open(join(root, path), constants.O_RDONLY | constants.O_NOFOLLOW);
      const opened = await handle.stat();
      if (!opened.isFile() || opened.dev !== info.dev || opened.ino !== info.ino)
        fail('source changed during read', path);
      const buffer = Buffer.alloc(MAX_FILE_BYTES + 1);
      let length = 0;
      while (length < buffer.length) {
        const { bytesRead } = await handle.read(buffer, length, buffer.length - length, null);
        if (bytesRead === 0) break;
        length += bytesRead;
      }
      if (length > MAX_FILE_BYTES) fail('per-file byte limit exceeded', path);
      const after = await metadata(path);
      if (
        after.dev !== opened.dev ||
        after.ino !== opened.ino ||
        after.size !== opened.size ||
        after.mtimeMs !== opened.mtimeMs ||
        length !== opened.size
      )
        fail('source changed during read', path);
      totalBytes += length;
      if (totalBytes > MAX_TOTAL_BYTES) fail('total byte limit exceeded', path);
      return buffer.subarray(0, length);
    } catch (error) {
      if (error.message?.startsWith('Workflow discovery ')) throw error;
      fail('source read failed', path);
    } finally {
      await handle?.close();
    }
  }
  function parseJson(bytes, path) {
    try {
      const value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
      if (!object(value)) fail('invalid JSON object', path);
      return value;
    } catch {
      fail('invalid JSON object', path);
    }
  }
  async function addPackage(path, optional = false) {
    const bytes = await readSource(path, optional);
    if (!bytes) return;
    const value = parseJson(bytes, path);
    if (typeof value.name !== 'string' || !value.name.trim() || value.name.length > 256)
      fail('invalid package identity', path);
    if (
      value.scripts !== undefined &&
      (!object(value.scripts) ||
        Object.values(value.scripts).some((command) => typeof command !== 'string'))
    )
      fail('invalid package scripts', path);
    packages.push({
      path,
      sha256: hash(bytes),
      name: value.name,
      scriptNames: Object.keys(value.scripts ?? {}).sort()
    });
  }
  await addPackage('package.json');
  for (const parent of ['apps', 'packages']) {
    for (const entry of await directories(parent)) {
      if (!entry.isDirectory || entry.name === 'node_modules' || entry.name === '.git') continue;
      const prefix = `${parent}/${entry.name}`;
      await addPackage(`${prefix}/package.json`, true);
      if (parent !== 'packages') continue;
      for (const workflow of await directories(`${prefix}/workflows`)) {
        if (!workflow.isDirectory || workflow.name === 'node_modules' || workflow.name === '.git')
          continue;
        const path = `${prefix}/workflows/${workflow.name}/workflow.json`;
        const bytes = await readSource(path, true);
        if (bytes)
          workflows.push({ path, sha256: hash(bytes), definition: parseJson(bytes, path) });
      }
    }
  }
  if (await metadata('.github', true)) {
    for (const entry of await directories('.github/workflows')) {
      if (!/\.ya?ml$/.test(entry.name)) continue;
      const path = `.github/workflows/${entry.name}`;
      if (!entry.isFile) fail('invalid source file', path);
      const bytes = await readSource(path);
      githubWorkflows.push({ path, sha256: hash(bytes) });
    }
  }
  const inventory = {
    schema: 'workflow-discovery-inventory@1',
    packages: packages.sort(order),
    workflows: workflows.sort(order),
    githubWorkflows: githubWorkflows.sort(order)
  };
  return { ...inventory, digest: hash(JSON.stringify(canonical(inventory))) };
}
