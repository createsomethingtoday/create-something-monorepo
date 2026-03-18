import { redirect } from 'next/navigation';
import { getCurrentUser } from '../lib/server/session';
import { withBasePath } from '../lib/runtime-paths';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const user = await getCurrentUser();
  redirect(withBasePath(user ? '/dashboard' : '/submit'));
}
