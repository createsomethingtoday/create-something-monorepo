#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const POLICY_DIR = resolve(ROOT, 'docs/policies/v1');
const ALLOWED_STATUS = new Set(['draft', 'active', 'archived', 'deprecated']);

function parseArgs(argv) {
  const args = {
    policyIds: [],
    format: 'text',
    strict: true,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--policy-id' && argv[i + 1]) {
      args.policyIds.push(...argv[++i].split(',').map((value) => value.trim()).filter(Boolean));
      continue;
    }
    if (arg === '--format' && argv[i + 1]) {
      args.format = argv[++i];
      continue;
    }
    if (arg === '--no-strict') {
      args.strict = false;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (args.format !== 'text' && args.format !== 'json') {
    throw new Error(`Unsupported format: ${args.format}`);
  }

  return args;
}

function printUsage() {
  console.log(`Usage:
  node scripts/policy-artifact-check.mjs [--policy-id policy.foo.v1,policy.bar.v1] [--format text|json] [--no-strict]`);
}

function listPolicyIds() {
  const ids = new Set();
  for (const file of readdirSync(POLICY_DIR)) {
    if (!file.startsWith('policy.') || (!file.endsWith('.md') && !file.endsWith('.json'))) {
      continue;
    }
    ids.add(file.replace(/\.json$|\.md$/u, ''));
  }
  return [...ids].sort();
}

function asObject(value) {
  return value && typeof value === 'object' ? value : null;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function validateReleaseGatePolicy(parsed, details) {
  const artifactClasses = new Set(asArray(parsed.artifact_classes));
  for (const artifactClass of ['paper', 'experiment', 'policy']) {
    if (!artifactClasses.has(artifactClass)) {
      details.push(`Missing artifact class "${artifactClass}" in release gate policy JSON.`);
    }
  }

  const previewEligibility = asObject(parsed.preview_eligibility);
  if (!previewEligibility) {
    details.push('Missing preview_eligibility block in release gate policy JSON.');
  } else {
    const requires = new Set(asArray(previewEligibility.requires));
    for (const requirement of ['cycle_label', 'draft_pr', 'quality_checks_passed']) {
      if (!requires.has(requirement)) {
        details.push(`preview_eligibility.requires is missing "${requirement}".`);
      }
    }
  }

  const productionEligibility = asObject(parsed.production_eligibility);
  if (!productionEligibility) {
    details.push('Missing production_eligibility block in release gate policy JSON.');
  } else {
    const requires = new Set(asArray(productionEligibility.requires));
    for (const requirement of ['review_1_complete', 'review_2_complete', 'publish_approved_label', 'merged_to_main']) {
      if (!requires.has(requirement)) {
        details.push(`production_eligibility.requires is missing "${requirement}".`);
      }
    }
  }

  const prohibitedTriggers = new Set(asArray(parsed.prohibited_triggers));
  if (!prohibitedTriggers.has('commit_count')) {
    details.push('prohibited_triggers must include "commit_count".');
  }

  const reviewLabels = new Set(asArray(parsed.review_labels));
  for (const label of [
    'paper-cycle',
    'experiment-cycle',
    'policy-cycle',
    'ready-review-1',
    'ready-review-2',
    'publish-approved',
    'deployed',
  ]) {
    if (!reviewLabels.has(label)) {
      details.push(`review_labels is missing "${label}".`);
    }
  }
}

function validatePolicy(policyId) {
  const details = [];
  const jsonPath = resolve(POLICY_DIR, `${policyId}.json`);
  const mdPath = resolve(POLICY_DIR, `${policyId}.md`);

  if (!existsSync(jsonPath)) {
    details.push(`Missing JSON artifact: ${jsonPath}`);
  }

  if (!existsSync(mdPath)) {
    details.push(`Missing markdown artifact: ${mdPath}`);
  }

  if (existsSync(jsonPath)) {
    try {
      const parsed = JSON.parse(readFileSync(jsonPath, 'utf8'));
      if (parsed.policy_id !== policyId) {
        details.push(`policy_id mismatch in ${jsonPath}`);
      }
      if (!Number.isInteger(parsed.version) || parsed.version < 1) {
        details.push(`version must be a positive integer in ${jsonPath}`);
      }
      if (!ALLOWED_STATUS.has(parsed.status)) {
        details.push(`status must be one of ${[...ALLOWED_STATUS].join(', ')} in ${jsonPath}`);
      }

      if (policyId === 'policy.paper-experiment-release-gate.v1') {
        validateReleaseGatePolicy(parsed, details);
      }
    } catch (error) {
      details.push(`Invalid JSON in ${jsonPath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (existsSync(mdPath)) {
    const content = readFileSync(mdPath, 'utf8');
    const requiredSections = [
      `# ${policyId}`,
      '## Purpose',
      '## Policy Statements',
      '## Evidence',
      '## Source Anchors',
    ];
    for (const section of requiredSections) {
      if (!content.includes(section)) {
        details.push(`Missing "${section}" in ${mdPath}`);
      }
    }

    if (policyId === 'policy.paper-experiment-release-gate.v1' && !content.includes('Commit count MUST NOT be used')) {
      details.push(`Release gate policy markdown must explicitly prohibit commit-count deploy triggers in ${mdPath}`);
    }
  }

  return {
    id: policyId,
    ok: details.length === 0,
    details,
  };
}

function printText(results) {
  const failed = results.filter((result) => !result.ok);
  if (failed.length === 0) {
    console.log(`Policy artifact check passed for ${results.length} policy artifact(s).`);
    return;
  }

  console.error(`Policy artifact check failed for ${failed.length} of ${results.length} policy artifact(s):`);
  for (const result of failed) {
    console.error(`- ${result.id}`);
    for (const detail of result.details) {
      console.error(`  - ${detail}`);
    }
  }
}

function main() {
  const args = parseArgs(process.argv);
  const policyIds = args.policyIds.length > 0 ? [...new Set(args.policyIds)].sort() : listPolicyIds();
  const results = policyIds.map(validatePolicy);
  const passed = results.every((result) => result.ok);

  if (args.format === 'json') {
    console.log(JSON.stringify({
      audit: {
        command: 'policy:artifacts:check',
        passed,
        policy_count: results.length,
      },
      results,
    }, null, 2));
  } else {
    printText(results);
  }

  if (args.strict && !passed) {
    process.exit(1);
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
