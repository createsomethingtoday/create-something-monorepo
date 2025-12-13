/**
 * Banner State Store
 *
 * Shared state for emergency banner dismissal.
 * When dismissed, nav slides up to top.
 */

import { writable } from 'svelte/store';

export const bannerDismissed = writable(false);
