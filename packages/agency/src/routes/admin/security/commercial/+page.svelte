<script lang="ts">
	import { SEO } from '@create-something/canon';

	type CommercialAccount = {
		normalized_email: string | null;
		stripe_customer_id: string | null;
		stripe_subscription_id: string | null;
		product_id: string | null;
		service_tier: string | null;
		subscription_status: string | null;
		contract_active: number;
		billing_active: number;
		current_period_end: string | null;
		last_invoice_status: string | null;
		updated_at: string;
	};

	let { data } = $props();
	const commercial = $derived(data.commercial as CommercialAccount[]);
</script>

<SEO title="Commercial State" description="Stripe-backed commercial state for .agency." propertyName="agency" noindex={true} />

<section class="shell">
	<div class="shell-inner">
		<header class="hero">
			<p class="eyebrow">Operator Surface</p>
			<h1>Commercial State</h1>
			<p>Read-only Stripe-backed commercial ledger used during entitlement reconciliation when no explicit contract record overrides it.</p>
			<nav class="subnav">
				<a href="/admin/security">Overview</a>
				<a href="/admin/security/bearer-tokens">Bearer Governance</a>
				<a href="/admin/security/contracts">Contracts</a>
				<a href="/admin/security/commercial" aria-current="page">Commercial</a>
				<a href="/admin/security/partners">Partners</a>
			</nav>
		</header>

		<div class="panel">
			<div class="table-wrap">
				<table>
					<thead>
						<tr>
							<th>Customer</th>
							<th>Stripe</th>
							<th>Offer</th>
							<th>State</th>
							<th>Timing</th>
						</tr>
					</thead>
					<tbody>
						{#if commercial.length === 0}
							<tr><td colspan="5" class="empty">No commercial records.</td></tr>
						{:else}
							{#each commercial as row}
								<tr>
									<td>
										<div>{row.normalized_email ?? 'unknown'}</div>
										<div class="muted">{row.updated_at}</div>
									</td>
									<td class="muted">
										<div>{row.stripe_customer_id ?? 'no customer'}</div>
										<div>{row.stripe_subscription_id ?? 'no subscription'}</div>
									</td>
									<td>
										<div>{row.product_id ?? 'unknown'}</div>
										<div class="muted">{row.service_tier ?? 'no tier'}</div>
									</td>
									<td>
										<div>{row.subscription_status ?? 'n/a'}</div>
										<div class:good={row.billing_active === 1} class:bad={row.billing_active !== 1}>
											billing={row.billing_active === 1 ? 'active' : 'inactive'}
										</div>
										<div class="muted">contract={row.contract_active === 1 ? 'active' : 'inactive'}</div>
									</td>
									<td>
										<div>{row.current_period_end ?? 'no period end'}</div>
										<div class="muted">{row.last_invoice_status ?? 'no invoice status'}</div>
									</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>
		</div>
	</div>
</section>

<style>
	.shell-inner { max-width: 1320px; margin: 0 auto; padding: 2rem 1.5rem 4rem; }
	.hero { margin-bottom: 2rem; }
	.eyebrow { text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.75rem; color: var(--color-performance-fg-tertiary); }
	.hero p { max-width: 72ch; color: var(--color-performance-fg-secondary); }
	.subnav { display: flex; gap: 1rem; margin-top: 1rem; flex-wrap: wrap; }
	.subnav a { color: inherit; text-decoration: none; padding-bottom: 0.25rem; border-bottom: 1px solid transparent; }
	.subnav a[aria-current='page'] { border-color: var(--color-performance-focus); }
	.panel { border: 1px solid var(--color-performance-border-default); border-radius: 20px; background: var(--color-performance-hover); padding: 1.2rem; }
	.table-wrap { overflow-x: auto; }
	table { width: 100%; border-collapse: collapse; }
	th, td { padding: 0.9rem 0.7rem; text-align: left; vertical-align: top; border-bottom: 1px solid var(--color-performance-border-default); }
	.muted { color: var(--color-performance-fg-tertiary); font-size: 0.85rem; margin-top: 0.25rem; }
	.good { color: var(--color-performance-success); }
	.bad { color: var(--color-performance-error); }
	.empty { color: var(--color-performance-fg-tertiary); }
</style>
