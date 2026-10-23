import type { PageServerLoad } from './$types';

// The commercial homepage does not own research records; those live on .io.
export const load: PageServerLoad = () => ({ papers: [], categories: [] });
