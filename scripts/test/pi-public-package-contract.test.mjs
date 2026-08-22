import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  collectDeclaredFiles,
  validatePiPackage
} from '../pi-public-package-contract.mjs';

async function fixture(overrides = {}) {
  const root = await mkdtemp(path.join(tmpdir(), 'pi-public-contract-'));
  await mkdir(path.join(root, 'skills', 'example'), { recursive: true });
  await mkdir(path.join(root, 'prompts'), { recursive: true });
  await writeFile(path.join(root, 'LICENSE'), 'MIT fixture\n');
  await writeFile(path.join(root, 'CHANGELOG.md'), '# Changelog\n\n## 1.0.0\n\n- Initial release.\n');
  await writeFile(path.join(root, 'README.md'), '# Fixture\n');
  await writeFile(
    path.join(root, 'skills', 'example', 'SKILL.md'),
    '---\nname: example\ndescription: Example skill.\n---\n\n# Example\n'
  );
  await writeFile(
    path.join(root, 'prompts', 'example.md'),
    '---\ndescription: Example prompt.\n---\n\nUse the example skill.\n'
  );

  const packageJson = {
    name: '@createsomething/pi-fixture',
    version: '1.0.0',
    description: 'Fixture package',
    license: 'MIT',
    type: 'module',
    files: ['skills', 'prompts', 'README.md', 'LICENSE', 'CHANGELOG.md'],
    repository: {
      type: 'git',
      url: 'git+https://github.com/createsomethingtoday/create-something-monorepo.git',
      directory: 'packages/pi-fixture'
    },
    publishConfig: { access: 'public', provenance: true },
    pi: { skills: ['./skills'], prompts: ['./prompts'] },
    ...overrides
  };
  await writeFile(path.join(root, 'package.json'), `${JSON.stringify(packageJson, null, 2)}\n`);
  return root;
}

test('accepts a public MIT Pi package with explicit release and discovery metadata', async () => {
  const root = await fixture();
  try {
    assert.deepEqual(await validatePiPackage(root), []);
    assert.deepEqual(await collectDeclaredFiles(root), [
      'CHANGELOG.md',
      'LICENSE',
      'README.md',
      'package.json',
      'prompts/example.md',
      'skills/example/SKILL.md'
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('rejects missing license material, unsafe publication metadata, and invalid Pi paths', async () => {
  const root = await fixture({
    name: '@create-something/pi-fixture',
    license: 'UNLICENSED',
    publishConfig: { access: 'restricted', provenance: false },
    repository: { url: 'https://example.com/private.git' },
    dependencies: { '@create-something/private-package': 'workspace:*' },
    pi: { skills: ['../private'] }
  });
  try {
    await rm(path.join(root, 'LICENSE'));
    const issues = await validatePiPackage(root);
    assert.ok(issues.some((issue) => issue.includes('@createsomething/pi-*')));
    assert.ok(issues.some((issue) => issue.includes('MIT')));
    assert.ok(issues.some((issue) => issue.includes('LICENSE')));
    assert.ok(issues.some((issue) => issue.includes('public')));
    assert.ok(issues.some((issue) => issue.includes('provenance')));
    assert.ok(issues.some((issue) => issue.includes('repository')));
    assert.ok(issues.some((issue) => issue.includes('workspace:')));
    assert.ok(issues.some((issue) => issue.includes('Pi resource path')));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
