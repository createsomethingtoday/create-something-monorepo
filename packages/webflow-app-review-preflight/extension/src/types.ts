import type {
  BundleReview,
  RuntimeTestPackageInput,
  RuntimeTestPackageView
} from '@create-something/webflow-app-review-preflight';

export type { RuntimeTestPackageInput, RuntimeTestPackageView };

export interface ReviewVersion {
  id: string;
  sequence: number;
  createdAt: string;
  result: BundleReview;
}

export interface StoredReview {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  latestVersion: ReviewVersion;
}

export interface ReviewSummary {
  id: string;
  name: string;
  updatedAt: string;
  latestSequence: number;
  readiness: BundleReview['summary']['readiness'];
  appName: string | null;
  coverage: BundleReview['coverage'];
}

export interface ReviewComparison {
  resolved: string[];
  remaining: string[];
  added: string[];
}

export interface RevisionResult {
  review: StoredReview;
  comparison: ReviewComparison;
  deduplicated: boolean;
}

export interface CompanionPairing {
  code: string;
  expiresAt: string;
}

export interface PreflightIdentity {
  id: string;
  siteId: string | null;
  companionRole: 'developer' | 'reviewer';
}

export interface RuntimeJob {
  id: string;
  status: 'approved';
  approvedAt: string;
  contract: {
    schemaVersion: 'app_runtime_evidence_job.v1';
    purpose: 'evidence_only';
    reviewVersionId: string;
    targets: Array<{ url: string; host: string }>;
    manualVerification: string[];
    controls: {
      allowedHosts: string[];
      maxRequests: number;
      requestTimeoutMs: number;
      totalTimeoutMs: number;
      networkMode: 'exact_host_allowlist';
      credentials: 'none';
      viewports: Array<{ width: number; height: number }>;
    };
    evidenceOutputs: string[];
    boundaries: {
      officialDecision: null;
      canWriteGovernance: false;
      acceptsSecrets: false;
    };
  };
}

export interface PreflightApi {
  getIdentity(): Promise<PreflightIdentity>;
  listReviews(): Promise<ReviewSummary[]>;
  getReview(id: string): Promise<StoredReview>;
  createReview(file: File, name?: string): Promise<StoredReview>;
  addRevision(reviewId: string, file: File): Promise<RevisionResult>;
  approveRuntimeJob(reviewId: string): Promise<RuntimeJob>;
  listRuntimeTestPackages(reviewId: string): Promise<RuntimeTestPackageView[]>;
  createRuntimeTestPackage(
    reviewId: string,
    input: RuntimeTestPackageInput
  ): Promise<RuntimeTestPackageView>;
  createCompanionPairing(
    reviewId: string,
    reviewVersionId: string
  ): Promise<CompanionPairing>;
}
