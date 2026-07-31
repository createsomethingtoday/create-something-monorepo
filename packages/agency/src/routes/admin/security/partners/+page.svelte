<script lang="ts">
	import { SEO } from '@create-something/canon';
	import SecurityAdminNav from '$lib/components/access/SecurityAdminNav.svelte';

	type PartnerClient = {
		slug: string;
		display_name: string | null;
		workspace_account_id: string;
		identity_account_id: string | null;
		identity_user_id: string | null;
		identity_tenant_id: string | null;
		owner_email: string | null;
		status: string;
		required_toolkits: string[];
		updated_at: string;
	};

	let { data } = $props();
	const clients = $derived(data.clients as PartnerClient[]);
</script>

<SEO title="Partner Mappings" description="Partner identity and account mappings for .agency." propertyName="agency" noindex={true} />

<section class="shell">
	<div class="shell-inner">
		<header class="hero">
			<p class="eyebrow">Workspace bindings</p>
			<h1>Check partner workspace bindings</h1>
			<p>Verify that each partner is bound to the expected workspace and first-party identity. Bindings are read-only.</p>
			<SecurityAdminNav current="partners" />
		</header>

		<div class="panel">
			<div class="table-wrap">
				<table>
					<thead>
						<tr>
							<th>Client</th>
							<th>Status</th>
							<th>Identity</th>
							<th>Workspace</th>
							<th>Toolkits</th>
						</tr>
					</thead>
					<tbody>
						{#if clients.length === 0}
							<tr><td colspan="5" class="empty">No partner clients.</td></tr>
						{:else}
							{#each clients as client}
								<tr>
									<td>
										<div>{client.display_name ?? client.slug}</div>
										<div class="muted">{client.owner_email ?? 'no owner email'}</div>
										<div class="muted">{client.updated_at}</div>
									</td>
									<td>{client.status}</td>
									<td class="muted">
										<div>{client.identity_user_id ?? 'no subject'}</div>
										<div>{client.identity_account_id ?? 'no account'}</div>
										<div>{client.identity_tenant_id ?? 'no tenant'}</div>
									</td>
									<td class="muted">{client.workspace_account_id}</td>
									<td>{client.required_toolkits.length > 0 ? client.required_toolkits.join(', ') : 'none'}</td>
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
	.panel { border: 1px solid var(--color-performance-border-default); border-radius: 20px; background: var(--color-performance-hover); padding: 1.2rem; }
	.table-wrap { overflow-x: auto; }
	table { width: 100%; border-collapse: collapse; }
	th, td { padding: 0.9rem 0.7rem; text-align: left; vertical-align: top; border-bottom: 1px solid var(--color-performance-border-default); }
	.muted { color: var(--color-performance-fg-tertiary); font-size: 0.85rem; margin-top: 0.25rem; }
	.empty { color: var(--color-performance-fg-tertiary); }
</style>
