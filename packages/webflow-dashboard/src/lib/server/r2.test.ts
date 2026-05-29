import { describe, expect, it } from 'vitest';
import { generateStorageKey, sanitizeFilename } from './r2';

describe('R2 storage keys', () => {
	it('sanitizes filenames while preserving the extension', () => {
		expect(sanitizeFilename('Hero Image (final).webp')).toBe('Hero_Image__final_.webp');
	});

	it('does not expose email local parts in public object keys', () => {
		const key = generateStorageKey('avatar.webp', 'creator@example.com');

		expect(key).not.toContain('creator');
		expect(key).not.toContain('example.com');
		expect(key).toMatch(/^[a-f0-9]{16}\/\d+_[0-9a-f-]+_avatar\.webp$/);
	});
});
