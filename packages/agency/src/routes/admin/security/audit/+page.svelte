<script lang="ts">
	import { SEO } from '@create-something/canon';

	type Delivery = {
		id: string;
		delivery_type: string;
		delivery_channel: string;
		delivered_by: string;
		recipient: string | null;
		artifact_ref: string | null;
		expires_at: string | null;
		created_at: string;
		client_slug: string;
		client_display_name: string | null;
	};

	type AuthEvent = {
		id: string;
		user_id: string | null;
		event_type: string;
		created_at: string;
		event_data_json: string;
	};

	type PolicyEvent = {
		id: string;
		policy_id: string;
		action_name: string;
		account_id: string | null;
		actor: string | null;
		final_decision: string;
		created_at: string;
	};

	let { data } = $props();
	const deliveries = $derived(data.deliveries as Delivery[]);
	const authEvents = $derived(data.authEvents as AuthEvent[]);
	const policyEvents = $derived(data.policyEvents as PolicyEvent[]);
</script>

<SEO title="Audit Explorer" description="Operational evidence for bearer governance and partner delivery." propertyName="agency" noindex={true} />

<section class="shell">
	<div class="shell-inner">
		<header class="hero">
			<p class="eyebrow">Operator Surface</p>
			<h1>Audit Explorer</h1>
			<p>Read-only operational evidence for access delivery and resolver decisions. Use this when you need to explain why a token was issued, denied, or revoked.</p>
			<nav class="subnav">
				<a href="/admin/security">Overview</a>
				<a href="/admin/security/bearer-tokens">Bearer Governance</a>
				<a href="/admin/security/contracts">Contracts</a>
				<a href="/admin/security/commercial">Commercial</a>
				<a href="/admin/security/partners">Partners</a>
				<a href="/admin/security/audit" aria-current="page">Audit</a>
			</nav>
		</header>

		<div class="panels">
			<section class="panel">
				<div class="panel-header"><h2>Partner Deliveries</h2></div>
				<div class="table-wrap">
					<table>
						<thead><tr><th>Client</th><th>Delivery</th><th>Artifact</th></tr></thead>
						<tbody>
							{#each deliveries as row}
								<tr>
									<td>
										<div>{row.client_display_name ?? row.client_slug}</div>
										<div class="muted">{row.created_at}</div>
									</td>
									<td>
										<div>{row.delivery_type}</div>
										<div class="muted">{row.delivery_channel} by {row.delivered_by}</div>
									</td>
									<td>
										<div>{row.artifact_ref ?? 'none'}</div>
										<div class="muted">{row.recipient ?? 'no recipient'} / {row.expires_at ?? 'no expiry'}</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</section>

			<section class="panel">
				<div class="panel-header"><h2>Identity Auth Events</h2></div>
				<div class="table-wrap">
					<table>
						<thead><tr><th>Event</th><th>User</th><th>Time</th></tr></thead>
						<tbody>
							{#each authEvents as row}
								<tr>
									<td>
										<div>{row.event_type}</div>
										<div class="muted">{row.id}</div>
									</td>
									<td>{row.user_id ?? 'unknown'}</td>
									<td>{row.created_at}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</section>

			<section class="panel full">
				<div class="panel-header"><h2>Policy Decisions</h2></div>
				<div class="table-wrap">
					<table>
						<thead><tr><th>Policy</th><th>Action</th><th>Decision</th><th>Context</th></tr></thead>
						<tbody>
							{#each policyEvents as row}
								<tr>
									<td>
										<div>{row.policy_id}</div>
										<div class="muted">{row.created_at}</div>
									</td>
									<td>{row.action_name}</td>
									<td>{row.final_decision}</td>
									<td class="muted">{row.actor ?? 'unknown actor'} / {row.account_id ?? 'no account'}</td>
								</tr>
							{/each}
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
	.eyebrow { text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.75rem; color: var(--color-fg-tertiary); }
	.hero p { max-width: 72ch; color: var(--color-fg-secondary); }
	.subnav { display: flex; gap: 1rem; margin-top: 1rem; flex-wrap: wrap; }
	.subnav a { color: inherit; text-decoration: none; padding-bottom: 0.25rem; border-bottom: 1px solid transparent; }
	.subnav a[aria-current='page'] { border-color: var(--color-focus); }
	.panels { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
	.panel { border: 1px solid var(--color-border-default); border-radius: 20px; background: var(--color-hover); padding: 1.2rem; }
	.panel.full { grid-column: 1 / -1; }
	.table-wrap { overflow-x: auto; }
	table { width: 100%; border-collapse: collapse; }
	th, td { padding: 0.9rem 0.7rem; text-align: left; vertical-align: top; border-bottom: 1px solid var(--color-border-default); }
	.muted { color: var(--color-fg-tertiary); font-size: 0.85rem; margin-top: 0.25rem; }
	@media (max-width: 980px) { .panels { grid-template-columns: 1fr; } }
</style>
