<script lang="ts">
	import { buildControlPlaneBridgeHref } from '$lib/control-plane';
	import '../app.css';

	export let error: App.Error;
	export let status: number;

	const dashboardHref = buildControlPlaneBridgeHref('dashboard');
	const securityHref = buildControlPlaneBridgeHref('security');
	const accountHref = buildControlPlaneBridgeHref('account');

	$: detail = error?.message ?? 'An unexpected error interrupted the Abundance workflow.';
	$: isAccessDenied = status === 403;
	$: isMissingSecret = status === 500 && detail.includes('signing secret');
	$: isNotFound = status === 404;
	$: eyebrow = isAccessDenied
		? 'Governed Intake Access'
		: isMissingSecret
			? 'Runtime Configuration'
			: isNotFound
				? 'Route Unavailable'
				: 'Service Interruption';
	$: pageTitle = isAccessDenied
		? 'Secure verification required'
		: isMissingSecret
			? 'Runtime configuration required'
			: isNotFound
				? 'Requested route unavailable'
				: 'Abundance Concierge unavailable';
	$: lead = isAccessDenied
		? 'Abundance Concierge allows public nurse entry, but this step still requires secure verification before protected credentials or staffing progression can continue.'
		: isMissingSecret
			? 'The production runtime is missing required signing configuration, so nurse intake cannot open safely yet.'
			: isNotFound
				? 'This route is not active for the current governed session.'
				: 'The concierge hit an unexpected runtime error before the workflow could continue.';
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

		<section class="error-detail">
			<div class="eyebrow">Runtime Detail</div>
			<p>{detail}</p>
		</section>

		<div class="error-actions">
			{#if isAccessDenied}
				<a class="cta-link primary" href={dashboardHref} target="_blank" rel="noreferrer">
					Open .agency
				</a>
				<a class="cta-link secondary" href={accountHref} target="_blank" rel="noreferrer">
					Check Account
				</a>
			{:else if isMissingSecret}
				<a class="cta-link primary" href={securityHref} target="_blank" rel="noreferrer">
					Open .agency security
				</a>
				<a class="cta-link secondary" href={dashboardHref} target="_blank" rel="noreferrer">
					Open .agency dashboard
				</a>
			{:else}
				<a class="cta-link primary" href="/chat">Open chat workspace</a>
				<a class="cta-link secondary" href={dashboardHref} target="_blank" rel="noreferrer">
					Open .agency
				</a>
			{/if}
		</div>

		<div class="error-grid">
			{#if isAccessDenied}
				<article class="error-note glass">
					<div class="eyebrow">Nurse Candidates</div>
					<p>
						Return to the apply flow and complete the secure email verification step before
						retrying the protected route.
					</p>
				</article>

				<article class="error-note glass">
					<div class="eyebrow">Operators</div>
					<p>
						Use `.agency` for governed access, or issue a direct secure entry link when a
						recruiter-assisted fast path is still needed.
					</p>
				</article>
			{:else if isMissingSecret}
				<article class="error-note glass">
					<div class="eyebrow">Production State</div>
					<p>
						The deployment is reachable, but the intake signing secret is missing, so nurse
						traffic is being held behind the governed access boundary.
					</p>
				</article>

				<article class="error-note glass">
					<div class="eyebrow">Next Step</div>
					<p>
						Complete the runtime security configuration, then retry the signed intake entry
						link.
					</p>
				</article>
			{:else}
				<article class="error-note glass">
					<div class="eyebrow">Next Step</div>
					<p>Retry the governed session route or return to the main chat workspace.</p>
				</article>

				<article class="error-note glass">
					<div class="eyebrow">Operations</div>
					<p>Use .agency to inspect access, security posture, and downstream staffing controls.</p>
				</article>
			{/if}
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
