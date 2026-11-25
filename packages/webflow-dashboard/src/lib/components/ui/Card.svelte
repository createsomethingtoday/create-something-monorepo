<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import type { Action } from 'svelte/action';
	import { spotlight } from '$lib/motion/actions';

	type Variant = 'default' | 'elevated' | 'glass';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		variant?: Variant;
		/** Light the border under the pointer. For summary surfaces, not lists. */
		interactive?: boolean;
		children?: Snippet;
	}

	let {
		variant = 'default',
		interactive = false,
		class: className = '',
		children,
		...restProps
	}: Props = $props();

	const track: Action<HTMLDivElement, boolean> = (node, enabled) => {
		if (!enabled) return;
		const handle = spotlight(node);
		return { destroy: () => handle?.destroy?.() };
	};
</script>

<div
	class="card card-{variant} {className}"
	class:card-interactive={interactive}
	use:track={interactive}
	{...restProps}
>
	{#if children}
		{@render children()}
	{/if}
</div>

<style>
	.card {
		border-radius: var(--radius-md);
		border: 1px solid var(--color-shell-border-default);
		background: var(--color-bg-surface);
		box-shadow: var(--card-shadow, none);
		transition:
			border-color var(--duration-micro) var(--ease-standard),
			background-color var(--duration-micro) var(--ease-standard);
	}

	.card-default {
		border-color: var(--color-shell-border-default);
	}

	.card-elevated {
		border-color: var(--color-info-border);
	}

	.card-elevated:hover {
		background: var(--color-bg-subtle);
		border-color: var(--color-info-border);
	}

	.card-glass {
		background: var(--glass-bg-strong);
		border-color: color-mix(in srgb, var(--color-info-border) 45%, var(--color-shell-border-default));
	}

	.card-glass:hover {
		background: var(--color-bg-subtle);
		border-color: var(--color-info-border);
	}

	/* Pointer light: $lib/motion `spotlight` writes --spot-x, --spot-y and --spot-o.
	   ::before lights the border nearest the pointer; ::after is a faint wash
	   under the content so the light is felt in the middle of a large card. */
	.card-interactive {
		position: relative;
		isolation: isolate;
	}

	.card-interactive::before,
	.card-interactive::after {
		content: '';
		position: absolute;
		border-radius: inherit;
		opacity: var(--spot-o, 0);
		pointer-events: none;
	}

	.card-interactive::before {
		inset: -1px;
		padding: 1px;
		background: radial-gradient(
			24rem circle at var(--spot-x, 50%) var(--spot-y, 50%),
			color-mix(in srgb, var(--color-info) 62%, transparent),
			transparent 70%
		);
		-webkit-mask:
			linear-gradient(#000 0 0) content-box,
			linear-gradient(#000 0 0);
		-webkit-mask-composite: xor;
		mask:
			linear-gradient(#000 0 0) content-box,
			linear-gradient(#000 0 0);
		mask-composite: exclude;
	}

	.card-interactive::after {
		inset: 0;
		z-index: -1;
		background: radial-gradient(
			20rem circle at var(--spot-x, 50%) var(--spot-y, 50%),
			color-mix(in srgb, var(--color-info) 3.5%, transparent),
			transparent 70%
		);
	}

	@media (prefers-reduced-motion: reduce) {
		.card {
			transition: none;
		}
	}
</style>
