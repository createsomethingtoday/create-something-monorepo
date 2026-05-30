import { redirect } from 'next/navigation';
import { withBasePath } from '../lib/runtime-paths';

export default function CategoryIndexPage() {
  redirect(withBasePath('/portfolio-and-agency-websites'));
}
