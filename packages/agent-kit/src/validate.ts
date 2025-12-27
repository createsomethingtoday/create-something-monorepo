/**
 * License Validation
 *
 * Validates license key against CREATE SOMETHING API.
 * Records activation for machine tracking.
 */

export interface LicenseValidation {
	valid: boolean;
	tier: 'solo' | 'team' | 'org';
	email?: string;
	teamSeatsRemaining?: number;
	officeHoursRemaining?: number;
	error?: string;
}

const API_BASE = 'https://createsomething.agency/api';

export async function validateLicense(key: string, machineId: string): Promise<LicenseValidation> {
	// Basic format check
	if (!key.startsWith('ak_') || key.length < 20) {
		return { valid: false, tier: 'solo', error: 'Invalid license key format' };
	}

	try {
		const response = await fetch(`${API_BASE}/agent-kit/validate`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'User-Agent': '@createsomething/agent-kit'
			},
			body: JSON.stringify({
				key,
				machineId,
				hostname: getHostname(),
				os: getOS()
			})
		});

		if (!response.ok) {
			if (response.status === 404) {
				return { valid: false, tier: 'solo', error: 'License key not found' };
			}
			if (response.status === 403) {
				return { valid: false, tier: 'solo', error: 'License key expired or revoked' };
			}
			return { valid: false, tier: 'solo', error: `Server error: ${response.status}` };
		}

		const data = (await response.json()) as LicenseValidation;
		return data;
	} catch (error) {
		// Network error - allow offline mode if key format is valid
		// This is a fallback for development/testing
		if (process.env.AGENT_KIT_OFFLINE === 'true') {
			console.warn('  Warning: Offline mode - license not verified');
			return { valid: true, tier: 'solo' };
		}
		return {
			valid: false,
			tier: 'solo',
			error: `Network error: ${error instanceof Error ? error.message : 'Unknown'}`
		};
	}
}

function getHostname(): string {
	try {
		return require('os').hostname();
	} catch {
		return 'unknown';
	}
}

function getOS(): string {
	try {
		const os = require('os');
		return `${os.platform()} ${os.release()}`;
	} catch {
		return 'unknown';
	}
}
