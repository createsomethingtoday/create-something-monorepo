import { error } from '@sveltejs/kit';

/**
 * Require the D1 binding. Load functions issue read-only SELECTs against it;
 * the only writes are the audited form actions on /sources (each records an
 * events row alongside its mutation).
 */
export function requireDb(platform: App.Platform | undefined): D1Database {
  const db = platform?.env?.DB;
  if (!db) {
    error(500, 'D1 binding DB is not available');
  }
  return db;
}
