import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Reaching fetch exits the child before any network call or result-file write.
const noNetwork = `data:text/javascript,${encodeURIComponent('globalThis.fetch = async () => { process.exit(99); };')}`;
function invoke(extra: NodeJS.ProcessEnv) {
  return spawnSync(process.execPath, ['--import', 'tsx', '--import', noNetwork,
    fileURLToPath(new URL('./run.ts', import.meta.url))], {
    encoding: 'utf8', env: { PATH: process.env.PATH, TYPESAFE_API_KEY: 'fixture', ...extra },
  });
}
test('OpenAI reference requires its own credential before any network request', () => {
  const result = invoke({ EVAL_BASELINE: 'openai', WEBFLOW_GROQ_API_KEY: 'fixture' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Missing WEBFLOW_OPENAI_API_KEY/);
});
test('either baseline runs with only its own credential plus Jev', () => {
  assert.equal(invoke({ EVAL_BASELINE: 'openai', WEBFLOW_OPENAI_API_KEY: 'fixture' }).status, 99);
  assert.equal(invoke({ WEBFLOW_GROQ_API_KEY: 'fixture' }).status, 99);
});
