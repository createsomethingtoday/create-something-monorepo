#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'yaml';

const ROOT = process.cwd();
const failures = [];
const checks = [];

function repoPath(path) {
  return resolve(ROOT, path);
}

function record(name, passed, detail) {
  checks.push({ name, passed });
  if (!passed) {
    failures.push(detail ? `${name}: ${detail}` : name);
  }
}

function readText(path) {
  const fullPath = repoPath(path);
  if (!existsSync(fullPath)) {
    record(`read ${path}`, false, 'file does not exist');
    return '';
  }
  return readFileSync(fullPath, 'utf8');
}

function readJson(path) {
  const text = readText(path);
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (error) {
    record(`parse ${path}`, false, error.message);
    return {};
  }
}

function readYaml(path) {
  const text = readText(path);
  if (!text) return {};
  try {
    return parse(text);
  } catch (error) {
    record(`parse ${path}`, false, error.message);
    return {};
  }
}

function includesAll(name, text, needles) {
  for (const needle of needles) {
    record(`${name} includes ${needle}`, text.includes(needle), `missing "${needle}"`);
  }
}

function collectCommandStrings(value, path = []) {
  if (typeof value === 'string') {
    return [{ path: path.join('.'), value }];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectCommandStrings(item, [...path, String(index)]));
  }
  if (!value || typeof value !== 'object') {
    return [];
  }

  return Object.entries(value).flatMap(([key, item]) => {
    if (['command', 'start', 'ready'].includes(key) && typeof item === 'string') {
      return [{ path: [...path, key].join('.'), value: item }];
    }
    return collectCommandStrings(item, [...path, key]);
  });
}

function assertTask(automations, id, expected) {
  const task = automations.tasks?.[id];
  record(`task ${id} exists`, Boolean(task), `missing tasks.${id}`);
  if (!task) return;

  if (expected.command) {
    record(
      `task ${id} command`,
      task.command === expected.command,
      `expected "${expected.command}", found "${task.command ?? ''}"`
    );
  }

  if (expected.trigger) {
    record(
      `task ${id} trigger`,
      Array.isArray(task.triggeredBy) && task.triggeredBy.includes(expected.trigger),
      `expected trigger "${expected.trigger}"`
    );
  }
}

function assertService(automations, id) {
  const service = automations.services?.[id];
  record(`service ${id} exists`, Boolean(service), `missing services.${id}`);
  record(
    `service ${id} start command`,
    typeof service?.commands?.start === 'string',
    'missing commands.start'
  );
}

const packageJson = readJson('package.json');
const nvmVersion = readText('.nvmrc').trim();
const nodeVersion = nvmVersion.replace(/^v/u, '');
const pnpmVersion = packageJson.packageManager?.replace(/^pnpm@/u, '') ?? '';

record(
  'packageManager pins pnpm',
  packageJson.packageManager === 'pnpm@9.15.0',
  'expected pnpm@9.15.0'
);
record(
  'bootstrap worktree script exists',
  packageJson.scripts?.['bootstrap:worktree'] === 'bash ./scripts/bootstrap-worktree.sh',
  'expected bootstrap:worktree wrapper'
);
record(
  'root check runs Ona rollout gate',
  typeof packageJson.scripts?.check === 'string' &&
    packageJson.scripts.check.startsWith('pnpm ona:rollout:check && '),
  'expected root check to start with pnpm ona:rollout:check'
);
record(
  'linear ready script exists',
  packageJson.scripts?.['linear:ready'] === 'node scripts/linear/remote.mjs ready',
  'expected pnpm linear:ready wrapper'
);
record(
  'ona rollout check script exists',
  packageJson.scripts?.['ona:rollout:check'] === 'node scripts/ona-rollout-check.mjs',
  'expected pnpm ona:rollout:check wrapper'
);

const devcontainer = readJson('.devcontainer/devcontainer.json');
record(
  'devcontainer pins Node',
  devcontainer.build?.args?.NODE_VERSION === nodeVersion,
  `expected NODE_VERSION ${nodeVersion}`
);
record(
  'devcontainer pins pnpm',
  devcontainer.build?.args?.PNPM_VERSION === pnpmVersion,
  `expected PNPM_VERSION ${pnpmVersion}`
);
record(
  'devcontainer post-create command',
  devcontainer.postCreateCommand === 'bash .devcontainer/post-create.sh',
  'expected bash .devcontainer/post-create.sh'
);

const postCreate = readText('.devcontainer/post-create.sh');
includesAll('post-create', postCreate, [
  `EXPECTED_NODE="v${nodeVersion}"`,
  `EXPECTED_PNPM="${pnpmVersion}"`,
  'pnpm install --frozen-lockfile',
  'pnpm --filter @create-something/dotfiles install-codex-skills'
]);

const bootstrap = readText('.ona/scripts/bootstrap.sh');
includesAll('bootstrap', bootstrap, [
  `EXPECTED_NODE="v${nodeVersion}"`,
  `EXPECTED_PNPM="${pnpmVersion}"`,
  'warn_or_require_optional_commands',
  'pnpm install --frozen-lockfile',
  'node_modules/.pnpm-lock.sha256'
]);

const automations = readYaml('.ona/automations.yaml');
assertTask(automations, 'bootstrap', {
  command: './.ona/scripts/bootstrap.sh',
  trigger: 'postEnvironmentStart'
});
assertTask(automations, 'linear-ready', {
  command: 'pnpm linear:ready',
  trigger: 'manual'
});
assertTask(automations, 'ona-rollout-check', {
  command: 'pnpm ona:rollout:check',
  trigger: 'manual'
});

for (const id of [
  'agency-check',
  'repo-lint',
  'repo-check',
  'webflow-dashboard-cloud-check',
  'webflow-dashboard-cloud-build',
  'agency-build',
  'agency-deploy-preview'
]) {
  assertTask(automations, id, { trigger: 'manual' });
}

for (const id of [
  'agency-dev',
  'product-dev',
  'services-dev',
  'platform-dev',
  'webflow-dashboard-cloud-dev'
]) {
  assertService(automations, id);
}

for (const command of collectCommandStrings(automations)) {
  const legacyCommand = /(^|\s)(lm\s|lm$|pnpm\s+loom:|\.loom)/u.test(command.value);
  record(
    `automation command avoids legacy Loom at ${command.path}`,
    !legacyCommand,
    `legacy coordination command found: ${command.value}`
  );
}

const skill = readText('.ona/skills/create-something-monorepo-workflow/SKILL.md');
includesAll('workflow skill', skill, [
  '## Linear Rules',
  '## Codex Agent In Ona',
  'pnpm linear:ready',
  'Do not create new Loom work.'
]);
record(
  'workflow skill removed Loom Rules heading',
  !skill.includes('## Loom Rules'),
  'legacy Loom heading remains'
);

const rollout = readText('docs/guides/ONA_CORE_ROLLOUT.md');
includesAll('rollout guide', rollout, [
  '## Current Ona Docs Anchors',
  '## Codex Agent Adoption Boundary',
  '## Ona CLI Operator Path',
  '## Core Tier Gate',
  '## MCP Configuration Policy',
  '## Live Setup Evidence Record',
  '### Coordination Secrets',
  '### CLI/Admin Access',
  '`https://ona.com/docs/llms.txt`',
  '`https://ona.com/docs/ona/agents/codex`',
  '`https://ona.com/docs/ona/integrations/configure-codex`',
  '`https://ona.com/docs/ona/integrations/cli`',
  'brew install gitpod-io/tap/ona',
  'https://app.gitpod.io/releases/cli/install.sh',
  'VERIFY_SLSA=true',
  'ona login',
  'ona login --token',
  'ONA_TOKEN',
  'ona whoami',
  'ona project list',
  'ona environment list',
  'failed_precondition: feature is only available for core tier and above',
  'ona environment create <agency-project-id>',
  'Core-tier blocker observed',
  'Run `ona-rollout-check`',
  'Do not mark live Ona setup complete from local repo checks alone.',
  '### Project Evidence',
  'Ona project ID/URL',
  'Codex read-only validation',
  '### Secret Presence',
  'Secret key',
  'Present in Ona'
]);

const docsReadme = readText('docs/README.md');
record(
  'docs README links Ona rollout',
  docsReadme.includes('[guides/ONA_CORE_ROLLOUT.md](./guides/ONA_CORE_ROLLOUT.md)'),
  'missing ONA_CORE_ROLLOUT entry'
);

record(
  'phase 1 has no active repo-local MCP config',
  !existsSync(repoPath('.ona/mcp-config.json')),
  '.ona/mcp-config.json exists despite phase-1 no-active-MCP policy'
);

if (failures.length > 0) {
  console.error(
    `Ona rollout check failed (${failures.length} failure${failures.length === 1 ? '' : 's'}):`
  );
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Ona rollout check passed (${checks.length} checks).`);
