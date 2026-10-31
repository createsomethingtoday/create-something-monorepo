import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const TOOLS_SRC = path.join(REPO_ROOT, 'packages', 'webflow-template-review-mcp', 'src', 'tools.ts');
const MANIFEST = path.join(REPO_ROOT, 'config', 'dify-agents', 'template-review-hub.json');
const DSL = path.join(REPO_ROOT, 'config', 'dify-agents', 'template-review-hub.dify.yml');

function registeredTools() {
  const source = readFileSync(TOOLS_SRC, 'utf8');
  return new Set([...source.matchAll(/server\.tool\(\s*'(template_review_[a-z_]+)'/g)].map((match) => match[1]));
}

function unregisteredToolNames(prompt, registered) {
  const named = new Set(prompt.match(/template_review_[a-z_]+/g) ?? []);
  return [...named].filter((name) => !registered.has(name)).sort();
}

// The Hub resolves these names through hub_describe_proxy_tool, so a name the
// Worker does not register fails at runtime (template_review_resolve_reference_urls).
test('TEMPLATE REVIEW HUB prompts only name tools the Worker registers', () => {
  const registered = registeredTools();
  assert.ok(registered.size > 0, 'expected server.tool registrations in tools.ts');

  const manifestPrompt = JSON.parse(readFileSync(MANIFEST, 'utf8')).agent_prompt;
  const dslPrompt = parseYaml(readFileSync(DSL, 'utf8')).model_config.pre_prompt;

  assert.deepEqual(unregisteredToolNames(manifestPrompt, registered), [], MANIFEST);
  assert.deepEqual(unregisteredToolNames(dslPrompt, registered), [], DSL);
});
