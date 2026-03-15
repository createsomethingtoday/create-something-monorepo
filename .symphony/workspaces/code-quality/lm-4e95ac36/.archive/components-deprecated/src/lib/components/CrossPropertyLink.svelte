<script lang="ts">
	/**
	 * CrossPropertyLink - Hermeneutic Navigation Between Properties
	 *
	 * Wraps links to other CREATE Something properties with exit/entry
	 * animations that make the Mode of Being shift visible.
	 *
	 * Usage:
	 * <CrossPropertyLink href="https://createsomething.ltd" from="io">
	 *   Visit Canon
	 * </CrossPropertyLink>
	 */
	import type { Snippet } from 'svelte';

	type Mode = 'ltd' | 'io' | 'space' | 'agency';

	interface Props {
		href: string;
		from: Mode;
		class?: string;
		children: Snippet;
	}

	let { href, from, class: className = '', children }: Props = $props();

	/**
	 * Extract mode from URL
	 */
	function extractMode(url: string): Mode | null {
		if (url.includes('createsomething.ltd')) return 'ltd';
		if (url.includes('createsomething.io')) return 'io';
		if (url.includes('createsomething.space')) return 'space';
		if (url.includes('createsomething.agency')) return 'agency';
		return null;
	}

	const targetMode = extractMode(href);
	const isCrossProperty = targetMode !== null && targetMode !== from;

	function handleClick(e: MouseEvent) {
		if (!isCrossProperty) return;

		e.preventDefault();

		// Store transition data
		if (typeof sessionStorage !== 'undefined' && targetMode) {
			sessionStorage.setItem('cs-transition-from', from);
			sessionStorage.setItem('cs-transition-to', targetMode);
			sessionStorage.setItem('cs-transition-time', Date.now().toString());
		}

		// Add exit animation class
		document.body.classList.add('transitioning-out');

		// Navigate after animation
		setTimeout(() => {
			window.location.href = href;
		}, 300);
	}
</script>

<a {href} class={className} onclick={handleClick}>
	{@render children()}
</a>
