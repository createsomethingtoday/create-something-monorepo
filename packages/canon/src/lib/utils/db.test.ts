/**
 * D1 Query Builder Tests
 *
 * Tests for typed query builder functionality.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { query, insert, update, QueryBuilder, InsertBuilder, UpdateBuilder } from './db';

// Mock D1 database
function createMockDb() {
	const mockStmt = {
		bind: vi.fn().mockReturnThis(),
		all: vi.fn().mockResolvedValue({ results: [], success: true, meta: {} }),
		first: vi.fn().mockResolvedValue(null),
		run: vi.fn().mockResolvedValue({ success: true, meta: {} })
	};

	return {
		prepare: vi.fn().mockReturnValue(mockStmt),
		_stmt: mockStmt
	};
}

describe('QueryBuilder', () => {
	let mockDb: ReturnType<typeof createMockDb>;

	beforeEach(() => {
		mockDb = createMockDb();
	});

	describe('toSQL', () => {
		it('builds basic SELECT query', () => {
			const { sql, params } = query(mockDb).from('users').toSQL();

			expect(sql).toBe('SELECT * FROM users');
			expect(params).toEqual([]);
		});

		it('builds SELECT with specific columns', () => {
			const { sql } = query(mockDb).from('users').select(['id', 'name', 'email']).toSQL();

			expect(sql).toBe('SELECT id, name, email FROM users');
		});

		it('builds SELECT with string columns', () => {
			const { sql } = query(mockDb).from('users').select('id, name').toSQL();

			expect(sql).toBe('SELECT id, name FROM users');
		});

		it('builds WHERE clause with equals', () => {
			const { sql, params } = query(mockDb).from('users').where('status', '=', 'active').toSQL();

			expect(sql).toBe('SELECT * FROM users WHERE status = ?');
			expect(params).toEqual(['active']);
		});

		it('builds WHERE clause with whereEquals shorthand', () => {
			const { sql, params } = query(mockDb).from('users').whereEquals('id', 123).toSQL();

			expect(sql).toBe('SELECT * FROM users WHERE id = ?');
			expect(params).toEqual([123]);
		});

		it('builds WHERE clause with multiple conditions', () => {
			const { sql, params } = query(mockDb)
				.from('users')
				.where('status', '=', 'active')
				.where('role', '=', 'admin')
				.toSQL();

			expect(sql).toBe('SELECT * FROM users WHERE status = ? AND role = ?');
			expect(params).toEqual(['active', 'admin']);
		});

		it('builds WHERE IS NULL', () => {
			const { sql, params } = query(mockDb).from('users').whereNull('deleted_at').toSQL();

			expect(sql).toBe('SELECT * FROM users WHERE deleted_at IS NULL');
			expect(params).toEqual([]);
		});

		it('builds WHERE IS NOT NULL', () => {
			const { sql, params } = query(mockDb).from('users').whereNotNull('email').toSQL();

			expect(sql).toBe('SELECT * FROM users WHERE email IS NOT NULL');
			expect(params).toEqual([]);
		});

		it('builds WHERE IN', () => {
			const { sql, params } = query(mockDb).from('users').whereIn('role', ['admin', 'moderator']).toSQL();

			expect(sql).toBe('SELECT * FROM users WHERE role IN (?, ?)');
			expect(params).toEqual(['admin', 'moderator']);
		});

		it('builds ORDER BY', () => {
			const { sql } = query(mockDb).from('users').orderBy('created_at', 'DESC').toSQL();

			expect(sql).toBe('SELECT * FROM users ORDER BY created_at DESC');
		});

		it('builds ORDER BY with default ASC', () => {
			const { sql } = query(mockDb).from('users').orderBy('name').toSQL();

			expect(sql).toBe('SELECT * FROM users ORDER BY name ASC');
		});

		it('builds multiple ORDER BY', () => {
			const { sql } = query(mockDb)
				.from('users')
				.orderBy('role', 'ASC')
				.orderBy('name', 'DESC')
				.toSQL();

			expect(sql).toBe('SELECT * FROM users ORDER BY role ASC, name DESC');
		});

		it('builds LIMIT', () => {
			const { sql, params } = query(mockDb).from('users').limit(10).toSQL();

			expect(sql).toBe('SELECT * FROM users LIMIT ?');
			expect(params).toEqual([10]);
		});

		it('builds OFFSET', () => {
			const { sql, params } = query(mockDb).from('users').limit(10).offset(20).toSQL();

			expect(sql).toBe('SELECT * FROM users LIMIT ? OFFSET ?');
			expect(params).toEqual([10, 20]);
		});

		it('builds complex query', () => {
			const { sql, params } = query(mockDb)
				.from('users')
				.select(['id', 'name', 'email'])
				.where('status', '=', 'active')
				.where('role', '!=', 'guest')
				.orderBy('created_at', 'DESC')
				.limit(25)
				.offset(50)
				.toSQL();

			expect(sql).toBe(
				'SELECT id, name, email FROM users WHERE status = ? AND role != ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
			);
			expect(params).toEqual(['active', 'guest', 25, 50]);
		});

		it('throws error without table name', () => {
			expect(() => query(mockDb).where('id', '=', 1).toSQL()).toThrow(
				'Table name is required. Call .from() first.'
			);
		});
	});

	describe('all', () => {
		it('executes query and returns results', async () => {
			const mockUsers = [
				{ id: 1, name: 'John' },
				{ id: 2, name: 'Jane' }
			];
			mockDb._stmt.all.mockResolvedValue({ results: mockUsers, success: true, meta: {} });

			const results = await query<{ id: number; name: string }>(mockDb).from('users').all();

			expect(mockDb.prepare).toHaveBeenCalledWith('SELECT * FROM users');
			expect(results).toEqual(mockUsers);
		});

		it('returns empty array when no results', async () => {
			mockDb._stmt.all.mockResolvedValue({ results: undefined, success: true, meta: {} });

			const results = await query(mockDb).from('users').all();

			expect(results).toEqual([]);
		});
	});

	describe('first', () => {
		it('executes query and returns first result', async () => {
			const mockUser = { id: 1, name: 'John' };
			mockDb._stmt.first.mockResolvedValue(mockUser);

			const result = await query<{ id: number; name: string }>(mockDb)
				.from('users')
				.where('id', '=', 1)
				.first();

			expect(mockDb.prepare).toHaveBeenCalledWith('SELECT * FROM users WHERE id = ? LIMIT ?');
			expect(result).toEqual(mockUser);
		});
	});

	describe('count', () => {
		it('executes count query', async () => {
			mockDb._stmt.first.mockResolvedValue({ count: 42 });

			const count = await query(mockDb).from('users').where('status', '=', 'active').count();

			expect(mockDb.prepare).toHaveBeenCalledWith('SELECT COUNT(*) as count FROM users WHERE status = ?');
			expect(count).toBe(42);
		});

		it('returns 0 when no results', async () => {
			mockDb._stmt.first.mockResolvedValue(null);

			const count = await query(mockDb).from('users').count();

			expect(count).toBe(0);
		});
	});
});

describe('InsertBuilder', () => {
	let mockDb: ReturnType<typeof createMockDb>;

	beforeEach(() => {
		mockDb = createMockDb();
	});

	describe('toSQL', () => {
		it('builds INSERT query', () => {
			const { sql, params } = insert(mockDb)
				.into('users')
				.values({ name: 'John', email: 'john@example.com' })
				.toSQL();

			expect(sql).toBe('INSERT INTO users (name, email) VALUES (?, ?)');
			expect(params).toEqual(['John', 'john@example.com']);
		});

		it('throws error without table name', () => {
			expect(() => insert(mockDb).values({ name: 'John' }).toSQL()).toThrow(
				'Table name is required. Call .into() first.'
			);
		});
	});

	describe('run', () => {
		it('executes insert and returns result', async () => {
			mockDb._stmt.run.mockResolvedValue({
				success: true,
				meta: { last_row_id: 123 }
			});

			const result = await insert(mockDb)
				.into('users')
				.values({ name: 'John' })
				.run();

			expect(result.success).toBe(true);
			expect(result.lastRowId).toBe(123);
		});
	});
});

describe('UpdateBuilder', () => {
	let mockDb: ReturnType<typeof createMockDb>;

	beforeEach(() => {
		mockDb = createMockDb();
	});

	describe('toSQL', () => {
		it('builds UPDATE query', () => {
			const { sql, params } = update(mockDb)
				.table('users')
				.set({ name: 'Jane', updated_at: 12345 })
				.where('id', '=', 1)
				.toSQL();

			expect(sql).toBe('UPDATE users SET name = ?, updated_at = ? WHERE id = ?');
			expect(params).toEqual(['Jane', 12345, 1]);
		});

		it('builds UPDATE without WHERE (dangerous but allowed)', () => {
			const { sql, params } = update(mockDb).table('users').set({ status: 'inactive' }).toSQL();

			expect(sql).toBe('UPDATE users SET status = ?');
			expect(params).toEqual(['inactive']);
		});

		it('throws error without table name', () => {
			expect(() => update(mockDb).set({ name: 'John' }).toSQL()).toThrow(
				'Table name is required. Call .table() first.'
			);
		});
	});

	describe('run', () => {
		it('executes update and returns result', async () => {
			mockDb._stmt.run.mockResolvedValue({
				success: true,
				meta: { changes: 5 }
			});

			const result = await update(mockDb)
				.table('users')
				.set({ status: 'active' })
				.where('role', '=', 'member')
				.run();

			expect(result.success).toBe(true);
			expect(result.rowsAffected).toBe(5);
		});
	});
});
