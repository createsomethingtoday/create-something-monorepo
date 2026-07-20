import type { PageServerLoad } from './$types';

import { safeLearnReturnPath } from '../../../lib/auth/return-path';

export const load: PageServerLoad = ({ url }) => ({
  token: url.searchParams.get('token'),
  sessionId: url.searchParams.get('session'),
  redirectTo: safeLearnReturnPath(url.searchParams.get('redirect'))
});
