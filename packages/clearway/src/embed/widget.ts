/**
 * CLEARWAY Embed Widget
 *
 * Standalone JavaScript bundle for embedding booking widgets on client sites.
 *
 * Usage:
 * <script src="https://clearway.createsomething.space/embed.js"></script>
 * <script>
 *   Clearway.init({
 *     facility: 'thestack',
 *     container: '#booking-widget',
 *     theme: 'dark',
 *     onBook: (r) => console.log('Booked!', r)
 *   });
 * </script>
 */

import Widget from './Widget.svelte';

export interface ClearwayConfig {
	/** Facility slug (e.g., 'thestack') */
	facility: string;

	/** CSS selector for container element */
	container: string;

	/** Theme (default: 'dark') */
	theme?: 'light' | 'dark';

	/** Date to display (default: today) */
	date?: string;

	/** Court type filter (optional) */
	courtType?: string;

	/** Callback when reservation is completed */
	onBook?: (reservation: BookingResult) => void;

	/** Callback when widget is ready */
	onReady?: () => void;

	/** Callback on error */
	onError?: (error: Error) => void;
}

export interface BookingResult {
	id: string;
	court: string;
	start: string;
	end: string;
	price: number;
}

export interface ClearwayInstance {
	destroy: () => void;
	setDate: (date: string) => void;
	refresh: () => void;
}

/**
 * Initialize a CLEARWAY booking widget
 */
export function init(config: ClearwayConfig): ClearwayInstance {
	const {
		facility,
		container,
		theme = 'dark',
		date,
		courtType,
		onBook,
		onReady,
		onError
	} = config;

	// Validate required fields
	if (!facility) {
		const error = new Error('facility is required');
		onError?.(error);
		throw error;
	}

	if (!container) {
		const error = new Error('container is required');
		onError?.(error);
		throw error;
	}

	// Find container element
	const containerEl = document.querySelector(container);
	if (!containerEl) {
		const error = new Error(`Container element not found: ${container}`);
		onError?.(error);
		throw error;
	}

	// Mount Svelte component
	let widget: Widget;
	try {
		widget = new Widget({
			target: containerEl as HTMLElement,
			props: {
				facilitySlug: facility,
				theme,
				date: date || new Date().toISOString().split('T')[0],
				courtType,
				onReservationComplete: onBook
					? (r: any) =>
							onBook({
								id: r.id,
								court: r.courtName,
								start: r.startTime,
								end: r.endTime,
								price: r.price
							})
					: undefined,
				onError
			}
		});

		onReady?.();
	} catch (err) {
		const error = err instanceof Error ? err : new Error(String(err));
		onError?.(error);
		throw error;
	}

	// Return instance API
	return {
		destroy: () => {
			widget.$destroy();
		},
		setDate: (newDate: string) => {
			widget.$set({ date: newDate });
		},
		refresh: () => {
			// Trigger a re-fetch by updating the date to itself
			const currentDate = widget.$$.props.date;
			widget.$set({ date: currentDate });
		}
	};
}

// Legacy API for backwards compatibility
export const createWidget = init;

// Global API
if (typeof window !== 'undefined') {
	(window as any).Clearway = {
		init,
		createWidget, // Legacy support
		version: '1.0.0'
	};

	// Legacy global for backwards compatibility
	(window as any).CourtReserve = {
		createWidget: init,
		version: '1.0.0'
	};
}
