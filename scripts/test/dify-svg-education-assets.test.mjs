import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const CLI = path.join(
  REPO_ROOT,
  'packages/dotfiles/codex/skills/svg-education-precision/scripts/svg-education.mjs'
);

const VISUALS = [
  {
    name: 'shipping path',
    spec: 'packages/agency/static/images/articles/dify-ship-mcp-tools/dify-mcp-shipping-path-v2.spec.json',
    route: 'packages/agency/src/routes/dify/ship-dify-app-with-mcp-tools/+page.svelte',
    publicPath: '/images/articles/dify-ship-mcp-tools/dify-mcp-shipping-path-v2.svg'
  },
  {
    name: 'operating layer map',
    spec: 'packages/agency/static/images/articles/dify-vs-n8n/dify-n8n-layer-map-v2.spec.json',
    route: 'packages/agency/src/routes/dify/n8n-vs-dify/+page.svelte',
    publicPath: '/images/articles/dify-vs-n8n/dify-n8n-layer-map-v2.svg'
  }
];

function runCli(...args) {
  return spawnSync(process.execPath, [CLI, ...args], {
    cwd: REPO_ROOT,
    encoding: 'utf8'
  });
}

for (const visual of VISUALS) {
  test(`${visual.name} has a stable 16:9 SVG contract`, (t) => {
    const outputDir = mkdtempSync(path.join(tmpdir(), 'dify-svg-education-'));
    t.after(() => rmSync(outputDir, { recursive: true, force: true }));

    const spec = path.join(REPO_ROOT, visual.spec);
    const firstOutput = path.join(outputDir, 'first.svg');
    const secondOutput = path.join(outputDir, 'second.svg');
    const first = runCli('check', spec, firstOutput);
    const second = runCli('build', spec, secondOutput);

    assert.equal(first.status, 0, first.stderr || first.stdout);
    assert.equal(second.status, 0, second.stderr || second.stdout);

    const firstSvg = readFileSync(firstOutput, 'utf8');
    const secondSvg = readFileSync(secondOutput, 'utf8');
    assert.equal(firstSvg, secondSvg);
    assert.match(firstSvg, /viewBox="0 0 1200 675"/);
    assert.match(firstSvg, /role="img"/);
    assert.match(firstSvg, /aria-labelledby="svg-title svg-desc"/);

    const route = readFileSync(path.join(REPO_ROOT, visual.route), 'utf8');
    assert.match(route, new RegExp(`src="${visual.publicPath}"`));
    assert.match(route, /eyebrow="Verified diagram"/);
    assert.match(
      route,
      /sourceLabel="Verified SVG generated from a structured CREATE SOMETHING specification\."/
    );
  });
}
