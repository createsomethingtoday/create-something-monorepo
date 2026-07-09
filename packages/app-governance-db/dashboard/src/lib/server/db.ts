import { error } from '@sveltejs/kit';

/** Require the D1 binding; every load function is a read-only SELECT against it. */
export function requireDb(platform: App.Platform | undefined): D1Database {
  const db = platform?.env?.DB;
  if (!db) {
    error(500, 'D1 binding DB is not available');
  }
  return db;
}
