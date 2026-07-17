<script lang="ts">
	import { SEO } from '@create-something/canon';

	type Summary = {
		totalEntitlements: number;
		deniedEntitlements: number;
		manualOverrides: number;
		activeContracts: number;
		inactiveBilling: number;
		activeBilling: number;
		seededUsers: number;
		unboundSeeds: number;
	};

	type DeniedEntitlement = {
		auth_subject: string;
		auth_email: string | null;
		account_id: string | null;
		tenant_id: string | null;
		updated_at: string;
		decision: { allowed: boolean; reason: string };
	};

	type Contract = {
		contract_reference: string;
		contract_status: string;
		auth_subject: string | null;
		normalized_email: string | null;
		account_id: string | null;
		tenant_id: string | null;
		updated_at: string;
	};

	type CommercialAccount = {
		normalized_email: string | null;
		stripe_customer_id: string | null;
		stripe_subscription_id: string | null;
		product_id: string | null;
		subscription_status: string | null;
		contract_active: number;
		billing_active: number;
		updated_at: string;
	};

	type IdentitySeed = {
		normalized_email: string;
		auth_subject: string | null;
		account_id: string;
		tenant_id: string;
		status: string;
		updated_at: string;
	};

	let { data } = $props();
	const summary = $derived(data.summary as Summary);
	const denied = $derived(data.recentDeniedEntitlements as DeniedEntitlement[]);
	const contracts = $derived(data.recentContracts as Contract[]);
	const commercial = $derived(data.recentCommercialAccounts as CommercialAccount[]);
	const seeds = $derived(data.recentIdentitySeeds as IdentitySeed[]);
</script>

<SEO title="Security Operations" description="Operator dashboard for bearer governance, contracts, and commercial state." propertyName="agency" noindex={true} />

<section class="shell">
	<div class="shell-inner">
		<header class="hero">
			<p class="eyebrow">Operator Surface</p>
			<h1>Security Operations</h1>
			<p>Control plane for managed bearer access. CREATE SOMETHING Identity establishes identity; this dashboard shows whether contract, billing, partner, and operator controls currently allow that identity to use MCP.</p>
			<nav class="subnav">
				<a href="/admin/security" aria-current="page">Overview</a>
				<a href="/admin/security/bearer-tokens">Bearer Governance</a>
				<a href="/admin/security/contracts">Contracts</a>
				<a href="/admin/security/commercial">Commercial</a>
				<a href="/admin/security/partners">Partners</a>
				<a href="/admin/security/seeds">Seeds</a>
				<a href="/admin/security/audit">Audit</a>
			</nav>
		</header>

		<section class="summary-grid">
			<article class="stat-card">
				<span class="label">Entitlements</span>
				<strong>{summary.totalEntitlements}</strong>
			</article>
			<article class="stat-card">
				<span class="label">Denied</span>
				<strong class="bad">{summary.deniedEntitlements}</strong>
			</article>
			<article class="stat-card">
				<span class="label">Manual Overrides</span>
				<strong>{summary.manualOverrides}</strong>
			</article>
			<article class="stat-card">
				<span class="label">Active Contracts</span>
				<strong>{summary.activeContracts}</strong>
			</article>
			<article class="stat-card">
				<span class="label">Billing Healthy</span>
				<strong class="good">{summary.activeBilling}</strong>
			</article>
			<article class="stat-card">
				<span class="label">Billing Attention</span>
				<strong class="bad">{summary.inactiveBilling}</strong>
			</article>
			<article class="stat-card">
				<span class="label">Seeded Users</span>
				<strong>{summary.seededUsers}</strong>
			</article>
			<article class="stat-card">
				<span class="label">Unbound Seeds</span>
				<strong>{summary.unboundSeeds}</strong>
			</article>
		</section>

		<section class="actions">
			<a href="/admin/security/bearer-tokens" class="action-card">
				<h2>Bearer Governance</h2>
				<p>Inspect allow/deny state, live checks, and operator overrides for managed bearer access.</p>
			</a>
			<a href="/admin/security/contracts" class="action-card">
				<h2>Contracts</h2>
				<p>Set explicit contract authority for users, accounts, and tenants. Contract state overrides Stripe timing noise.</p>
			</a>
			<a href="/admin/security/commercial" class="action-card">
				<h2>Commercial State</h2>
				<p>Inspect raw Stripe-backed customer, subscription, and invoice posture feeding billing enforcement.</p>
			</a>
			<a href="/admin/security/partners" class="action-card">
				<h2>Partner Mappings</h2>
				<p>Inspect partner client status, Identity subject mapping, workspace account mapping, and required toolkits.</p>
			</a>
			<a href="/admin/security/seeds" class="action-card">
				<h2>Seeded Users</h2>
				<p>Seed invite mappings by email before first login, then inspect subject binding after first Identity sign-in.</p>
			</a>
			<a href="/admin/security/audit" class="action-card">
				<h2>Audit Explorer</h2>
				<p>Inspect partner delivery artifacts, identity auth events, and policy decisions from the broker path.</p>
			</a>
		</section>

		<div class="panels">
			<section class="panel">
				<div class="panel-header">
					<h2>Recent Denials</h2>
					<a href="/admin/security/bearer-tokens">Open</a>
				</div>
				<div class="table-wrap">
					<table>
						<thead>
							<tr><th>User</th><th>Reason</th><th>Context</th></tr>
						</thead>
						<tbody>
							{#if denied.length === 0}
								<tr><td colspan="3" class="empty">No denied entitlements.</td></tr>
							{:else}
								{#each denied as row}
									<tr>
										<td>
											<div>{row.auth_email ?? row.auth_subject}</div>
											<div class="muted">{row.updated_at}</div>
										</td>
										<td class="bad">{row.decision.reason}</td>
										<td class="muted">{row.account_id ?? 'no account'} / {row.tenant_id ?? 'no tenant'}</td>
									</tr>
								{/each}
							{/if}
						</tbody>
					</table>
				</div>
			</section>

			<section class="panel">
				<div class="panel-header">
					<h2>Recent Contracts</h2>
					<a href="/admin/security/contracts">Open</a>
				</div>
				<div class="table-wrap">
					<table>
						<thead>
							<tr><th>Reference</th><th>Status</th><th>Mapped To</th></tr>
						</thead>
						<tbody>
							{#if contracts.length === 0}
								<tr><td colspan="3" class="empty">No contract records.</td></tr>
							{:else}
								{#each contracts as row}
									<tr>
										<td>
											<div>{row.contract_reference}</div>
											<div class="muted">{row.updated_at}</div>
										</td>
										<td>{row.contract_status}</td>
										<td class="muted">{row.normalized_email ?? row.auth_subject ?? row.account_id ?? 'unmapped'}</td>
									</tr>
								{/each}
							{/if}
						</tbody>
					</table>
				</div>
			</section>

			<section class="panel full">
				<div class="panel-header">
					<h2>Recent Identity Seeds</h2>
					<a href="/admin/security/seeds">Open</a>
				</div>
				<div class="table-wrap">
					<table>
						<thead>
							<tr><th>Email</th><th>Mapping</th><th>Status</th></tr>
						</thead>
						<tbody>
							{#if seeds.length === 0}
								<tr><td colspan="3" class="empty">No seeded users yet.</td></tr>
							{:else}
								{#each seeds as row}
									<tr>
										<td>
											<div>{row.normalized_email}</div>
											<div class="muted">{row.updated_at}</div>
										</td>
										<td class="muted">{row.account_id} / {row.tenant_id}</td>
										<td>{row.auth_subject ? 'bound' : row.status}</td>
									</tr>
								{/each}
							{/if}
						</tbody>
					</table>
				</div>
			</section>

			<section class="panel full">
				<div class="panel-header">
					<h2>Recent Commercial State</h2>
				</div>
				<div class="table-wrap">
					<table>
						<thead>
							<tr><th>Customer</th><th>Stripe</th><th>Product</th><th>Billing</th></tr>
						</thead>
						<tbody>
							{#if commercial.length === 0}
								<tr><td colspan="4" class="empty">No Stripe-backed commercial state.</td></tr>
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
										<td>{row.product_id ?? 'unknown'} <span class="muted">{row.subscription_status ?? 'n/a'}</span></td>
										<td>
											<span class:good={row.billing_active === 1} class:bad={row.billing_active !== 1}>
												billing={row.billing_active === 1 ? 'active' : 'inactive'}
											</span>
											<div class="muted">contract={row.contract_active === 1 ? 'active' : 'inactive'}</div>
										</td>
									</tr>
								{/each}
							{/if}
						</tbody>
					</table>
				</div>
			</section>
		</div>
	</div>
</section>

<style>
	.shell-inner { max-width: 1320px; margin: 0 auto; padding: 2rem 1.5rem 4rem; }
	.hero { margin-bottom: 2rem; }
	.eyebrow { text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.75rem; color: var(--color-performance-fg-tertiary); }
	.hero p { max-width: 75ch; color: var(--color-performance-fg-secondary); }
	.subnav { display: flex; gap: 1rem; margin-top: 1rem; }
	.subnav a { color: inherit; text-decoration: none; padding-bottom: 0.25rem; border-bottom: 1px solid transparent; }
	.subnav a[aria-current='page'] { border-color: var(--color-performance-focus); }
	.summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
	.stat-card, .action-card, .panel { border: 1px solid var(--color-performance-border-default); border-radius: 20px; background: var(--color-performance-hover); padding: 1.2rem; }
	.stat-card .label { display: block; text-transform: uppercase; letter-spacing: 0.06em; font-size: 0.78rem; color: var(--color-performance-fg-tertiary); margin-bottom: 0.5rem; }
	.stat-card strong { font-size: 2rem; }
	.actions { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
	.action-card { text-decoration: none; color: inherit; }
	.action-card h2 { margin: 0 0 0.5rem; }
	.action-card p { margin: 0; color: var(--color-performance-fg-secondary); }
	.panels { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
	.panel.full { grid-column: 1 / -1; }
	.panel-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.75rem; }
	.panel-header a { color: inherit; }
	.table-wrap { overflow-x: auto; }
	table { width: 100%; border-collapse: collapse; }
	th, td { padding: 0.9rem 0.7rem; text-align: left; vertical-align: top; border-bottom: 1px solid var(--color-performance-border-default); }
	.muted { color: var(--color-performance-fg-tertiary); font-size: 0.85rem; margin-top: 0.25rem; }
	.good { color: var(--color-performance-success); }
	.bad { color: var(--color-performance-error); }
	.empty { color: var(--color-performance-fg-tertiary); }
	@media (max-width: 980px) {
		.panels { grid-template-columns: 1fr; }
	}
</style>
