import { error } from '@sveltejs/kit';
export const load = async ({ fetch, locals, platform }) => {
  const response = await fetch('/api/support');
  if (!response.ok) error(503, 'Support requests unavailable.');
  const partner =
    locals.identity && platform?.env.DB
      ? await platform.env.DB.prepare(
          "SELECT p.approved FROM support_partners p JOIN creator_applications a ON a.subject=p.subject WHERE p.subject=? AND a.status='approved'"
        )
          .bind(locals.identity.subject)
          .first<{ approved: number }>()
      : null;
  return {
    ...(await response.json()),
    isPartner: partner?.approved === 1,
    supportEnabled: platform?.env.PCN_SUPPORT_ENABLED === 'true'
  };
};
