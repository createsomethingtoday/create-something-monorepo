/**
 * Interaction & Friction Tracking
 *
 * Tracks user interactions: clicks, forms, rage clicks (frustration signal).
 * Philosophy: Friction points reveal opportunities for improvement.
 *
 * @packageDocumentation
 */

import type { AnalyticsClient } from './client.js';

// =============================================================================
// RAGE CLICK DETECTION
// =============================================================================

interface RageClickOptions {
	/** Number of clicks to trigger rage detection (default: 3) */
	threshold?: number;
	/** Time window in ms (default: 500) */
	timeWindow?: number;
	/** Pixel distance to consider same target (default: 50) */
	distanceThreshold?: number;
}

interface ClickRecord {
	x: number;
	y: number;
	timestamp: number;
	target: string;
}

/**
 * Creates a rage click detector.
 * Rage clicks indicate user frustration with unresponsive UI.
 */
export function createRageClickTracker(
	client: AnalyticsClient,
	options: RageClickOptions = {}
): () => void {
	if (typeof window === 'undefined') {
		return () => {};
	}

	const threshold = options.threshold ?? 3;
	const timeWindow = options.timeWindow ?? 500;
	const distanceThreshold = options.distanceThreshold ?? 50;

	const recentClicks: ClickRecord[] = [];

	function getTargetIdentifier(element: HTMLElement): string {
		// Try to get meaningful identifier
		if (element.id) return `#${element.id}`;
		if (element.getAttribute('data-testid')) {
			return `[data-testid="${element.getAttribute('data-testid')}"]`;
		}
		if (element.className && typeof element.className === 'string') {
			const classes = element.className.split(' ').slice(0, 2).join('.');
			if (classes) return `.${classes}`;
		}
		return element.tagName.toLowerCase();
	}

	function isWithinDistance(a: ClickRecord, b: ClickRecord): boolean {
		const dx = a.x - b.x;
		const dy = a.y - b.y;
		return Math.sqrt(dx * dx + dy * dy) <= distanceThreshold;
	}

	function onClick(event: MouseEvent): void {
		const now = Date.now();
		const target = event.target as HTMLElement;

		const click: ClickRecord = {
			x: event.clientX,
			y: event.clientY,
			timestamp: now,
			target: getTargetIdentifier(target),
		};

		// Remove old clicks outside time window
		while (recentClicks.length > 0 && now - recentClicks[0].timestamp > timeWindow) {
			recentClicks.shift();
		}

		recentClicks.push(click);

		// Check for rage clicks (multiple clicks in same area)
		const recentNearbyClicks = recentClicks.filter((c) => isWithinDistance(c, click));

		if (recentNearbyClicks.length >= threshold) {
			client.rageClick(click.target, recentNearbyClicks.length);
			// Clear to avoid duplicate reports
			recentClicks.length = 0;
		}
	}

	document.addEventListener('click', onClick);

	return () => {
		document.removeEventListener('click', onClick);
	};
}

// =============================================================================
// FORM TRACKING
// =============================================================================

interface FormTrackingOptions {
	/** Form selector (default: 'form') */
	selector?: string;
	/** Track field-level interactions (default: false) */
	trackFields?: boolean;
	/** Abandon timeout in ms (default: 30000) */
	abandonTimeout?: number;
}

interface FormState {
	formId: string;
	startTime: number;
	lastField: string | null;
	submitted: boolean;
}

/**
 * Creates a form interaction tracker.
 * Tracks form starts, submissions, and abandonment.
 */
export function createFormTracker(
	client: AnalyticsClient,
	options: FormTrackingOptions = {}
): () => void {
	if (typeof window === 'undefined') {
		return () => {};
	}

	const selector = options.selector ?? 'form';
	const trackFields = options.trackFields ?? false;
	const abandonTimeout = options.abandonTimeout ?? 30000;

	const formStates = new Map<string, FormState>();

	function getFormId(form: HTMLFormElement): string {
		return (
			form.id ||
			form.getAttribute('data-form-id') ||
			form.getAttribute('name') ||
			`form_${Array.from(document.querySelectorAll(selector)).indexOf(form)}`
		);
	}

	function onFocusIn(event: FocusEvent): void {
		const target = event.target as HTMLElement;
		const form = target.closest(selector) as HTMLFormElement | null;
		if (!form) return;

		const formId = getFormId(form);
		const fieldName =
			(target as HTMLInputElement).name ||
			target.id ||
			target.getAttribute('placeholder') ||
			'unknown';

		if (!formStates.has(formId)) {
			// Form interaction started
			formStates.set(formId, {
				formId,
				startTime: Date.now(),
				lastField: fieldName,
				submitted: false,
			});
			client.formStart(formId);
		} else {
			// Update last interacted field
			const state = formStates.get(formId)!;
			state.lastField = fieldName;
		}

		if (trackFields) {
			client.track('interaction', 'form_field_focus', {
				target: `${formId}:${fieldName}`,
			});
		}
	}

	function onSubmit(event: SubmitEvent): void {
		const form = event.target as HTMLFormElement;
		const formId = getFormId(form);

		const state = formStates.get(formId);
		if (state) {
			state.submitted = true;
			const timeSpent = Date.now() - state.startTime;
			client.formSubmit(formId, true);
			formStates.delete(formId);
		} else {
			// Form submitted without tracked interaction
			client.formSubmit(formId, true);
		}
	}

	// Check for abandoned forms on page unload
	function onUnload(): void {
		formStates.forEach((state, formId) => {
			if (!state.submitted) {
				const timeSpent = Date.now() - state.startTime;
				client.formAbandon(formId, state.lastField ?? undefined, timeSpent);
			}
		});
	}

	document.addEventListener('focusin', onFocusIn);
	document.addEventListener('submit', onSubmit);
	window.addEventListener('pagehide', onUnload);

	return () => {
		document.removeEventListener('focusin', onFocusIn);
		document.removeEventListener('submit', onSubmit);
		window.removeEventListener('pagehide', onUnload);
	};
}

// =============================================================================
// CTA BUTTON TRACKING
// =============================================================================

interface CTATrackingOptions {
	/** Selector for CTA buttons (default: '[data-cta], .cta, button[type="submit"]') */
	selector?: string;
}

/**
 * Creates a CTA button click tracker.
 */
export function createCTATracker(
	client: AnalyticsClient,
	options: CTATrackingOptions = {}
): () => void {
	if (typeof window === 'undefined') {
		return () => {};
	}

	const selector = options.selector ?? '[data-cta], .cta, button[type="submit"]';

	function onClick(event: MouseEvent): void {
		const target = event.target as HTMLElement;
		const cta = target.closest(selector);

		if (!cta) return;

		const ctaId =
			cta.id ||
			cta.getAttribute('data-cta') ||
			(cta as HTMLButtonElement).name ||
			cta.textContent?.trim().substring(0, 30) ||
			'unknown';

		const buttonType = cta.getAttribute('data-cta-type') as 'cta' | 'nav' | 'action' | null;

		client.buttonClick(ctaId, buttonType ?? 'cta');
	}

	document.addEventListener('click', onClick);

	return () => {
		document.removeEventListener('click', onClick);
	};
}

// =============================================================================
// ERROR TRACKING
// =============================================================================

interface ErrorTrackingOptions {
	/** Selector for error messages (default: '[role="alert"], .error, .error-message') */
	errorSelector?: string;
	/** Track validation errors (default: true) */
	trackValidation?: boolean;
}

/**
 * Creates an error display tracker.
 * Tracks when error messages are shown to users.
 */
export function createErrorTracker(
	client: AnalyticsClient,
	options: ErrorTrackingOptions = {}
): () => void {
	if (typeof window === 'undefined') {
		return () => {};
	}

	const errorSelector =
		options.errorSelector ?? '[role="alert"], .error, .error-message, [aria-invalid="true"]';
	const trackValidation = options.trackValidation ?? true;

	// Track dynamically added error elements
	const observer = new MutationObserver((mutations) => {
		for (const mutation of mutations) {
			for (const node of mutation.addedNodes) {
				if (node instanceof HTMLElement) {
					if (node.matches(errorSelector)) {
						trackError(node);
					}
					// Check children
					node.querySelectorAll(errorSelector).forEach(trackError);
				}
			}
		}
	});

	function trackError(element: Element): void {
		const message = element.textContent?.trim().substring(0, 100) || 'Unknown error';
		const errorType = element.getAttribute('data-error-type') || 'display';
		const component =
			element.closest('[data-component]')?.getAttribute('data-component') || undefined;

		client.errorDisplayed(message, errorType, component);
	}

	// Track validation errors on invalid inputs
	function onInvalid(event: Event): void {
		if (!trackValidation) return;

		const input = event.target as HTMLInputElement;
		const fieldName = input.name || input.id || 'unknown';
		const validationType = input.validity.valueMissing
			? 'required'
			: input.validity.typeMismatch
				? 'type'
				: input.validity.patternMismatch
					? 'pattern'
					: 'other';

		const formId =
			input.form?.id || input.form?.getAttribute('data-form-id') || input.form?.name || undefined;

		client.track('error', 'validation_failure', {
			target: fieldName,
			metadata: { validationType, formId },
		});
	}

	observer.observe(document.body, { childList: true, subtree: true });
	document.addEventListener('invalid', onInvalid, true);

	return () => {
		observer.disconnect();
		document.removeEventListener('invalid', onInvalid, true);
	};
}

// =============================================================================
// COMBINED INTERACTION TRACKER
// =============================================================================

export interface InteractionTrackerOptions {
	rageClick?: RageClickOptions | false;
	forms?: FormTrackingOptions | false;
	cta?: CTATrackingOptions | false;
	errors?: ErrorTrackingOptions | false;
}

/**
 * Creates a combined interaction tracker.
 */
export function createInteractionTracker(
	client: AnalyticsClient,
	options: InteractionTrackerOptions = {}
): () => void {
	const cleanupFns: Array<() => void> = [];

	if (options.rageClick !== false) {
		cleanupFns.push(createRageClickTracker(client, options.rageClick || {}));
	}

	if (options.forms !== false) {
		cleanupFns.push(createFormTracker(client, options.forms || {}));
	}

	if (options.cta !== false) {
		cleanupFns.push(createCTATracker(client, options.cta || {}));
	}

	if (options.errors !== false) {
		cleanupFns.push(createErrorTracker(client, options.errors || {}));
	}

	return () => {
		cleanupFns.forEach((fn) => fn());
	};
}
