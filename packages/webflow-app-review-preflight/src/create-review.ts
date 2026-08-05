import {
  buildInventory,
  analyzeSourceMaps,
  defaultConfig,
  defaultRuleset,
  generateReport,
  processZipBuffer,
  runScan,
  type FileEntry,
  type FindingGroup,
  type ScanConfig,
  type Severity
} from '@create-something/bundle-scanner-core';
import { discoverRuntimeReferences } from './runtime-references';
import type {
  ArtifactSurface,
  BundleReview,
  CreateBundleReviewInput,
  ReviewGuidance,
  SourceMapArtifactInput,
  SourceMapPolicyResult,
  SubmissionArtifactIdentity,
  SubmissionArtifactSet
} from './types';

const PREFLIGHT_CONFIG: ScanConfig = {
  ...defaultConfig,
  globalScanConfig: {
    ...defaultConfig.globalScanConfig,
    zipSafety: {
      ...defaultConfig.globalScanConfig.zipSafety,
      maxTotalUnzippedBytes: 50 * 1024 * 1024,
      maxFiles: 2000
    },
    hardExcludeGlobs: defaultConfig.globalScanConfig.hardExcludeGlobs.filter(
      (glob) => glob !== '**/dist/**' && glob !== '**/build/**'
    )
  }
};

const NEXT_MOVES: Record<string, string> = {
  'SEC-SCRIPT-INJECTION':
    'Package the reviewed runtime with the app, or use one immutable, reviewed runtime with a defined removal lifecycle.',
  'SEC-NO-DCE': 'Remove runtime code compilation and replace it with reviewed, bundled functions.',
  'SEC-NO-CLIENT-SECRETS': 'Remove the secret, rotate it, and keep privileged credentials on a server boundary.',
  'SEC-CODE-TRANSPARENCY': 'Provide reviewable source and matching source maps for every executable production file.'
};

const MAX_EVIDENCE_SNIPPET_LENGTH = 500;

export function boundedEvidenceSnippet(
  value: string,
  column: number,
  triggerToken: string
): string {
  if (value.length <= MAX_EVIDENCE_SNIPPET_LENGTH) return value;

  const columnIndex = Number.isFinite(column) && column > 0 ? column - 1 : -1;
  const triggerIndex = triggerToken ? value.indexOf(triggerToken) : -1;
  const focus = columnIndex >= 0 && columnIndex < value.length
    ? columnIndex
    : triggerIndex >= 0
      ? triggerIndex
      : 0;
  const contentLength = MAX_EVIDENCE_SNIPPET_LENGTH - 2;
  const start = Math.max(0, Math.min(value.length - contentLength, focus - 160));
  const end = Math.min(value.length, start + contentLength);

  return `${start > 0 ? '…' : ''}${value.slice(start, end)}${end < value.length ? '…' : ''}`;
}

function toHex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function sha256(content: ArrayBuffer): Promise<string> {
  return toHex(await crypto.subtle.digest('SHA-256', content));
}

export type SourceMapValidationErrorCode =
  | 'source_map_required'
  | 'source_map_invalid'
  | 'source_map_mismatch';

export class SourceMapValidationError extends Error {
  constructor(
    public readonly code: SourceMapValidationErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'SourceMapValidationError';
  }
}

async function buildArtifactSet(
  input: CreateBundleReviewInput
): Promise<SubmissionArtifactSet> {
  const bundle: SubmissionArtifactIdentity & { kind: 'bundle' } = {
    kind: 'bundle',
    fileName: input.fileName,
    sha256: await sha256(input.bundle),
    bytes: input.bundle.byteLength
  };
  const sourceMapArtifact = input.sourceMapArtifact
    ? {
        kind: 'source_maps' as const,
        fileName: input.sourceMapArtifact.fileName,
        sha256: await sha256(input.sourceMapArtifact.content),
        bytes: input.sourceMapArtifact.content.byteLength
      }
    : null;
  const manifest = JSON.stringify({
    schemaVersion: 'submission_artifact_set.v1',
    bundleSha256: bundle.sha256,
    sourceMapArtifactSha256: sourceMapArtifact?.sha256 ?? null
  });

  return {
    schemaVersion: 'submission_artifact_set.v1',
    sha256: await sha256(new TextEncoder().encode(manifest).buffer as ArrayBuffer),
    bundle,
    sourceMapArtifact
  };
}

async function sourceMapFiles(sourceMapArtifact?: SourceMapArtifactInput) {
  if (!sourceMapArtifact) return [];
  try {
    return await processZipBuffer(sourceMapArtifact.content, PREFLIGHT_CONFIG, () => undefined);
  } catch {
    if (sourceMapArtifact.fileName.toLowerCase().endsWith('.map')) {
      return [{
        path: sourceMapArtifact.fileName,
        data: new Uint8Array(sourceMapArtifact.content)
      }];
    }
    throw new SourceMapValidationError(
      'source_map_invalid',
      'Source maps must be a readable ZIP of .map files or one .map file.'
    );
  }
}

async function enforceSourceMapPolicy(
  inventory: FileEntry[],
  sourceMapArtifact?: SourceMapArtifactInput
): Promise<SourceMapPolicyResult> {
  const summary = analyzeSourceMaps(inventory, await sourceMapFiles(sourceMapArtifact));
  const required = summary.reviewCandidateCount > 0;

  if (required && !summary.artifactProvided) {
    throw new SourceMapValidationError(
      'source_map_required',
      'Generated or minified executable files require matching private source maps.'
    );
  }
  if (summary.status === 'invalid') {
    throw new SourceMapValidationError(
      'source_map_invalid',
      summary.invalidSourceMaps[0]?.error ?? 'The private source-map artifact is invalid.'
    );
  }
  if (required && summary.status !== 'matched') {
    throw new SourceMapValidationError(
      'source_map_mismatch',
      'Every generated or minified executable file must have a matching private source map.'
    );
  }

  return {
    policyVersion: 'source_maps.v1',
    required,
    status: summary.status,
    reason: required
      ? 'Generated or minified executable files require matching private source maps.'
      : 'No generated or minified executable files were detected.',
    summary
  };
}

function findManifest(inventory: FileEntry[]): {
  primary: ArtifactSurface;
  appName: string | null;
  manifestPath: string | null;
} {
  const manifest = inventory.find((file) => /(^|\/)webflow\.json$/i.test(file.path));
  if (!manifest?.content) {
    return { primary: 'unknown', appName: null, manifestPath: null };
  }

  try {
    const parsed = JSON.parse(manifest.content) as {
      name?: unknown;
      apiVersion?: unknown;
      publicDir?: unknown;
      designer?: unknown;
    };
    const isDesignerExtension =
      String(parsed.apiVersion ?? '') === '2' &&
      (typeof parsed.publicDir === 'string' || typeof parsed.designer === 'object');

    return {
      primary: isDesignerExtension ? 'designer_extension' : 'unknown',
      appName: typeof parsed.name === 'string' ? parsed.name : null,
      manifestPath: manifest.path
    };
  } catch {
    return { primary: 'unknown', appName: null, manifestPath: manifest.path };
  }
}

function guidanceLabel(severity: Severity): ReviewGuidance['label'] {
  if (severity === 'BLOCKER') return 'Security blocker';
  if (severity === 'HIGH' || severity === 'MEDIUM') return 'Required update';
  return 'Suggested update';
}

function toGuidance(groups: Record<string, FindingGroup>): ReviewGuidance[] {
  return Object.values(groups)
    .map((group) => {
      const severity = group.items[0]?.severity ?? group.rule.severity;
      const confidence = group.items[0]?.confidence ?? 'MEDIUM';

      return {
        id: group.rule.ruleId,
        label: guidanceLabel(severity),
        title: group.rule.name,
        explanation: group.rule.description,
        nextMove:
          NEXT_MOVES[group.rule.ruleId] ??
          'Update the implementation, upload a revision, and use the next scan to confirm the finding is resolved.',
        severity,
        confidence,
        evidence: group.items.slice(0, 3).map((finding) => ({
          filePath: finding.filePath,
          line: finding.line,
          snippet: boundedEvidenceSnippet(
            finding.snippet,
            finding.col,
            finding.triggerToken
          )
        }))
      } satisfies ReviewGuidance;
    })
    .sort((left, right) => {
      const order: Record<ReviewGuidance['label'], number> = {
        'Security blocker': 0,
        'Required update': 1,
        'Suggested update': 2
      };
      return order[left.label] - order[right.label] || left.title.localeCompare(right.title);
    });
}

export async function createBundleReview(
  input: CreateBundleReviewInput
): Promise<BundleReview> {
  const unzipped = await processZipBuffer(input.bundle, PREFLIGHT_CONFIG, () => undefined);
  const inventory = buildInventory(unzipped, PREFLIGHT_CONFIG);
  const sourceMapPolicy = await enforceSourceMapPolicy(inventory, input.sourceMapArtifact);
  const artifactSet = await buildArtifactSet(input);
  const findings = runScan(inventory, defaultRuleset, PREFLIGHT_CONFIG, () => undefined);
  const report = generateReport(findings, defaultRuleset, PREFLIGHT_CONFIG, {
    fileCount: inventory.length,
    totalBytes: inventory.reduce((total, file) => total + file.sizeBytes, 0),
    textFilesScanned: inventory.filter((file) => file.isTextCandidate && !file.isIgnored).length,
    skippedFileCount: inventory.filter((file) => file.isIgnored).length
  });
  const artifactScope = findManifest(inventory);
  const runtimeReferences = discoverRuntimeReferences(inventory);
  const guidance = toGuidance(report.findings);
  const securityBlockers = guidance.filter((item) => item.label === 'Security blocker').length;
  const requiredUpdates = guidance.filter((item) => item.label === 'Required update').length;
  const suggestedUpdates = guidance.filter((item) => item.label === 'Suggested update').length;

  return {
    schemaVersion: 'app_review_preflight.v1',
    reviewId: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    artifact: {
      fileName: input.fileName,
      sha256: artifactSet.bundle.sha256,
      compressedBytes: input.bundle.byteLength,
      fileCount: inventory.length
    },
    artifactSet,
    sourceMapPolicy,
    artifactScope,
    coverage: [
      {
        surface: 'designer_extension',
        status: artifactScope.primary === 'designer_extension' ? 'reviewed' : 'not_provided',
        label:
          artifactScope.primary === 'designer_extension'
            ? 'Designer Extension reviewed'
            : 'Designer Extension not identified',
        detail:
          artifactScope.primary === 'designer_extension'
            ? 'The uploaded configuration interface was included in this review.'
            : 'A Webflow Designer Extension manifest was not identified in this bundle.'
      },
      {
        surface: 'production_runtime',
        status: 'needs_verification',
        label: 'Production runtime not yet verified',
        detail:
          runtimeReferences.length > 0
            ? 'Runtime references were discovered, but their executed behavior is outside this bundle review.'
            : 'No complete production runtime artifact was included in this review.'
      }
    ],
    runtime: {
      references: runtimeReferences,
      status: runtimeReferences.length > 0 ? 'discovered_unverified' : 'not_discovered',
      manualVerificationRequired: true
    },
    summary: {
      readiness:
        securityBlockers > 0 || requiredUpdates > 0 ? 'changes_required' : 'ready',
      securityBlockers,
      requiredUpdates,
      suggestedUpdates
    },
    guidance,
    policySnapshot: {
      rulesetVersion: defaultRuleset.rulesetVersion,
      configVersion: PREFLIGHT_CONFIG.configVersion
    },
    evidence: {
      scanReportVersion: report.scanReportVersion,
      scanRunId: report.runId
    },
    officialDecision: null
  };
}
