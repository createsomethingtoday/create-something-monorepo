import type { BundleReview } from '@create-something/webflow-app-review-preflight';

export interface Env {
  DB: D1Database;
  ARTIFACTS: R2Bucket;
  ENVIRONMENT: string;
  ALLOWED_ORIGINS: string;
  PREFLIGHT_DEV_TOKEN?: string;
  PREFLIGHT_REVIEWER_DEV_TOKEN?: string;
  WEBFLOW_APP_ACCESS_TOKEN?: string;
  WEBFLOW_CLIENT_ID?: string;
  WEBFLOW_CLIENT_SECRET?: string;
  WEBFLOW_OAUTH_REDIRECT_URI?: string;
  WEBFLOW_TOKEN_ENCRYPTION_KEY?: string;
  E2B_COORDINATOR_TOKEN?: string;
  RUNTIME_CANARY_URL?: string;
  PATTERN_COORDINATOR_TOKEN?: string;
  GOVERNANCE_APPROVER_TOKEN?: string;
  REVIEWER_USER_IDS?: string;
}

export interface AuthenticatedUser {
  id: string;
  siteId: string | null;
  companionSession?: {
    reviewId: string;
    reviewVersionId: string;
    runtimeTestPackageId: string;
    actorRole: 'developer' | 'reviewer';
  };
}

export interface StoredReviewVersion {
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
  latestVersion: StoredReviewVersion;
}
