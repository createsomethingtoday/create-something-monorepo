<script lang="ts">
	import { browser } from '$app/environment';
	import { Sun, Moon } from 'lucide-svelte';

	let isDark = $state(false);

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
				document.documentElement.setAttribute('data-theme', 'dark');
			} else {
				document.documentElement.removeAttribute('data-theme');
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
		background: var(--color-bg-surface);
		border: 1px solid var(--color-shell-border-default);
		border-radius: 999px;
		box-shadow: var(--shadow-sm);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.toggle-btn:hover {
		color: var(--color-fg-primary);
		border-color: var(--color-info-border);
		transform: translateY(-1px);
	}

	.toggle-btn:focus-visible {
		outline: none;
		box-shadow: 0 0 0 4px var(--color-info-muted);
	}
</style>
