/**
 * @create-something/cloudflare-sdk
 *
 * Code Mode wrapper for Cloudflare operations.
 *
 * Philosophy: This SDK achieves Zuhandenheit (ready-to-hand) by presenting
 * Cloudflare infrastructure as familiar programming patterns. The tool
 * recedes into transparent use—you think about WHAT you're building,
 * not HOW to invoke the API.
 *
 * Instead of:
 *   <invoke name="mcp__cloudflare__kv_get">
 *     <parameter name="namespaceId">abc123</parameter>
 *     <parameter name="key">user:123</parameter>
 *   </invoke>
 *
 * You write:
 *   const user = await kv.get('users', 'user:123');
 *
 * The hammer disappears when hammering.
 *
 * @see https://createsomething.io/papers/code-mode-hermeneutic-analysis
 */

import { execa } from 'execa';

// ============================================================================
// Types
// ============================================================================

export interface KVNamespace {
	id: string;
	title: string;
}

export interface D1Database {
	uuid: string;
	name: string;
}

export interface Worker {
	id: string;
	name: string;
}

export interface R2Bucket {
	name: string;
	creation_date: string;
}

// ============================================================================
// KV Storage
// ============================================================================

export const kv = {
	/**
	 * List all KV namespaces
	 */
	async listNamespaces(): Promise<KVNamespace[]> {
		const { stdout } = await execa('wrangler', ['kv:namespace', 'list', '--json']);
		return JSON.parse(stdout);
	},

	/**
	 * Get a value from KV
	 */
	async get(namespaceId: string, key: string): Promise<string | null> {
		try {
			const { stdout } = await execa('wrangler', [
				'kv:key',
				'get',
				key,
				'--namespace-id',
				namespaceId
			]);
			return stdout;
		} catch {
			return null;
		}
	},

	/**
	 * Put a value into KV
	 */
	async put(namespaceId: string, key: string, value: string): Promise<void> {
		await execa('wrangler', ['kv:key', 'put', key, value, '--namespace-id', namespaceId]);
	},

	/**
	 * Delete a key from KV
	 */
	async delete(namespaceId: string, key: string): Promise<void> {
		await execa('wrangler', ['kv:key', 'delete', key, '--namespace-id', namespaceId]);
	},

	/**
	 * List keys in a namespace
	 */
	async list(namespaceId: string, prefix?: string): Promise<string[]> {
		const args = ['kv:key', 'list', '--namespace-id', namespaceId];
		if (prefix) args.push('--prefix', prefix);
		const { stdout } = await execa('wrangler', args);
		const result = JSON.parse(stdout);
		return result.map((item: { name: string }) => item.name);
	}
};

// ============================================================================
// D1 Database
// ============================================================================

export const d1 = {
	/**
	 * List all D1 databases
	 */
	async listDatabases(): Promise<D1Database[]> {
		const { stdout } = await execa('wrangler', ['d1', 'list', '--json']);
		return JSON.parse(stdout);
	},

	/**
	 * Execute a SQL query
	 */
	async query<T = unknown>(databaseName: string, sql: string): Promise<T[]> {
		const { stdout } = await execa('wrangler', [
			'd1',
			'execute',
			databaseName,
			'--command',
			sql,
			'--json'
		]);
		const result = JSON.parse(stdout);
		return result[0]?.results ?? [];
	},

	/**
	 * Execute a SQL query with parameters (prepared statement)
	 */
	async queryWithParams<T = unknown>(
		databaseName: string,
		sql: string,
		params: unknown[]
	): Promise<T[]> {
		// For parameterized queries, we need to use the remote flag
		const paramStr = params.map((p) => JSON.stringify(p)).join(' ');
		const { stdout } = await execa('wrangler', [
			'd1',
			'execute',
			databaseName,
			'--command',
			sql,
			'--json',
			'--',
			...params.map(String)
		]);
		const result = JSON.parse(stdout);
		return result[0]?.results ?? [];
	}
};

// ============================================================================
// Workers
// ============================================================================

export const workers = {
	/**
	 * List all Workers
	 */
	async list(): Promise<Worker[]> {
		const { stdout } = await execa('wrangler', ['deployments', 'list', '--json']);
		return JSON.parse(stdout);
	},

	/**
	 * Deploy a Worker from a file
	 */
	async deploy(name: string, scriptPath: string): Promise<void> {
		await execa('wrangler', ['deploy', scriptPath, '--name', name]);
	},

	/**
	 * Tail Worker logs
	 */
	async tail(name: string): Promise<AsyncIterable<string>> {
		const subprocess = execa('wrangler', ['tail', name]);
		return subprocess.stdout as unknown as AsyncIterable<string>;
	}
};

// ============================================================================
// R2 Storage
// ============================================================================

export const r2 = {
	/**
	 * List all R2 buckets
	 */
	async listBuckets(): Promise<R2Bucket[]> {
		const { stdout } = await execa('wrangler', ['r2', 'bucket', 'list', '--json']);
		return JSON.parse(stdout);
	},

	/**
	 * Get an object from R2
	 */
	async get(bucket: string, key: string): Promise<Buffer | null> {
		try {
			const { stdout } = await execa('wrangler', ['r2', 'object', 'get', `${bucket}/${key}`], {
				encoding: 'buffer'
			});
			return stdout as unknown as Buffer;
		} catch {
			return null;
		}
	},

	/**
	 * Put an object into R2
	 */
	async put(bucket: string, key: string, filePath: string): Promise<void> {
		await execa('wrangler', ['r2', 'object', 'put', `${bucket}/${key}`, '--file', filePath]);
	},

	/**
	 * Delete an object from R2
	 */
	async delete(bucket: string, key: string): Promise<void> {
		await execa('wrangler', ['r2', 'object', 'delete', `${bucket}/${key}`]);
	}
};

// ============================================================================
// Pages
// ============================================================================

export const pages = {
	/**
	 * Deploy to Cloudflare Pages
	 */
	async deploy(projectName: string, directory: string): Promise<string> {
		const { stdout } = await execa('wrangler', [
			'pages',
			'deploy',
			directory,
			'--project-name',
			projectName,
			'--commit-dirty=true'
		]);
		// Extract URL from output
		const urlMatch = stdout.match(/https:\/\/[^\s]+\.pages\.dev/);
		return urlMatch?.[0] ?? stdout;
	},

	/**
	 * List Pages projects
	 */
	async listProjects(): Promise<unknown[]> {
		const { stdout } = await execa('wrangler', ['pages', 'project', 'list', '--json']);
		return JSON.parse(stdout);
	}
};

// ============================================================================
// Convenience: Unified namespace access
// ============================================================================

/**
 * Main export: Cloudflare SDK
 *
 * Usage:
 *   import { cf } from '@create-something/cloudflare-sdk';
 *
 *   // KV operations
 *   const namespaces = await cf.kv.listNamespaces();
 *   const value = await cf.kv.get('namespace-id', 'my-key');
 *
 *   // D1 operations
 *   const users = await cf.d1.query('my-db', 'SELECT * FROM users');
 *
 *   // Pages deployment
 *   const url = await cf.pages.deploy('my-project', './dist');
 */
export const cf = {
	kv,
	d1,
	workers,
	r2,
	pages
};

export default cf;
