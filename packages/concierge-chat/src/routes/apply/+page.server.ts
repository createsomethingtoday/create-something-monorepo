import type { PageServerLoad } from './$types';
import { CONCIERGE_SESSION_DEPENDENCY } from '$chat/api-contract';
import { loadPublicNursingJobs } from '$lib/server/abundance/public-jobs';
import { ensureConciergeSession, getWorkspacePageData } from '$lib/server/threads/session';

export const load: PageServerLoad = async ({ depends, cookies, fetch, platform, url }) => {
  depends(CONCIERGE_SESSION_DEPENDENCY);

  const selectedJobId = url.searchParams.get('job_id')?.trim();
  const selectedJob = selectedJobId
    ? ((await loadPublicNursingJobs({ fetch, platform })).jobs.find(
        (job) => job.id === selectedJobId
      ) ?? null)
    : null;

  return {
    ...(await getWorkspacePageData(
      ensureConciergeSession(cookies, url.protocol === 'https:', { platform, url }),
      platform
    )),
    selectedJob
  };
};
