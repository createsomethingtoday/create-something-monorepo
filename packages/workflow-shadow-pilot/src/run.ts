import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { writeWorkflowShadowPilotArtifacts } from './artifacts.js';
import { loadWorkflowPilotCorpus } from './corpus.js';
import {
  createWorkflowPilotMeasurementReceipt,
  writeWorkflowPilotMeasurementReceipt,
} from './measurement.js';
import { assertWorkflowPilotPrivacy } from './privacy.js';
import { createWorkflowPilotOperatorConsoleData } from './operator-console.js';
import { createWorkflowPilotReconciliationSummary } from './reconciliation.js';
import { compileWorkflowPilotRuntime } from './runtime.js';
import { createWorkflowPilotScorecard } from './scorecard.js';
import type {
  WorkflowPilotAdapter,
  WorkflowPilotDiscoveryOptions,
  WorkflowPilotDiscoveryPack,
  WorkflowPilotSource,
  WorkflowShadowPilotOptions,
  WorkflowShadowPilotResult,
} from './types.js';

const DISCOVERY_POLICY_PATH =
  'packages/workflow-shadow-pilot/fixtures/marketplace/discovery-policy.json';

interface DiscoveryPolicySource {
  id: string;
  tier: WorkflowPilotSource['tier'];
  relativePath: string;
  owner: string;
  expectedSha256: string;
  evidence: string;
  receipt: string;
  escalation: string;
}

interface DiscoveryPolicy {
  schemaVersion: 'workflow_shadow_discovery_policy.v0.1';
  sources: DiscoveryPolicySource[];
}

function sha256(content: Buffer): string {
  return `sha256:${createHash('sha256').update(content).digest('hex')}`;
}

export class WorkflowShadowPilotError extends Error {
  readonly code: 'REQUIRED_SOURCE_UNAVAILABLE' | 'SOURCE_HASH_MISMATCH';
  readonly sourceId: string;
  readonly relativePath: string;
  readonly expectedSha256?: string;
  readonly actualSha256?: string;

  constructor(input: {
    code: 'REQUIRED_SOURCE_UNAVAILABLE' | 'SOURCE_HASH_MISMATCH';
    sourceId: string;
    relativePath: string;
    cause?: unknown;
    expectedSha256?: string;
    actualSha256?: string;
  }) {
    const message =
      input.code === 'SOURCE_HASH_MISMATCH'
        ? `Workflow pilot source hash changed: ${input.sourceId} (${input.relativePath})`
        : `Required workflow pilot source is unavailable: ${input.sourceId} (${input.relativePath})`;
    super(message, { cause: input.cause });
    this.name = 'WorkflowShadowPilotError';
    this.code = input.code;
    this.sourceId = input.sourceId;
    this.relativePath = input.relativePath;
    this.expectedSha256 = input.expectedSha256;
    this.actualSha256 = input.actualSha256;
  }
}

async function loadDiscoveryPolicy(repoRoot: string): Promise<{
  policy: DiscoveryPolicy;
  policySha256: string;
}> {
  try {
    const content = await readFile(path.join(repoRoot, DISCOVERY_POLICY_PATH));
    return {
      policy: JSON.parse(content.toString('utf8')) as DiscoveryPolicy,
      policySha256: sha256(content),
    };
  } catch (cause) {
    throw new WorkflowShadowPilotError({
      code: 'REQUIRED_SOURCE_UNAVAILABLE',
      sourceId: 'discovery_policy',
      relativePath: DISCOVERY_POLICY_PATH,
      cause,
    });
  }
}

export async function createWorkflowPilotDiscoveryPack(
  options: WorkflowPilotDiscoveryOptions,
): Promise<WorkflowPilotDiscoveryPack> {
  const { policy, policySha256 } = await loadDiscoveryPolicy(options.repoRoot);
  const definitions = [...policy.sources].sort((left, right) =>
    left.id.localeCompare(right.id),
  );
  const sources: WorkflowPilotSource[] = [];
  for (const definition of definitions) {
    try {
      const content = await readFile(path.join(options.repoRoot, definition.relativePath));
      const actualSha256 = sha256(content);
      if (actualSha256 !== definition.expectedSha256) {
        throw new WorkflowShadowPilotError({
          code: 'SOURCE_HASH_MISMATCH',
          sourceId: definition.id,
          relativePath: definition.relativePath,
          expectedSha256: definition.expectedSha256,
          actualSha256,
        });
      }
      sources.push({
        id: definition.id,
        tier: definition.tier,
        relativePath: definition.relativePath,
        sha256: actualSha256,
      });
    } catch (cause) {
      if (cause instanceof WorkflowShadowPilotError) throw cause;
      throw new WorkflowShadowPilotError({
        code: 'REQUIRED_SOURCE_UNAVAILABLE',
        sourceId: definition.id,
        relativePath: definition.relativePath,
        cause,
      });
    }
  }

  const adapters = definitions.map(
    (definition): WorkflowPilotAdapter => ({
      id: definition.id,
      owner: definition.owner,
      sourceId: definition.id,
      read: true,
      write: false,
      authority: 'observe_only',
      permissions: ['read'],
      evidence: definition.evidence,
      receipt: definition.receipt,
      escalation: definition.escalation,
    }),
  );

  return {
    schemaVersion: 'workflow_shadow_discovery_pack.v0.1',
    mode: 'shadow',
    policySha256,
    sources,
    adapters,
  };
}

export async function runWorkflowShadowPilot(
  options: WorkflowShadowPilotOptions,
): Promise<WorkflowShadowPilotResult> {
  const corpus = await loadWorkflowPilotCorpus(options.corpusDir);
  const base = {
    discoveryPack: await createWorkflowPilotDiscoveryPack(options),
    corpusSummary: corpus.summary,
    reconciliationSummary: await createWorkflowPilotReconciliationSummary({
      repoRoot: options.repoRoot,
      receiptCorpus: corpus.receiptCorpus,
      historicalContext: corpus.historicalContext,
    }),
  };
  const compiledRuntime = await compileWorkflowPilotRuntime({
    repoRoot: options.repoRoot,
    outputDir: options.outputDir,
  });
  const privacySummary = await assertWorkflowPilotPrivacy(options.corpusDir, {
    ...base,
    compiledRuntime,
  });
  const scorecard = createWorkflowPilotScorecard({
    ...base,
    compiledRuntime,
    privacySummary,
  });
  const artifacts = {
    ...base,
    compiledRuntime,
    privacySummary,
    scorecard,
    operatorConsole: createWorkflowPilotOperatorConsoleData({
      discoveryPack: base.discoveryPack,
      reconciliationSummary: base.reconciliationSummary,
      compiledRuntime,
      scorecard,
    }),
  };
  await assertWorkflowPilotPrivacy(options.corpusDir, artifacts);
  const artifactManifest = await writeWorkflowShadowPilotArtifacts(options.outputDir, artifacts);
  const measurementReceipt = createWorkflowPilotMeasurementReceipt({
    startedAt: options.measurementStartedAt,
    artifactManifest,
    compiledRuntime,
    corpusSummary: corpus.summary,
    reconciliationSummary: base.reconciliationSummary,
  });
  await assertWorkflowPilotPrivacy(options.corpusDir, {
    ...artifacts,
    artifactManifest,
    measurementReceipt,
  });
  await writeWorkflowPilotMeasurementReceipt(options.outputDir, measurementReceipt);
  return {
    ...artifacts,
    artifactManifest,
    measurementReceipt,
  };
}
