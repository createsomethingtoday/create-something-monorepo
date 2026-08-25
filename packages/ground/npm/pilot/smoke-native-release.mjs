#!/usr/bin/env node

import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const pilotDirectory = dirname(fileURLToPath(import.meta.url));
const packageManifest = JSON.parse(
  readFileSync(resolve(pilotDirectory, '..', 'package.json'), 'utf8')
);
const [groundBinary, mcpBinary, platformId, outputPath] = process.argv.slice(2);

assert(
  groundBinary && mcpBinary && platformId && outputPath,
  [
    'Usage: node smoke-native-release.mjs',
    '<ground-binary> <ground-mcp-binary> <platform-id> <receipt-path>'
  ].join(' ')
);

function run(binary, args, options = {}) {
  const resolvedBinary = resolve(binary);
  const isJavaScriptWrapper = resolvedBinary.endsWith('.js');
  const result = spawnSync(
    isJavaScriptWrapper ? process.execPath : resolvedBinary,
    [...(isJavaScriptWrapper ? [resolvedBinary] : []), ...args],
    {
      encoding: 'utf8',
      ...options
    }
  );
  assert.equal(
    result.status,
    0,
    `${binary} ${args.join(' ')} failed (${result.status}): ${result.stderr}`
  );
  return result;
}

function writeDuplicateFixture(directory, extension, functionName, contents) {
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, `primary.${extension}`), contents);
  writeFileSync(join(directory, `secondary.${extension}`), contents);
  return functionName;
}

function analyzeDuplicate(binary, database, directory, expectedFunction) {
  const result = run(binary, ['--db', database, 'analyze', directory, '--checks', 'duplicates']);
  const analysis = JSON.parse(result.stdout);
  assert.equal(analysis.coverage?.duplicates?.status, 'FAIL', JSON.stringify(analysis));
  assert.equal(analysis.findings?.duplicates?.length, 1, JSON.stringify(analysis));
  assert.equal(analysis.findings.duplicates[0].function, expectedFunction);
  return {
    verification_status: analysis.verification_status,
    finding: analysis.findings.duplicates[0].function,
    framework: analysis.framework?.detected ?? 'Unknown'
  };
}

const versionResult = run(groundBinary, ['--version']);
assert.match(
  versionResult.stdout,
  new RegExp(`\\b${packageManifest.version.replaceAll('.', '\\.')}\\b`)
);

const buildInfoResult = run(groundBinary, ['build-info', '--json']);
const buildInfo = JSON.parse(buildInfoResult.stdout);
assert.equal(buildInfo.version, packageManifest.version);
assert.match(buildInfo.source_sha, /^[0-9a-f]{40}$/);

const temporaryDirectory = mkdtempSync(join(tmpdir(), 'ground-release-smoke-'));
try {
  const fixtures = join(temporaryDirectory, 'fixtures');
  const typescriptDirectory = join(fixtures, 'typescript');
  const javascriptDirectory = join(fixtures, 'javascript');
  const svelteDirectory = join(fixtures, 'sveltekit');
  writeDuplicateFixture(
    typescriptDirectory,
    'ts',
    'normalizeLabel',
    "export function normalizeLabel(value: string) {\n  const trimmed = value.trim();\n  if (!trimmed) return 'Unknown';\n  return trimmed.toUpperCase();\n}\n"
  );
  writeDuplicateFixture(
    javascriptDirectory,
    'js',
    'normalizeSlug',
    "export function normalizeSlug(value) {\n  const trimmed = value.trim();\n  if (!trimmed) return 'unknown';\n  return trimmed.toLowerCase();\n}\n"
  );
  mkdirSync(join(svelteDirectory, 'src', 'lib'), { recursive: true });
  writeFileSync(join(svelteDirectory, 'svelte.config.js'), 'export default {};\n');
  writeDuplicateFixture(
    join(svelteDirectory, 'src', 'lib'),
    'svelte',
    'normalizeTitle',
    "<script lang=\"ts\">\n  export function normalizeTitle(value: string) {\n    const trimmed = value.trim();\n    if (!trimmed) return 'Untitled';\n    return trimmed.toUpperCase();\n  }\n</script>\n<p>{normalizeTitle('ground')}</p>\n"
  );

  const database = join(temporaryDirectory, 'registry.db');
  const languageSmokes = {
    typescript: analyzeDuplicate(groundBinary, database, typescriptDirectory, 'normalizeLabel'),
    javascript: analyzeDuplicate(groundBinary, database, javascriptDirectory, 'normalizeSlug'),
    svelte: analyzeDuplicate(groundBinary, database, svelteDirectory, 'normalizeTitle')
  };
  assert.equal(languageSmokes.svelte.framework, 'SvelteKit');

  const rpcInput =
    [
      { jsonrpc: '2.0', id: 1, method: 'initialize', params: {} },
      { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }
    ]
      .map((message) => JSON.stringify(message))
      .join('\n') + '\n';
  const mcpResult = run(mcpBinary, ['--db', database], { input: rpcInput });
  const responses = mcpResult.stdout
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  const initialize = responses.find((response) => response.id === 1);
  const toolList = responses.find((response) => response.id === 2);
  assert.equal(initialize?.result?.serverInfo?.version, packageManifest.version);
  const tools = toolList?.result?.tools ?? [];
  assert(tools.length >= 21, `expected at least 21 tools, received ${tools.length}`);
  for (const requiredTool of ['ground_analyze', 'ground_diff', 'ground_verify_fix']) {
    assert(
      tools.some((tool) => tool.name === requiredTool),
      `missing ${requiredTool}`
    );
  }

  const receipt = {
    schema_version: 'ground-native-release-smoke.v1',
    platform: platformId,
    version: packageManifest.version,
    source_sha: buildInfo.source_sha,
    cli_version: versionResult.stdout.trim(),
    mcp: {
      initialized: true,
      tool_count: tools.length,
      required_tools: ['ground_analyze', 'ground_diff', 'ground_verify_fix']
    },
    language_smokes: languageSmokes,
    ready: true
  };
  writeFileSync(outputPath, `${JSON.stringify(receipt, null, 2)}\n`, { flag: 'wx' });
  process.stdout.write(`${JSON.stringify(receipt)}\n`);
} finally {
  rmSync(temporaryDirectory, { recursive: true, force: true });
}
