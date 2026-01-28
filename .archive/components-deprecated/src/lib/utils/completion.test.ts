/**
 * Experiment Completion Tracking Tests
 *
 * Tests for local storage-based experiment completion tracking.
 * Note: These tests mock the browser environment and localStorage.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the $app/environment module
vi.mock('$app/environment', () => ({
	browser: true
}));

// We need to import after the mock is set up
import {
	markExperimentCompleted,
	isExperimentCompleted,
	clearExperimentCompletion,
	validateCompletionToken
} from './completion';

describe('experiment completion tracking', () => {
	// Mock localStorage
	const localStorageMock = {
		store: {} as Record<string, string>,
		getItem: vi.fn((key: string) => localStorageMock.store[key] || null),
		setItem: vi.fn((key: string, value: string) => {
			localStorageMock.store[key] = value;
		}),
		removeItem: vi.fn((key: string) => {
			delete localStorageMock.store[key];
		}),
		clear: vi.fn(() => {
			localStorageMock.store = {};
		})
	};

	beforeEach(() => {
		// Reset localStorage mock
		localStorageMock.store = {};
		vi.clearAllMocks();

		// Apply mock to global
		Object.defineProperty(globalThis, 'localStorage', {
			value: localStorageMock,
			writable: true
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('markExperimentCompleted', () => {
		it('stores completion state in localStorage', () => {
			markExperimentCompleted('test-experiment');

			expect(localStorageMock.setItem).toHaveBeenCalledWith(
				'experiment_completed_test-experiment',
				'true'
			);
		});

		it('uses correct key prefix', () => {
			markExperimentCompleted('my-slug');

			expect(localStorageMock.setItem).toHaveBeenCalledWith(
				'experiment_completed_my-slug',
				'true'
			);
		});

		it('handles localStorage errors gracefully', () => {
			const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
			localStorageMock.setItem.mockImplementationOnce(() => {
				throw new Error('Storage full');
			});

			// Should not throw
			expect(() => markExperimentCompleted('test')).not.toThrow();
			expect(consoleSpy).toHaveBeenCalledWith(
				'Failed to save completion state:',
				expect.any(Error)
			);
		});
	});

	describe('isExperimentCompleted', () => {
		it('returns true when experiment is marked completed', () => {
			localStorageMock.store['experiment_completed_test'] = 'true';

			expect(isExperimentCompleted('test')).toBe(true);
		});

		it('returns false when experiment is not completed', () => {
			expect(isExperimentCompleted('not-completed')).toBe(false);
		});

		it('returns false for non-true values', () => {
			localStorageMock.store['experiment_completed_test'] = 'false';

			expect(isExperimentCompleted('test')).toBe(false);
		});

		it('handles localStorage errors gracefully', () => {
			const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
			localStorageMock.getItem.mockImplementationOnce(() => {
				throw new Error('Access denied');
			});

			expect(isExperimentCompleted('test')).toBe(false);
			expect(consoleSpy).toHaveBeenCalledWith(
				'Failed to read completion state:',
				expect.any(Error)
			);
		});
	});

	describe('clearExperimentCompletion', () => {
		it('removes completion state from localStorage', () => {
			localStorageMock.store['experiment_completed_test'] = 'true';

			clearExperimentCompletion('test');

			expect(localStorageMock.removeItem).toHaveBeenCalledWith('experiment_completed_test');
		});

		it('handles localStorage errors gracefully', () => {
			const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
			localStorageMock.removeItem.mockImplementationOnce(() => {
				throw new Error('Access denied');
			});

			expect(() => clearExperimentCompletion('test')).not.toThrow();
			expect(consoleSpy).toHaveBeenCalledWith(
				'Failed to clear completion state:',
				expect.any(Error)
			);
		});
	});

	describe('validateCompletionToken', () => {
		it('returns true when completed=true in URL', () => {
			const url = new URL('https://example.com/experiment?completed=true');

			expect(validateCompletionToken(url)).toBe(true);
		});

		it('returns false when completed param is missing', () => {
			const url = new URL('https://example.com/experiment');

			expect(validateCompletionToken(url)).toBe(false);
		});

		it('returns false when completed is not true', () => {
			const url = new URL('https://example.com/experiment?completed=false');

			expect(validateCompletionToken(url)).toBe(false);
		});

		it('returns false for other completed values', () => {
			const url = new URL('https://example.com/experiment?completed=1');

			expect(validateCompletionToken(url)).toBe(false);
		});

		it('handles URL with other parameters', () => {
			const url = new URL('https://example.com/experiment?other=param&completed=true&more=data');

			expect(validateCompletionToken(url)).toBe(true);
		});
	});
});

describe('server-side behavior (browser = false)', () => {
	beforeEach(() => {
		// Re-mock with browser = false
		vi.resetModules();
		vi.doMock('$app/environment', () => ({
			browser: false
		}));
	});

	afterEach(() => {
		vi.resetModules();
	});

	it('markExperimentCompleted does nothing on server', async () => {
		const { markExperimentCompleted } = await import('./completion');

		// Should not throw, just return early
		expect(() => markExperimentCompleted('test')).not.toThrow();
	});

	it('isExperimentCompleted returns false on server', async () => {
		const { isExperimentCompleted } = await import('./completion');

		expect(isExperimentCompleted('test')).toBe(false);
	});

	it('clearExperimentCompletion does nothing on server', async () => {
		const { clearExperimentCompletion } = await import('./completion');

		expect(() => clearExperimentCompletion('test')).not.toThrow();
	});
});
