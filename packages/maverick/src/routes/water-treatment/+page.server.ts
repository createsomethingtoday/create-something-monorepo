import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// Preserve inbound links while retiring the separate water product/market.
export const load: PageServerLoad = () => {
  redirect(308, '/oil-gas#produced-water');
};
