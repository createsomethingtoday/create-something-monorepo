import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { access, readFile, stat } from 'node:fs/promises';
import { constants } from 'node:fs';
import test from 'node:test';

const resources = new URL('../src-tauri/resources/', import.meta.url);

function digest(value) {
  return createHash('sha256').update(value).digest('hex');
}

test('prepared Atlas runtime is self-contained, hashed, and checkout-agnostic', async () => {
  const manifest = JSON.parse(await readFile(new URL('runtime-build.json', resources), 'utf8'));
  assert.equal(manifest.schema, 'create-something/atlas-studio-runtime@1');
  assert.equal(manifest.language, 'create-something/control');
  assert.equal(manifest.runtimeVersion, '0.1.0');
  assert.equal(manifest.serverEntry, 'server/cli.js');
  assert.equal(manifest.interactionEntry, 'interactions/marketplace/governed-interaction.json');
  assert.ok(manifest.files.length >= 6);

  for (const file of manifest.files) {
    assert.ok(!file.path.endsWith('.map'), file.path);
    const content = await readFile(new URL(file.path, resources));
    assert.equal(digest(content), file.sha256, file.path);
    assert.equal(content.byteLength, file.bytes, file.path);
    assert.doesNotMatch(
      content.toString('utf8'),
      /create-something-monorepo|cre-1476-agent-worktree|\/Users\/micahjohnson/,
      file.path,
    );
  }

  const bun = new URL('runtime/bun', resources);
  await access(bun, constants.X_OK);
  assert.ok((await stat(bun)).size > 1_000_000);

  const interaction = JSON.parse(
    await readFile(new URL(manifest.interactionEntry, resources), 'utf8'),
  );
  assert.equal(interaction.schemaVersion, 'governed_interaction_bundle.v0.1');
  assert.equal(interaction.language, manifest.language);
  assert.equal(interaction.runtimeVersion, manifest.runtimeVersion);
});
