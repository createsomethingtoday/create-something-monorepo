import { redirect, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
  throw redirect(308, '/agents');
};

export const actions: Actions = {
  default: () => {
    throw redirect(303, '/agents');
  },
  reset: () => {
    throw redirect(303, '/agents');
  }
};
