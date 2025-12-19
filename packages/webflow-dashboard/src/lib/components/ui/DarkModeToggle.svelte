<script lang="ts">
	import { browser } from '$app/environment';
	import { Sun, Moon } from 'lucide-svelte';
	import Button from './Button.svelte';

	let isDarkMode = $state(false);

	$effect(() => {
		if (browser) {
			const stored = localStorage.getItem('theme');
			const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
			isDarkMode = stored === 'dark' || (!stored && prefersDark);
			updateTheme(isDarkMode);
		}
	});

	function toggle() {
		isDarkMode = !isDarkMode;
		updateTheme(isDarkMode);
		if (browser) {
			localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
		}
	}

	function updateTheme(dark: boolean) {
		if (browser) {
			document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
		}
	}
</script>

<Button variant="ghost" size="icon" onclick={toggle} aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}>
	{#if isDarkMode}
		<Moon size={18} />
	{:else}
		<Sun size={18} />
	{/if}
</Button>
