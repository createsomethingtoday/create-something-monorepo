<script lang="ts">
	import { SEO } from '@create-something/canon';

	let { data } = $props();

	type Seed = {
		normalized_email: string;
		auth_subject: string | null;
		account_id: string;
		tenant_id: string;
		workspace_account_id: string | null;
		service_tier: string;
		policy_accepted: number;
		status: string;
		updated_at: string;
	};

	const seeds = $derived(data.seeds as Seed[]);
</script>

<SEO title="Seeded Users" description="Inspect seeded identity mappings for invited .agency users." propertyName="agency" noindex={true} />

<section class="shell">
	<div class="shell-inner">
		<header class="hero">
			<p class="eyebrow">Operator Surface</p>
			<h1>Seeded Users</h1>
			<p>Invite users by email first, then let first Auth0 login bind the seed to a durable subject. This view shows which identities are still unbound.</p>
			<nav class="subnav">
				<a href="/admin/security">Overview</a>
				<a href="/admin/security/bearer-tokens">Bearer Governance</a>
				<a href="/admin/security/contracts">Contracts</a>
				<a href="/admin/security/commercial">Commercial</a>
				<a href="/admin/security/partners">Partners</a>
				<a href="/admin/security/seeds" aria-current="page">Seeds</a>
				<a href="/admin/security/audit">Audit</a>
			</nav>
		</header>

		<section class="panel">
			<div class="panel-header">
				<h2>Seed Registry</h2>
				<a href="/docs/AGENCY_USER_PROVISIONING_POLICY.md">Policy</a>
			</div>
			<div class="table-wrap">
				<table>
					<thead>
						<tr><th>Email</th><th>Account</th><th>Tenant</th><th>Subject</th><th>Status</th><th>Policy</th></tr>
					</thead>
					<tbody>
						{#if seeds.length === 0}
							<tr><td colspan="6" class="empty">No seeded users found.</td></tr>
						{:else}
							{#each seeds as row}
								<tr>
									<td>
										<div>{row.normalized_email}</div>
										<div class="muted">{row.updated_at}</div>
									</td>
									<td class="mono">{row.account_id}</td>
									<td class="mono">{row.tenant_id}</td>
									<td class="mono">{row.auth_subject ?? 'Unbound'}</td>
									<td>{row.auth_subject ? 'bound' : row.status}</td>
									<td>{row.policy_accepted === 1 ? 'accepted' : 'pending'}</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>
		</section>
	</div>
</section>

<style>
	.shell {
		padding: 2rem 1.5rem 4rem;
	}
	.shell-inner {
		max-width: 1200px;
		margin: 0 auto;
	}
	.hero {
		margin-bottom: 2rem;
	}
	.eyebrow {
		text-transform: uppercase;
		letter-spacing: 0.12em;
		font-size: 0.75rem;
		color: var(--color-fg-tertiary, rgba(255,255,255,0.6));
	}
	h1 {
		margin: 0.5rem 0;
	}
	p, .muted {
		color: var(--color-fg-secondary, rgba(255,255,255,0.72));
	}
	.subnav {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		margin-top: 1rem;
	}
	.subnav a,
	.panel-header a {
		color: var(--color-fg-primary, #fff);
		text-decoration: none;
	}
	.panel {
		border: 1px solid rgba(255,255,255,0.1);
		border-radius: 20px;
		padding: 1.25rem;
	}
	.panel-header {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 1rem;
	}
	.table-wrap {
		overflow-x: auto;
		margin-top: 1rem;
	}
	table {
		width: 100%;
		border-collapse: collapse;
	}
	th, td {
		text-align: left;
		padding: 0.85rem 0.6rem;
		border-bottom: 1px solid rgba(255,255,255,0.08);
		vertical-align: top;
	}
	.mono {
		font-family: inherit;
		word-break: break-word;
	}
	.empty {
		color: var(--color-fg-secondary, rgba(255,255,255,0.72));
	}
</style>
