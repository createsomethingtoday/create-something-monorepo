import type { PageServerLoad } from './$types';

const contactIntents = new Set([
  'governance-checklist',
  'workflow-teardown',
  'workflow-mapping'
]);

const serviceLanes = new Set([
  'workflow_infrastructure',
  'reliability_and_control',
  'enterprise_extension',
  'system_development_referral',
  'not_sure'
]);

function normalizeQueryToken(value: string | null, fallback: string) {
  const normalized = (value ?? fallback)
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);

  return normalized || fallback;
}

export const load: PageServerLoad = ({ url }) => {
  const intent = normalizeQueryToken(url.searchParams.get('intent'), 'workflow-teardown');
  const lane = normalizeQueryToken(url.searchParams.get('lane'), 'not_sure');

  return {
    contactSource: normalizeQueryToken(url.searchParams.get('source'), 'contact'),
    contactCampaign: normalizeQueryToken(url.searchParams.get('campaign'), ''),
    contactIntent: contactIntents.has(intent) ? intent : 'workflow-teardown',
    contactLane: serviceLanes.has(lane) ? lane : 'not_sure'
  };
};
