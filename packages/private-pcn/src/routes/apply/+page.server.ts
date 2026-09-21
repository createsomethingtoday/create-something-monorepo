import { redirect, error } from '@sveltejs/kit';
export const load = async ({ locals, platform, url, cookies }) => {
  const token = url.searchParams.get('invite');
  if (token && /^[a-f0-9-]{72}$/.test(token)) {
    cookies.set('__Host-pcn_invitation', token, {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 30 * 86400
    });
    redirect(303, '/apply');
  }
  if (!locals.identity)
    redirect(303, `/login?next=${encodeURIComponent(url.pathname + url.search)}`);
  if (!platform?.env.DB) error(503, 'Applications unavailable.');
  const application = await platform.env.DB.prepare(
    'SELECT display_name,credentials,teaching_video_url,status,review_note FROM creator_applications WHERE subject=?'
  )
    .bind(locals.identity.subject)
    .first<{
      display_name: string;
      credentials: string;
      teaching_video_url: string;
      status: string;
      review_note: string;
    }>();
  const invitation = await platform.env.DB.prepare(
    'SELECT redeemed_at FROM creator_invitations WHERE redeemed_by=?'
  )
    .bind(locals.identity.subject)
    .first();
  return {
    application: application || null,
    invited: !!invitation,
    hasInvitation: !!cookies.get('__Host-pcn_invitation')
  };
};
