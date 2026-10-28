import fs from 'node:fs';
import assert from 'node:assert/strict';
const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
for (const name of ['puppeteer', 'extract-zip', 'basic-ftp'])
  assert.ok(
    !Object.keys(lock.packages).some(
      (key) =>
        key.endsWith('/node_modules/' + name) || key === 'node_modules/' + name,
    ),
    `Unexpected ${name}`,
  );
assert.equal(lock.packages['node_modules/puppeteer-core'].version, '25.15.0');
assert.equal(
  lock.packages['node_modules/@puppeteer/browsers'].version,
  '3.2.5',
);
for (const name of ['puppeteer-core', '@puppeteer/browsers']) {
  const p = JSON.parse(
    fs.readFileSync(`node_modules/${name}/package.json`, 'utf8'),
  );
  for (const event of ['preinstall', 'install', 'postinstall'])
    assert.ok(!p.scripts?.[event], `${name} has ${event}`);
}
console.log(
  'Pinned core graph: no affected archive package; no browser install lifecycle. Downloader code remains in browsers dependency.',
);
