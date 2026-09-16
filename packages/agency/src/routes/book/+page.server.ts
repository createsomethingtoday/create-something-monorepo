import { createBookingHandoffState } from '$lib/scheduling/first-party';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url }) => createBookingHandoffState(url.search);
