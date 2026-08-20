import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');

test('reports Canon token suggestions from Svelte style blocks as warnings', async () => {
  const eslint = new ESLint({
    cwd: REPO_ROOT,
    overrideConfigFile: 'eslint.foundation.config.mjs'
  });
  const [result] = await eslint.lintText(
    '<style>.card { color: #fff; border-radius: 12px; }</style><div class="card" />',
    { filePath: 'packages/io/src/routes/token-check.svelte' }
  );

  const tokenWarnings = result.messages.filter((message) => message.ruleId === 'canon/prefer-canon-tokens');
  assert.equal(tokenWarnings.length, 2, JSON.stringify(result.messages, null, 2));
  assert.ok(tokenWarnings.every((message) => message.severity === 1));
});
