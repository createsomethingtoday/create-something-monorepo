import { writable } from 'svelte/store';

/** Presentation only: lets authored motion yield to search without sharing queries. */
export const agencySearchOpen = writable(false);
