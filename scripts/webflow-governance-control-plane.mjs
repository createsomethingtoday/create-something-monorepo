#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG_PATH = join(ROOT, 'config/webflow/control-plane.json');
const GENERATED_DOC_PATH = join(ROOT, 'docs/WEBFLOW_CODE_COMPONENTS_CONTROL_PLANE.generated.md');

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function parseArgs(argv) {
  const args = { command: argv[2] ?? 'check', out: null, pretty: true };
  for (let i = 3; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--out' && argv[i + 1]) {
      args.out = argv[i + 1];
      i += 1;
    } else if (arg === '--compact') {
      args.pretty = false;
    } else if (arg === '--help' || arg === '-h') {
      args.command = 'help';
    }
  }
  return args;
}

function listFiles(dir) {
  const entries = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      entries.push(...listFiles(fullPath));
    } else {
      entries.push(fullPath);
    }
  }
  return entries;
}

function buildManifest() {
  const config = readJson(CONFIG_PATH);
  const packagePath = join(ROOT, config.frontend.packagePath);
  const packageJsonPath = join(packagePath, 'package.json');
  const webflowJsonPath = join(ROOT, config.frontend.webflowJsonPath);
  const srcPath = join(packagePath, 'src');
  const packageJson = readJson(packageJsonPath);
  const webflowJson = readJson(webflowJsonPath);
  const webflowComponentFiles = listFiles(srcPath)
    .filter((path) => path.endsWith('.webflow.tsx'))
    .map((path) => relative(ROOT, path))
    .sort();
  const indexSource = readFileSync(join(srcPath, 'index.ts'), 'utf8');

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    source: {
      repo: 'create-something-monorepo',
      root: ROOT,
      configPath: relative(ROOT, CONFIG_PATH),
      generatedDocPath: relative(ROOT, GENERATED_DOC_PATH),
    },
    config,
    package: {
      name: packageJson.name,
      version: packageJson.version,
      private: packageJson.private,
      scripts: packageJson.scripts ?? {},
    },
    webflowLibrary: {
      name: webflowJson.library?.name ?? webflowJson.name ?? null,
      id: webflowJson.library?.id ?? null,
      components: webflowJson.library?.components ?? webflowJson.components ?? [],
      description: webflowJson.library?.description ?? null,
    },
    components: {
      required: config.requiredControlComponents,
      webflowFileCount: webflowComponentFiles.length,
      webflowFiles: webflowComponentFiles,
      exportedRequired: config.requiredControlComponents.filter((componentName) =>
        indexSource.includes(componentName)
      ),
    },
  };
}

function checkManifest(manifest) {
  const errors = [];
  const warnings = [];
  const { config } = manifest;

  if (config.status !== 'active') {
    errors.push('Webflow control-plane status must be active.');
  }
  if (config.frontend?.provider !== 'webflow_code_components') {
    errors.push('frontend.provider must be webflow_code_components.');
  }
  if (config.governanceDataPlane?.sourceOfTruth !== 'cloudflare') {
    errors.push('governanceDataPlane.sourceOfTruth must be cloudflare.');
  }
  if (manifest.webflowLibrary.name !== config.frontend.libraryName) {
    errors.push('webflow.json library name must match config frontend.libraryName.');
  }
  if (manifest.webflowLibrary.id !== config.frontend.libraryId) {
    errors.push('webflow.json library id must match config frontend.libraryId.');
  }
  if (!manifest.package.scripts.verify) {
    errors.push('packages/webflow-components must expose a verify script.');
  }

  const exportedRequired = new Set(manifest.components.exportedRequired);
  for (const componentName of config.requiredControlComponents ?? []) {
    const declarationPath = `packages/webflow-components/src/components/control/${componentName}.webflow.tsx`;
    if (!existsSync(join(ROOT, declarationPath))) {
      errors.push(`Missing Webflow declaration for ${componentName}: ${declarationPath}`);
    }
    if (!exportedRequired.has(componentName)) {
      errors.push(`Missing package export for required component ${componentName}.`);
    }
  }

  if (manifest.components.webflowFileCount === 0) {
    errors.push('No Webflow component declaration files were found.');
  }

  if (config.frontend.shareCommand && !config.deployment?.requiresHumanApproval) {
    warnings.push('Sharing to Webflow should require human approval.');
  }

  if (!isFileContentEqual(GENERATED_DOC_PATH, renderDoc(manifest))) {
    errors.push(`Generated doc is out of date: ${relative(ROOT, GENERATED_DOC_PATH)}. Run pnpm webflow:governance:generate.`);
  }

  return { errors, warnings };
}

function renderDoc(manifest) {
  const { config } = manifest;
  const lines = [];
  lines.push('# Webflow Code Components Control Plane');
  lines.push('');
  lines.push('Generated from `config/webflow/control-plane.json`. Do not edit this file directly.');
  lines.push('');
  lines.push('## Decision');
  lines.push('');
  lines.push(`- Status: ${config.status}`);
  lines.push(`- Decision date: ${config.decisionDate}`);
  lines.push(`- Decision: ${config.decision}`);
  lines.push('');
  lines.push('## Frontend');
  lines.push('');
  lines.push(`- Provider: ${config.frontend.provider}`);
  lines.push(`- Package: ${config.frontend.packagePath}`);
  lines.push(`- Library: ${config.frontend.libraryName}`);
  lines.push(`- Library ID: ${config.frontend.libraryId}`);
  lines.push(`- Verify command: \`${config.frontend.verifyCommand}\``);
  lines.push('');
  lines.push('## Governance Data Plane');
  lines.push('');
  lines.push(`- Source of truth: ${config.governanceDataPlane.sourceOfTruth}`);
  lines.push(`- Durable systems: ${config.governanceDataPlane.durableSystems.join(', ')}`);
  lines.push(`- Automation surface: ${config.governanceDataPlane.automationSurface}`);
  lines.push(`- Policy surface: ${config.governanceDataPlane.policySurface}`);
  lines.push(`- Rule: ${config.governanceDataPlane.rule}`);
  lines.push('');
  lines.push('## Required Control Components');
  lines.push('');
  lines.push('| Component | Webflow declaration | Exported |');
  lines.push('| --- | --- | --- |');
  const exported = new Set(manifest.components.exportedRequired);
  for (const componentName of config.requiredControlComponents) {
    const declarationPath = `packages/webflow-components/src/components/control/${componentName}.webflow.tsx`;
    lines.push(`| ${componentName} | ${declarationPath} | ${String(exported.has(componentName))} |`);
  }
  lines.push('');
  lines.push('## Deployment');
  lines.push('');
  lines.push(`- Bundle command: \`${config.deployment.bundleCommand}\``);
  lines.push(`- Share command: \`${config.deployment.shareCommand}\``);
  lines.push(`- Requires human approval: ${String(config.deployment.requiresHumanApproval)}`);
  lines.push(`- Notes: ${config.deployment.notes}`);
  lines.push('');

  return `${lines.join('\n').trimEnd()}\n`;
}

function isFileContentEqual(path, expected) {
  return existsSync(path) && readFileSync(path, 'utf8') === expected;
}

function printHelp() {
  console.log(`Usage:
  node scripts/webflow-governance-control-plane.mjs check
  node scripts/webflow-governance-control-plane.mjs generate
  node scripts/webflow-governance-control-plane.mjs manifest [--out <path>] [--compact]
`);
}

function main() {
  const args = parseArgs(process.argv);
  if (args.command === 'help') {
    printHelp();
    return;
  }

  if (!existsSync(CONFIG_PATH)) {
    console.error(`Missing required config: ${relative(ROOT, CONFIG_PATH)}`);
    process.exit(1);
  }

  const manifest = buildManifest();

  if (args.command === 'manifest') {
    const payload = JSON.stringify(manifest, null, args.pretty ? 2 : 0);
    if (args.out) {
      const outPath = resolve(ROOT, args.out);
      writeFileSync(outPath, `${payload}\n`);
      console.log(`wrote ${relative(ROOT, outPath)}`);
    } else {
      console.log(payload);
    }
    return;
  }

  if (args.command === 'generate') {
    writeFileSync(GENERATED_DOC_PATH, renderDoc(manifest));
    console.log(`wrote ${relative(ROOT, GENERATED_DOC_PATH)}`);
    return;
  }

  if (args.command === 'check') {
    const { errors, warnings } = checkManifest(manifest);
    for (const warning of warnings) {
      console.warn(`warning: ${warning}`);
    }
    if (errors.length > 0) {
      for (const error of errors) {
        console.error(`error: ${error}`);
      }
      process.exit(1);
    }
    console.log('Webflow governance control-plane check ok.');
    return;
  }

  printHelp();
  process.exit(1);
}

main();
