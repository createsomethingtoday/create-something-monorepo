import type {
  PreflightApi,
  RevisionResult,
  RuntimeTestPackageInput,
  RuntimeTestPackageView,
  ReviewSummary,
  StoredReview,
  PreflightIdentity,
  ReviewerHandoff
} from './types';
import { PREFLIGHT_API_BASE } from './config';

interface WebflowRuntime {
  getIdToken?: () => Promise<string>;
}

function apiBase(): string {
  if (PREFLIGHT_API_BASE) return PREFLIGHT_API_BASE;
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    return 'http://localhost:8787';
  }
  throw new Error('The preflight service is not configured for this extension build.');
}

async function idToken(): Promise<string> {
  const designer = (globalThis as typeof globalThis & { webflow?: WebflowRuntime }).webflow;
  if (designer?.getIdToken) return designer.getIdToken();
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    return 'test-token';
  }
  throw new Error('Open App Review Preflight from Webflow Designer to continue.');
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('authorization', `Bearer ${await idToken()}`);
  const response = await fetch(`${apiBase()}${path}`, { ...init, headers });
  const body = (await response.json()) as T & { message?: string; error?: string };
  if (!response.ok) {
    if (path.includes('/observation-runs') && response.status === 404 && body.error === 'not_found') {
      throw new Error(
        'The live preflight service is out of date. Ask a reviewer to deploy the runtime-run update, then try again.'
      );
    }
    if (path.includes('/observation-runs') && body.error === 'runtime_observation_approval_required') {
      throw new Error(
        body.message ?? 'This test package has expired. Prepare a fresh package, then run the test again.'
      );
    }
    throw new Error(body.message ?? 'The preflight service could not complete that step.');
  }
  return body;
}

export function createPreflightApi(): PreflightApi {
  return {
    async getIdentity(): Promise<PreflightIdentity> {
      const body = await request<{ user: PreflightIdentity }>('/v1/me');
      return body.user;
    },
    async listReviews(): Promise<ReviewSummary[]> {
      const body = await request<{ reviews: ReviewSummary[] }>('/v1/reviews');
      return body.reviews;
    },
    async getReview(id: string): Promise<StoredReview> {
      const body = await request<{ review: StoredReview }>(`/v1/reviews/${id}`);
      return body.review;
    },
    async createReview(file: File, sourceMaps?: File, name?: string): Promise<StoredReview> {
      const form = new FormData();
      form.set('bundle', file);
      if (sourceMaps) form.set('sourceMaps', sourceMaps);
      if (name) form.set('name', name);
      const body = await request<{ review: StoredReview }>('/v1/reviews', {
        method: 'POST',
        body: form
      });
      return body.review;
    },
    async addRevision(reviewId: string, file: File, sourceMaps?: File): Promise<RevisionResult> {
      const form = new FormData();
      form.set('bundle', file);
      if (sourceMaps) form.set('sourceMaps', sourceMaps);
      return request<RevisionResult>(`/v1/reviews/${reviewId}/revisions`, {
        method: 'POST',
        body: form
      });
    },
    async listRuntimeTestPackages(reviewId: string): Promise<RuntimeTestPackageView[]> {
      const body = await request<{ testPackages: RuntimeTestPackageView[] }>(
        `/v1/reviews/${reviewId}/runtime-test-packages`
      );
      return body.testPackages;
    },
    async createRuntimeTestPackage(
      reviewId: string,
      input: RuntimeTestPackageInput
    ): Promise<RuntimeTestPackageView> {
      const body = await request<{
        testPackage: Omit<RuntimeTestPackageView, 'observation'>;
      }>(`/v1/reviews/${reviewId}/runtime-test-packages`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input)
      });
      return { ...body.testPackage, observation: null };
    },
    async requestRuntimeObservationRun(testPackageId: string) {
      const body = await request<{
        observationJob: RuntimeTestPackageView['observation'];
      }>(`/v1/runtime-test-packages/${testPackageId}/observation-runs`, {
        method: 'POST'
      });
      return body.observationJob;
    },
    async createReviewerHandoff(
      reviewId: string,
      reviewVersionId: string,
      runtimeTestPackageId: string
    ): Promise<ReviewerHandoff> {
      const body = await request<{ handoff: ReviewerHandoff }>(
        `/v1/reviews/${reviewId}/reviewer-handoffs`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ reviewVersionId, runtimeTestPackageId })
        }
      );
      return body.handoff;
    }
  };
}
