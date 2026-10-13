import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { mkdtemp, mkdir, writeFile, readFile, symlink, link, lstat, readlink, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

// An explicit module path lets the same suite test an unpatched negative control,
// a pnpm-patched installation, and the standalone Docker/npm patch installation.
assert.ok(process.env.EXTRACT_ZIP_MODULE, 'Set EXTRACT_ZIP_MODULE to the installed extractor entry point');
const extract = createRequire(import.meta.url)(path.resolve(process.env.EXTRACT_ZIP_MODULE));

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Stored ZIP entries with explicit Unix modes, including duplicate names.
// All malicious targets and canaries belong to the test's own temporary root.
function zip(entries) {
  const files = [], directory = [];
  let offset = 0;
  for (const { name, data = '', mode = 0o100644 } of entries) {
    const filename = Buffer.from(name), content = Buffer.from(data), crc = crc32(content);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(content.length, 18);
    local.writeUInt32LE(content.length, 22);
    local.writeUInt16LE(filename.length, 26);
    files.push(local, filename, content);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(0x0314, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(content.length, 20);
    central.writeUInt32LE(content.length, 24);
    central.writeUInt16LE(filename.length, 28);
    central.writeUInt32LE((mode << 16) >>> 0, 38);
    central.writeUInt32LE(offset, 42);
    directory.push(central, filename);
    offset += local.length + filename.length + content.length;
  }
  const cd = Buffer.concat(directory), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(cd.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...files, cd, end]);
}

async function fixture(t) {
  const root = await mkdtemp(path.join(tmpdir(), 'extract-zip-security-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const dest = path.join(root, 'dest'), outside = path.join(root, 'outside');
  await mkdir(dest);
  await mkdir(outside);
  const canary = path.join(outside, 'canary');
  await writeFile(canary, 'untouched');
  return {
    root, dest, outside, canary,
    async run(entries) {
      const archive = path.join(root, 'fixture.zip');
      await writeFile(archive, zip(entries));
      return extract(archive, { dir: dest });
    },
    async intact() { assert.equal(await readFile(canary, 'utf8'), 'untouched'); }
  };
}
const sym = (name, data) => ({ name, data, mode: 0o120777 });
const absent = async (file) => assert.rejects(lstat(file), { code: 'ENOENT' });

for (const absolute of [false, true]) {
  test(`GHSA-jmr9: rejects ${absolute ? 'absolute' : 'relative'} escaping symlink`, async (t) => {
    const f = await fixture(t);
    await assert.rejects(f.run([sym('escape', absolute ? f.canary : '../outside/canary')]));
    await absent(path.join(f.dest, 'escape'));
    await f.intact();
  });
  test(`GHSA-7pqw: rejects same-name link/file overwrite (${absolute ? 'absolute' : 'relative'})`, async (t) => {
    const f = await fixture(t);
    await assert.rejects(f.run([sym('escape', absolute ? f.canary : '../outside/canary'), { name: 'escape', data: 'changed' }]));
    await absent(path.join(f.dest, 'escape'));
    await f.intact();
  });
}

test('rejects pre-existing leaf symlink before writing', async (t) => {
  const f = await fixture(t);
  await symlink(f.canary, path.join(f.dest, 'leaf'));
  await assert.rejects(f.run([{ name: 'leaf', data: 'changed' }]));
  await f.intact();
});

test('rejects pre-existing hardlink before truncating', async (t) => {
  const f = await fixture(t);
  await link(f.canary, path.join(f.dest, 'leaf'));
  await assert.rejects(f.run([{ name: 'leaf', data: 'changed' }]));
  await f.intact();
});

for (const dangling of [false, true]) {
  test(`checks ${dangling ? 'dangling' : 'existing'} parent symlink before mkdir`, async (t) => {
    const f = await fixture(t);
    const target = dangling ? path.join(f.outside, 'missing') : f.outside;
    await symlink(target, path.join(f.dest, 'parent'));
    await assert.rejects(f.run([{ name: 'parent/created/leaf', data: 'changed' }]));
    await absent(path.join(target, 'created'));
    await f.intact();
  });
}

test('directory entry cannot follow an existing escaping leaf link', async (t) => {
  const f = await fixture(t);
  await symlink(f.outside, path.join(f.dest, 'directory'));
  await assert.rejects(f.run([{ name: 'directory/', mode: 0o40755 }]));
  await f.intact();
});

test('rejects symlink target that escapes through an existing intermediate link', async (t) => {
  const f = await fixture(t);
  await symlink(f.outside, path.join(f.dest, 'alias'));
  await assert.rejects(f.run([sym('escape', 'alias/canary')]));
  await absent(path.join(f.dest, 'escape'));
  await f.intact();
});

test('resolves relative symlink target against canonical parent', async (t) => {
  const f = await fixture(t);
  await mkdir(path.join(f.dest, 'nested'));
  await symlink('..', path.join(f.dest, 'nested', 'alias'));
  // Lexically nested/alias/../outside is in dest; actually it is outside dest.
  await assert.rejects(f.run([sym('nested/alias/escape', '../outside/canary')]));
  await absent(path.join(f.dest, 'escape'));
  await f.intact();
});

test('rejects sibling prefix path confusion', async (t) => {
  const f = await fixture(t);
  await assert.rejects(f.run([sym('escape', '../dest-sibling/secret')]));
  await absent(path.join(f.dest, 'escape'));
});

test('resolves intermediate links before parent segments inside a symlink target', async (t) => {
  const f = await fixture(t);
  await mkdir(path.join(f.dest, 'nested'));
  await symlink('..', path.join(f.dest, 'nested/alias'));
  await assert.rejects(f.run([sym('escape', 'nested/alias/../outside/canary')]));
  await absent(path.join(f.dest, 'escape'));
  await f.intact();
});

for (const absolute of [false, true]) {
  test(`rejects ${absolute ? 'absolute' : 'traversing'} ZIP entry name`, async (t) => {
    const f = await fixture(t);
    const name = absolute ? f.canary : '../outside/canary';
    await assert.rejects(f.run([{ name, data: 'changed' }]));
    await f.intact();
  });
}

test('preserves nested files, executable mode, directories and ordinary overwrites', async (t) => {
  const f = await fixture(t);
  await f.run([{ name: 'nested/', mode: 0o40755 }, { name: 'nested/bin', mode: 0o100755, data: 'first' }, { name: 'nested/bin', data: 'second' }]);
  assert.equal(await readFile(path.join(f.dest, 'nested/bin'), 'utf8'), 'second');
  assert.ok((await lstat(path.join(f.dest, 'nested/bin'))).mode & 0o100);
});

test('preserves internal relative links, forward targets and framework-style links', async (t) => {
  const f = await fixture(t);
  await f.run([sym('current', 'Versions/A'), { name: 'Versions/A/bin', mode: 0o100755, data: 'browser' }, sym('browser', 'current/bin'), sym('Versions/alias', 'A')]);
  assert.equal(await readlink(path.join(f.dest, 'current')), 'Versions/A');
  assert.equal(await readFile(path.join(f.dest, 'browser'), 'utf8'), 'browser');
  await access(path.join(f.dest, 'Versions/alias/bin'));
});

test('allows file entry through an existing internal directory symlink', async (t) => {
  const f = await fixture(t);
  await f.run([{ name: 'actual/', mode: 0o40755 }, sym('alias', 'actual'), { name: 'alias/bin', data: 'browser' }]);
  assert.equal(await readFile(path.join(f.dest, 'actual/bin'), 'utf8'), 'browser');
});
