import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const agencyPage = new URL(
  '../../packages/agency/src/routes/products/ground/+page.svelte',
  import.meta.url
);
const agencyServices = new URL('../../packages/agency/src/lib/data/services.ts', import.meta.url);
const ioDocs = new URL('../../packages/io/src/routes/docs/ground/+page.svelte', import.meta.url);
const packageReadme = new URL('../../packages/ground/npm/README.md', import.meta.url);
const performanceRegistry = new URL('../../config/performance-pages/registry.ts', import.meta.url);
const agencyDeployWorkflow = new URL(
  '../../.github/workflows/agency-pages-deploy.yml',
  import.meta.url
);
const generatedKnowledgeGraph = new URL(
  '../../packages/create-something-mcp/src/content/generated/graph.ts',
  import.meta.url
);

test('Ground public surfaces use executable agent-client commands', async () => {
  const [agency, docs, readme] = await Promise.all([
    readFile(agencyPage, 'utf8'),
    readFile(ioDocs, 'utf8'),
    readFile(packageReadme, 'utf8')
  ]);

  const command = 'codex mcp add ground -- npx --yes -p @createsomething/ground-mcp ground-mcp';
  assert.match(agency, new RegExp(command.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(docs, new RegExp(command.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(readme, new RegExp(command.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.doesNotMatch(agency, /codex mcp add ground --command/);
  assert.doesNotMatch(docs, /codex mcp add ground --command/);
  assert.doesNotMatch(readme, /codex mcp add ground --command/);

  for (const source of [agency, docs, readme]) {
    assert.match(source, /"--yes"/);
    assert.match(source, /"-p"/);
    assert.match(source, /"@createsomething\/ground-mcp"/);
    assert.match(source, /"ground-mcp"/);
  }
});

test('Ground package README states the exact TS, JS, Svelte, and SvelteKit boundary', async () => {
  const readme = await readFile(packageReadme, 'utf8');
  assert.match(readme, /Ground 0\.3\.6 supports TypeScript/);
  assert.match(readme, /JavaScript/);
  assert.match(readme, /Svelte component/);
  assert.match(readme, /SvelteKit configuration/);
  assert.match(readme, /module-context/);
  assert.match(readme, /instance-script exports/);
  assert.doesNotMatch(readme, /Svelte duplicate-function scans\)\./);
});

test('Ground public claims stay inside owned evidence', async () => {
  const [agency, services, docs] = await Promise.all([
    readFile(agencyPage, 'utf8'),
    readFile(agencyServices, 'utf8'),
    readFile(ioDocs, 'utf8')
  ]);
  const publicCopy = `${agency}\n${services}\n${docs}`;

  assert.doesNotMatch(publicCopy, /zero reported false positives/i);
  assert.doesNotMatch(publicCopy, /no more false positives/i);
  assert.doesNotMatch(publicCopy, /<dt>False positives<\/dt>[\s\S]{0,80}<dd>0<\/dd>/i);
  assert.match(publicCopy, /TypeScript/);
  assert.match(publicCopy, /JavaScript/);
  assert.match(publicCopy, /SvelteKit/);
  assert.match(publicCopy, /calibrat/i);
});

test('Ground docs use Linear-first coordination and disclose local state', async () => {
  const docs = await readFile(ioDocs, 'utf8');
  assert.doesNotMatch(docs, /\/docs\/loom/);
  assert.match(docs, /Linear/);
  assert.match(docs, /\.ground\/registry\.db/);
  assert.match(docs, /--db/);
});

test('Ground public routes remain registered in the Performance page system', async () => {
  const registry = await readFile(performanceRegistry, 'utf8');
  assert.match(registry, /'products\/ground'/);
  assert.match(registry, /'docs\/ground'/);
});

test('Agency production deployment waits for the released Ground source tree', async () => {
  const workflow = await readFile(agencyDeployWorkflow, 'utf8');
  assert.match(workflow, /Require matching Ground release before production deploy/);
  assert.match(workflow, /git merge-base --is-ancestor "\$release_sha" "\$GITHUB_SHA"/);
  assert.match(workflow, /git rev-parse "\$\{release_sha\}:\$\{release_path\}"/);
  assert.match(workflow, /git rev-parse "\$\{GITHUB_SHA\}:\$\{release_path\}"/);
  assert.match(workflow, /packages\/ground/);
  assert.match(workflow, /config\/ground-ga\.v1\.json/);
  assert.match(workflow, /scripts\/ground-calibration-verify\.mjs/);
  assert.match(workflow, /scripts\/ground-calibration-execution-receipt\.mjs/);
  assert.match(workflow, /ground-darwin-x64\.tar\.gz/);
  assert.match(workflow, /ground-linux-arm64-smoke\.json/);
  assert.match(workflow, /ground-linux-arm64-consumer-smoke\.json/);
  assert.match(workflow, /CONSUMER-SHA256SUMS/);
  assert.match(workflow, /ground-calibration-receipt\.json/);
  assert.match(workflow, /promotion\?\.ready/);
  assert.match(workflow, /fixture_execution\?\.ready/);
  assert.match(workflow, /npm view "\$\{package_name\}@\$\{version\}" version/);
});

test('Ground public discovery omits retired distribution paths', async () => {
  const graph = await readFile(generatedKnowledgeGraph, 'utf8');
  assert.doesNotMatch(graph, /packages\/ground\/mcpb\/README\.md/);
  assert.doesNotMatch(graph, /Ground MCP - Claude Desktop Extension/);
});
