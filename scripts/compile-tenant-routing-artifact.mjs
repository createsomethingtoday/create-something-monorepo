#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const POLICY_SPEC_PATH = resolve(ROOT, 'docs/policies/v1/policy.tenant-tool-exposure.v1.json');
const ROUTING_CONFIG_PATH = resolve(ROOT, 'config/mcp-hub/routing.json');
const OUTPUT_PATH = resolve(ROOT, 'docs/policies/generated/tenant-tool-exposure-routing.v1.json');

function resolveCommitSha() {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: ROOT,
      encoding: 'utf8',
    }).trim();
  } catch {
    return 'unknown';
  }
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) {
    return undefined;
  }
  return value
    .filter((entry) => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normalizeStringMap(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entry]) => typeof entry === 'string' && entry.trim().length > 0)
      .map(([key, entry]) => [key.trim(), entry.trim()])
      .sort(([left], [right]) => left.localeCompare(right)),
  );
}

function normalizeTenantPolicy(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const allowServers = normalizeStringArray(value.allowServers);
  const allowTags = normalizeStringArray(value.allowTags);
  const allowAccessTypes = normalizeStringArray(value.allowAccessTypes);
  const allowToolPrefixes = normalizeStringArray(value.allowToolPrefixes);
  const normalized = {};

  if (allowServers) {
    normalized.allowServers = allowServers;
  }
  if (allowTags) {
    normalized.allowTags = allowTags;
  }
  if (allowAccessTypes) {
    normalized.allowAccessTypes = allowAccessTypes;
  }
  if (allowToolPrefixes) {
    normalized.allowToolPrefixes = allowToolPrefixes;
  }

  return normalized;
}

function normalizeRoutingConfig(value) {
  const input = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const defaultsInput = input.defaults && typeof input.defaults === 'object' && !Array.isArray(input.defaults)
    ? input.defaults
    : {};
  const tenantsInput = input.tenants && typeof input.tenants === 'object' && !Array.isArray(input.tenants)
    ? input.tenants
    : {};

  return {
    defaults: {
      tenant: typeof defaultsInput.tenant === 'string' && defaultsInput.tenant.trim().length > 0
        ? defaultsInput.tenant.trim()
        : 'default',
      allowPendingOauthApprovals: defaultsInput.allowPendingOauthApprovals === true,
    },
    tenants: Object.fromEntries(
      Object.entries(tenantsInput)
        .filter(([key]) => typeof key === 'string' && key.trim().length > 0)
        .map(([key, policy]) => [key.trim(), normalizeTenantPolicy(policy)])
        .sort(([left], [right]) => left.localeCompare(right)),
    ),
    aliases: normalizeStringMap(input.aliases),
  };
}

function sortKeys(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => sortKeys(entry));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, sortKeys(entry)]),
    );
  }

  return value;
}

function hashJson(value) {
  return createHash('sha256').update(JSON.stringify(sortKeys(value))).digest('hex');
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function main() {
  const policySpec = readJson(POLICY_SPEC_PATH);
  const routing = normalizeRoutingConfig(readJson(ROUTING_CONFIG_PATH));
  const generatedAt = new Date().toISOString();
  const commitSha = resolveCommitSha();
  const artifact = {
    policy_id: 'policy.tenant-tool-exposure.v1',
    artifact_type: 'hub_tenant_routing',
    version: 1,
    generated_at: generatedAt,
    commit_sha: commitSha,
    compiler: {
      name: 'compile-tenant-routing-artifact',
      version: 1,
    },
    catalog: {
      version: policySpec.version,
      status: policySpec.status,
    },
    runtime_surface: 'hub_visible_route_filter',
    coverage: {
      implemented_controls: [
        'defaults.tenant',
        'tenant_aliases',
        'allow_servers',
        'allow_tags',
        'allow_access_types',
        'allow_tool_prefixes',
        'hub_tenant_id_override',
      ],
      unimplemented_policy_controls: [
        'provider_candidate_failover',
        'pending_oauth_candidate_state',
        'workflow_target_scope_constraints',
      ],
    },
    integrity: {
      policy_hash: hashJson(routing),
      source_hash: hashJson({
        policySpec,
        routing,
      }),
    },
    sources: {
      policy_spec: 'docs/policies/v1/policy.tenant-tool-exposure.v1.json',
      routing_config: 'config/mcp-hub/routing.json',
    },
    routing,
  };

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
  console.log(`Compiled tenant routing artifact to ${OUTPUT_PATH.replace(`${ROOT}/`, '')}.`);
}

main();
