import { createLoginHandler } from '@create-something/canon/auth/handlers';

export const POST = createLoginHandler({ audience: 'ona-agents' });
