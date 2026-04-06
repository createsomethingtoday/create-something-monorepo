<script lang="ts">
	import { dev } from '$app/environment';
	import '../app.css';

	export let error: App.Error;
	export let status: number;

	$: detail = error?.message ?? 'An unexpected error interrupted the Abundance workflow.';
	$: isAccessDenied = status === 403;
	$: isMissingSecret = status === 500 && detail.includes('signing secret');
	$: isNotFound = status === 404;
	$: eyebrow = isAccessDenied
		? 'Verification Needed'
		: isMissingSecret
			? 'Secure Steps Unavailable'
			: isNotFound
				? 'Page Unavailable'
				: 'Temporary Problem';
	$: pageTitle = isAccessDenied
		? 'Verify to continue'
		: isMissingSecret
			? 'Secure intake is temporarily unavailable'
			: isNotFound
				? 'That page is not available'
				: 'Something interrupted the application';
	$: lead = isAccessDenied
		? 'Return to your application and complete the one-time email verification step there before retrying this protected page.'
		: isMissingSecret
			? 'The application is reachable, but secure steps are temporarily offline. Please try again shortly.'
			: isNotFound
				? 'This page is not active for the current application state.'
				: 'The application hit an unexpected problem before the conversation could continue.';
	$: primaryHref = isNotFound ? '/apply' : '/apply';
	$: primaryLabel = isAccessDenied
		? 'Continue application'
		: isNotFound
			? 'Start application'
			: 'Open application';
	$: secondaryHref = '/';
	$: secondaryLabel = 'Return home';
</script>

<svelte:head>
	<title>{pageTitle} · Abundance Concierge</title>
</svelte:head>

<div class="error-shell">
	<section class="error-card glass">
		<div class="error-top">
			<div class="eyebrow">{eyebrow}</div>
			<span class={`status-pill ${status >= 500 ? 'danger' : status === 403 ? 'warn' : ''}`}>
				{status}
			</span>
		</div>

		<h1 class="page-title">{pageTitle}</h1>
		<p class="error-lead">{lead}</p>

		{#if dev}
			<section class="error-detail">
				<div class="eyebrow">Technical detail</div>
				<p>{detail}</p>
			</section>
		{/if}

		<div class="error-actions">
			<a class="cta-link primary" href={primaryHref}>{primaryLabel}</a>
			<a class="cta-link secondary" href={secondaryHref}>{secondaryLabel}</a>
		</div>

		<div class="error-grid">
			<article class="error-note glass">
				<div class="eyebrow">What to do next</div>
				<p>
					{#if isAccessDenied}
						Open your application, finish verification there, and then retry this step.
					{:else if isNotFound}
						Return to the application and continue from the main chat thread instead of this direct route.
					{:else}
						Return to the application and try the step again. If it still fails, start again from the home page.
					{/if}
				</p>
			</article>

			<article class="error-note glass">
				<div class="eyebrow">For staff</div>
				<p>Internal team members can use Staff sign-in from the home page if they need the control plane.</p>
			</article>
		</div>
	</section>
</div>

<style>
	.error-shell {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1.5rem;
	}

	.error-card {
		width: min(960px, 100%);
		padding: 1.4rem;
		display: grid;
		gap: 1.25rem;
	}

	.error-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.error-lead {
		margin: 0;
		max-width: 44rem;
		font-size: 1.02rem;
		color: var(--muted-strong);
	}

	.error-detail {
		display: grid;
		gap: 0.7rem;
		padding: 1rem 1.05rem;
		border-radius: calc(var(--radius) - 6px);
		background: var(--surface-contrast);
		border: 1px solid var(--line);
	}

	.error-detail p {
		margin: 0;
		color: var(--muted-strong);
	}

	.error-actions {
		display: flex;
		gap: 0.85rem;
		flex-wrap: wrap;
	}

	.cta-link {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 3.1rem;
		padding: 0.85rem 1.2rem;
		border-radius: 999px;
		text-decoration: none;
		font-weight: 600;
		transition:
			transform 140ms ease,
			border-color 140ms ease,
			background 140ms ease,
			box-shadow 140ms ease;
	}

	.cta-link.primary {
		background: var(--button-bg);
		color: var(--button-ink);
		box-shadow: 0 16px 34px rgba(49, 92, 255, 0.22);
	}

	.cta-link.secondary {
		background: var(--surface-overlay);
		color: var(--ink-soft);
		border: 1px solid var(--line);
	}

	.cta-link:hover {
		transform: translateY(-1px);
	}

	.error-grid {
		display: grid;
		gap: 1rem;
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.error-note {
		padding: 1rem 1.05rem;
		display: grid;
		gap: 0.7rem;
		background: var(--surface-strong);
	}

	.error-note p {
		margin: 0;
		color: var(--muted-strong);
	}

	@media (max-width: 760px) {
		.error-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
