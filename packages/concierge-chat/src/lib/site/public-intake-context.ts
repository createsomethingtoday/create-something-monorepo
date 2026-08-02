import type { PublicNursingJob } from '$lib/server/abundance/public-jobs';

export interface FacilityCoverageRequest {
  facilityName: string;
  specialtyOrUnit: string;
  shift: string;
  coverageWindow: string;
  location: string;
  urgency: string;
}

export function buildSelectedRoleIntakeMessage(
  job: Pick<PublicNursingJob, 'title' | 'employer' | 'display_location'>
) {
  const roleContext = [
    job.title.trim(),
    job.employer?.trim() ? `at ${job.employer.trim()}` : '',
    job.display_location?.trim() ? `in ${job.display_location.trim()}` : ''
  ]
    .filter(Boolean)
    .join(' ');

  return `I want to apply for ${roleContext}. Keep this role in context and ask what preferences still need confirmation.`;
}

export function buildFacilityCoverageBrief(request: FacilityCoverageRequest) {
  const rows = [
    ['Facility', request.facilityName],
    ['Need', request.specialtyOrUnit],
    ['Shift', request.shift],
    ['Coverage window', request.coverageWindow],
    ['Location', request.location],
    ['Urgency', request.urgency]
  ]
    .map(([label, value]) => [label, value.trim()] as const)
    .filter(([, value]) => Boolean(value))
    .map(([label, value]) => `${label}: ${value}`);

  return [
    'Facility coverage brief',
    ...rows,
    'Prepared for recruiter review. This brief is not submitted from this page.'
  ].join('\n');
}
