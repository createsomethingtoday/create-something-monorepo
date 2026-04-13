#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';

const ROOT = process.cwd();
const CATALOG_PATH = resolve(ROOT, 'config/distribution/catalog.json');
const SCHEMA_PATH = resolve(ROOT, 'config/distribution/catalog.schema.json');
const PLAYBOOK_OUTPUT_PATH = resolve(ROOT, 'packages/playbook-mcp/src/catalog.distribution.generated.ts');
const DOC_OUTPUT_PATH = resolve(ROOT, 'docs/DISTRIBUTION_CATALOG.generated.md');

const command = String(process.argv[2] ?? 'check').trim().toLowerCase();
const allowedCommands = new Set(['check', 'generate', 'validate']);

const HOSTS = new Set([
  'claude-code',
  'cursor',
  'claude-desktop',
  'windsurf',
  'vscode',
  'codex',
  'goose',
]);

const ARTIFACT_KINDS = new Set([
  'extension',
  'policy_pack',
  'recipe',
  'distro',
]);

const VISIBILITIES = new Set(['public', 'gated', 'internal']);
const ENTITLEMENTS = new Set(['public', 'mcp_only', 'policy_os']);

const GOOSE_INSTALL_MODE_TYPES = new Set([
  'goose_extension',
  'goose_recipe',
  'goose_distro',
  'goose_bundle',
  'stdio_command',
  'persistent_instructions_file',
  'prompt_template_file',
  'adversary_rule_file',
]);

const COMPATIBILITY_INSTALL_MODE_TYPES = new Set([
  'remote_mcp_url',
  'cursor_deeplink',
  'cursor_config',
  'codex_config',
  'codex_command',
  'claude_desktop_config',
  'claude_code_command',
  'windsurf_config',
  'vscode_extension_hint',
]);

if (!allowedCommands.has(command)) {
  console.error('Usage: node scripts/distribution-catalog.mjs [check|generate|validate]');
  process.exit(2);
}

if (!existsSync(CATALOG_PATH)) {
  console.error(`Catalog missing: ${CATALOG_PATH}`);
  process.exit(1);
}

if (!existsSync(SCHEMA_PATH)) {
  console.error(`Schema missing: ${SCHEMA_PATH}`);
  process.exit(1);
}

const catalog = loadCatalog(CATALOG_PATH);
const errors = validateCatalog(catalog);

if (errors.length > 0) {
  console.error('Distribution catalog validation failed:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

const playbookOutput = renderTypeScriptFile(catalog, 'Distribution catalog for Playbook MCP consumers.');
const docOutput = renderMarkdownDoc(catalog);

if (command === 'validate') {
  console.log('Distribution catalog validation passed.');
  process.exit(0);
}

if (command === 'generate') {
  writeOutput(PLAYBOOK_OUTPUT_PATH, playbookOutput);
  writeOutput(DOC_OUTPUT_PATH, docOutput);
  console.log(`Wrote ${relativeToRoot(PLAYBOOK_OUTPUT_PATH)}`);
  console.log(`Wrote ${relativeToRoot(DOC_OUTPUT_PATH)}`);
  process.exit(0);
}

const drift = [];

if (!isFileContentEqual(PLAYBOOK_OUTPUT_PATH, playbookOutput)) {
  drift.push(relativeToRoot(PLAYBOOK_OUTPUT_PATH));
}
if (!isFileContentEqual(DOC_OUTPUT_PATH, docOutput)) {
  drift.push(relativeToRoot(DOC_OUTPUT_PATH));
}

if (drift.length > 0) {
  console.error('Distribution artifacts are out of date:');
  for (const file of drift) {
    console.error(`- ${file}`);
  }
  console.error('Run: pnpm distribution:generate');
  process.exit(1);
}

console.log('Distribution catalog check passed.');

function loadCatalog(path) {
  let parsed;

  try {
    parsed = JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new Error(`Failed to parse ${relativeToRoot(path)}: ${error instanceof Error ? error.message : String(error)}`);
  }

  return parsed;
}

function validateCatalog(data) {
  const issues = [];

  if (!isPlainObject(data)) {
    return ['catalog must be an object'];
  }

  if (data.version !== 2) {
    issues.push(`version must be 2 (received ${String(data.version)})`);
  }

  if (!Array.isArray(data.artifacts) || data.artifacts.length === 0) {
    issues.push('artifacts must be a non-empty array');
    return issues;
  }

  const ids = new Set();
  const telemetryKeys = new Set();

  for (const [index, artifact] of data.artifacts.entries()) {
    const prefix = `artifacts[${index}]`;

    if (!isPlainObject(artifact)) {
      issues.push(`${prefix} must be an object`);
      continue;
    }

    validateStringField(issues, artifact, 'id', prefix);
    validateEnumField(issues, artifact, 'kind', ARTIFACT_KINDS, prefix);
    validateStringField(issues, artifact, 'title', prefix);
    validateStringField(issues, artifact, 'description', prefix);
    validateStringField(issues, artifact, 'ownerPackage', prefix);
    validateEnumField(issues, artifact, 'visibility', VISIBILITIES, prefix);
    validateEnumField(issues, artifact, 'entitlement', ENTITLEMENTS, prefix);
    validateStringField(issues, artifact, 'docsRef', prefix);
    validateStringField(issues, artifact, 'telemetryKey', prefix);

    if (!Array.isArray(artifact.policyRefs)) {
      issues.push(`${prefix}.policyRefs must be an array`);
    } else {
      for (const [policyIndex, policyRef] of artifact.policyRefs.entries()) {
        if (!isNonEmptyString(policyRef)) {
          issues.push(`${prefix}.policyRefs[${policyIndex}] must be a non-empty string`);
          continue;
        }

        if (!existsSync(resolve(ROOT, policyRef))) {
          issues.push(`${prefix}.policyRefs[${policyIndex}] does not exist (${policyRef})`);
        }
      }
    }

    if (artifact.packageRefs !== undefined) {
      if (!Array.isArray(artifact.packageRefs)) {
        issues.push(`${prefix}.packageRefs must be an array when present`);
      } else {
        for (const [refIndex, packageRef] of artifact.packageRefs.entries()) {
          if (!isNonEmptyString(packageRef)) {
            issues.push(`${prefix}.packageRefs[${refIndex}] must be a non-empty string`);
          }
        }
      }
    }

    if (artifact.artifacts !== undefined) {
      if (!isPlainObject(artifact.artifacts)) {
        issues.push(`${prefix}.artifacts must be an object when present`);
      } else {
        for (const [key, value] of Object.entries(artifact.artifacts)) {
          if (!isNonEmptyString(key) || !isNonEmptyString(value)) {
            issues.push(`${prefix}.artifacts entries must map non-empty strings to non-empty strings`);
            continue;
          }

          if (looksLikeLocalPath(value) && !existsSync(resolve(ROOT, value))) {
            issues.push(`${prefix}.artifacts.${key} does not exist (${value})`);
          }
        }
      }
    }

    if (!isPlainObject(artifact.goose)) {
      issues.push(`${prefix}.goose must be an object`);
    } else {
      validateInstallModeArray(issues, artifact.goose.installModes, prefix, {
        setName: 'goose.installModes',
        allowedTypes: GOOSE_INSTALL_MODE_TYPES,
        requireHost: false,
        forbidHost: true,
      });
    }

    if (artifact.compatibility !== undefined) {
      if (!isPlainObject(artifact.compatibility)) {
        issues.push(`${prefix}.compatibility must be an object when present`);
      } else {
        if (!Array.isArray(artifact.compatibility.hosts) || artifact.compatibility.hosts.length === 0) {
          issues.push(`${prefix}.compatibility.hosts must be a non-empty array`);
        } else {
          for (const [hostIndex, host] of artifact.compatibility.hosts.entries()) {
            if (!HOSTS.has(host)) {
              issues.push(`${prefix}.compatibility.hosts[${hostIndex}] must be one of: ${Array.from(HOSTS).join(', ')}`);
            }
          }
        }

        validateInstallModeArray(issues, artifact.compatibility.installModes, prefix, {
          setName: 'compatibility.installModes',
          allowedTypes: COMPATIBILITY_INSTALL_MODE_TYPES,
          requireHost: true,
          forbidHost: false,
          allowedHosts: Array.isArray(artifact.compatibility.hosts) ? new Set(artifact.compatibility.hosts) : undefined,
        });
      }
    }

    if (!isPlainObject(artifact.verification)) {
      issues.push(`${prefix}.verification must be an object`);
    } else {
      validateStringField(issues, artifact.verification, 'summary', `${prefix}.verification`);

      if (!Array.isArray(artifact.verification.steps) || artifact.verification.steps.length === 0) {
        issues.push(`${prefix}.verification.steps must be a non-empty array`);
      } else {
        for (const [stepIndex, step] of artifact.verification.steps.entries()) {
          const stepPrefix = `${prefix}.verification.steps[${stepIndex}]`;
          if (!isPlainObject(step)) {
            issues.push(`${stepPrefix} must be an object`);
            continue;
          }

          validateStringField(issues, step, 'label', stepPrefix);

          if (!isNonEmptyString(step.command) && !isNonEmptyString(step.prompt)) {
            issues.push(`${stepPrefix} requires either command or prompt`);
          }

          if (step.expected !== undefined && !isNonEmptyString(step.expected)) {
            issues.push(`${stepPrefix}.expected must be a non-empty string when present`);
          }
        }
      }
    }

    if (isNonEmptyString(artifact.id)) {
      if (ids.has(artifact.id)) {
        issues.push(`duplicate artifact id: ${artifact.id}`);
      }
      ids.add(artifact.id);
    }

    if (isNonEmptyString(artifact.telemetryKey)) {
      if (telemetryKeys.has(artifact.telemetryKey)) {
        issues.push(`duplicate telemetry key: ${artifact.telemetryKey}`);
      }
      telemetryKeys.add(artifact.telemetryKey);
    }

    if (isNonEmptyString(artifact.ownerPackage) && !existsSync(resolve(ROOT, artifact.ownerPackage))) {
      issues.push(`${prefix}.ownerPackage does not exist (${artifact.ownerPackage})`);
    }

    if (isNonEmptyString(artifact.docsRef) && !existsSync(resolve(ROOT, artifact.docsRef))) {
      issues.push(`${prefix}.docsRef does not exist (${artifact.docsRef})`);
    }
  }

  for (const [index, artifact] of data.artifacts.entries()) {
    if (!Array.isArray(artifact.packageRefs)) {
      continue;
    }

    for (const [refIndex, packageRef] of artifact.packageRefs.entries()) {
      if (!ids.has(packageRef)) {
        issues.push(`artifacts[${index}].packageRefs[${refIndex}] references missing artifact id (${packageRef})`);
      }
    }
  }

  return issues;
}

function validateInstallModeArray(issues, modes, prefix, options) {
  if (!Array.isArray(modes) || modes.length === 0) {
    issues.push(`${prefix}.${options.setName} must be a non-empty array`);
    return;
  }

  for (const [modeIndex, mode] of modes.entries()) {
    const modePrefix = `${prefix}.${options.setName}[${modeIndex}]`;

    if (!isPlainObject(mode)) {
      issues.push(`${modePrefix} must be an object`);
      continue;
    }

    validateEnumField(issues, mode, 'type', options.allowedTypes, modePrefix);
    validateStringField(issues, mode, 'label', modePrefix);

    if (options.requireHost && !isNonEmptyString(mode.host)) {
      issues.push(`${modePrefix}.host is required`);
    }

    if (options.forbidHost && mode.host !== undefined) {
      issues.push(`${modePrefix}.host is not allowed for Goose-standard install modes`);
    }

    if (mode.host !== undefined) {
      if (!HOSTS.has(mode.host)) {
        issues.push(`${modePrefix}.host must be one of: ${Array.from(HOSTS).join(', ')}`);
      } else if (options.allowedHosts && !options.allowedHosts.has(mode.host)) {
        issues.push(`${modePrefix}.host must also appear in ${prefix}.compatibility.hosts`);
      }
    }

    if (!isNonEmptyString(mode.value) && !isNonEmptyString(mode.command)) {
      issues.push(`${modePrefix} requires either value or command`);
    }

    if (mode.args !== undefined) {
      if (!Array.isArray(mode.args) || mode.args.some((arg) => !isNonEmptyString(arg))) {
        issues.push(`${modePrefix}.args must be an array of non-empty strings when present`);
      }
    }

    if (isNonEmptyString(mode.value) && looksLikeLocalPath(mode.value) && !existsSync(resolve(ROOT, mode.value))) {
      issues.push(`${modePrefix}.value does not exist (${mode.value})`);
    }
  }
}

function renderTypeScriptFile(data, description) {
  const serialized = JSON.stringify(data.artifacts, null, 2);

  return `/**
 * ${description}
 *
 * Generated from \`config/distribution/catalog.json\`.
 * Regenerate with: pnpm distribution:generate
 */

export const DISTRIBUTION_CATALOG_VERSION = ${String(data.version)} as const;

export const DISTRIBUTION_CATALOG_ENTRIES = ${serialized} as const;

export type DistributionCatalogEntry = (typeof DISTRIBUTION_CATALOG_ENTRIES)[number];
export type DistributionArtifactKind = DistributionCatalogEntry['kind'];
export type DistributionGooseInstallMode = DistributionCatalogEntry['goose']['installModes'][number];
export type DistributionCatalogEntryWithCompatibility = Extract<DistributionCatalogEntry, { compatibility: unknown }>;
export type DistributionCompatibility = NonNullable<DistributionCatalogEntryWithCompatibility['compatibility']>;
export type DistributionHost = DistributionCompatibility['hosts'][number];
export type DistributionCompatibilityInstallMode = DistributionCompatibility['installModes'][number];
export type DistributionVisibility = DistributionCatalogEntry['visibility'];
export type DistributionEntitlement = DistributionCatalogEntry['entitlement'];
`;
}

function renderMarkdownDoc(data) {
  const summaryRows = data.artifacts
    .map((artifact) => {
      const gooseModes = artifact.goose.installModes.map((mode) => mode.type).join(', ');
      const compatibilityHosts = artifact.compatibility?.hosts?.join(', ') ?? 'goose-only';
      const related = Array.isArray(artifact.packageRefs) && artifact.packageRefs.length > 0
        ? artifact.packageRefs.join(', ')
        : '—';

      return `| \`${escapePipes(artifact.id)}\` | \`${artifact.kind}\` | \`${artifact.ownerPackage}\` | ${escapePipes(gooseModes)} | ${escapePipes(compatibilityHosts)} | ${escapePipes(related)} |`;
    })
    .join('\n');

  const details = data.artifacts.map((artifact) => renderArtifactDetails(artifact)).join('\n\n');

  return `# Distribution Catalog

> Generated from \`config/distribution/catalog.json\`.
> Regenerate with \`pnpm distribution:generate\`.

## Summary

| ID | Kind | Owner Package | Goose Modes | Compatibility Hosts | Related Packages |
|----|------|---------------|-------------|---------------------|------------------|
${summaryRows}

## Artifact Details

${details}
`;
}

function renderArtifactDetails(artifact) {
  const gooseInstallModes = artifact.goose.installModes
    .map((mode) => renderInstallMode(mode, 'Goose'))
    .join('\n\n');

  const compatibilitySection = artifact.compatibility
    ? `#### Compatibility

- Hosts: ${artifact.compatibility.hosts.map((host) => `\`${host}\``).join(', ')}

${artifact.compatibility.installModes.map((mode) => renderInstallMode(mode, 'Compatibility')).join('\n\n')}`
    : '#### Compatibility\n\n- Goose-only artifact.'
  ;

  const relatedPackages = Array.isArray(artifact.packageRefs) && artifact.packageRefs.length > 0
    ? artifact.packageRefs.map((ref) => `\`${ref}\``).join(', ')
    : 'None';

  const artifactRefs = artifact.artifacts
    ? Object.entries(artifact.artifacts).map(([key, value]) => `- ${key}: \`${value}\``).join('\n')
    : '- None';

  const verification = artifact.verification.steps
    .map((step, index) => {
      const action = isNonEmptyString(step.command) ? `Command: \`${step.command}\`` : `Prompt: ${step.prompt}`;
      const expected = isNonEmptyString(step.expected) ? ` Expected: ${step.expected}` : '';
      return `${index + 1}. ${step.label}. ${action}${expected}`;
    })
    .join('\n');

  return `### ${artifact.title} (\`${artifact.id}\`)

- Kind: \`${artifact.kind}\`
- Owner package: \`${artifact.ownerPackage}\`
- Visibility: \`${artifact.visibility}\`
- Entitlement: \`${artifact.entitlement}\`
- Docs: \`${artifact.docsRef}\`
- Policy refs: ${artifact.policyRefs.map((ref) => `\`${ref}\``).join(', ')}
- Telemetry key: \`${artifact.telemetryKey}\`
- Related packages: ${relatedPackages}
- Verification summary: ${artifact.verification.summary}

#### Goose Packaging

${gooseInstallModes}

#### Artifact Refs

${artifactRefs}

${compatibilitySection}

#### Verification

${verification}`;
}

function renderInstallMode(mode, sectionLabel) {
  const header = `- \`${mode.type}\`${mode.host ? ` for \`${mode.host}\`` : ''} — ${mode.label} (${sectionLabel})`;
  const value = isNonEmptyString(mode.value)
    ? mode.value
    : [mode.command, ...(Array.isArray(mode.args) ? mode.args : [])].join(' ');

  return `${header}\n\n\`\`\`text\n${value}\n\`\`\``;
}

function looksLikeLocalPath(value) {
  return /^(config|docs|packages|scripts)\//.test(value);
}

function writeOutput(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, 'utf8');
}

function isFileContentEqual(path, content) {
  if (!existsSync(path)) {
    return false;
  }

  return readFileSync(path, 'utf8') === content;
}

function relativeToRoot(path) {
  return relative(ROOT, path) || '.';
}

function validateStringField(issues, object, key, prefix) {
  if (!isNonEmptyString(object[key])) {
    issues.push(`${prefix}.${key} must be a non-empty string`);
  }
}

function validateEnumField(issues, object, key, allowed, prefix) {
  if (!allowed.has(object[key])) {
    issues.push(`${prefix}.${key} must be one of: ${Array.from(allowed).join(', ')}`);
  }
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function escapePipes(value) {
  return String(value).replaceAll('|', '\\|');
}
