import { createLoginHandler } from '@create-something/canon/auth/handlers';

export const POST = createLoginHandler({ audience: 'client-workspace' });
