import { createAuthenticatedPageLoader } from '@create-something/canon/auth';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = createAuthenticatedPageLoader();
