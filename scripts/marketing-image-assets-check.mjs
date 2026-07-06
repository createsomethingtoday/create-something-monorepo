#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const MARKETING_TEMPLATES_DIR = join(ROOT, 'packages/agency/content/templates/marketing');
const ARTICLE_ASSETS_DIR = join(ROOT, 'packages/agency/content/assets/articles');

const TEMPLATE_REQUIREMENTS = {
  'workflow-intent-article-brief.md': [
    'attempt an Atlas-style canvas before creating a one-off graphic',
    'Canvas-first fit',
    'Atlas canvas source: existing starter map | new graph artifact | not applicable',
    'Canvas renderer: Atlas | static-story | sigma | cosmograph | not applicable',
    'Canvas must show: owner | workflow artifact | automation | AI task | human judgment | stop boundary | receipt',
  ],
  'image-prompt.md': [
    'Model: gpt-image-2',
    'Image family: atlas-story-canvas',
    'Canvas renderer: Atlas | static-story | sigma | cosmograph | not applicable',
    'Atlas graph source: existing starter map | new graph artifact | not applicable',
    'Preserve the graph as the source of truth',
    'Use Ona.com as the design and communication foundation',
    'CREATE SOMETHING artifact language',
    'system maps, MCP boundaries, policy gates, receipts, validation proof, owners',
    'Langfuse is not required unless a separate scored image-quality rubric exists',
  ],
  'image-metadata.md': [
    '## Original Visuals',
    '## Canvas Artifacts',
    'Graph source',
    'Workflow, governance, and agent-behavior visuals were attempted as Atlas canvas artifacts before one-off graphics',
    'Canvas artifacts preserve a graph source and do not move the source of truth into the renderer',
    '## Generated Exports',
    '## Route Placement',
    '## Collected Screenshots',
    'Primary owned visual is placed in the article body',
    'No generated image is treated as durable source-of-truth evidence',
    'Langfuse is excluded unless this asset is part of a separate scored rubric',
  ],
};

const METADATA_REQUIREMENTS = [
  'Article URL:',
  'Article asset ID:',
  'Updated:',
  '## Original Visuals',
];

function parseArgs(argv) {
  const args = {
    format: 'text',
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--format' && argv[i + 1]) {
      args.format = argv[++i];
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!['text', 'json'].includes(args.format)) {
    throw new Error(`Unsupported format: ${args.format}`);
  }

  return args;
}

function printUsage() {
  console.log(`Usage:
  node scripts/marketing-image-assets-check.mjs [--format text|json]

Checks CREATE SOMETHING marketing image templates and article image metadata.`);
}

function readText(pathname) {
  return readFileSync(pathname, 'utf8');
}

function checkTextIncludes(pathname, content, requirements) {
  return requirements
    .filter((requirement) => !content.includes(requirement))
    .map((requirement) => `Missing required text: ${requirement}`)
    .map((detail) => ({
      target: relative(ROOT, pathname),
      ok: false,
      detail,
    }));
}

function checkTemplates() {
  const results = [];

  for (const [filename, requirements] of Object.entries(TEMPLATE_REQUIREMENTS)) {
    const pathname = join(MARKETING_TEMPLATES_DIR, filename);
    if (!existsSync(pathname)) {
      results.push({
        target: relative(ROOT, pathname),
        ok: false,
        detail: 'Template is missing.',
      });
      continue;
    }

    const failures = checkTextIncludes(pathname, readText(pathname), requirements);
    if (failures.length > 0) {
      results.push(...failures);
    } else {
      results.push({
        target: relative(ROOT, pathname),
        ok: true,
        detail: 'Template includes required Canon/Ona image standard text.',
      });
    }
  }

  return results;
}

function listArticleAssetDirs() {
  if (!existsSync(ARTICLE_ASSETS_DIR)) {
    return [];
  }

  return readdirSync(ARTICLE_ASSETS_DIR)
    .map((entry) => join(ARTICLE_ASSETS_DIR, entry))
    .filter((pathname) => statSync(pathname).isDirectory())
    .sort((left, right) => basename(left).localeCompare(basename(right)));
}

function checkArticleMetadata() {
  const results = [];

  for (const dir of listArticleAssetDirs()) {
    const metadataPath = join(dir, 'metadata.md');
    if (!existsSync(metadataPath)) {
      results.push({
        target: relative(ROOT, metadataPath),
        ok: false,
        detail: 'Article asset folder is missing metadata.md.',
      });
      continue;
    }

    const content = readText(metadataPath);
    const failures = checkTextIncludes(metadataPath, content, METADATA_REQUIREMENTS);
    if (failures.length > 0) {
      results.push(...failures);
    } else {
      results.push({
        target: relative(ROOT, metadataPath),
        ok: true,
        detail: 'Article image metadata includes required source fields.',
      });
    }
  }

  return results;
}

export function checkMarketingImageAssets() {
  const results = [
    ...checkTemplates(),
    ...checkArticleMetadata(),
  ];

  return {
    audit: {
      command: 'marketing-image-assets-check',
      passed: results.every((result) => result.ok),
      result_count: results.length,
    },
    results,
  };
}

function printText(payload) {
  const failed = payload.results.filter((result) => !result.ok);
  if (failed.length === 0) {
    console.log(`Marketing image asset check passed for ${payload.audit.result_count} target(s).`);
    return;
  }

  console.error(`Marketing image asset check failed for ${failed.length} target(s):`);
  for (const result of failed) {
    console.error(`- ${result.target}: ${result.detail}`);
  }
}

function main() {
  const args = parseArgs(process.argv);
  const payload = checkMarketingImageAssets();

  if (args.format === 'json') {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    printText(payload);
  }

  if (!payload.audit.passed) {
    process.exitCode = 1;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
