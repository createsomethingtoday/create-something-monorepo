<script lang="ts">
	import { SEO } from '@create-something/canon';

	type Entitlement = {
		auth_subject: string;
		auth_email: string | null;
		account_id: string | null;
		tenant_id: string | null;
		service_tier: string;
		managed_bearer_allowed: number;
		org_membership_active: number;
		service_entitled: number;
		policy_accepted: number;
		contract_active: number;
		billing_active: number;
		denial_reason: string | null;
		updated_at: string;
		decision: { allowed: boolean; reason: string };
	};
	type EntitlementsPayload = { entitlements: Entitlement[]; message?: string };
	type MutationPayload = { entitlement?: Entitlement; message?: string };
	type ToggleField =
		| 'managed_bearer_allowed'
		| 'org_membership_active'
		| 'service_entitled'
		| 'policy_accepted'
		| 'contract_active'
		| 'billing_active';
	const toggleFields: Array<{ field: ToggleField; label: string }> = [
		{ field: 'managed_bearer_allowed', label: 'Bearer' },
		{ field: 'org_membership_active', label: 'Org' },
		{ field: 'service_entitled', label: 'Service' },
		{ field: 'policy_accepted', label: 'Policy' },
		{ field: 'contract_active', label: 'Contract' },
		{ field: 'billing_active', label: 'Billing' },
	];

	let { data } = $props();
	let entitlements = $state<Entitlement[]>([]);
	let search = $state('');
	let busySubject = $state('');
	let message = $state('');
	let errorMessage = $state('');

	$effect(() => {
		entitlements = data.entitlements as Entitlement[];
	});

	async function reload() {
		const params = new URLSearchParams();
		if (search.trim()) params.set('search', search.trim());
		const response = await fetch(`/api/admin/mcp-entitlements?${params.toString()}`);
		const payload = (await response.json()) as EntitlementsPayload;
		if (!response.ok) {
			throw new Error(payload.message ?? 'Failed to load entitlements');
		}
		entitlements = payload.entitlements;
	}

	async function toggle(subject: string, field: ToggleField) {
		const current = entitlements.find((row) => row.auth_subject === subject);
		if (!current) return;

		busySubject = subject;
		message = '';
		errorMessage = '';
		try {
			const response = await fetch('/api/admin/mcp-entitlements', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					auth_subject: subject,
					[field]: current[field] !== 1,
					denial_reason: current.denial_reason,
				}),
			});
			const payload = (await response.json()) as MutationPayload;
			if (!response.ok) {
				throw new Error(payload.message ?? 'Failed to update entitlement');
			}
			message = `Updated ${subject}.`;
			await reload();
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Failed to update entitlement';
		} finally {
			busySubject = '';
		}
	}

	async function setDenialReason(subject: string, denialReason: string) {
		busySubject = subject;
		message = '';
		errorMessage = '';
		try {
			const response = await fetch('/api/admin/mcp-entitlements', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					auth_subject: subject,
					denial_reason: denialReason.trim() || null,
				}),
			});
			const payload = (await response.json()) as MutationPayload;
			if (!response.ok) {
				throw new Error(payload.message ?? 'Failed to update denial reason');
			}
			message = `Updated ${subject}.`;
			await reload();
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Failed to update denial reason';
		} finally {
			busySubject = '';
		}
	}
</script>

<SEO title="Bearer Token Governance" description="Operator controls for .agency managed bearer token entitlement state." propertyName="agency" noindex={true} />

<section class="shell">
	<div class="shell-inner">
		<header class="hero">
			<p class="eyebrow">Operator Surface</p>
			<h1>Managed Bearer Governance</h1>
			<p>Live entitlement state for `.agency` bearer tokens. Clerk proves identity. This table controls whether that identity remains entitled to use MCP access.</p>
			<nav class="subnav">
				<a href="/admin/security">Overview</a>
				<a href="/admin/security/bearer-tokens" aria-current="page">Bearer Governance</a>
				<a href="/admin/security/contracts">Contracts</a>
			</nav>
		</header>

		<div class="toolbar">
			<input bind:value={search} placeholder="Search by subject, email, account, tenant" />
			<button onclick={reload}>Refresh</button>
		</div>

		{#if message}<p class="success">{message}</p>{/if}
		{#if errorMessage}<p class="error">{errorMessage}</p>{/if}

		<div class="table-wrap">
			<table>
				<thead>
					<tr>
						<th>User</th>
						<th>Account</th>
						<th>Status</th>
						<th>Checks</th>
						<th>Denial</th>
					</tr>
				</thead>
				<tbody>
					{#each entitlements as row}
						<tr>
							<td>
								<strong>{row.auth_email ?? row.auth_subject}</strong>
								<div class="muted">{row.auth_subject}</div>
								<div class="muted">{row.updated_at}</div>
							</td>
							<td>
								<div>{row.account_id ?? 'unset'}</div>
								<div class="muted">{row.tenant_id ?? 'unset'}</div>
							</td>
							<td>
								<span class:allowed={row.decision.allowed} class:blocked={!row.decision.allowed}>
									{row.decision.reason}
								</span>
							</td>
							<td class="checks">
								{#each toggleFields as { field, label }}
									<button
										class:check-on={row[field] === 1}
										class:check-off={row[field] !== 1}
										disabled={busySubject === row.auth_subject}
										onclick={() => toggle(row.auth_subject, field)}
									>
										{label}
									</button>
								{/each}
							</td>
							<td>
								<form
									onsubmit={(event) => {
										event.preventDefault();
										const data = new FormData(event.currentTarget as HTMLFormElement);
										void setDenialReason(row.auth_subject, String(data.get('denial_reason') ?? ''));
									}}
								>
									<input name="denial_reason" value={row.denial_reason ?? ''} placeholder="Optional deny reason" />
									<button disabled={busySubject === row.auth_subject}>Save</button>
								</form>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</section>

<style>
	.shell-inner { max-width: 1280px; margin: 0 auto; padding: 2rem 1.5rem 4rem; }
	.hero { margin-bottom: 2rem; }
	.eyebrow { text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.75rem; color: rgba(255,255,255,0.6); }
	.hero p { max-width: 70ch; color: rgba(255,255,255,0.75); }
	.subnav { display: flex; gap: 1rem; margin-top: 1rem; }
	.subnav a { color: inherit; text-decoration: none; padding-bottom: 0.25rem; border-bottom: 1px solid transparent; }
	.subnav a[aria-current='page'] { border-color: rgba(255,255,255,0.5); }
	.toolbar { display: flex; gap: 0.75rem; margin-bottom: 1rem; }
	.toolbar input, td input { width: 100%; border-radius: 12px; border: 1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.03); color: inherit; padding: 0.75rem 0.9rem; }
	.toolbar button, td button { border: 0; border-radius: 999px; padding: 0.75rem 1rem; font: inherit; font-weight: 600; background: #f3f1e8; color: #111; }
	.table-wrap { overflow-x: auto; border: 1px solid rgba(255,255,255,0.12); border-radius: 20px; background: rgba(255,255,255,0.03); }
	table { width: 100%; border-collapse: collapse; }
	th, td { padding: 1rem; text-align: left; vertical-align: top; border-bottom: 1px solid rgba(255,255,255,0.08); }
	.muted { color: rgba(255,255,255,0.58); font-size: 0.85rem; margin-top: 0.25rem; }
	.allowed { color: #8fd19e; }
	.blocked { color: #ff9d9d; }
	.checks { display: flex; flex-wrap: wrap; gap: 0.5rem; min-width: 260px; }
	.checks button { padding: 0.45rem 0.8rem; }
	.check-on { background: #8fd19e; color: #0b1f11; }
	.check-off { background: rgba(255,255,255,0.08); color: #fff; }
	form { display: flex; gap: 0.5rem; min-width: 280px; }
	.success { color: #8fd19e; }
	.error { color: #ff9d9d; }
</style>
