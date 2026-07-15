import type { Confidence, Severity } from '@create-something/bundle-scanner-core';

export type ArtifactSurface =
  | 'designer_extension'
  | 'production_runtime'
  | 'unknown';

export type CoverageStatus = 'reviewed' | 'needs_verification' | 'not_provided';

export interface ReviewCoverage {
  surface: ArtifactSurface;
  status: CoverageStatus;
  label: string;
  detail: string;
}

export interface ReviewGuidance {
  id: string;
  label: 'Security blocker' | 'Required update' | 'Suggested update';
  title: string;
  explanation: string;
  nextMove: string;
  severity: Severity;
  confidence: Confidence;
  evidence: Array<{
    filePath: string;
    line: number;
    snippet: string;
  }>;
}

export interface BundleReview {
  schemaVersion: 'app_review_preflight.v1';
  reviewId: string;
  createdAt: string;
  artifact: {
    fileName: string;
    sha256: string;
    compressedBytes: number;
    fileCount: number;
  };
  artifactScope: {
    primary: ArtifactSurface;
    appName: string | null;
    manifestPath: string | null;
  };
  coverage: ReviewCoverage[];
  runtime: {
    references: string[];
    status: 'not_discovered' | 'discovered_unverified';
    manualVerificationRequired: boolean;
  };
  summary: {
    readiness: 'ready' | 'changes_required';
    securityBlockers: number;
    requiredUpdates: number;
    suggestedUpdates: number;
  };
  guidance: ReviewGuidance[];
  policySnapshot: {
    rulesetVersion: string;
    configVersion: string;
  };
  evidence: {
    scanReportVersion: string;
    scanRunId: string;
  };
  officialDecision: null;
}

export interface CreateBundleReviewInput {
  bundle: ArrayBuffer;
  fileName: string;
}

export type RuntimeEvidenceTrust =
  | 'partner_supplied'
  | 'webflow_observed'
  | 'human_verified';

export interface RuntimeArtifactPin {
  url: string;
  sha256: string;
  integrity: string;
}

export interface RuntimeLifecycleContract {
  readySelector: string;
  cleanupTrigger: {
    type: 'click';
    selector: string;
  };
}

export interface RuntimeTestPackageInput {
  targetUrl: string;
  sandboxInstallationId: string;
  sandboxOwnershipConfirmed: true;
  license: {
    mode: 'installation_allowlist';
    expiresAt: string;
  };
  runtimeArtifacts: RuntimeArtifactPin[];
  negativeProxyProbe: {
    method: 'GET';
    urlTemplate: string;
  };
  lifecycle: RuntimeLifecycleContract;
}

export interface RuntimeTestPackage {
  schemaVersion: 'runtime_test_package.v1';
  id: string;
  reviewId: string;
  reviewVersionId: string;
  bundleSha256: string;
  status: 'ready';
  trust: 'partner_supplied';
  target: {
    url: string;
    host: string;
  };
  sandboxInstallationId: string;
  license: {
    mode: 'installation_allowlist';
    expiresAt: string;
  };
  runtimeArtifacts: RuntimeArtifactPin[];
  negativeProxyProbe: RuntimeTestPackageInput['negativeProxyProbe'];
  lifecycle: RuntimeLifecycleContract;
  evidence: null;
  createdAt: string;
}

export interface RuntimeObservationJobContract {
  schemaVersion: 'runtime_observation_job.v1';
  purpose: 'webflow_observation';
  testPackageId: string;
  reviewId: string;
  reviewVersionId: string;
  bundleSha256: string;
  nonce: string;
  target: RuntimeTestPackage['target'];
  sandboxInstallationId: string;
  runtimeArtifacts: RuntimeArtifactPin[];
  negativeProxyProbe: {
    method: 'GET';
    url: string;
  };
  lifecycle: RuntimeLifecycleContract;
  controls: {
    allowedHosts: string[];
    maxRequests: 100;
    requestTimeoutMs: 10_000;
    totalTimeoutMs: 90_000;
    networkMode: 'exact_host_allowlist';
    evidenceTrust: 'webflow_observed';
    negativeProxyCanaryUrl: string;
  };
  boundaries: {
    partnerCanSubmitEvidence: false;
    officialDecision: null;
    canWriteGovernance: false;
    acceptsAccountCredentials: false;
  };
  expiresAt: string;
}

export interface RuntimeObservationSummary {
  id: string;
  status: 'approved' | 'running' | 'uploading' | 'complete' | 'failed' | 'expired' | 'revoked';
  trust: 'webflow_observed' | null;
  approvedAt: string;
  expiresAt: string;
  completedAt: string | null;
  evidence: {
    cleanupStatus: 'clean' | 'residue_detected';
    cleanupResidue: string[];
    negativeProxyOutcome: 'blocked' | 'exposed' | 'error';
    artifactCount: number;
    artifacts: Array<{
      kind: string;
      contentType: string;
      bytes: number;
      sha256: string;
    }>;
  } | null;
}

export type RuntimeTestPackageView = Omit<RuntimeTestPackage, 'status'> & {
  status: 'ready' | 'expired' | 'revoked';
  observation: RuntimeObservationSummary | null;
};

export type CompanionActorRole = 'developer' | 'reviewer';
export type CompanionExecutionAuthority = 'partner' | 'webflow';
export type CompanionRunStatus =
  | 'preparing'
  | 'ready'
  | 'running'
  | 'blocked'
  | 'failed'
  | 'validated';
export type CompanionMissionId =
  | 'install_authorize'
  | 'configure'
  | 'publish'
  | 'production_runtime'
  | 'uninstall_cleanup';
export type CompanionMissionStatus =
  | 'pending'
  | 'running'
  | 'passed'
  | 'failed'
  | 'blocked'
  | 'not_applicable';

export interface CompanionMissionReceipt {
  evidenceDigest: string;
  eventCount: number;
  artifactCount: number;
  observedAt: string;
  evidenceTrust: RuntimeEvidenceTrust;
}

export interface CompanionMission {
  id: CompanionMissionId;
  required: true;
  status: CompanionMissionStatus;
  receipt: CompanionMissionReceipt | null;
  approvedNotApplicableReason: string | null;
}

export interface CompanionRun {
  schemaVersion: 'app_review_companion_run.v1';
  id: string;
  reviewId: string;
  reviewVersionId: string;
  bundleSha256: string;
  actorRole: CompanionActorRole;
  evidenceTrust: RuntimeEvidenceTrust;
  policyVersion: string;
  status: CompanionRunStatus;
  missions: CompanionMission[];
  replayOfRunId: string | null;
  officialDecision: null;
  createdAt: string;
  updatedAt: string;
}
