import { createAuthenticatedPageLoader } from '@create-something/components/auth';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = createAuthenticatedPageLoader();
