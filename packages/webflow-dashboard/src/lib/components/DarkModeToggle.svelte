<script lang="ts">
	import { browser } from '$app/environment';
	import { Sun, Moon } from 'lucide-svelte';

	// Default to dark mode (dark is default, no attribute needed)
	let isDark = $state(true);

	// Initialize from localStorage or system preference
	$effect(() => {
		if (browser) {
			const stored = localStorage.getItem('theme');
			if (stored) {
				isDark = stored === 'dark';
			} else {
				// Default to system preference, but default to dark if no preference
				isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
			}
			updateTheme();
		}
	});

	function updateTheme() {
		if (browser) {
			if (isDark) {
				// Dark mode is default - remove attribute
				document.documentElement.removeAttribute('data-theme');
			} else {
				// Light mode - set data-theme attribute
				document.documentElement.setAttribute('data-theme', 'light');
			}
			localStorage.setItem('theme', isDark ? 'dark' : 'light');
		}
	}

	function toggle() {
		isDark = !isDark;
		updateTheme();
	}
</script>

<button
	type="button"
	class="toggle-btn"
	onclick={toggle}
	aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
>
	{#if isDark}
		<Sun size={20} />
	{:else}
		<Moon size={20} />
	{/if}
</button>

<style>
	.toggle-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.25rem;
		height: 2.25rem;
		padding: 0;
		color: var(--color-fg-secondary);
		background: transparent;
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.toggle-btn:hover {
		color: var(--color-fg-primary);
		border-color: var(--color-border-emphasis);
	}

	.toggle-btn:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}
</style>
