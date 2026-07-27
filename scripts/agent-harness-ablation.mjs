#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MANIFEST_SCHEMA = 'harness-ablation-manifest.v1';
const PLAN_SCHEMA = 'harness-ablation-plan.v1';
const RESULTS_SCHEMA = 'harness-ablation-results.v1';
const COMPARISON_SCHEMA = 'harness-ablation-comparison.v1';
const SAFE_ENVIRONMENTS = new Set(['isolated', 'shadow']);
const COMPONENT_KINDS = new Set([
  'instruction',
  'hook',
  'skill',
  'mcp',
  'policy',
  'memory',
  'review',
  'other'
]);
const OVERHEAD_METRICS = new Set(['humanCorrectionMinutes', 'totalTokens', 'costUsd', 'latencyMs']);

function parseArgs(argv) {
  const tokens = argv.slice(2).filter((token) => token !== '--');
  const command = tokens.shift();
  const args = {
    command,
    manifest: null,
    results: null,
    format: 'markdown',
    out: null
  };

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token === '--manifest' && tokens[index + 1]) {
      args.manifest = tokens[++index];
    } else if (token === '--results' && tokens[index + 1]) {
      args.results = tokens[++index];
    } else if (token === '--format' && tokens[index + 1]) {
      args.format = tokens[++index].toLowerCase();
    } else if (token === '--out' && tokens[index + 1]) {
      args.out = tokens[++index];
    } else if (token === '--help' || token === '-h') {
      args.command = 'help';
    } else {
      throw new Error(`Unknown argument: ${token}`);
    }
  }

  if (args.format === 'md') args.format = 'markdown';
  if (!['json', 'markdown'].includes(args.format)) {
    throw new Error(`Unsupported format: ${args.format}`);
  }
  return args;
}

function usage() {
  return `Usage:
  pnpm agent:harness-ablation -- plan --manifest <manifest.json> [--format json|markdown] [--out <path>]
  pnpm agent:harness-ablation -- compare --manifest <manifest.json> --results <results.json> [--format json|markdown] [--out <path>]

The CLI plans and compares no-write harness ablations. It does not launch an
agent, remove live controls, spend model credits, or mutate production.`;
}

function readJson(filePath) {
  return JSON.parse(readFileSync(path.resolve(filePath), 'utf8'));
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort((left, right) => left.localeCompare(right))
        .map((key) => [key, canonicalize(value[key])])
    );
  }
  return value;
}

function hash(value) {
  return createHash('sha256')
    .update(JSON.stringify(canonicalize(value)))
    .digest('hex');
}

function assertObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
}

function assertIdentifier(value, label) {
  if (typeof value !== 'string' || !/^[a-z0-9][a-z0-9._-]*$/.test(value)) {
    throw new Error(`${label} must use lowercase letters, numbers, dots, underscores, or hyphens.`);
  }
}

function assertMetricName(value) {
  if (typeof value !== 'string' || !/^[A-Za-z][A-Za-z0-9._-]*$/.test(value)) {
    throw new Error(
      'Metric names must start with a letter and contain only letters, numbers, dots, underscores, or hyphens.'
    );
  }
}

function assertUniqueIds(items, label) {
  const ids = new Set();
  for (const item of items) {
    assertObject(item, `${label} item`);
    assertIdentifier(item.id, `${label} id`);
    if (ids.has(item.id)) throw new Error(`Duplicate ${label} id: ${item.id}`);
    ids.add(item.id);
  }
}

export function validateManifest(manifest) {
  assertObject(manifest, 'Manifest');
  if (manifest.schemaVersion !== MANIFEST_SCHEMA) {
    throw new Error(`Manifest schemaVersion must be ${MANIFEST_SCHEMA}.`);
  }
  assertIdentifier(manifest.experimentId, 'experimentId');
  if (!SAFE_ENVIRONMENTS.has(manifest.environment)) {
    throw new Error(
      'Harness ablations must run in an isolated or shadow environment; production ablation is forbidden.'
    );
  }
  if (typeof manifest.hypothesis !== 'string' || manifest.hypothesis.trim().length < 12) {
    throw new Error('Manifest hypothesis must explain the expected causal contribution.');
  }
  if (!Number.isInteger(manifest.repetitions) || manifest.repetitions < 2) {
    throw new Error('Manifest repetitions must be an integer of at least 2.');
  }
  if (
    typeof manifest.randomizationSeed !== 'string' ||
    manifest.randomizationSeed.trim().length < 8
  ) {
    throw new Error('Manifest randomizationSeed must contain at least 8 characters.');
  }
  if (!Array.isArray(manifest.components) || manifest.components.length === 0) {
    throw new Error('Manifest must declare at least one harness component.');
  }
  assertUniqueIds(manifest.components, 'component');
  for (const component of manifest.components) {
    if (!COMPONENT_KINDS.has(component.kind)) {
      throw new Error(`Unsupported component kind for ${component.id}: ${component.kind}`);
    }
    if (typeof component.artifact !== 'string' || !component.artifact.trim()) {
      throw new Error(`Component ${component.id} must name its artifact.`);
    }
    if (
      typeof component.expectedContribution !== 'string' ||
      !component.expectedContribution.trim()
    ) {
      throw new Error(`Component ${component.id} must state its expected contribution.`);
    }
    if (typeof component.safetyCritical !== 'boolean') {
      throw new Error(`Component ${component.id} must declare safetyCritical.`);
    }
    if (typeof component.deterministicAlternativeAvailable !== 'boolean') {
      throw new Error(`Component ${component.id} must declare deterministicAlternativeAvailable.`);
    }
  }
  if (!Array.isArray(manifest.tasks) || manifest.tasks.length === 0) {
    throw new Error('Manifest must declare at least one task.');
  }
  assertUniqueIds(manifest.tasks, 'task');
  for (const task of manifest.tasks) {
    if (typeof task.description !== 'string' || !task.description.trim()) {
      throw new Error(`Task ${task.id} must include a description.`);
    }
  }
  assertObject(manifest.metrics, 'metrics');
  const metricEntries = Object.entries(manifest.metrics);
  if (metricEntries.length === 0) throw new Error('Manifest must configure at least one metric.');
  let totalWeight = 0;
  for (const [metric, config] of metricEntries) {
    assertMetricName(metric);
    assertObject(config, `metric ${metric}`);
    if (!['maximize', 'minimize'].includes(config.direction)) {
      throw new Error(`Metric ${metric} direction must be maximize or minimize.`);
    }
    if (!Number.isFinite(config.weight) || config.weight < 0) {
      throw new Error(`Metric ${metric} weight must be a non-negative number.`);
    }
    if (!Number.isFinite(config.scale) || config.scale <= 0) {
      throw new Error(`Metric ${metric} scale must be a positive number.`);
    }
    totalWeight += config.weight;
  }
  if (totalWeight <= 0) throw new Error('At least one metric weight must be positive.');
  assertObject(manifest.decisionPolicy, 'decisionPolicy');
  for (const key of [
    'materialContribution',
    'materialRegression',
    'overheadTolerance',
    'movePolicyViolationDelta',
    'moveTaskSuccessDeltaCeiling'
  ]) {
    if (!Number.isFinite(manifest.decisionPolicy[key])) {
      throw new Error(`decisionPolicy.${key} must be a number.`);
    }
  }
  if (manifest.decisionPolicy.materialContribution <= 0) {
    throw new Error('decisionPolicy.materialContribution must be positive.');
  }
  if (manifest.decisionPolicy.materialRegression >= 0) {
    throw new Error('decisionPolicy.materialRegression must be negative.');
  }
  return manifest;
}

export function buildPlan(manifestInput) {
  const manifest = validateManifest(manifestInput);
  const componentIds = manifest.components.map((component) => component.id);
  const safetyIds = new Set(
    manifest.components
      .filter((component) => component.safetyCritical)
      .map((component) => component.id)
  );
  const arms = [
    {
      id: 'control',
      label: 'Model and harness baseline without declared CREATE SOMETHING components',
      enabledComponents: [],
      disabledComponents: componentIds,
      ablatedComponent: null,
      requiresIsolatedExecution: safetyIds.size > 0
    },
    {
      id: 'full',
      label: 'Full declared harness',
      enabledComponents: componentIds,
      disabledComponents: [],
      ablatedComponent: null,
      requiresIsolatedExecution: false
    },
    ...manifest.components.map((component) => ({
      id: `without-${component.id}`,
      label: `Full harness without ${component.id}`,
      enabledComponents: componentIds.filter((id) => id !== component.id),
      disabledComponents: [component.id],
      ablatedComponent: component.id,
      requiresIsolatedExecution: component.safetyCritical
    }))
  ];
  const manifestHash = hash(manifest);
  const schedule = [];
  for (const arm of arms) {
    for (const task of manifest.tasks) {
      for (let repetition = 1; repetition <= manifest.repetitions; repetition += 1) {
        const key = `${arm.id}::${task.id}::${repetition}`;
        schedule.push({
          key,
          armId: arm.id,
          taskId: task.id,
          repetition,
          randomOrderKey: hash(`${manifest.experimentId}:${manifest.randomizationSeed}:${key}`)
        });
      }
    }
  }
  schedule.sort((left, right) => left.randomOrderKey.localeCompare(right.randomOrderKey));
  const orderedSchedule = schedule.map(({ randomOrderKey: _randomOrderKey, ...run }, index) => ({
    sequence: index + 1,
    ...run
  }));
  const planCore = {
    schemaVersion: PLAN_SCHEMA,
    experimentId: manifest.experimentId,
    manifestHash,
    environment: manifest.environment,
    hypothesis: manifest.hypothesis,
    repetitions: manifest.repetitions,
    randomizationSeed: manifest.randomizationSeed,
    taskIds: manifest.tasks.map((task) => task.id),
    arms,
    schedule: orderedSchedule,
    executionBoundary: {
      writesProduction: false,
      launchesAgents: false,
      allowedEnvironments: [...SAFE_ENVIRONMENTS],
      note: 'Execute each planned arm through an owning isolated or shadow harness, then return versioned run receipts.'
    }
  };
  return {
    ...planCore,
    planHash: hash(planCore),
    expectedRunCount: orderedSchedule.length
  };
}

function validateMetricValue(metric, value) {
  if (!Number.isFinite(value)) throw new Error(`Metric ${metric} must be a finite number.`);
  if (value < 0) throw new Error(`Metric ${metric} cannot be negative.`);
  if (['taskSuccess', 'escalationQuality'].includes(metric) && value > 1) {
    throw new Error(`Metric ${metric} must be between 0 and 1.`);
  }
}

function expectedRunKeys(plan) {
  return plan.schedule.map((run) => run.key);
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value) {
  return Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000;
}

function normalizedMetricScore(value, config) {
  const normalized = Math.min(value / config.scale, 1);
  return config.direction === 'maximize' ? normalized : 1 - normalized;
}

function utility(metrics, metricConfig) {
  const entries = Object.entries(metricConfig);
  const totalWeight = entries.reduce((sum, [, config]) => sum + config.weight, 0);
  return (
    entries.reduce(
      (sum, [metric, config]) =>
        sum + normalizedMetricScore(metrics[metric], config) * config.weight,
      0
    ) / totalWeight
  );
}

function summarizeArm(runs, metricConfig) {
  const metrics = Object.fromEntries(
    Object.keys(metricConfig).map((metric) => [
      metric,
      round(mean(runs.map((run) => run.metrics[metric])))
    ])
  );
  return {
    runCount: runs.length,
    metrics,
    utility: round(utility(metrics, metricConfig))
  };
}

function rawDeltas(left, right) {
  return Object.fromEntries(
    Object.keys(left).map((metric) => [`${metric}Delta`, round(left[metric] - right[metric])])
  );
}

function overheadDelta(fullMetrics, ablatedMetrics, metricConfig) {
  const entries = Object.entries(metricConfig).filter(
    ([metric, config]) =>
      OVERHEAD_METRICS.has(metric) && config.direction === 'minimize' && config.weight > 0
  );
  if (entries.length === 0) return 0;
  return round(
    entries.reduce((sum, [metric, config]) => {
      const normalized = (fullMetrics[metric] - ablatedMetrics[metric]) / config.scale;
      return sum + Math.max(normalized, 0) * config.weight;
    }, 0) / entries.reduce((sum, [, config]) => sum + config.weight, 0)
  );
}

function decisionFor(component, contribution, overhead, metricDeltas, policy) {
  const policyViolationBenefit = -(metricDeltas.policyViolationsDelta ?? 0);
  const taskSuccessBenefit = metricDeltas.taskSuccessDelta ?? 0;

  if (contribution <= policy.materialRegression) {
    return {
      decision: 'remove',
      reason: 'The full harness performed materially worse than the leave-one-out arm.'
    };
  }
  if (
    component.kind === 'instruction' &&
    component.deterministicAlternativeAvailable &&
    policyViolationBenefit >= policy.movePolicyViolationDelta &&
    Math.abs(taskSuccessBenefit) <= policy.moveTaskSuccessDeltaCeiling
  ) {
    return {
      decision: 'move',
      reason:
        'The component contributes policy enforcement without task-success lift and has a declared deterministic alternative.'
    };
  }
  if (contribution >= policy.materialContribution) {
    return {
      decision: 'retain',
      reason: 'The component provides material positive utility over its leave-one-out arm.'
    };
  }
  if (overhead >= policy.overheadTolerance) {
    if (contribution <= 0) {
      return {
        decision: 'remove',
        reason: 'The component adds material overhead without measurable net utility.'
      };
    }
    return {
      decision: 'rewrite',
      reason:
        'The component has some benefit but adds material overhead below the retain threshold.'
    };
  }
  return {
    decision: 'unresolved',
    reason: 'The observed marginal contribution is below the configured materiality thresholds.'
  };
}

export function compareResults(manifestInput, results) {
  const manifest = validateManifest(manifestInput);
  const plan = buildPlan(manifest);
  assertObject(results, 'Results');
  if (results.schemaVersion !== RESULTS_SCHEMA) {
    throw new Error(`Results schemaVersion must be ${RESULTS_SCHEMA}.`);
  }
  if (results.experimentId !== manifest.experimentId) {
    throw new Error('Results experimentId does not match the manifest.');
  }
  if (results.planHash !== plan.planHash) {
    throw new Error('Results planHash does not match the current manifest plan.');
  }
  if (typeof results.provenance !== 'string' || !results.provenance.trim()) {
    throw new Error('Results must name their provenance.');
  }
  if (!Array.isArray(results.runs)) throw new Error('Results runs must be an array.');

  const expected = new Set(expectedRunKeys(plan));
  const observed = new Map();
  for (const run of results.runs) {
    assertObject(run, 'Run');
    const key = `${run.armId}::${run.taskId}::${run.repetition}`;
    if (!expected.has(key)) throw new Error(`Unexpected run: ${key}`);
    if (observed.has(key)) throw new Error(`Duplicate run: ${key}`);
    assertObject(run.metrics, `metrics for ${key}`);
    for (const metric of Object.keys(manifest.metrics)) {
      if (!(metric in run.metrics)) throw new Error(`Run ${key} is missing metric ${metric}.`);
      validateMetricValue(metric, run.metrics[metric]);
    }
    observed.set(key, run);
  }
  const missing = [...expected].filter((key) => !observed.has(key));
  if (missing.length > 0) {
    throw new Error(
      `Results are missing ${missing.length} required run${missing.length === 1 ? '' : 's'}; no causal decision was produced.`
    );
  }

  const armSummaries = Object.fromEntries(
    plan.arms.map((arm) => {
      const armRuns = results.runs.filter((run) => run.armId === arm.id);
      return [arm.id, summarizeArm(armRuns, manifest.metrics)];
    })
  );
  const full = armSummaries.full;
  const control = armSummaries.control;
  const decisions = manifest.components.map((component) => {
    const ablated = armSummaries[`without-${component.id}`];
    const contribution = round(full.utility - ablated.utility);
    const metricDeltas = rawDeltas(full.metrics, ablated.metrics);
    const overhead = overheadDelta(full.metrics, ablated.metrics, manifest.metrics);
    const verdict = decisionFor(
      component,
      contribution,
      overhead,
      metricDeltas,
      manifest.decisionPolicy
    );
    return {
      componentId: component.id,
      kind: component.kind,
      artifact: component.artifact,
      safetyCritical: component.safetyCritical,
      contribution,
      overhead,
      metricDeltas,
      ...verdict
    };
  });

  return {
    schemaVersion: COMPARISON_SCHEMA,
    experimentId: manifest.experimentId,
    manifestHash: plan.manifestHash,
    planHash: plan.planHash,
    provenance: results.provenance,
    passed: true,
    evidence: {
      runCount: results.runs.length,
      expectedRunCount: plan.expectedRunCount,
      repetitions: manifest.repetitions,
      taskCount: manifest.tasks.length,
      completeMatrix: true
    },
    controlToFull: {
      utilityDelta: round(full.utility - control.utility),
      ...rawDeltas(full.metrics, control.metrics)
    },
    armSummaries,
    decisions,
    nextDecision: decisions.some((item) => item.decision === 'unresolved')
      ? 'Run a sharper task corpus or more repetitions before changing unresolved components.'
      : 'Review decisions with the owning operator before changing harness artifacts.'
  };
}

function renderPlanMarkdown(plan) {
  const lines = [
    '# Harness Ablation Plan',
    '',
    `- Experiment: \`${plan.experimentId}\``,
    `- Environment: \`${plan.environment}\``,
    `- Repetitions: ${plan.repetitions}`,
    `- Tasks: ${plan.taskIds.length}`,
    `- Expected runs: ${plan.expectedRunCount}`,
    `- Randomization seed: \`${plan.randomizationSeed}\``,
    `- Manifest SHA-256: \`${plan.manifestHash}\``,
    `- Plan SHA-256: \`${plan.planHash}\``,
    '',
    '## Arms',
    '',
    '| Arm | Enabled | Disabled | Isolated required |',
    '|---|---|---|---|'
  ];
  for (const arm of plan.arms) {
    lines.push(
      `| \`${arm.id}\` | ${arm.enabledComponents.join(', ') || 'none'} | ${arm.disabledComponents.join(', ') || 'none'} | ${arm.requiresIsolatedExecution ? 'yes' : 'no'} |`
    );
  }
  lines.push(
    '',
    '## Randomized schedule',
    '',
    '| Sequence | Arm | Task | Repetition |',
    '|---:|---|---|---:|'
  );
  for (const run of plan.schedule) {
    lines.push(`| ${run.sequence} | \`${run.armId}\` | \`${run.taskId}\` | ${run.repetition} |`);
  }
  lines.push(
    '',
    'This plan does not launch agents or change any harness component. Execute the schedule through an owning isolated or shadow harness and return a versioned result receipt.'
  );
  return `${lines.join('\n')}\n`;
}

function renderComparisonMarkdown(comparison) {
  const lines = [
    '# Harness Ablation Comparison',
    '',
    `- Experiment: \`${comparison.experimentId}\``,
    `- Provenance: \`${comparison.provenance}\``,
    `- Complete runs: ${comparison.evidence.runCount}/${comparison.evidence.expectedRunCount}`,
    `- Control to full utility: ${comparison.controlToFull.utilityDelta}`,
    '',
    '## Decisions',
    '',
    '| Component | Decision | Contribution | Overhead | Reason |',
    '|---|---|---:|---:|---|'
  ];
  for (const item of comparison.decisions) {
    lines.push(
      `| \`${item.componentId}\` | **${item.decision}** | ${item.contribution} | ${item.overhead} | ${item.reason} |`
    );
  }
  lines.push('', `Next decision: ${comparison.nextDecision}`);
  return `${lines.join('\n')}\n`;
}

function writeOutput(text, outPath) {
  if (outPath) {
    writeFileSync(path.resolve(outPath), text);
    return;
  }
  process.stdout.write(text);
}

function main() {
  let args = { format: 'markdown' };
  try {
    args = parseArgs(process.argv);
    if (!args.command || args.command === 'help') {
      process.stdout.write(`${usage()}\n`);
      return;
    }
    if (!args.manifest) throw new Error('--manifest is required.');
    const manifest = readJson(args.manifest);
    let payload;
    if (args.command === 'plan') {
      payload = buildPlan(manifest);
    } else if (args.command === 'compare') {
      if (!args.results) throw new Error('--results is required for compare.');
      payload = compareResults(manifest, readJson(args.results));
    } else {
      throw new Error(`Unknown command: ${args.command}`);
    }
    const text =
      args.format === 'json'
        ? `${JSON.stringify(payload, null, 2)}\n`
        : args.command === 'plan'
          ? renderPlanMarkdown(payload)
          : renderComparisonMarkdown(payload);
    writeOutput(text, args.out);
  } catch (error) {
    const payload = {
      passed: false,
      error: error instanceof Error ? error.message : String(error)
    };
    if (args.format === 'json') {
      process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    } else {
      process.stderr.write(`Harness ablation failed: ${payload.error}\n`);
    }
    process.exitCode = 1;
  }
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
  main();
}
