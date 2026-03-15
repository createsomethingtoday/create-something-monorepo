/**
 * Phone number utilities
 *
 * Shared formatting and normalization functions used by SMS providers.
 */

/**
 * Normalize phone number to digits only
 * +1234567890 -> 1234567890
 */
export function normalizePhone(phone: string): string {
	return phone.replace(/\D/g, '');
}

/**
 * Format phone number for display
 * 1234567890 -> (123) 456-7890
 */
export function formatPhone(phone: string): string {
	const cleaned = normalizePhone(phone);
	if (cleaned.length === 10) {
		return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
	}
	if (cleaned.length === 11 && cleaned.startsWith('1')) {
		return `(${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
	}
	return phone;
}

/**
 * Format phone number to E.164
 * 1234567890 -> +11234567890
 */
export function toE164(phone: string, countryCode = '1'): string {
	const cleaned = normalizePhone(phone);
	if (cleaned.startsWith(countryCode)) {
		return `+${cleaned}`;
	}
	return `+${countryCode}${cleaned}`;
}
