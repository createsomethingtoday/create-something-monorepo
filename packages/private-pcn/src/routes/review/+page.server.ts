import { error, redirect } from '@sveltejs/kit';
import { isReviewer } from '$lib/server/admission';
export const load = async ({ locals, platform }) => {
  if (!locals.identity) redirect(303, '/login?next=/review');
  if (!platform?.env || !isReviewer(locals.identity, platform.env))
    error(403, 'Reviewer access required.');
  const { results } = await platform.env.DB.prepare(
    'SELECT a.*,COALESCE(p.approved,0) AS support_partner FROM creator_applications a LEFT JOIN support_partners p ON p.subject=a.subject ORDER BY a.updated_at DESC LIMIT 200'
  ).all<{
    subject: string;
    email: string;
    display_name: string;
    credentials: string;
    teaching_video_url: string;
    status: string;
    revision: number;
    support_partner: number;
  }>();
  return { applications: results };
};
