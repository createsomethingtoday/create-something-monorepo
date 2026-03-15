/**
 * Accessibility Actions
 *
 * Svelte actions for keyboard accessibility patterns.
 * Following WAI-ARIA best practices for interactive elements.
 */

// Focusable element selectors for focus trapping
const FOCUSABLE_SELECTORS = [
	'a[href]',
	'button:not([disabled])',
	'input:not([disabled])',
	'select:not([disabled])',
	'textarea:not([disabled])',
	'[tabindex]:not([tabindex="-1"])',
	'[contenteditable="true"]'
].join(', ');

/**
 * Options for the keyboardClick action
 */
export interface KeyboardClickOptions {
	/**
	 * Callback fired on Enter or Space key press
	 * If not provided, the action will dispatch a click event on the element
	 */
	onclick?: () => void;

	/**
	 * Callback fired on Escape key press (for dismissal)
	 */
	onEscape?: () => void;

	/**
	 * Whether to prevent default behavior on Enter/Space
	 * @default true
	 */
	preventDefault?: boolean;

	/**
	 * Whether to stop propagation on handled keys
	 * @default false
	 */
	stopPropagation?: boolean;
}

/**
 * Svelte action for keyboard click accessibility.
 *
 * Makes elements keyboard-accessible by handling:
 * - Enter key: triggers click/activation
 * - Space key: triggers click/activation (with scroll prevention)
 * - Escape key: triggers dismissal callback
 *
 * Usage:
 * ```svelte
 * <div
 *   use:keyboardClick={{ onclick: handleClick, onEscape: handleDismiss }}
 *   role="button"
 *   tabindex="0"
 * >
 *   Clickable content
 * </div>
 * ```
 *
 * Or with simpler syntax when you just want to fire a click event:
 * ```svelte
 * <div use:keyboardClick role="button" tabindex="0" onclick={handleClick}>
 *   Clickable content
 * </div>
 * ```
 *
 * Works with both HTML and SVG elements.
 */
export function keyboardClick(
	node: HTMLElement | SVGElement,
	options: KeyboardClickOptions = {}
): { update: (options: KeyboardClickOptions) => void; destroy: () => void } {
	let currentOptions = {
		preventDefault: true,
		stopPropagation: false,
		...options
	};

	function handleKeydown(event: KeyboardEvent) {
		const { key } = event;

		// Handle Enter or Space for click activation
		if (key === 'Enter' || key === ' ') {
			if (currentOptions.preventDefault) {
				event.preventDefault();
			}
			if (currentOptions.stopPropagation) {
				event.stopPropagation();
			}

			if (currentOptions.onclick) {
				currentOptions.onclick();
			} else {
				// Dispatch a click event if no callback provided
				// SVG elements may not have .click() method, so dispatch synthetic event
				if ('click' in node && typeof (node as HTMLElement).click === 'function') {
					(node as HTMLElement).click();
				} else {
					node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
				}
			}
			return;
		}

		// Handle Escape for dismissal
		if (key === 'Escape' && currentOptions.onEscape) {
			if (currentOptions.preventDefault) {
				event.preventDefault();
			}
			if (currentOptions.stopPropagation) {
				event.stopPropagation();
			}
			currentOptions.onEscape();
		}
	}

	node.addEventListener('keydown', handleKeydown as EventListener);

	return {
		update(newOptions: KeyboardClickOptions) {
			currentOptions = {
				preventDefault: true,
				stopPropagation: false,
				...newOptions
			};
		},
		destroy() {
			node.removeEventListener('keydown', handleKeydown as EventListener);
		}
	};
}

/**
 * Options for the keyboardToggle action
 */
export interface KeyboardToggleOptions {
	/**
	 * Current toggle state
	 */
	pressed: boolean;

	/**
	 * Callback fired when toggle state should change
	 */
	onToggle: (pressed: boolean) => void;

	/**
	 * Callback fired on Escape key press (for dismissal)
	 */
	onEscape?: () => void;
}

/**
 * Svelte action for keyboard toggle accessibility.
 *
 * Specialized variant for toggle buttons that need to manage pressed state.
 * Handles Enter/Space to toggle and Escape to dismiss.
 *
 * Usage:
 * ```svelte
 * <div
 *   use:keyboardToggle={{ pressed: isActive, onToggle: (v) => isActive = v }}
 *   role="button"
 *   tabindex="0"
 *   aria-pressed={isActive}
 * >
 *   Toggle content
 * </div>
 * ```
 *
 * Works with both HTML and SVG elements.
 */
export function keyboardToggle(
	node: HTMLElement | SVGElement,
	options: KeyboardToggleOptions
): { update: (options: KeyboardToggleOptions) => void; destroy: () => void } {
	let currentOptions = options;

	function handleKeydown(event: KeyboardEvent) {
		const { key } = event;

		// Handle Enter or Space for toggle
		if (key === 'Enter' || key === ' ') {
			event.preventDefault();
			currentOptions.onToggle(!currentOptions.pressed);
			return;
		}

		// Handle Escape for dismissal
		if (key === 'Escape' && currentOptions.onEscape) {
			event.preventDefault();
			currentOptions.onEscape();
		}
	}

	node.addEventListener('keydown', handleKeydown as EventListener);

	return {
		update(newOptions: KeyboardToggleOptions) {
			currentOptions = newOptions;
		},
		destroy() {
			node.removeEventListener('keydown', handleKeydown as EventListener);
		}
	};
}

/**
 * Options for the focusTrap action
 */
export interface FocusTrapOptions {
	/**
	 * Whether the focus trap is currently active
	 * @default true
	 */
	active?: boolean;

	/**
	 * Element to receive initial focus when trap activates
	 * If not provided, focuses the first focusable element
	 */
	initialFocus?: HTMLElement | null;

	/**
	 * Element to return focus to when trap deactivates
	 * If not provided, returns focus to document.activeElement at mount time
	 */
	returnFocusTo?: HTMLElement | null;

	/**
	 * Callback fired when Escape is pressed
	 */
	onEscape?: () => void;
}

/**
 * Svelte action for modal focus trapping.
 *
 * Traps keyboard focus within a container, cycling through focusable elements.
 * Essential for modal dialogs to meet WCAG 2.4.3 (Focus Order).
 *
 * Features:
 * - Traps Tab and Shift+Tab within container
 * - Auto-focuses first focusable element (or specified initialFocus)
 * - Returns focus to trigger element on deactivation
 * - Handles Escape key for dismissal
 *
 * Usage:
 * ```svelte
 * <div
 *   use:focusTrap={{ active: isOpen, onEscape: closeModal }}
 *   role="dialog"
 *   aria-modal="true"
 * >
 *   <button>First focusable</button>
 *   <input type="text" />
 *   <button>Last focusable</button>
 * </div>
 * ```
 *
 * With explicit return focus element:
 * ```svelte
 * <button bind:this={triggerEl} onclick={openModal}>Open</button>
 * <div use:focusTrap={{ active: isOpen, returnFocusTo: triggerEl }}>
 *   ...
 * </div>
 * ```
 */
export function focusTrap(
	node: HTMLElement,
	options: FocusTrapOptions = {}
): { update: (options: FocusTrapOptions) => void; destroy: () => void } {
	let currentOptions: FocusTrapOptions = {
		active: true,
		...options
	};

	// Store the element that had focus before trap activated
	let previouslyFocusedElement: HTMLElement | null =
		currentOptions.returnFocusTo ?? (document.activeElement as HTMLElement);

	function getFocusableElements(): HTMLElement[] {
		const elements = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS));
		// Filter out elements that are not visible
		return elements.filter((el) => {
			return el.offsetParent !== null && !el.hasAttribute('inert');
		});
	}

	function handleKeydown(event: KeyboardEvent) {
		if (!currentOptions.active) return;

		// Handle Escape
		if (event.key === 'Escape' && currentOptions.onEscape) {
			event.preventDefault();
			currentOptions.onEscape();
			return;
		}

		// Handle Tab key for focus trapping
		if (event.key === 'Tab') {
			const focusableElements = getFocusableElements();
			if (focusableElements.length === 0) return;

			const firstElement = focusableElements[0];
			const lastElement = focusableElements[focusableElements.length - 1];

			// Shift+Tab on first element -> go to last
			if (event.shiftKey && document.activeElement === firstElement) {
				event.preventDefault();
				lastElement.focus();
				return;
			}

			// Tab on last element -> go to first
			if (!event.shiftKey && document.activeElement === lastElement) {
				event.preventDefault();
				firstElement.focus();
				return;
			}

			// If focus is outside the trap (shouldn't happen, but safety), refocus
			if (!focusableElements.includes(document.activeElement as HTMLElement)) {
				event.preventDefault();
				firstElement.focus();
			}
		}
	}

	function activate() {
		if (!currentOptions.active) return;

		// Store current focus for later restoration
		previouslyFocusedElement =
			currentOptions.returnFocusTo ?? (document.activeElement as HTMLElement);

		// Focus initial element or first focusable
		requestAnimationFrame(() => {
			if (currentOptions.initialFocus) {
				currentOptions.initialFocus.focus();
			} else {
				const focusableElements = getFocusableElements();
				if (focusableElements.length > 0) {
					focusableElements[0].focus();
				} else {
					// If no focusable elements, focus the container itself
					node.setAttribute('tabindex', '-1');
					node.focus();
				}
			}
		});
	}

	function deactivate() {
		// Return focus to the element that had focus before
		if (previouslyFocusedElement && typeof previouslyFocusedElement.focus === 'function') {
			previouslyFocusedElement.focus();
		}
	}

	// Initialize
	node.addEventListener('keydown', handleKeydown as EventListener);
	if (currentOptions.active) {
		activate();
	}

	return {
		update(newOptions: FocusTrapOptions) {
			const wasActive = currentOptions.active;
			currentOptions = {
				active: true,
				...newOptions
			};

			// Handle activation/deactivation transitions
			if (!wasActive && currentOptions.active) {
				activate();
			} else if (wasActive && !currentOptions.active) {
				deactivate();
			}

			// Update return focus target if provided
			if (newOptions.returnFocusTo) {
				previouslyFocusedElement = newOptions.returnFocusTo;
			}
		},
		destroy() {
			node.removeEventListener('keydown', handleKeydown as EventListener);
			if (currentOptions.active) {
				deactivate();
			}
		}
	};
}
