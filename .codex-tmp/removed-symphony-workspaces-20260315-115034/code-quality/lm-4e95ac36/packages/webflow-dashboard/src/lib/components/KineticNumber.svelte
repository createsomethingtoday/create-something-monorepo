<script lang="ts">
	import { onMount } from 'svelte';
	import { spring } from 'svelte/motion';

	interface Props {
		value: number;
		duration?: number;
		precision?: number;
		prefix?: string;
		suffix?: string;
	}

	let {
		value,
		duration = 1000,
		precision = 0,
		prefix = '',
		suffix = ''
	}: Props = $props();

	// Spring animation for smooth kinetic effect
	const displayed = spring(0, {
		stiffness: 0.1,
		damping: 0.25
	});

	// Update displayed value when prop changes
	$effect(() => {
		displayed.set(value);
	});

	// Format the displayed number
	const formattedValue = $derived(() => {
		const val = $displayed;
		if (precision === 0) {
			return Math.round(val).toLocaleString();
		}
		return val.toFixed(precision);
	});
</script>

<span class="kinetic-number">
	{#if prefix}{prefix}{/if}{formattedValue()}{#if suffix}{suffix}{/if}
</span>

<style>
	.kinetic-number {
		font-variant-numeric: tabular-nums;
		display: inline-block;
	}

	@media (prefers-reduced-motion: reduce) {
		.kinetic-number {
			/* Disable spring animation for reduced motion users */
			transition: none;
		}
	}
</style>
