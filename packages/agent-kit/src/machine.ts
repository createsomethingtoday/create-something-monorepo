/**
 * Machine ID Generation
 *
 * Creates a consistent machine identifier for license activation tracking.
 * Uses hardware-based identifiers when available.
 */

import { createHash } from 'crypto';
import { homedir, platform, hostname, cpus } from 'os';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const MACHINE_ID_FILE = join(homedir(), '.config', 'agent-kit', 'machine-id');

export async function getMachineId(): Promise<string> {
	// Check for cached machine ID
	if (existsSync(MACHINE_ID_FILE)) {
		return readFileSync(MACHINE_ID_FILE, 'utf-8').trim();
	}

	// Generate machine ID from hardware characteristics
	const machineId = generateMachineId();

	// Cache for future use
	const dir = join(homedir(), '.config', 'agent-kit');
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}
	writeFileSync(MACHINE_ID_FILE, machineId);

	return machineId;
}

function generateMachineId(): string {
	const components: string[] = [];

	// Platform
	components.push(platform());

	// Hostname
	components.push(hostname());

	// CPU model (consistent per machine)
	const cpu = cpus()[0];
	if (cpu) {
		components.push(cpu.model);
	}

	// Home directory (unique per user on shared machines)
	components.push(homedir());

	// Hash the components
	const hash = createHash('sha256').update(components.join('|')).digest('hex');

	// Return first 32 characters
	return `mid_${hash.substring(0, 32)}`;
}
