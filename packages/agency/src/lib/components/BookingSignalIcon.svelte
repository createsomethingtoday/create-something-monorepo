<script module lang="ts">
	export type BookingSignalIconName =
		| 'handoff-map'
		| 'ownership-boundary'
		| 'decision-rules'
		| 'first-safe-path'
		| 'workflow-brief'
		| 'systems-stack'
		| 'approver-seat'
		| 'no-secrets';
</script>

<script lang="ts">
	export let name: BookingSignalIconName;
	export let title: string | undefined = undefined;
</script>

<svg
	class="booking-signal-icon booking-signal-icon--{name}"
	viewBox="0 0 24 24"
	focusable="false"
	aria-hidden={title ? undefined : 'true'}
	aria-label={title}
	role={title ? 'img' : undefined}
>
	{#if name === 'handoff-map'}
		<path d="M4 6.75 8.75 5l6.5 2.25L20 5.5v11.75L15.25 19l-6.5-2.25L4 18.5z" />
		<path d="M8.75 5v11.75M15.25 7.25V19" />
		<path d="M6.5 13.5c2.8-3.5 6.2-4.1 10.2-1.75" />
		<path d="m15.15 9.65 2.05 2.1-2.05 2.1" />
	{:else if name === 'ownership-boundary'}
		<rect x="3.5" y="6" width="6" height="12" rx="1.5" />
		<rect x="14.5" y="6" width="6" height="12" rx="1.5" />
		<path d="M12 4.5v15" />
		<path d="M6 10h1.3m-1.3 4h1.3m9.4-4H18m-1.3 4H18" />
		<path d="M10.25 9.25 12 7.5l1.75 1.75M10.25 14.75 12 16.5l1.75-1.75" />
	{:else if name === 'decision-rules'}
		<path d="M12 3.75 19.25 11 12 18.25 4.75 11 12 3.75Z" />
		<path d="m9 11 1.9 1.9L15.4 8.5" />
		<path d="M12 18.25v2.5M4.75 11H2.5m19 0h-2.25" />
	{:else if name === 'first-safe-path'}
		<path d="M4.5 17.5h4.2a3 3 0 0 0 3-3v-5a3 3 0 0 1 3-3h4.8" />
		<path d="m17.25 4.25 2.5 2.25-2.5 2.25" />
		<path d="M5.5 13.5h3.2" />
		<path d="m14.75 17.25 1.65 1.65 3.35-3.65" />
	{:else if name === 'workflow-brief'}
		<path d="M6 3.5h8.25L18 7.25V20.5H6z" />
		<path d="M14 3.5v4h4" />
		<path d="M9 11h5.5M9 14.5h2.2m2.6 0H16M9 18h4" />
	{:else if name === 'systems-stack'}
		<rect x="3.5" y="5" width="5.5" height="5.5" rx="1.2" />
		<rect x="15" y="5" width="5.5" height="5.5" rx="1.2" />
		<rect x="9.25" y="14.25" width="5.5" height="5.5" rx="1.2" />
		<path d="M9 7.75h6M6.25 10.5V12h11.5v-1.5M12 12v2.25" />
	{:else if name === 'approver-seat'}
		<circle cx="8.5" cy="7.75" r="2.75" />
		<path d="M3.75 18.75a4.75 4.75 0 0 1 9.5 0" />
		<circle cx="17" cy="16.5" r="3.75" />
		<path d="m15.45 16.45 1.05 1.1 2.1-2.25" />
	{:else}
		<rect x="5.5" y="10" width="13" height="10" rx="2" />
		<path d="M8.5 10V7.6a3.5 3.5 0 0 1 6.15-2.3" />
		<path d="M12 14.1v2.1" />
		<path d="M5 5 19 19" />
	{/if}
</svg>

<style>
	.booking-signal-icon {
		width: var(--booking-signal-icon-size, 2.25rem);
		height: var(--booking-signal-icon-size, 2.25rem);
		overflow: visible;
		fill: none;
		color: var(--booking-signal-icon-color, rgba(232, 237, 255, 0.68));
		stroke: currentColor;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 1.18;
		vector-effect: non-scaling-stroke;
		filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.08));
	}

	.booking-signal-icon--ownership-boundary,
	.booking-signal-icon--systems-stack {
		color: var(--booking-signal-icon-color, rgba(238, 242, 255, 0.7));
	}

	.booking-signal-icon--decision-rules,
	.booking-signal-icon--approver-seat {
		color: var(--booking-signal-icon-color, rgba(225, 231, 255, 0.68));
	}

	.booking-signal-icon--first-safe-path,
	.booking-signal-icon--no-secrets {
		color: var(--booking-signal-icon-color, rgba(226, 232, 240, 0.7));
	}
</style>
