<script lang="ts">
	import { page } from '$app/stores';
	import { onMount, onDestroy } from 'svelte';
	import {
		initAnalytics,
		getAnalytics,
		createEngagementTracker,
		createInteractionTracker,
		type Property,
		type AnalyticsConfig,
	} from '../analytics/index.js';

	// Props
	interface Props {
		/** Property identifier */
		property?: Property;
		/** API endpoint (default: /api/analytics/events) */
		endpoint?: string;
		/** Enable scroll depth tracking */
		trackScrollDepth?: boolean;
		/** Enable time on page tracking */
		trackTimeOnPage?: boolean;
		/** Enable content copy tracking */
		trackCopy?: boolean;
		/** Enable rage click detection */
		trackRageClicks?: boolean;
		/** Enable form tracking */
		trackForms?: boolean;
		/** Enable error tracking */
		trackErrors?: boolean;
		/** Enable debug logging */
		debug?: boolean;
		/** User has opted out of analytics tracking (from profile) */
		userOptedOut?: boolean;
		/** Authenticated user ID for cross-property tracking */
		userId?: string;
	}

	let {
		property = 'io',
		endpoint = '/api/analytics/events',
		trackScrollDepth = true,
		trackTimeOnPage = true,
		trackCopy = true,
		trackRageClicks = true,
		trackForms = true,
		trackErrors = true,
		debug = false,
		userOptedOut = false,
		userId = undefined,
	}: Props = $props();

	let cleanupFns: Array<() => void> = [];
	let lastPath = '';

	onMount(() => {
		// Initialize analytics client
		const config: AnalyticsConfig = {
			property,
			endpoint,
			debug,
			userOptedOut,
			userId,
		};

		const client = initAnalytics(config);

		// Track initial page view
		client.pageView({ title: document.title });
		lastPath = $page.url.pathname;

		// Set up engagement tracking
		if (trackScrollDepth || trackTimeOnPage || trackCopy) {
			const cleanup = createEngagementTracker(client, {
				scroll: trackScrollDepth ? {} : false,
				time: trackTimeOnPage ? {} : false,
				copy: trackCopy,
				links: { contentSelector: 'main, article, .content' },
			});
			cleanupFns.push(cleanup);
		}

		// Set up interaction tracking
		if (trackRageClicks || trackForms || trackErrors) {
			const cleanup = createInteractionTracker(client, {
				rageClick: trackRageClicks ? {} : false,
				forms: trackForms ? {} : false,
				cta: true, // Always track CTAs
				errors: trackErrors ? {} : false,
			});
			cleanupFns.push(cleanup);
		}

		// Expose tracking API globally for backward compatibility
		if (typeof window !== 'undefined') {
			(window as unknown as { trackEvent: typeof trackEvent }).trackEvent = trackEvent;
			(window as unknown as { analytics: typeof client }).analytics = client;
		}
	});

	onDestroy(() => {
		// Flush any pending events
		const client = getAnalytics();
		client?.flush();

		// Clean up trackers
		cleanupFns.forEach((fn) => fn());
		cleanupFns = [];
	});

	// Track route changes
	$effect(() => {
		const currentPath = $page.url.pathname;
		if (currentPath && currentPath !== lastPath) {
			const client = getAnalytics();
			if (client) {
				client.routeChange(lastPath, currentPath);
				client.pageView({ title: document.title });
			}
			lastPath = currentPath;
		}
	});

	// Update opt-out status when prop changes
	$effect(() => {
		const client = getAnalytics();
		if (client) {
			client.setUserOptOut(userOptedOut);
		}
	});

	// Update user ID when prop changes (login/logout)
	$effect(() => {
		const client = getAnalytics();
		if (client) {
			client.setUserId(userId ?? null);
		}
	});

	/**
	 * Track a custom event (backward compatible API)
	 */
	function trackEvent(
		event_type: string,
		data: Record<string, unknown> = {}
	): void {
		const client = getAnalytics();
		if (!client) return;

		// Map legacy event_type to category/action
		const [category, action] = mapLegacyEventType(event_type);

		client.track(category, action, {
			target: data.target as string | undefined,
			value: data.value as number | undefined,
			metadata: data,
		});
	}

	/**
	 * Map legacy event types to category/action pairs
	 */
	function mapLegacyEventType(
		eventType: string
	): [
		'navigation' | 'interaction' | 'search' | 'content' | 'conversion' | 'error' | 'performance',
		string,
	] {
		// Common legacy mappings
		const mappings: Record<string, [string, string]> = {
			page_view: ['navigation', 'page_view'],
			click: ['interaction', 'button_click'],
			form_submit: ['interaction', 'form_submit'],
			search: ['search', 'search_query'],
			signup: ['conversion', 'signup'],
			deploy: ['conversion', 'deploy'],
			error: ['error', 'error_displayed'],
		};

		const mapped = mappings[eventType.toLowerCase()];
		if (mapped) {
			return mapped as [
				'navigation' | 'interaction' | 'search' | 'content' | 'conversion' | 'error' | 'performance',
				string,
			];
		}

		// Default to interaction category for unknown event types
		return ['interaction', eventType];
	}
</script>
