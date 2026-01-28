/**
 * Ethos Storage
 *
 * Persists user's personal ethos to ~/.create-something/ethos.json
 * Canon: The ethos recedes into use; your principles guide without commanding.
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import type {
	UserEthos,
	EthosPrinciple,
	EthosConstraint,
	EthosHealthCheck
} from '../types.js';
import { CONFIG_DIR, ensureConfigDir, generateId } from '../lib/storage.js';

const ETHOS_FILE = join(CONFIG_DIR, 'ethos.json');

/**
 * Create an empty ethos with defaults
 */
function createEmptyEthos(name = 'My Ethos'): UserEthos {
	const now = Date.now();
	return {
		version: 1,
		name,
		principles: [],
		constraints: [],
		healthChecks: [],
		createdAt: now,
		updatedAt: now
	};
}

/**
 * Load stored ethos
 */
export function loadEthos(): UserEthos | null {
	try {
		if (!existsSync(ETHOS_FILE)) {
			return null;
		}

		const content = readFileSync(ETHOS_FILE, 'utf-8');
		const ethos = JSON.parse(content) as UserEthos;

		// Validate structure
		if (ethos.version !== 1 || !Array.isArray(ethos.principles)) {
			return null;
		}

		return ethos;
	} catch {
		return null;
	}
}

/**
 * Save ethos to disk
 */
export function saveEthos(ethos: UserEthos): void {
	ensureConfigDir();
	ethos.updatedAt = Date.now();
	writeFileSync(ETHOS_FILE, JSON.stringify(ethos, null, 2));
}

/**
 * Get or create ethos
 */
export function getOrCreateEthos(name?: string): UserEthos {
	const existing = loadEthos();
	if (existing) return existing;

	const ethos = createEmptyEthos(name);
	saveEthos(ethos);
	return ethos;
}

/**
 * Check if ethos exists
 */
export function hasEthos(): boolean {
	return loadEthos() !== null;
}

/**
 * Clear ethos entirely
 */
export function clearEthos(): void {
	try {
		if (existsSync(ETHOS_FILE)) {
			writeFileSync(ETHOS_FILE, '{}');
		}
	} catch {
		// Ignore errors
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Principle Operations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Add a principle to the ethos
 */
export function addPrinciple(
	text: string,
	level: EthosPrinciple['level'],
	domain?: string
): EthosPrinciple {
	const ethos = getOrCreateEthos();
	const now = Date.now();

	const principle: EthosPrinciple = {
		id: generateId(),
		text,
		level,
		domain,
		createdAt: now,
		updatedAt: now
	};

	ethos.principles.push(principle);
	saveEthos(ethos);

	return principle;
}

/**
 * Remove a principle (and its associated constraints)
 */
export function removePrinciple(id: string): boolean {
	const ethos = loadEthos();
	if (!ethos) return false;

	const index = ethos.principles.findIndex((p) => p.id === id);
	if (index === -1) return false;

	// Remove the principle
	ethos.principles.splice(index, 1);

	// Remove associated constraints
	ethos.constraints = ethos.constraints.filter((c) => c.principleId !== id);

	saveEthos(ethos);
	return true;
}

/**
 * Update a principle's text
 */
export function updatePrinciple(id: string, text: string): EthosPrinciple | null {
	const ethos = loadEthos();
	if (!ethos) return null;

	const principle = ethos.principles.find((p) => p.id === id);
	if (!principle) return null;

	principle.text = text;
	principle.updatedAt = Date.now();

	saveEthos(ethos);
	return principle;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constraint Operations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Add a constraint linked to a principle
 */
export function addConstraint(
	principleId: string,
	pattern: string,
	rule: string,
	severity: EthosConstraint['severity'] = 'warning'
): EthosConstraint | null {
	const ethos = loadEthos();
	if (!ethos) return null;

	// Verify principle exists
	const principle = ethos.principles.find((p) => p.id === principleId);
	if (!principle) return null;

	const constraint: EthosConstraint = {
		id: generateId(),
		principleId,
		pattern,
		rule,
		severity,
		createdAt: Date.now()
	};

	ethos.constraints.push(constraint);
	saveEthos(ethos);

	return constraint;
}

/**
 * Generic helper to remove an item from an ethos array by ID
 */
function removeFromEthosArray(
	arrayKey: 'constraints' | 'healthChecks',
	id: string
): boolean {
	const ethos = loadEthos();
	if (!ethos) return false;

	const array = ethos[arrayKey];
	const index = array.findIndex((item) => item.id === id);
	if (index === -1) return false;

	array.splice(index, 1);
	saveEthos(ethos);
	return true;
}

/**
 * Remove a constraint
 */
export function removeConstraint(id: string): boolean {
	return removeFromEthosArray('constraints', id);
}

// ─────────────────────────────────────────────────────────────────────────────
// Health Check Operations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Add a health check
 */
export function addHealthCheck(
	name: string,
	description: string,
	metric: string,
	threshold: string,
	command?: string
): EthosHealthCheck {
	const ethos = getOrCreateEthos();

	const healthCheck: EthosHealthCheck = {
		id: generateId(),
		name,
		description,
		metric,
		threshold,
		command,
		createdAt: Date.now()
	};

	ethos.healthChecks.push(healthCheck);
	saveEthos(ethos);

	return healthCheck;
}

/**
 * Remove a health check
 */
export function removeHealthCheck(id: string): boolean {
	return removeFromEthosArray('healthChecks', id);
}

// ─────────────────────────────────────────────────────────────────────────────
// Import/Export
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Export ethos as JSON string
 */
export function exportEthos(): string | null {
	const ethos = loadEthos();
	if (!ethos) return null;
	return JSON.stringify(ethos, null, 2);
}

/**
 * Import ethos from JSON
 */
export function importEthos(json: string): UserEthos | null {
	try {
		const ethos = JSON.parse(json) as UserEthos;

		// Validate structure
		if (
			ethos.version !== 1 ||
			!Array.isArray(ethos.principles) ||
			!Array.isArray(ethos.constraints) ||
			!Array.isArray(ethos.healthChecks)
		) {
			return null;
		}

		// Update timestamps
		ethos.updatedAt = Date.now();

		saveEthos(ethos);
		return ethos;
	} catch {
		return null;
	}
}

/**
 * Get the ethos file path (for display)
 */
export function getEthosPath(): string {
	return ETHOS_FILE;
}
