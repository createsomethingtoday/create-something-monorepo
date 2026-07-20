import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

import { safeLearnReturnPath } from '../../lib/auth/return-path';

export const load: PageServerLoad = ({ url, locals }) => {
  const redirectTo = safeLearnReturnPath(url.searchParams.get('redirect'));

  if (locals.user) throw redirect(302, redirectTo);

  return { redirectTo };
};
