import { error, redirect } from '@sveltejs/kit';
export const load = async ({ locals, platform }) => {
  if (!locals.identity) redirect(303, '/login?next=/support/partner');
  const row = await platform?.env.DB.prepare(
    "SELECT p.approved FROM support_partners p JOIN creator_applications a ON a.subject=p.subject WHERE p.subject=? AND a.status='approved'"
  )
    .bind(locals.identity.subject)
    .first<{ approved: number }>();
  if (row?.approved !== 1) error(403, 'Approved support partner access required.');
  return { onboardingEnabled: platform?.env.PCN_SUPPORT_CONNECT_ENABLED === 'true' };
};
