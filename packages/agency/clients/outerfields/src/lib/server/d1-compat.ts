/**
 * Database compatibility layer for:
 * - Cloudflare D1 in production (Pages/Workers)
 * - Postgres in Node environments when DATABASE_URL is set
 * - SQLite fallback for local development
 */
import { readFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';
import type { D1Database } from '@cloudflare/workers-types';

type DbMode = 'cloudflare-d1' | 'postgres' | 'sqlite';

let _sqliteDb: any = null;
let _sqliteInitialized = false;
let _pgClient: any = null;
let _pgReady: Promise<void> | null = null;

function toPgPlaceholders(sql: string): string {
	let i = 0;
	return sql.replace(/\?/g, () => `$${++i}`);
}

function forPostgres(sql: string): string {
	return sql
		.replace(
			/strftime\s*\(\s*['"]%s['"]\s*,\s*['"]now['"]\s*\)\s*\*\s*1000/gi,
			'(EXTRACT(EPOCH FROM NOW()))::INTEGER * 1000'
		)
		.replace(/strftime\s*\(\s*['"]%s['"]\s*,\s*['"]now['"]\s*\)/gi, '(EXTRACT(EPOCH FROM NOW()))::INTEGER')
		.replace(/INSERT OR IGNORE INTO/gi, 'INSERT INTO')
		.replace(/AUTOINCREMENT/gi, '');
}

function getMode(cloudflareDb?: D1Database): DbMode {
	if (cloudflareDb) return 'cloudflare-d1';
	const databaseUrl = process.env.DATABASE_URL;
	if (databaseUrl && databaseUrl.startsWith('postgres')) return 'postgres';
	return 'sqlite';
}

async function ensurePgConnection(): Promise<any> {
	if (_pgClient && _pgReady) {
		await _pgReady;
		return _pgClient;
	}

	const databaseUrl = process.env.DATABASE_URL;
	if (!databaseUrl) throw new Error('DATABASE_URL is required for postgres mode');

	const { Client } = await import('pg');
	_pgClient = new Client({
		connectionString: databaseUrl,
		ssl: { rejectUnauthorized: true }
	});

	_pgReady = (async () => {
		await _pgClient.connect();
		await runPostgresMigrations(_pgClient);
	})();

	await _pgReady;
	return _pgClient;
}

async function ensureSqliteConnection(): Promise<any> {
	if (_sqliteDb && _sqliteInitialized) return _sqliteDb;

	const sqliteModule = await import('better-sqlite3');
	const Database = (sqliteModule as { default: new (path: string) => any }).default;
	const dbPath = process.env.DATABASE_PATH || join(process.cwd(), 'data', 'outerfields.db');
	const dir = dbPath.substring(0, dbPath.lastIndexOf('/'));

	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}

	_sqliteDb = new Database(dbPath);
	_sqliteDb.pragma('journal_mode = WAL');
	runSqliteMigrations(_sqliteDb);
	_sqliteInitialized = true;
	return _sqliteDb;
}

async function runPostgresMigrations(client: any): Promise<void> {
	const migrationsDir = join(process.cwd(), 'migrations');
	if (!existsSync(migrationsDir)) return;

	await client.query(`
		CREATE TABLE IF NOT EXISTS _migrations (
			id SERIAL PRIMARY KEY,
			name TEXT NOT NULL UNIQUE,
			applied_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()))::BIGINT
		)
	`);

	const files: string[] = readdirSync(migrationsDir)
		.filter((f: string) => f.endsWith('.sql'))
		.sort();

	for (const file of files) {
		const applied = await client.query('SELECT 1 FROM _migrations WHERE name = $1', [file]);
		if (applied.rows.length > 0) continue;

		let sql = readFileSync(join(migrationsDir, file), 'utf-8');
		sql = forPostgres(sql);

		if (file === '0004_seed_demo_users.sql') {
			sql = sql.replace(/\);\s*$/, ') ON CONFLICT (id) DO NOTHING;');
		}

		const statements = sql
			.split(/\s*;\s*\n/)
			.map((s) => s.trim())
			.filter((s) => s.length > 0 && !s.startsWith('--'));

		for (const stmt of statements) {
			const statement = stmt + (stmt.endsWith(';') ? '' : ';');
			try {
				await client.query(statement);
			} catch (err) {
				console.error(`[migration] Failed statement in ${file}:`, (err as Error).message);
			}
		}

		try {
			await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
			console.log(`[migration] Applied: ${file}`);
		} catch (err) {
			console.error(`[migration] Failed to record ${file}:`, err);
		}
	}
}

function runSqliteMigrations(db: any): void {
	const migrationsDir = join(process.cwd(), 'migrations');
	if (!existsSync(migrationsDir)) return;

	db.exec(`
		CREATE TABLE IF NOT EXISTS _migrations (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL UNIQUE,
			applied_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
		)
	`);

	const files: string[] = readdirSync(migrationsDir)
		.filter((f: string) => f.endsWith('.sql'))
		.sort();

	for (const file of files) {
		const applied = db.prepare('SELECT 1 FROM _migrations WHERE name = ?').get(file);
		if (applied) continue;
		const sql = readFileSync(join(migrationsDir, file), 'utf-8');
		try {
			db.exec(sql);
			db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(file);
			console.log(`[migration] Applied: ${file}`);
		} catch (err) {
			console.error(`[migration] Failed: ${file}`, err);
		}
	}
}

class D1PreparedStatement {
	private params: unknown[] = [];

	constructor(
		private mode: DbMode,
		private sql: string,
		private cloudflareDb?: D1Database
	) {}

	bind(...params: unknown[]): D1PreparedStatement {
		this.params = params;
		return this;
	}

	async all<T = Record<string, unknown>>(): Promise<{ results: T[] }> {
		if (this.mode === 'cloudflare-d1') {
			const result = await this.cloudflareDb!.prepare(this.sql).bind(...this.params).all<T>();
			return { results: result.results || [] };
		}

		if (this.mode === 'postgres') {
			const client = await ensurePgConnection();
			const pgSql = toPgPlaceholders(this.sql);
			const res = await client.query(pgSql, this.params);
			return { results: (res.rows || []) as T[] };
		}

		const db = await ensureSqliteConnection();
		const stmt = db.prepare(this.sql);
		return { results: (stmt.all(...this.params) as T[]) || [] };
	}

	async first<T = Record<string, unknown>>(): Promise<T | null> {
		if (this.mode === 'cloudflare-d1') {
			const result = await this.cloudflareDb!.prepare(this.sql).bind(...this.params).first<T>();
			return result || null;
		}

		if (this.mode === 'postgres') {
			const client = await ensurePgConnection();
			const pgSql = toPgPlaceholders(this.sql);
			const res = await client.query(pgSql, this.params);
			return (res.rows?.[0] as T) ?? null;
		}

		const db = await ensureSqliteConnection();
		const stmt = db.prepare(this.sql);
		const result = stmt.get(...this.params) as T | undefined;
		return result ?? null;
	}

	async run(): Promise<{ meta: { changes: number } }> {
		if (this.mode === 'cloudflare-d1') {
			const result = await this.cloudflareDb!.prepare(this.sql).bind(...this.params).run();
			return { meta: { changes: result.meta.changes || 0 } };
		}

		if (this.mode === 'postgres') {
			const client = await ensurePgConnection();
			const pgSql = toPgPlaceholders(this.sql);
			const res = await client.query(pgSql, this.params);
			return { meta: { changes: res.rowCount ?? 0 } };
		}

		const db = await ensureSqliteConnection();
		const stmt = db.prepare(this.sql);
		const info = stmt.run(...this.params);
		return { meta: { changes: info.changes || 0 } };
	}
}

export class D1Compat {
	private mode: DbMode;
	private cloudflareDb?: D1Database;

	constructor(cloudflareDb?: D1Database) {
		this.cloudflareDb = cloudflareDb;
		this.mode = getMode(cloudflareDb);
	}

	prepare(sql: string): D1PreparedStatement {
		return new D1PreparedStatement(this.mode, sql, this.cloudflareDb);
	}

	async exec(sql: string): Promise<void> {
		if (this.mode === 'cloudflare-d1') {
			await this.cloudflareDb!.exec(sql);
			return;
		}

		if (this.mode === 'postgres') {
			const client = await ensurePgConnection();
			await client.query(sql);
			return;
		}

		const db = await ensureSqliteConnection();
		db.exec(sql);
	}
}

export function getDB(cloudflareDb?: D1Database): D1Compat {
	return new D1Compat(cloudflareDb);
}

export function getDBFromPlatform(platform?: { env?: { DB?: D1Database } }): D1Compat {
	return getDB(platform?.env?.DB);
}
