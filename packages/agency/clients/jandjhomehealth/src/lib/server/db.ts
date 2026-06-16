import type { D1Database } from '@cloudflare/workers-types';

export type Db = D1Database;

export function getDb(platform?: App.Platform): Db {
	const db = platform?.env?.DB;
	if (!db) {
		throw new Error('Cloudflare D1 binding DB is not configured.');
	}
	return db;
}

export function nowIso(): string {
	return new Date().toISOString();
}

export function addSeconds(date: Date, seconds: number): Date {
	return new Date(date.getTime() + seconds * 1000);
}
