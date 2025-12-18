/**
 * Accessibility Actions
 *
 * Svelte actions for keyboard accessibility patterns.
 * Following WAI-ARIA best practices for interactive elements.
 */

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

	node.addEventListener('keydown', handleKeydown);

	return {
		update(newOptions: KeyboardClickOptions) {
			currentOptions = {
				preventDefault: true,
				stopPropagation: false,
				...newOptions
			};
		},
		destroy() {
			node.removeEventListener('keydown', handleKeydown);
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

	node.addEventListener('keydown', handleKeydown);

	return {
		update(newOptions: KeyboardToggleOptions) {
			currentOptions = newOptions;
		},
		destroy() {
			node.removeEventListener('keydown', handleKeydown);
		}
	};
}
