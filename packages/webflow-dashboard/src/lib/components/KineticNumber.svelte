<script lang="ts">
	import { countUp } from '$lib/motion/actions';

	interface Props {
		value: number;
		precision?: number;
		prefix?: string;
		suffix?: string;
	}

	let { value, precision = 0, prefix = '', suffix = '' }: Props = $props();

	function format(current: number): string {
		const number = precision === 0 ? Math.round(current).toLocaleString() : current.toFixed(precision);
		return `${prefix}${number}${suffix}`;
	}
</script>

<!-- Always shows the real value; it tweens only when the value changes. -->
<span class="kinetic-number" use:countUp={{ value, format }}>{format(value)}</span>

<style>
	.kinetic-number {
		font-variant-numeric: tabular-nums;
		display: inline-block;
	}
</style>
