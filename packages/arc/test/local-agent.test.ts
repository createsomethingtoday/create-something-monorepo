import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('the local agent runner uses authenticated CLIs without application API keys or write authority', async () => {
  const [runner, readme] = await Promise.all([
    readFile(path.join(packageRoot, 'scripts/local-agent.mjs'), 'utf8'),
    readFile(path.join(packageRoot, 'scripts/README.md'), 'utf8')
  ]);
  assert.match(runner, /provider === 'claude'/);
  assert.match(runner, /provider === 'codex'/);
  assert.match(runner, /resolveExecutable/);
  assert.match(runner, /--sandbox', 'read-only'/);
  assert.match(runner, /--permission-mode', 'dontAsk'/);
  assert.match(runner, /local authenticated/);
  assert.doesNotMatch(runner, /OPENAI_API_KEY|ANTHROPIC_API_KEY/);
  assert.match(readme, /existing Codex or Claude login/);
  assert.match(readme, /A human accepts the patch/);
});
