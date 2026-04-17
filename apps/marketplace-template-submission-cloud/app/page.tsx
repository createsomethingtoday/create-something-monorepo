import { redirect } from 'next/navigation';
import { withBasePath } from '../lib/runtime-paths';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  redirect(withBasePath('/submit'));
}
