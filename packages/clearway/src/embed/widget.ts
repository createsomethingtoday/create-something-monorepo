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

import { mount } from 'svelte';
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

	/** Stripe publishable key for in-widget checkout (optional) */
	stripePublishableKey?: string;

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
		stripePublishableKey,
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
	let widgetInstance: any;
	try {
		// Svelte 5 mount API
		widgetInstance = mount(Widget, {
			target: containerEl as HTMLElement,
			props: {
				facilitySlug: facility,
				theme,
				date: date || new Date().toISOString().split('T')[0],
				courtType,
				stripePublishableKey,
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

	// Track current date for API
	let currentDate = date || new Date().toISOString().split('T')[0];

	// Return instance API
	const instance: ClearwayInstance = {
		destroy: () => {
			// Svelte 5 uses unmount
			if (widgetInstance && typeof widgetInstance === 'object') {
				// Clean up mounted component
				containerEl.innerHTML = '';
			}
		},
		setDate: (newDate: string) => {
			currentDate = newDate;
			// Re-mount with new date (Svelte 5 reactive approach)
			if (widgetInstance) {
				instance.destroy();
				widgetInstance = mount(Widget, {
					target: containerEl as HTMLElement,
					props: {
						facilitySlug: facility,
						theme,
						date: newDate,
						courtType,
						stripePublishableKey,
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
			}
		},
		refresh: () => {
			// Refresh by remounting
			instance.setDate(currentDate);
		}
	};

	return instance;
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
