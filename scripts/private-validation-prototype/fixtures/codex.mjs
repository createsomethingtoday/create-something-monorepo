// Owned plugin fixture. No personal Codex config, account, model or credentials.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readdirSync, readFileSync } from 'node:fs';
const root = '/tmp/marketplace';
const plugin = `${root}/plugins/private-validator-fixture`;
mkdirSync(`${root}/.agents/plugins`, { recursive: true });
mkdirSync(`${plugin}/.codex-plugin`, { recursive: true });
mkdirSync(`${plugin}/skills/echo`, { recursive: true });
mkdirSync('/tmp/codex', { recursive: true });
writeFileSync(`${plugin}/.codex-plugin/plugin.json`, JSON.stringify({
  name: 'private-validator-fixture', version: '1.0.0',
  description: 'Owned PRIVATE validation fixture; no external actions.',
  author: { name: 'CREATE SOMETHING' }, skills: './skills/',
  interface: { displayName: 'PRIVATE validation fixture', shortDescription: 'Owned offline validation fixture' },
}));
writeFileSync(`${plugin}/skills/echo/SKILL.md`, '---\nname: echo\ndescription: Echo the supplied text when explicitly asked.\n---\nReturn the supplied text unchanged. Do not use tools.\n');
writeFileSync(`${root}/.agents/plugins/marketplace.json`, JSON.stringify({
  name: 'private-validation-fixture',
  interface: { displayName: 'PRIVATE validation fixture' },
  plugins: [{ name: 'private-validator-fixture', source: { source: 'local', path: './plugins/private-validator-fixture' },
    policy: { installation: 'AVAILABLE', authentication: 'ON_USE' }, category: 'Productivity' }],
}));
function codex(args) {
  const r = spawnSync('codex', args, { env: { ...process.env, CODEX_HOME: '/tmp/codex' },
    encoding: 'utf8', timeout: 1500, maxBuffer: 32768 });
  assert.equal(r.status, 0, `${args.join(' ')}: ${r.stderr}\n${r.stdout}`);
  return r.stdout;
}
assert.equal(codex(['--version']).trim(), 'codex-cli 0.155.1');
codex(['plugin', 'marketplace', 'add', root, '--json']);
const added = codex(['plugin', 'add', 'private-validator-fixture@private-validation-fixture', '--json']);
assert.match(added, /private-validator-fixture/);
const allFiles = readdirSync('/tmp/codex', { recursive: true });
const skill = allFiles.find(f => f.endsWith('skills/echo/SKILL.md'));
assert.ok(skill, 'Plugin installation must materialize its skill');
assert.match(readFileSync(`/tmp/codex/${skill}`, 'utf8'), /Return the supplied text unchanged/);
codex(['plugin', 'remove', 'private-validator-fixture@private-validation-fixture']);
assert.equal(readdirSync('/tmp/codex', { recursive: true }).some(f => f.endsWith('skills/echo/SKILL.md')), false);
console.log('codex-plugin-lifecycle:passed');
