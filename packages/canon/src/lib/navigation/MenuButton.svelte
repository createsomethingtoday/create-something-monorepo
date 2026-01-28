<script lang="ts">
	/**
	 * MenuButton Component
	 *
	 * Animated hamburger menu button that transforms to X when open.
	 * 44px minimum touch target for accessibility.
	 *
	 * @example
	 * <MenuButton bind:open={menuOpen} />
	 */

	interface Props {
		/** Whether the menu is open */
		open?: boolean;
		/** Accessible label */
		label?: string;
		/** Called when clicked */
		onclick?: () => void;
	}

	let {
		open = $bindable(false),
		label = 'Menu',
		onclick
	}: Props = $props();

	function handleClick() {
		open = !open;
		onclick?.();
	}
</script>

<button
	class="menu-button"
	onclick={handleClick}
	aria-label={open ? `Close ${label}` : `Open ${label}`}
	aria-expanded={open}
>
	<span class="hamburger" class:open></span>
</button>

<style>
	.menu-button {
		display: flex;
		align-items: center;
		justify-content: center;
		background: transparent;
		border: none;
		padding: var(--space-xs, 0.5rem);
		cursor: pointer;
		width: 44px;
		height: 44px;
		border-radius: var(--radius-sm, 6px);
		transition: background var(--duration-micro, 200ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1));
	}

	.menu-button:hover {
		background: var(--color-hover, rgba(255, 255, 255, 0.05));
	}

	.menu-button:focus-visible {
		outline: 2px solid var(--color-focus, rgba(255, 255, 255, 0.5));
		outline-offset: 2px;
	}

	.hamburger {
		display: block;
		width: 18px;
		height: 2px;
		background: var(--color-fg-primary, #fff);
		position: relative;
		transition: background var(--duration-micro, 200ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1));
	}

	.hamburger::before,
	.hamburger::after {
		content: '';
		position: absolute;
		left: 0;
		width: 18px;
		height: 2px;
		background: var(--color-fg-primary, #fff);
		transition: transform var(--duration-micro, 200ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1));
	}

	.hamburger::before {
		top: -6px;
	}

	.hamburger::after {
		top: 6px;
	}

	/* Open state - X shape */
	.hamburger.open {
		background: transparent;
	}

	.hamburger.open::before {
		transform: rotate(45deg) translate(4px, 4px);
	}

	.hamburger.open::after {
		transform: rotate(-45deg) translate(4px, -4px);
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.menu-button,
		.hamburger,
		.hamburger::before,
		.hamburger::after {
			transition: none;
		}
	}
</style>
