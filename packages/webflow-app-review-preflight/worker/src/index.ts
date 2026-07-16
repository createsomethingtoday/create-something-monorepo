import {
  authenticate,
  authenticateCompanion,
  companionRoleForUser
} from './auth';
import { allowedOrigin, json, options } from './http';
import {
  addRevision,
  createReview,
  getReview,
  listReviews,
  ReviewInputError
} from './reviews';
import { approveRuntimeJob, RuntimeApprovalError } from './runtime-jobs';
import { recordRuntimeEvidence, RuntimeEvidenceError } from './runtime-evidence';
import {
  approvePatternHandoff,
  derivePatternCandidates,
  PatternApprovalError
} from './patterns';
import {
  approveRuntimeObservationJob,
  createRuntimeTestPackage,
  getRuntimeObservationJob,
  listRuntimeTestPackages,
  requestRuntimeObservationRun,
  reconcileRuntimeObservationJobs,
  RuntimeObservationApprovalError,
  RuntimeObservationDispatchError,
  RuntimeObservationEvidenceError,
  recordRuntimeObservationEvidence,
  RuntimeTestPackageError
} from './runtime-observations';
import type { Env } from './types';
import {
  CompanionRunInputError,
  CompanionTrustEscalationError,
  completeCompanionRun,
  createCompanionRunForReview,
  getCompanionRun,
  replayCompanionRun,
  recordCompanionMissionEvidence
} from './companion-runs';
import {
  CompanionPairingInputError,
  createCompanionPairing,
  redeemCompanionPairing
} from './companion-pairings';
import {
  completeWebflowOAuth,
  startWebflowOAuth,
  webflowOAuthCompletePage
} from './webflow-oauth';
import {
  connectReviewerWorkspace,
  replayReviewerRuntimePackage,
  reviewerWorkspace
} from './reviewer-web';

function isRetiredLegacyMutation(pathname: string, method: string): boolean {
  if (method !== 'POST') return false;
  return [
    /^\/v1\/runtime-jobs\/[^/]+\/evidence$/,
    /^\/v1\/runtime-test-packages\/[^/]+\/observation-jobs$/,
    /^\/v1\/reviews\/[^/]+\/runtime-jobs$/,
    /^\/v1\/reviews\/[^/]+\/companion-runs$/,
    /^\/v1\/companion-runs\/[^/]+\/(?:complete|replay)$/,
    /^\/v1\/companion-runs\/[^/]+\/missions\/[^/]+$/
  ].some((pattern) => pattern.test(pathname));
}

async function handle(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const requestOrigin = request.headers.get('origin');
  const origin = allowedOrigin(request, env);
  const sameOriginRequest = requestOrigin === url.origin;

  if (requestOrigin && !origin && !sameOriginRequest) {
    return json({ error: 'origin_not_allowed' }, 403);
  }
  if (request.method === 'OPTIONS') {
    return origin
      ? options(origin)
      : json({ error: 'origin_required' }, 403);
  }
  if (
    env.ENVIRONMENT === 'production' &&
    isRetiredLegacyMutation(url.pathname, request.method)
  ) {
    return json(
      {
        error: 'legacy_runtime_mutation_retired',
        message: 'Use the package-bound runtime observation and reviewer replay workflow.'
      },
      410,
      origin
    );
  }
  if (url.pathname === '/health' && request.method === 'GET') {
    return json({ ok: true, service: 'webflow-app-review-preflight' }, 200, origin);
  }
  if (url.pathname === '/v1/oauth/webflow/start' && request.method === 'GET') {
    return startWebflowOAuth(env);
  }
  if (url.pathname === '/v1/oauth/webflow/callback' && request.method === 'GET') {
    return completeWebflowOAuth(request, env);
  }
  if (url.pathname === '/v1/oauth/webflow/complete' && request.method === 'GET') {
    return webflowOAuthCompletePage();
  }

  if (url.pathname === '/reviewer/connect' && request.method === 'GET') {
    try {
      return await connectReviewerWorkspace(request, env);
    } catch (error) {
      if (error instanceof CompanionPairingInputError) {
        return json(
          { error: 'invalid_reviewer_handoff', message: error.message },
          400,
          origin
        );
      }
      throw error;
    }
  }

  if (url.pathname === '/reviewer' && request.method === 'GET') {
    const reviewer = await authenticateCompanion(request, env);
    return reviewer
      ? reviewerWorkspace(request, env, reviewer)
      : json({ error: 'unauthorized' }, 401, origin);
  }

  const reviewerReplayMatch = url.pathname.match(
    /^\/reviewer\/runtime-test-packages\/([^/]+)\/replay$/
  );
  if (reviewerReplayMatch && request.method === 'POST') {
    const reviewer = await authenticateCompanion(request, env);
    if (!reviewer) return json({ error: 'unauthorized' }, 401, origin);
    try {
      return await replayReviewerRuntimePackage(
        decodeURIComponent(reviewerReplayMatch[1]!),
        request,
        env,
        reviewer
      );
    } catch (error) {
      if (error instanceof RuntimeObservationDispatchError) {
        return json(
          { error: 'runtime_observation_dispatch_unavailable', message: error.message },
          503,
          origin
        );
      }
      throw error;
    }
  }

  if (url.pathname === '/v1/companion-pairings/redeem' && request.method === 'POST') {
    try {
      const session = await redeemCompanionPairing(request, env);
      return session
        ? json({ session }, 200, origin)
        : json({ error: 'companion_pairing_unavailable' }, 409, origin);
    } catch (error) {
      if (error instanceof CompanionPairingInputError) {
        return json(
          { error: 'invalid_companion_pairing', message: error.message },
          400,
          origin
        );
      }
      throw error;
    }
  }

  const companionPairingMatch = url.pathname.match(
    /^\/v1\/reviews\/([^/]+)\/companion-pairings$/
  );
  if (companionPairingMatch && request.method === 'POST') {
    const pairingUser = await authenticate(request, env);
    if (!pairingUser) return json({ error: 'unauthorized' }, 401, origin);
    try {
      const pairing = await createCompanionPairing(
        decodeURIComponent(companionPairingMatch[1]!),
        request,
        env,
        pairingUser
      );
      return pairing
        ? json({ pairing }, 201, origin)
        : json({ error: 'review_version_not_found' }, 404, origin);
    } catch (error) {
      if (error instanceof CompanionPairingInputError) {
        return json(
          { error: 'invalid_companion_pairing', message: error.message },
          400,
          origin
        );
      }
      throw error;
    }
  }

  const reviewerHandoffMatch = url.pathname.match(
    /^\/v1\/reviews\/([^/]+)\/reviewer-handoffs$/
  );
  if (reviewerHandoffMatch && request.method === 'POST') {
    const reviewer = await authenticate(request, env);
    if (!reviewer) return json({ error: 'unauthorized' }, 401, origin);
    if (companionRoleForUser(reviewer, env) !== 'reviewer') {
      return json({ error: 'reviewer_required' }, 403, origin);
    }
    try {
      const pairing = await createCompanionPairing(
        decodeURIComponent(reviewerHandoffMatch[1]!),
        request,
        env,
        reviewer
      );
      if (!pairing) {
        return json({ error: 'review_version_not_found' }, 404, origin);
      }
      const handoffUrl = new URL('/reviewer/connect', url.origin);
      handoffUrl.searchParams.set('code', pairing.code);
      return json(
        {
          handoff: {
            url: handoffUrl.toString(),
            expiresAt: pairing.expiresAt
          }
        },
        201,
        origin
      );
    } catch (error) {
      if (error instanceof CompanionPairingInputError) {
        return json(
          { error: 'invalid_reviewer_handoff', message: error.message },
          400,
          origin
        );
      }
      throw error;
    }
  }

  const runtimeEvidenceMatch = url.pathname.match(
    /^\/v1\/runtime-jobs\/([^/]+)\/evidence$/
  );
  if (runtimeEvidenceMatch && request.method === 'POST') {
    try {
      const result = await recordRuntimeEvidence(
        decodeURIComponent(runtimeEvidenceMatch[1]!),
        request,
        env
      );
      if ('unauthorized' in result) return json({ error: 'unauthorized' }, 401, origin);
      if ('notFound' in result) return json({ error: 'runtime_job_not_found' }, 404, origin);
      return json(result, 200, origin);
    } catch (error) {
      if (error instanceof RuntimeEvidenceError) {
        return json(
          { error: 'invalid_runtime_evidence', message: error.message },
          400,
          origin
        );
      }
      throw error;
    }
  }

  if (url.pathname === '/v1/pattern-candidates/derive' && request.method === 'POST') {
    const result = await derivePatternCandidates(request, env);
    return 'unauthorized' in result
      ? json({ error: 'unauthorized' }, 401, origin)
      : json(result, 200, origin);
  }

  const observationJobMatch = url.pathname.match(
    /^\/v1\/runtime-test-packages\/([^/]+)\/observation-jobs$/
  );
  if (observationJobMatch && request.method === 'POST') {
    try {
      const result = await approveRuntimeObservationJob(
        decodeURIComponent(observationJobMatch[1]!),
        request,
        env
      );
      if (result && 'unauthorized' in result) {
        return json({ error: 'unauthorized' }, 401, origin);
      }
      return result
        ? json({ observationJob: result }, 201, origin)
        : json({ error: 'runtime_test_package_not_found' }, 404, origin);
    } catch (error) {
      if (error instanceof RuntimeObservationApprovalError) {
        return json(
          { error: 'runtime_observation_approval_required', message: error.message },
          403,
          origin
        );
      }
      throw error;
    }
  }

  const observationJobFetchMatch = url.pathname.match(
    /^\/v1\/runtime-observation-jobs\/([^/]+)$/
  );
  if (observationJobFetchMatch && request.method === 'GET') {
    const result = await getRuntimeObservationJob(
      decodeURIComponent(observationJobFetchMatch[1]!),
      request,
      env
    );
    if ('unauthorized' in result) return json({ error: 'unauthorized' }, 401, origin);
    if ('notFound' in result) {
      return json({ error: 'runtime_observation_job_not_found' }, 404, origin);
    }
    if ('unavailable' in result) {
      return json({ error: 'runtime_observation_job_unavailable' }, 410, origin);
    }
    return json({ observationJob: result }, 200, origin);
  }

  const observationEvidenceMatch = url.pathname.match(
    /^\/v1\/runtime-observation-jobs\/([^/]+)\/evidence$/
  );
  if (observationEvidenceMatch && request.method === 'POST') {
    try {
      const result = await recordRuntimeObservationEvidence(
        decodeURIComponent(observationEvidenceMatch[1]!),
        request,
        env
      );
      if ('unauthorized' in result) return json({ error: 'unauthorized' }, 401, origin);
      if ('notFound' in result) {
        return json({ error: 'runtime_observation_job_not_found' }, 404, origin);
      }
      if ('unavailable' in result) {
        return json({ error: 'runtime_observation_job_unavailable' }, 410, origin);
      }
      return json(result, 200, origin);
    } catch (error) {
      if (error instanceof RuntimeObservationEvidenceError) {
        return json(
          { error: 'invalid_runtime_observation_evidence', message: error.message },
          400,
          origin
        );
      }
      throw error;
    }
  }

  const patternHandoffMatch = url.pathname.match(
    /^\/v1\/pattern-candidates\/([^/]+)\/handoff$/
  );
  if (patternHandoffMatch && request.method === 'POST') {
    try {
      const result = await approvePatternHandoff(
        decodeURIComponent(patternHandoffMatch[1]!),
        request,
        env
      );
      if ('unauthorized' in result) return json({ error: 'unauthorized' }, 401, origin);
      if ('notFound' in result) return json({ error: 'pattern_candidate_not_found' }, 404, origin);
      return json(result, 200, origin);
    } catch (error) {
      if (error instanceof PatternApprovalError) {
        return json(
          { error: 'human_approval_required', message: error.message },
          403,
          origin
        );
      }
      throw error;
    }
  }

  const isCompanionRequest =
    /^\/v1\/companion-runs\//.test(url.pathname) ||
    /^\/v1\/reviews\/[^/]+\/companion-runs$/.test(url.pathname);
  const user = isCompanionRequest
    ? await authenticateCompanion(request, env)
    : await authenticate(request, env);
  if (!user) return json({ error: 'unauthorized' }, 401, origin);

  if (url.pathname === '/v1/me' && request.method === 'GET') {
    return json(
      {
        user: {
          id: user.id,
          siteId: user.siteId,
          companionRole: companionRoleForUser(user, env)
        }
      },
      200,
      origin
    );
  }

  try {
    const observationRunMatch = url.pathname.match(
      /^\/v1\/runtime-test-packages\/([^/]+)\/observation-runs$/
    );
    if (observationRunMatch && request.method === 'POST') {
      const observationJob = await requestRuntimeObservationRun(
        decodeURIComponent(observationRunMatch[1]!),
        request,
        env,
        user
      );
      return 'notFound' in observationJob
        ? json({ error: 'runtime_test_package_not_found' }, 404, origin)
        : json({ observationJob }, observationJob.deduplicated ? 200 : 201, origin);
    }

    const companionCompleteMatch = url.pathname.match(
      /^\/v1\/companion-runs\/([^/]+)\/complete$/
    );
    if (companionCompleteMatch && request.method === 'POST') {
      const run = await completeCompanionRun(
        decodeURIComponent(companionCompleteMatch[1]!),
        env,
        user
      );
      return run
        ? json({ run }, 200, origin)
        : json({ error: 'companion_run_not_found' }, 404, origin);
    }

    const companionReplayMatch = url.pathname.match(
      /^\/v1\/companion-runs\/([^/]+)\/replay$/
    );
    if (companionReplayMatch && request.method === 'POST') {
      const run = await replayCompanionRun(
        decodeURIComponent(companionReplayMatch[1]!),
        env,
        user
      );
      return run
        ? json({ run }, 201, origin)
        : json({ error: 'companion_run_not_found' }, 404, origin);
    }

    const companionRunGetMatch = url.pathname.match(/^\/v1\/companion-runs\/([^/]+)$/);
    if (companionRunGetMatch && request.method === 'GET') {
      const run = await getCompanionRun(
        decodeURIComponent(companionRunGetMatch[1]!),
        env,
        user
      );
      return run
        ? json({ run }, 200, origin)
        : json({ error: 'companion_run_not_found' }, 404, origin);
    }

    const companionRunMatch = url.pathname.match(
      /^\/v1\/reviews\/([^/]+)\/companion-runs$/
    );
    if (companionRunMatch && request.method === 'POST') {
      const run = await createCompanionRunForReview(
        decodeURIComponent(companionRunMatch[1]!),
        request,
        env,
        user
      );
      return run
        ? json({ run }, 201, origin)
        : json({ error: 'review_version_not_found' }, 404, origin);
    }

    const companionMissionMatch = url.pathname.match(
      /^\/v1\/companion-runs\/([^/]+)\/missions\/([^/]+)$/
    );
    if (companionMissionMatch && request.method === 'POST') {
      const run = await recordCompanionMissionEvidence(
        decodeURIComponent(companionMissionMatch[1]!),
        decodeURIComponent(companionMissionMatch[2]!),
        request,
        env,
        user
      );
      return run
        ? json({ run }, 200, origin)
        : json({ error: 'companion_run_not_found' }, 404, origin);
    }

    if (url.pathname === '/v1/reviews' && request.method === 'POST') {
      return json({ review: await createReview(request, env, user) }, 201, origin);
    }
    if (url.pathname === '/v1/reviews' && request.method === 'GET') {
      return json(
        {
          reviews: await listReviews(env, user, {
            includeAll: companionRoleForUser(user, env) === 'reviewer'
          })
        },
        200,
        origin
      );
    }

    const reviewMatch = url.pathname.match(/^\/v1\/reviews\/([^/]+)$/);
    if (reviewMatch && request.method === 'GET') {
      const review = await getReview(decodeURIComponent(reviewMatch[1]!), env, user, {
        includeAll: companionRoleForUser(user, env) === 'reviewer'
      });
      return review
        ? json({ review }, 200, origin)
        : json({ error: 'review_not_found' }, 404, origin);
    }

    const revisionMatch = url.pathname.match(/^\/v1\/reviews\/([^/]+)\/revisions$/);
    if (revisionMatch && request.method === 'POST') {
      const revision = await addRevision(
        decodeURIComponent(revisionMatch[1]!),
        request,
        env,
        user
      );
      return revision
        ? json(revision, revision.deduplicated ? 200 : 201, origin)
        : json({ error: 'review_not_found' }, 404, origin);
    }

    const runtimeJobMatch = url.pathname.match(
      /^\/v1\/reviews\/([^/]+)\/runtime-jobs$/
    );
    if (runtimeJobMatch && request.method === 'POST') {
      const runtimeJob = await approveRuntimeJob(
        decodeURIComponent(runtimeJobMatch[1]!),
        request,
        env,
        user
      );
      return runtimeJob
        ? json({ runtimeJob }, 201, origin)
        : json({ error: 'review_not_found' }, 404, origin);
    }

    const runtimeTestPackageMatch = url.pathname.match(
      /^\/v1\/reviews\/([^/]+)\/runtime-test-packages$/
    );
    if (runtimeTestPackageMatch && request.method === 'GET') {
      const testPackages = await listRuntimeTestPackages(
        decodeURIComponent(runtimeTestPackageMatch[1]!),
        env,
        user,
        { includeAll: companionRoleForUser(user, env) === 'reviewer' }
      );
      return testPackages
        ? json({ testPackages }, 200, origin)
        : json({ error: 'review_not_found' }, 404, origin);
    }
    if (runtimeTestPackageMatch && request.method === 'POST') {
      const testPackage = await createRuntimeTestPackage(
        decodeURIComponent(runtimeTestPackageMatch[1]!),
        request,
        env,
        user
      );
      return testPackage
        ? json({ testPackage }, 201, origin)
        : json({ error: 'review_not_found' }, 404, origin);
    }

    return json({ error: 'not_found' }, 404, origin);
  } catch (error) {
    if (error instanceof CompanionTrustEscalationError) {
      return json(
        { error: 'companion_trust_escalation', message: error.message },
        403,
        origin
      );
    }
    if (error instanceof CompanionRunInputError) {
      return json(
        { error: 'invalid_companion_run', message: error.message },
        400,
        origin
      );
    }
    if (error instanceof ReviewInputError) {
      return json({ error: 'invalid_bundle', message: error.message }, 400, origin);
    }
    if (error instanceof RuntimeApprovalError) {
      return json(
        { error: 'runtime_approval_required', message: error.message },
        403,
        origin
      );
    }
    if (error instanceof RuntimeObservationDispatchError) {
      return json(
        { error: 'runtime_observation_dispatch_unavailable', message: error.message },
        503,
        origin
      );
    }
    if (error instanceof RuntimeObservationApprovalError) {
      return json(
        { error: 'runtime_observation_approval_required', message: error.message },
        403,
        origin
      );
    }
    if (error instanceof RuntimeTestPackageError) {
      return json(
        { error: 'invalid_runtime_test_package', message: error.message },
        400,
        origin
      );
    }
    console.error('Preflight request failed', error);
    return json({ error: 'internal_error' }, 500, origin);
  }
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return handle(request, env);
  },
  scheduled(
    _controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext
  ): void {
    ctx.waitUntil(reconcileRuntimeObservationJobs(env));
  }
};
