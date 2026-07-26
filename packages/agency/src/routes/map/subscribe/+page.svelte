<script lang="ts">
	import { SEO } from '@create-something/canon';
	let { data } = $props();
	let busy = $state('');
	let checkoutError = $state('');

	async function startCheckout(productId: 'map-monthly' | 'map-yearly') {
		busy = productId;
		checkoutError = '';
		try {
			const response = await fetch('/api/stripe/checkout', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ productId })
			});
			const payload = await response.json().catch(() => ({})) as { url?: string; message?: string };
			if (!response.ok || !payload.url) throw new Error(payload.message ?? 'Checkout is unavailable.');
			window.location.assign(payload.url);
		} catch (cause) {
			checkoutError = cause instanceof Error ? cause.message : 'Checkout is unavailable.';
			busy = '';
		}
	}
</script>

<SEO title="Map Subscription | CREATE SOMETHING AGENCY" description="Choose a CREATE SOMETHING Map subscription cadence." propertyName="agency" noindex={true} />

<main>
	<header><p>CREATE SOMETHING Map</p><h1>Keep the workflow definition alive.</h1><span>Account-scoped workspace · immutable history · review · share · export · Build handoff</span></header>
	{#if data.checkoutEnabled}
		<section class="plans">
			<article><p>Monthly</p><h2>Map monthly</h2><span>Recurring subscription. Cancel from the billing support path.</span><button disabled={Boolean(busy)} onclick={() => startCheckout('map-monthly')}>{busy === 'map-monthly' ? 'Opening…' : 'Continue monthly'}</button></article>
			<article><p>Yearly</p><h2>Map yearly</h2><span>Recurring subscription billed annually.</span><button disabled={Boolean(busy)} onclick={() => startCheckout('map-yearly')}>{busy === 'map-yearly' ? 'Opening…' : 'Continue yearly'}</button></article>
		</section>
	{:else}
		<section class="gate" aria-live="polite">
			<p>Commercial launch gate</p>
			<h2>Self-serve checkout is not active.</h2>
			<span>No payment can be started until commercial approval and both approved price configurations are present. Existing invited pilots keep their governed access path.</span>
			<a href="/book?source=map-commercial-gate">Talk through access</a>
		</section>
	{/if}
	{#if checkoutError}<p class="error" role="alert">{checkoutError}</p>{/if}
	<footer>Taxes, invoices, refunds, cancellations, and payment failures follow the Map commercial operations runbook. Checkout never activates from a price ID alone.</footer>
</main>

<style>
	main { max-width: 1040px; margin: 0 auto; padding: 7rem 1.5rem 5rem; color: #f5f5f5; }
	header { max-width: 800px; margin-bottom: 3rem; } header p, .gate > p, article > p { color: #a1a1aa; text-transform: uppercase; letter-spacing: .12em; font-size: .7rem; } h1 { margin: .6rem 0 1rem; font-size: clamp(2.6rem, 7vw, 5.5rem); line-height: .98; letter-spacing: -.06em; } header span, article span, .gate span, footer { color: #a1a1aa; line-height: 1.6; }
	.plans { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; } article, .gate { display: grid; gap: 1rem; padding: 2rem; border: 1px solid #27272a; border-radius: 1rem; background: #0c0c0d; } h2 { margin: 0; font-size: 1.5rem; } button, .gate a { justify-self: start; border: 0; border-radius: 999px; padding: .8rem 1.1rem; background: #fff; color: #000; font-weight: 700; text-decoration: none; cursor: pointer; } button:disabled { opacity: .5; cursor: wait; }
	.gate { border-color: #713f12; } .gate > p { color: #fbbf24; } .error { color: #fca5a5; margin-top: 1rem; } footer { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #27272a; font-size: .75rem; }
	@media (max-width: 700px) { .plans { grid-template-columns: 1fr; } article, .gate { padding: 1.25rem; } }
</style>
