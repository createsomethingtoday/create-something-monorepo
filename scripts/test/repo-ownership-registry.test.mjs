import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { buildRegistry, renderMarkdown } from '../repo-ownership-registry.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SCRIPT = path.join(REPO_ROOT, 'scripts', 'repo-ownership-registry.mjs');

function makeWorkspace(t) {
  const root = mkdtempSync(path.join(tmpdir(), 'repo-ownership-registry-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));

  writeJson(path.join(root, 'config', 'workspace-lanes.json'), {
    version: 1,
    lanes: {
      platform: ['packages/mcp-core', 'packages/database-layer'],
      product: ['apps/library-form'],
      clients: ['packages/agency/clients/*'],
      labs: ['packages/unclear-tool'],
    },
  });

  writeJson(path.join(root, 'packages', 'mcp-core', 'package.json'), {
    name: '@create-something/mcp-core',
    repository: {
      type: 'git',
      url: 'https://github.com/createsomethingtoday/create-something-monorepo.git',
      directory: 'packages/mcp-core',
    },
  });

  writeJson(path.join(root, 'packages', 'database-layer', 'package.json'), {
    name: '@create-something/database-layer',
    repository: {
      type: 'git',
      url: 'https://github.com/createsomethingtoday/create-something-monorepo.git',
      directory: 'packages/database-layer',
    },
  });
  writeFile(
    path.join(root, 'packages', 'database-layer', 'docs', 'agent-wiki', 'README.md'),
    '# Generated Wiki\n',
  );

  writeJson(path.join(root, 'apps', 'library-form', 'package.json'), {
    name: '@create-something/library-form',
    dependencies: {
      '@create-something/mcp-core': 'workspace:*',
    },
    repository: {
      type: 'git',
      url: 'https://github.com/createsomethingtoday/create-something-monorepo.git',
      directory: 'apps/library-form',
    },
  });
  writeFile(
    path.join(root, 'apps', 'library-form', 'README.md'),
    'The standalone redundancy repo is `createsomethingtoday/webflow-library-submission-form`.\n',
  );
  writeJson(path.join(root, 'apps', 'library-form', '.next', 'package.json'), {
    name: 'generated-next-package',
  });
  writeJson(
    path.join(root, 'apps', 'library-form', '.open-next', 'server-functions', 'default', 'package.json'),
    {
      name: 'generated-open-next-package',
    },
  );

  writeJson(path.join(root, 'packages', 'agency', 'package.json'), {
    name: '@create-something/agency',
  });
  writeFile(
    path.join(root, 'packages', 'agency', 'src', 'lib', 'delivery', 'shivworks-context.ts'),
    "export const detail = 'createsomethingtoday/shivworks-network is the self-contained application repo.';\n",
  );

  writeJson(path.join(root, 'packages', 'agency', 'clients', 'outerfields', 'package.json'), {
    name: '@create-something/outerfields-client',
  });
  writeFile(
    path.join(root, '.github', 'workflows', 'outerfields-presentations-sync.yml'),
    `name: Sync
jobs:
  sync:
    steps:
      - run: |
          git subtree pull \\
            --prefix "packages/agency/clients/outerfields/src/routes/presentations" \\
            "https://github.com/createsomethingtoday/outerfields-presentations.git" \\
            main \\
            --squash
`,
  );

  writeJson(path.join(root, 'packages', 'standalone-tool', 'package.json'), {
    name: '@create-something/standalone-tool',
    repository: {
      type: 'git',
      url: 'https://github.com/createsomethingtoday/standalone-tool.git',
    },
  });

  writeJson(path.join(root, 'packages', 'unclear-tool', 'package.json'), {
    name: '@create-something/unclear-tool',
  });

  writeJson(path.join(root, 'packages', 'stale-namespace-tool', 'package.json'), {
    name: '@create-something/stale-namespace-tool',
    repository: {
      type: 'git',
      url: 'https://github.com/create-something/create-something-monorepo.git',
      directory: 'packages/stale-namespace-tool',
    },
  });

  writeFile(
    path.join(root, 'docs', 'plugins.md'),
    'Plugins must be registered in `createsomethingtoday/claude-plugins` repo.\n',
  );

  return root;
}

function writeFile(filePath, text) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, text, 'utf8');
}

function writeJson(filePath, value) {
  writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function byPath(registry, surfacePath) {
  const surface = registry.surfaces.find((entry) => entry.path === surfacePath);
  assert.ok(surface, `missing surface ${surfacePath}`);
  return surface;
}

test('classifies monorepo, standalone, mirrored, wiki, workspace, and unclear ownership', (t) => {
  const root = makeWorkspace(t);
  const registry = buildRegistry(root);

  assert.equal(byPath(registry, 'packages/mcp-core').ownership, 'monorepo');

  const databaseLayer = byPath(registry, 'packages/database-layer');
  assert.equal(databaseLayer.ownership, 'monorepo');
  assert.equal(databaseLayer.context.agentWiki, true);
  assert.match(databaseLayer.cautions.join('\n'), /Generated agent wiki/);

  const libraryForm = byPath(registry, 'apps/library-form');
  assert.equal(libraryForm.ownership, 'mirrored');
  assert.equal(libraryForm.authorityConfidence, 'medium');
  assert.equal(libraryForm.syncMode, 'mirror-redundancy');
  assert.deepEqual(libraryForm.workspaceDependencies.map((entry) => entry.name), [
    '@create-something/mcp-core',
  ]);
  assert.ok(
    libraryForm.externalReferences.some(
      (entry) => entry.repo === 'createsomethingtoday/webflow-library-submission-form',
    ),
    'library form keeps redundancy repo evidence',
  );
  assert.equal(
    registry.surfaces.some((entry) => entry.path.includes('.next') || entry.path.includes('.open-next')),
    false,
    'generated package manifests should not become registry surfaces',
  );

  const agency = byPath(registry, 'packages/agency');
  assert.equal(agency.ownership, 'standalone-reference');
  assert.equal(agency.syncMode, 'none');
  assert.equal(agency.externalReferences[0].repo, 'createsomethingtoday/shivworks-network');
  assert.equal(agency.externalReferences[0].relationship, 'standalone');

  const outerfields = byPath(registry, 'packages/agency/clients/outerfields');
  assert.equal(outerfields.ownership, 'mirrored');
  assert.equal(outerfields.syncMode, 'subtree');
  assert.equal(outerfields.externalReferences[0].relationship, 'subtree-sync');

  assert.equal(byPath(registry, 'packages/standalone-tool').ownership, 'standalone');
  assert.equal(byPath(registry, 'packages/unclear-tool').ownership, 'monorepo');
  const staleNamespace = byPath(registry, 'packages/stale-namespace-tool');
  assert.equal(staleNamespace.ownership, 'unclear');
  assert.match(staleNamespace.cautions.join('\n'), /stale namespace/);

  assert.ok(
    registry.externalRepositories.some((entry) => entry.repo === 'createsomethingtoday/claude-plugins'),
    'global external repo references are preserved',
  );
});

test('renders markdown with wiki-agent guidance', (t) => {
  const root = makeWorkspace(t);
  const markdown = renderMarkdown(buildRegistry(root));

  assert.match(markdown, /Repo Ownership Registry/);
  assert.match(markdown, /wiki-agent orientation/);
  assert.match(markdown, /Generated agent wiki pages are orientation projections/);
  assert.match(markdown, /createsomethingtoday\/webflow-library-submission-form/);
});

test('--check fails when generated files are missing and passes after generation', (t) => {
  const root = makeWorkspace(t);
  const missing = spawnSync(process.execPath, [SCRIPT, '--root', root, '--check'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /Repo ownership registry is stale/);

  const generate = spawnSync(process.execPath, [SCRIPT, '--root', root], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  assert.equal(generate.status, 0, generate.stderr || generate.stdout);

  const current = spawnSync(process.execPath, [SCRIPT, '--root', root, '--check'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  assert.equal(current.status, 0, current.stderr || current.stdout);
  assert.match(current.stdout, /Repo ownership registry is current/);

  const registry = JSON.parse(
    readFileSync(path.join(root, 'config', 'repo-ownership-registry.generated.json'), 'utf8'),
  );
  assert.equal(registry.summary.totalSurfaces, 8);
});
