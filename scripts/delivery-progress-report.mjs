#!/usr/bin/env node
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PROJECTS_DIR = join(ROOT, 'config/delivery/projects');
const AGENT_CONFIG_PATH = join(ROOT, 'config/delivery/agent.json');
const DELIVERIES_DIR = join(ROOT, 'docs/deliveries');

function parseArgs(argv) {
  const args = {
    date: new Date().toISOString().slice(0, 10),
    out: null,
    check: false,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--date' && argv[i + 1]) {
      args.date = argv[i + 1];
      i += 1;
    } else if (arg === '--out' && argv[i + 1]) {
      args.out = resolve(ROOT, argv[i + 1]);
      i += 1;
    } else if (arg === '--check') {
      args.check = true;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  return args;
}

function printHelp() {
  console.log(`Usage: node scripts/delivery-progress-report.mjs [--date YYYY-MM-DD] [--out path] [--check]

Generates an operator progress report from config/delivery/agent.json and project manifests.`);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function projectManifestPaths() {
  if (!existsSync(PROJECTS_DIR)) {
    return [];
  }

  return readdirSync(PROJECTS_DIR)
    .filter((entry) => entry.endsWith('.json'))
    .map((entry) => join(PROJECTS_DIR, entry))
    .sort();
}

function listFiles(path) {
  if (!existsSync(path)) {
    return [];
  }

  return readdirSync(path, { recursive: true })
    .map((entry) => join(path, String(entry)))
    .filter((entryPath) => existsSync(entryPath) && statSync(entryPath).isFile())
    .sort();
}

function latestProjectUpdate(slug) {
  const projectDir = join(DELIVERIES_DIR, slug);
  if (!existsSync(projectDir)) {
    return null;
  }

  const updates = readdirSync(projectDir)
    .filter((entry) => entry.endsWith('-project-update.md'))
    .sort();

  if (updates.length === 0) {
    return null;
  }

  return join(projectDir, updates.at(-1));
}

function evidenceStatus(project) {
  return project.components.flatMap((component) =>
    component.evidence.map((evidencePath) => ({
      component: component.label,
      path: evidencePath,
      exists: existsSync(join(ROOT, evidencePath)),
    })),
  );
}

function image2Status(slug) {
  const assetsDir = join(DELIVERIES_DIR, slug, 'assets');
  const files = listFiles(assetsDir);
  const promptFiles = files.filter((file) => file.includes('/prompts/') && file.endsWith('.txt'));
  const image2Images = files.filter((file) => file.includes('image2') && file.endsWith('.png'));
  const errorFiles = files.filter((file) => file.includes('image2') && file.endsWith('.error.txt'));

  if (image2Images.length > 0) {
    return {
      state: 'generated',
      details: `${image2Images.length} Image 2 PNG file(s) present`,
      promptFiles,
      errorFiles,
      image2Images,
    };
  }

  if (errorFiles.length > 0) {
    return {
      state: 'blocked',
      details: errorFiles
        .map((file) => firstMeaningfulLine(file))
        .filter(Boolean)
        .join('; '),
      promptFiles,
      errorFiles,
      image2Images,
    };
  }

  if (promptFiles.length > 0) {
    return {
      state: 'prompted',
      details: `${promptFiles.length} prompt file(s) ready`,
      promptFiles,
      errorFiles,
      image2Images,
    };
  }

  return {
    state: 'not_configured',
    details: 'No Image 2 prompt files found',
    promptFiles,
    errorFiles,
    image2Images,
  };
}

function firstMeaningfulLine(path) {
  return readFileSync(path, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0) ?? '';
}

function relativePath(path) {
  return relative(ROOT, path).replaceAll('\\', '/');
}

function markdownLink(fromFile, targetPath, label = targetPath) {
  const absoluteTarget = resolve(ROOT, targetPath);
  const href = relative(dirname(fromFile), absoluteTarget).replaceAll('\\', '/');
  return `[${label}](${href})`;
}

function validate(agent, projects) {
  const errors = [];

  if (agent.sourceOfTruth !== 'monorepo') {
    errors.push('Delivery agent sourceOfTruth must be monorepo.');
  }

  if (!agent.approvalRequired?.includes('send_client_email_or_message')) {
    errors.push('Delivery agent must require approval before sending client messages.');
  }

  if (!agent.approvalRequired?.includes('promote_to_client_portal')) {
    errors.push('Delivery agent must require approval before portal promotion.');
  }

  for (const project of projects) {
    for (const evidence of evidenceStatus(project)) {
      if (!evidence.exists) {
        errors.push(`${project.slug}: missing evidence path ${evidence.path}`);
      }
    }
  }

  return errors;
}

function projectRows(projects, outputPath) {
  return projects.map((project) => {
    const updatePath = latestProjectUpdate(project.slug);
    const image2 = image2Status(project.slug);
    const evidence = evidenceStatus(project);
    const missingEvidence = evidence.filter((item) => !item.exists).length;
    const updateLink = updatePath
      ? markdownLink(outputPath, relativePath(updatePath), updatePath.split('/').at(-1))
      : 'not generated';
    const client = project.deliveryPartner
      ? `${project.client} via ${project.deliveryPartner}`
      : project.client;
    return `| ${project.title} | ${client} | ${project.audience ?? 'operator'} | ${project.components.length} | ${missingEvidence} | ${image2.state} | ${updateLink} |`;
  });
}

function renderReport({ agent, projects, outputPath, date }) {
  const lines = [
    '# Delivery Agent Progress Report',
    '',
    `**Generated:** ${date}`,
    `**Agent:** ${agent.name}`,
    `**Mode:** ${agent.mode}`,
    `**Source of truth:** ${agent.sourceOfTruth}`,
    '',
    '## Current Position',
    '',
    'Agents can generate and stage delivery updates automatically from the monorepo. They should not send client messages, publish public case studies, promote private portals, or change scope language without human approval.',
    '',
    '## Project Status',
    '',
    '| Project | Client | Audience | Components | Missing Evidence | Image 2 | Latest Update |',
    '| --- | --- | --- | ---: | ---: | --- | --- |',
    ...projectRows(projects, outputPath),
    '',
    '## Automatic Actions Allowed',
    '',
    ...agent.allowedActions.map((action) => `- ${action}`),
    '',
    '## Human Approval Required',
    '',
    ...agent.approvalRequired.map((action) => `- ${action}`),
    '',
    '## Blocked Content',
    '',
    ...agent.blockedContent.map((item) => `- ${item}`),
    '',
    '## Delivery Surfaces',
    '',
    '| Surface | Status | Visibility | Rule |',
    '| --- | --- | --- | --- |',
    ...agent.deliverySurfaces.map((surface) => `| ${surface.id} | ${surface.status} | ${surface.visibility} | ${surface.rule ?? surface.path ?? ''} |`),
    '',
    '## Next Operator Decisions',
    '',
    '- Decide whether the NPG delivery URL should remain on public Pages or move behind private-link or authenticated access.',
    '- Finish brand/image alignment before replacing deterministic evidence images with Image 2 assets.',
    '- Verify OpenAI organization access for `gpt-image-2`, then rerun the Image 2 delivery command.',
    '- Decide the first client portal auth mode: private link, magic link, or authenticated account.',
    '',
    '## Regenerate',
    '',
    '```bash',
    'pnpm delivery:progress',
    '```',
    '',
  ];

  return lines.join('\n');
}

function main() {
  const args = parseArgs(process.argv);
  const agent = readJson(AGENT_CONFIG_PATH);
  const projects = projectManifestPaths().map((path) => readJson(path));
  const errors = validate(agent, projects);

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  if (args.check) {
    console.log(`Delivery progress config OK: ${relativePath(AGENT_CONFIG_PATH)} (${projects.length} project(s))`);
    return;
  }

  const outputPath = args.out ?? join(DELIVERIES_DIR, 'progress', `${args.date}-agent-progress-report.md`);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, renderReport({ agent, projects, outputPath, date: args.date }));
  console.log(JSON.stringify({
    report: relativePath(outputPath),
    projects: projects.map((project) => project.slug),
  }, null, 2));
}

main();
