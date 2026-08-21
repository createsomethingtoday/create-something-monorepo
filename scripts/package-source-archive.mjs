#!/usr/bin/env node

import { execFile, spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import {
  access,
  link,
  lstat,
  mkdir,
  open,
  readFile,
  readlink,
  realpath,
  rm,
  rmdir,
  statfs,
  writeFile
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const DEFAULT_RESERVE_BYTES = 5 * 1024 ** 3;
const ROOT_MANIFESTS = ['package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'tsconfig.json'];
const GENERATED_SEGMENTS = new Set([
  '.build',
  '.cache',
  '.next',
  '.open-next',
  '.svelte-kit',
  '.turbo',
  '.vite',
  '.wrangler',
  'build',
  'coverage',
  'dist',
  'node_modules',
  'out',
  'output',
  'playwright-report',
  'target',
  'test-results'
]);

function usage() {
  console.log(`Usage:
  node scripts/package-source-archive.mjs --package <name-or-path> --output <file.tar.gz> [options]

Creates one source archive from the selected pnpm workspace package, its local
workspace dependency closure, and required root manifests. The command includes
tracked changes and non-ignored untracked source files from the working tree.

Options:
  --package <selector>       Required exact pnpm package name or package path
  --output <file.tar.gz>     Required destination; existing outputs are refused
  --root <path>              Repository root; defaults to the current directory
  --include <path>           Add a non-generated repository path; repeatable
  --reserve-bytes <bytes>    Free-space reserve after worst-case archive growth
                             (default: 5368709120, or 5 GiB)
  --json                     Print only the JSON receipt summary
  --help                     Show this help
`);
}

export function parseArgs(argv) {
  const args = argv.slice(2).filter((arg) => arg !== '--');
  const options = {
    includes: [],
    reserveBytes: DEFAULT_RESERVE_BYTES,
    root: process.cwd(),
    json: false
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--package' && args[index + 1]) options.package = args[++index];
    else if (arg === '--output' && args[index + 1]) options.output = args[++index];
    else if (arg === '--root' && args[index + 1]) options.root = args[++index];
    else if (arg === '--include' && args[index + 1]) options.includes.push(args[++index]);
    else if (arg === '--reserve-bytes' && args[index + 1]) {
      const value = Number(args[++index]);
      if (!Number.isSafeInteger(value) || value < 0)
        throw new Error('--reserve-bytes must be a non-negative integer');
      options.reserveBytes = value;
    } else if (arg === '--json') options.json = true;
    else if (arg === '--help' || arg === '-h') options.help = true;
    else throw new Error(`Unknown or incomplete argument: ${arg}`);
  }

  return options;
}

function relativeInside(root, candidate, label) {
  const relative = path.relative(root, candidate);
  if (!relative || relative === '.') return '.';
  if (relative.startsWith(`..${path.sep}`) || relative === '..' || path.isAbsolute(relative)) {
    throw new Error(`${label} must stay inside the repository: ${candidate}`);
  }
  return relative.split(path.sep).join('/');
}

function isGenerated(relativePath) {
  return relativePath.split('/').some((segment) => GENERATED_SEGMENTS.has(segment));
}

function isCredentialLike(relativePath) {
  const basename = path.posix.basename(relativePath).toLowerCase();
  const publicEnvironmentExamples = new Set(['.env.example', '.env.sample', '.env.template']);
  if (
    basename === '.env' ||
    (basename.startsWith('.env.') && !publicEnvironmentExamples.has(basename))
  )
    return true;
  if (
    ['.dev.vars', '.netrc', '.pypirc', 'credentials.json', 'service-account.json'].includes(
      basename
    )
  )
    return true;
  return ['.key', '.p12', '.pfx', '.pem'].includes(path.posix.extname(basename));
}

async function assertSafeConfiguration(root, relativePath) {
  if (path.posix.basename(relativePath).toLowerCase() !== '.npmrc') return;
  const contents = await readFile(path.join(root, relativePath), 'utf8');
  const credentialKey = /(?:^|:)(_auth|_authtoken|password|username)$/i;
  for (const rawLine of contents.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith(';') || !line.includes('=')) continue;
    const key = line.slice(0, line.indexOf('=')).trim();
    if (credentialKey.test(key)) {
      throw new Error(
        `Credential-like npm configuration requires separate review: ${relativePath}`
      );
    }
  }
}

async function pathExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function runJson(command, args, cwd) {
  const { stdout } = await execFileAsync(command, args, { cwd, maxBuffer: 100 * 1024 * 1024 });
  try {
    return JSON.parse(stdout);
  } catch (error) {
    throw new Error(`${command} returned invalid JSON: ${error.message}`);
  }
}

export async function resolveWorkspaceClosure(root, selector) {
  const selected = await runJson(
    'pnpm',
    ['--filter', selector, 'list', '--depth', '-1', '--json'],
    root
  );
  if (!Array.isArray(selected) || selected.length !== 1) {
    throw new Error(
      `--package must select exactly one workspace project; matched ${selected?.length ?? 0}`
    );
  }

  const stableSelector = selected[0].name || selected[0].path;
  const closure = await runJson(
    'pnpm',
    ['--filter', `${stableSelector}...`, 'list', '--depth', '-1', '--json'],
    root
  );
  if (!Array.isArray(closure) || closure.length === 0)
    throw new Error(`No workspace closure found for ${selector}`);

  const projects = [];
  for (const project of closure) {
    if (!project.path || !project.name)
      throw new Error('pnpm workspace results must include package names and paths');
    const projectPath = await realpath(path.resolve(root, project.path));
    const relativePath = relativeInside(root, projectPath, `Workspace package ${project.name}`);
    if (relativePath === '.' || isGenerated(relativePath)) {
      throw new Error(`Unsafe workspace package path for ${project.name}: ${relativePath}`);
    }
    projects.push({ name: project.name, path: relativePath });
  }

  return projects.sort((left, right) => left.name.localeCompare(right.name));
}

async function hashFile(filePath) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(filePath)) hash.update(chunk);
  return hash.digest('hex');
}

async function describeFile(root, relativePath) {
  const absolutePath = path.join(root, relativePath);
  const metadata = await lstat(absolutePath);
  if (metadata.isSymbolicLink()) {
    const target = await readlink(absolutePath);
    relativeInside(
      root,
      path.resolve(path.dirname(absolutePath), target),
      `Symlink ${relativePath}`
    );
    return {
      path: relativePath,
      type: 'symlink',
      size: Buffer.byteLength(target),
      sha256: createHash('sha256').update(target).digest('hex')
    };
  }
  if (!metadata.isFile())
    throw new Error(`Archive inputs must be files or symlinks: ${relativePath}`);
  return {
    path: relativePath,
    type: 'file',
    size: metadata.size,
    sha256: await hashFile(absolutePath)
  };
}

async function listArchiveInputs(root, projectPaths, includes) {
  const { stdout } = await execFileAsync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
    { cwd: root, encoding: 'buffer', maxBuffer: 100 * 1024 * 1024 }
  );
  const candidates = stdout
    .toString('utf8')
    .split('\0')
    .filter(Boolean)
    .map((file) => file.split(path.sep).join('/'));

  const allowedRoots = [...projectPaths, ...includes];
  const selected = [];
  for (const file of candidates) {
    if (file.includes('\n') || file.includes('\r'))
      throw new Error(`Newlines are not supported in archive paths: ${file}`);
    const allowed =
      ROOT_MANIFESTS.includes(file) ||
      allowedRoots.some((rootPath) => file === rootPath || file.startsWith(`${rootPath}/`));
    if (!allowed || isGenerated(file) || !(await pathExists(path.join(root, file)))) continue;
    if (isCredentialLike(file))
      throw new Error(`Credential-like file requires separate review: ${file}`);
    await assertSafeConfiguration(root, file);
    selected.push(file);
  }

  selected.sort();
  if (selected.length === 0)
    throw new Error('The selected package closure contains no archiveable files');
  return selected;
}

function projectedTarBytes(files) {
  return files.reduce((total, file) => total + 512 + Math.ceil(file.size / 512) * 512, 1024);
}

async function findExistingAncestor(candidate) {
  let current = path.resolve(candidate);
  while (!(await pathExists(current))) {
    const parent = path.dirname(current);
    if (parent === current) throw new Error(`No existing ancestor for output path: ${candidate}`);
    current = parent;
  }
  return current;
}

async function canonicalizeProspectivePath(candidate) {
  const resolved = path.resolve(candidate);
  const ancestor = await findExistingAncestor(resolved);
  return path.resolve(await realpath(ancestor), path.relative(ancestor, resolved));
}

async function availableBytes(candidate) {
  const filesystem = await statfs(await findExistingAncestor(candidate), { bigint: true });
  return filesystem.bavail * filesystem.bsize;
}

async function ensureAbsent(paths) {
  for (const filePath of paths) {
    if (await pathExists(filePath))
      throw new Error(`Refusing to overwrite existing output: ${filePath}`);
  }
}

function defaultLockPath(root) {
  const rootHash = createHash('sha256').update(root).digest('hex').slice(0, 16);
  return path.join(os.tmpdir(), `create-something-package-source-archive-${rootHash}.lock`);
}

async function acquireLock(root) {
  const lockPath = process.env.PACKAGE_SOURCE_ARCHIVE_LOCK || defaultLockPath(root);
  let handle;
  try {
    handle = await open(lockPath, 'wx');
  } catch (error) {
    if (error.code === 'EEXIST') throw new Error(`Another package archive is active: ${lockPath}`);
    throw error;
  }
  try {
    await handle.writeFile(
      `${JSON.stringify({ pid: process.pid, root, startedAt: new Date().toISOString() })}\n`
    );
  } catch (error) {
    await handle.close();
    await rm(lockPath, { force: true });
    throw error;
  }
  return { handle, lockPath };
}

async function createTar(root, files, outputPath) {
  await new Promise((resolve, reject) => {
    const child = spawn('tar', ['-czf', outputPath, '-C', root, '--null', '-T', '-'], {
      stdio: ['pipe', 'ignore', 'pipe']
    });
    let stderr = '';
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`tar failed with exit code ${code}: ${stderr.trim()}`));
    });
    child.stdin.end(`${files.join('\0')}\0`);
  });
}

async function verifyListing(archivePath, expectedFiles) {
  const { stdout } = await execFileAsync('tar', ['-tzf', archivePath], {
    maxBuffer: 100 * 1024 * 1024
  });
  const actual = stdout.split('\n').filter(Boolean).sort();
  assertSameFiles(expectedFiles, actual, 'Archive listing differs from the explicit manifest');
}

function assertSameFiles(expected, actual, message) {
  if (expected.length !== actual.length || expected.some((file, index) => file !== actual[index])) {
    throw new Error(`${message}: expected ${expected.length} files, found ${actual.length}`);
  }
}

function assertStableSources(before, after) {
  const beforeJson = JSON.stringify(before);
  const afterJson = JSON.stringify(after);
  if (beforeJson !== afterJson)
    throw new Error('Source files changed while the archive was being created; output discarded');
}

async function publishExclusive(temporary, destination) {
  let linked = false;
  try {
    await link(temporary, destination);
    linked = true;
    await rm(temporary);
  } catch (error) {
    if (linked) await rm(destination, { force: true });
    throw error;
  }
}

export async function createPackageArchive(options) {
  if (!options.package) throw new Error('--package is required');
  if (!options.output) throw new Error('--output is required');

  const root = await realpath(path.resolve(options.root));
  const output = await canonicalizeProspectivePath(options.output);
  if (!output.endsWith('.tar.gz')) throw new Error('--output must end in .tar.gz');

  const includePaths = [];
  for (const include of options.includes || []) {
    const absoluteInclude = await realpath(path.resolve(root, include));
    const relativeInclude = relativeInside(root, absoluteInclude, '--include');
    if (relativeInclude === '.' || isGenerated(relativeInclude)) {
      throw new Error(
        `--include cannot select the repository root or generated content: ${include}`
      );
    }
    includePaths.push(relativeInclude);
  }

  const receiptPaths = [output, `${output}.manifest.json`, `${output}.sha256`];
  await ensureAbsent(receiptPaths);
  const lock = await acquireLock(root);
  const partialId = `${process.pid}-${randomUUID()}`;
  const temporaryArchive = `${output}.partial-${partialId}`;
  const temporaryManifest = `${output}.manifest.json.partial-${partialId}`;
  const temporaryChecksum = `${output}.sha256.partial-${partialId}`;
  const published = [];
  const outputDirectory = path.dirname(output);
  const outputDirectoryExisted = await pathExists(outputDirectory);

  try {
    const projects = await resolveWorkspaceClosure(root, options.package);
    const filePaths = await listArchiveInputs(
      root,
      projects.map((project) => project.path),
      includePaths
    );
    const files = await Promise.all(filePaths.map((file) => describeFile(root, file)));
    const projectedBytes = projectedTarBytes(files);
    const freeBytes = await availableBytes(outputDirectory);
    const requiredBytes = BigInt(projectedBytes + options.reserveBytes);
    if (freeBytes < requiredBytes) {
      throw new Error(
        `Insufficient disk space: ${freeBytes} bytes available; ${requiredBytes} required ` +
          `(${projectedBytes} projected archive bytes plus ${options.reserveBytes} reserve)`
      );
    }

    await mkdir(outputDirectory, { recursive: true });
    await createTar(root, filePaths, temporaryArchive);
    await verifyListing(temporaryArchive, filePaths);
    const filesAfter = await Promise.all(filePaths.map((file) => describeFile(root, file)));
    assertStableSources(files, filesAfter);

    const archiveHash = await hashFile(temporaryArchive);
    const manifest = {
      schemaVersion: 1,
      package: options.package,
      workspacePackages: projects.map((project) => project.name),
      projectedTarBytes: projectedBytes,
      reserveBytes: options.reserveBytes,
      files
    };

    await writeFile(temporaryManifest, `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' });
    await writeFile(temporaryChecksum, `${archiveHash}  ${path.basename(output)}\n`, {
      flag: 'wx'
    });
    await publishExclusive(temporaryArchive, output);
    published.push(output);
    await publishExclusive(temporaryManifest, `${output}.manifest.json`);
    published.push(`${output}.manifest.json`);
    await publishExclusive(temporaryChecksum, `${output}.sha256`);
    published.push(`${output}.sha256`);

    return {
      archive: output,
      checksum: archiveHash,
      fileCount: files.length,
      manifest: `${output}.manifest.json`,
      package: options.package,
      sha256Receipt: `${output}.sha256`,
      workspacePackages: manifest.workspacePackages
    };
  } catch (error) {
    await Promise.all(
      [temporaryArchive, temporaryManifest, temporaryChecksum, ...published].map((filePath) =>
        rm(filePath, { force: true })
      )
    );
    if (!outputDirectoryExisted) await rmdir(outputDirectory).catch(() => {});
    throw error;
  } finally {
    await lock.handle.close();
    await rm(lock.lockPath, { force: true });
  }
}

async function main() {
  const options = parseArgs(process.argv);
  if (options.help) {
    usage();
    return;
  }
  const receipt = await createPackageArchive(options);
  if (options.json) console.log(JSON.stringify(receipt));
  else {
    console.log(`Created ${receipt.archive}`);
    console.log(`Packages: ${receipt.workspacePackages.join(', ')}`);
    console.log(`Files: ${receipt.fileCount}`);
    console.log(`SHA-256: ${receipt.checksum}`);
    console.log(`Manifest: ${receipt.manifest}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
