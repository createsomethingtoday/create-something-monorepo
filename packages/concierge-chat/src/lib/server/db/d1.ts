export interface D1Result {
	success: boolean;
	meta?: Record<string, unknown>;
}

export interface D1PreparedStatement {
	bind(...values: unknown[]): D1PreparedStatement;
	first<T = unknown>(column?: string): Promise<T | null>;
	all<T = unknown>(): Promise<{ results: T[] }>;
	run(): Promise<D1Result>;
}

export interface D1Database {
	prepare(query: string): D1PreparedStatement;
	batch?(statements: D1PreparedStatement[]): Promise<D1Result[]>;
}

export async function runBatch(db: D1Database, statements: D1PreparedStatement[]) {
	if (statements.length === 0) {
		return;
	}

	if (typeof db.batch === 'function') {
		await db.batch(statements);
		return;
	}

	for (const statement of statements) {
		await statement.run();
	}
}
