/**
 * Interaction Patterns
 *
 * Motion and feedback that serves function, not decoration.
 *
 * @principle Animation should explain, not entertain.
 */

/**
 * Hover State Pattern
 *
 * Subtle acknowledgment of interactivity.
 */
export const hoverPattern = {
	name: 'Hover State',
	principles: [
		'Subtle, not dramatic',
		'Consistent across similar elements',
		'Color change OR transform, rarely both',
		'Transition duration: 200ms (micro)'
	],
	techniques: {
		opacity: 'Increase from 0.8 to 1',
		background: 'Subtle background color shift',
		transform: 'translateY(-2px) for lift effect',
		border: 'Border color emphasis'
	},
	css: {
		transition: 'transition: all var(--duration-micro) var(--ease-standard)',
		transform: 'transform: translateY(-2px)',
		opacity: 'opacity: 1'
	},
	accessibility: [
		'Never rely solely on hover for information',
		'Provide focus states that match hover',
		'Consider touch devices (no hover)'
	]
} as const;

/**
 * Focus State Pattern
 *
 * Clear indication of keyboard focus.
 */
export const focusPattern = {
	name: 'Focus State',
	principles: [
		'Visible focus ring (not outline: none)',
		'Consistent across all interactive elements',
		'High contrast for visibility',
		'Use :focus-visible for keyboard-only'
	],
	css: {
		ring: `
      outline: 2px solid var(--color-fg-primary);
      outline-offset: 2px;
    `,
		focusVisible: `
      &:focus-visible {
        outline: 2px solid var(--color-fg-primary);
        outline-offset: 2px;
      }
    `
	},
	accessibility: [
		'Focus ring must have 3:1 contrast ratio',
		'Focus order follows visual order',
		'No focus traps (except modals)'
	]
} as const;

/**
 * Click/Press Pattern
 *
 * Immediate feedback on interaction.
 */
export const pressPattern = {
	name: 'Press State',
	principles: [
		'Immediate visual feedback',
		'Subtle scale or color change',
		'No delay—instant response',
		'Return to normal on release'
	],
	css: {
		scale: `
      &:active {
        transform: scale(0.98);
      }
    `,
		background: `
      &:active {
        background-color: var(--color-active);
      }
    `
	}
} as const;

/**
 * Loading State Pattern
 *
 * Clear indication something is happening.
 */
export const loadingPattern = {
	name: 'Loading State',
	principles: [
		'Show immediately if operation > 100ms',
		'Use spinner for unknown duration',
		'Use progress bar for known duration',
		'Maintain layout to prevent jumps'
	],
	techniques: {
		spinner: 'Rotating icon, centered',
		skeleton: 'Pulsing placeholder shapes',
		progressBar: 'Horizontal bar with fill animation',
		overlay: 'Semi-transparent overlay with spinner'
	},
	css: {
		spinner: `
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      animation: spin 1s linear infinite;
    `,
		skeleton: `
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
      animation: pulse 2s ease-in-out infinite;
    `
	},
	accessibility: [
		'aria-busy="true" on loading container',
		'aria-live="polite" for status updates',
		'Screen reader announcement on complete'
	]
} as const;

/**
 * Transition Pattern
 *
 * Smooth state changes.
 */
export const transitionPattern = {
	name: 'Transitions',
	principles: [
		'Fast for micro-interactions (200ms)',
		'Medium for standard changes (300ms)',
		'Slow for complex/large changes (500ms)',
		'Ease-out for entering, ease-in for exiting'
	],
	durations: {
		micro: '200ms', // Hover, focus, small changes
		standard: '300ms', // Color, opacity, simple transforms
		complex: '500ms' // Layout changes, slides, modals
	},
	easings: {
		standard: 'cubic-bezier(0.4, 0, 0.2, 1)', // Material Design
		enter: 'cubic-bezier(0, 0, 0.2, 1)', // Ease-out
		exit: 'cubic-bezier(0.4, 0, 1, 1)' // Ease-in
	},
	reducedMotion: `
    @media (prefers-reduced-motion: reduce) {
      transition: none;
      animation: none;
    }
  `
} as const;

/**
 * Modal Pattern
 *
 * Focused interaction overlay.
 */
export const modalPattern = {
	name: 'Modal',
	principles: [
		'Backdrop dims background',
		'Centered content',
		'Close button obvious',
		'Focus trapped within modal'
	],
	animation: {
		enter: 'Fade in backdrop, scale up content',
		exit: 'Fade out backdrop, scale down content'
	},
	css: {
		backdrop: `
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      justify-content: center;
      align-items: center;
    `,
		content: `
      background: var(--color-bg-surface);
      border-radius: var(--radius-lg);
      padding: var(--space-lg);
      max-width: 90vw;
      max-height: 90vh;
      overflow: auto;
    `
	},
	accessibility: [
		'role="dialog" and aria-modal="true"',
		'Focus trapped within modal',
		'Escape key closes modal',
		'Return focus to trigger on close',
		'Body scroll locked when open'
	]
} as const;

/**
 * Toast/Notification Pattern
 *
 * Brief, non-blocking feedback.
 */
export const toastPattern = {
	name: 'Toast Notification',
	principles: [
		'Appears in consistent location (top-right or bottom)',
		'Auto-dismisses after 3-5 seconds',
		'Can be manually dismissed',
		'Stacks if multiple'
	],
	types: {
		success: 'Green accent, checkmark icon',
		error: 'Red accent, X icon',
		warning: 'Yellow accent, warning icon',
		info: 'Blue accent, info icon'
	},
	animation: {
		enter: 'Slide in from edge, fade in',
		exit: 'Slide out to edge, fade out'
	},
	accessibility: [
		'role="alert" for important messages',
		'aria-live="polite" for non-urgent',
		'Pausable on hover for reading time'
	]
} as const;

export const interactionPatterns = {
	hover: hoverPattern,
	focus: focusPattern,
	press: pressPattern,
	loading: loadingPattern,
	transition: transitionPattern,
	modal: modalPattern,
	toast: toastPattern
} as const;
