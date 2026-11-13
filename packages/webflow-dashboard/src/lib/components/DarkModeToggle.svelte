<script lang="ts">
	import { Sun, Moon } from 'lucide-svelte';
	import {
		applyTheme,
		getStoredTheme,
		onSystemThemeChange,
		persistTheme,
		resolveTheme
	} from '$lib/utils/theme';

	import { gsap, motionOK } from '$lib/motion/core';
	import { press } from '$lib/motion/actions';

	let isDark = $state(false);
	let iconEl = $state<HTMLElement | null>(null);

	$effect(() => {
		// The app.html bootstrap script has already applied the theme to <html>;
		// sync component state with the DOM rather than re-deriving it.
		isDark =
			document.documentElement.getAttribute('data-theme') === 'dark' ||
			resolveTheme() === 'dark';
		applyTheme(isDark ? 'dark' : 'light');

		// Follow OS changes only while no explicit preference is stored.
		return onSystemThemeChange((theme) => {
			if (getStoredTheme() !== null) return;
			isDark = theme === 'dark';
			applyTheme(theme);
		});
	});

	function toggle() {
		isDark = !isDark;
		const theme = isDark ? 'dark' : 'light';
		applyTheme(theme);
		persistTheme(theme);

		// The new icon turns into place, like a dial clicking over.
		if (iconEl && motionOK()) {
			gsap.fromTo(
				iconEl,
				{ rotation: isDark ? -90 : 90, scale: 0.5, opacity: 0 },
				{ rotation: 0, scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(1.8)', clearProps: 'all' }
			);
		}
	}
</script>

<button
	type="button"
	class="toggle-btn"
	use:press
	onclick={toggle}
	aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
>
	<span class="toggle-icon" bind:this={iconEl}>
		{#if isDark}
			<Sun size={20} />
		{:else}
			<Moon size={20} />
		{/if}
	</span>
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

	.toggle-icon {
		display: inline-flex;
	}

	.toggle-btn:hover {
		color: var(--color-fg-primary);
		border-color: var(--color-info-border);
	}

	.toggle-btn:focus-visible {
		outline: none;
		box-shadow: 0 0 0 4px var(--color-info-muted);
	}
</style>
