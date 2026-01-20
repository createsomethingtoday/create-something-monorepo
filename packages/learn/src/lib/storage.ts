/**
 * Storage Utilities
 *
 * Shared helpers for filesystem-based storage.
 */

import { existsSync, mkdirSync } from 'fs';
import { randomBytes } from 'crypto';
import { homedir } from 'os';
import { join } from 'path';

/**
 * Default config directory for CREATE SOMETHING tools
 */
export const CONFIG_DIR = join(homedir(), '.create-something');

/**
 * Ensure the config directory exists with proper permissions
 *
 * Creates ~/.create-something with mode 0o700 (owner read/write/execute only)
 */
export function ensureConfigDir(dir: string = CONFIG_DIR): void {
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true, mode: 0o700 });
	}
}

/**
 * Generate a short unique ID using crypto random bytes
 *
 * @returns 8-character hex string
 */
export function generateId(): string {
	return randomBytes(4).toString('hex');
}
