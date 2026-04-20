<script lang="ts">
	import { SEO } from '@create-something/canon';

	type Contract = {
		id: string;
		auth_subject: string | null;
		normalized_email: string | null;
		account_id: string | null;
		tenant_id: string | null;
		contract_reference: string;
		contract_status: 'draft' | 'pending' | 'active' | 'paused' | 'expired' | 'terminated';
		contract_active: number;
		service_entitled: number;
		policy_accepted: number;
		effective_at: string | null;
		expires_at: string | null;
		updated_at: string;
	};

	type ContractsPayload = { contracts: Contract[]; message?: string };
	type ContractFormState = {
		auth_subject: string;
		auth_email: string;
		account_id: string;
		tenant_id: string;
		contract_reference: string;
		contract_status: Contract['contract_status'];
		contract_active: boolean;
		service_entitled: boolean;
		policy_accepted: boolean;
		effective_at: string;
		expires_at: string;
	};

	let { data } = $props();
	let contracts = $state<Contract[]>([]);
	let search = $state('');
	let busy = $state(false);
	let message = $state('');
	let errorMessage = $state('');
	let form = $state<ContractFormState>({
		auth_subject: '',
		auth_email: '',
		account_id: '',
		tenant_id: '',
		contract_reference: '',
		contract_status: 'active',
		contract_active: true,
		service_entitled: true,
		policy_accepted: true,
		effective_at: '',
		expires_at: '',
	});

	$effect(() => {
		contracts = data.contracts as Contract[];
	});

	async function reload() {
		const params = new URLSearchParams();
		if (search.trim()) params.set('search', search.trim());
		const response = await fetch(`/api/admin/contracts?${params.toString()}`);
		const payload = (await response.json()) as ContractsPayload;
		if (!response.ok) {
			throw new Error(payload.message ?? 'Failed to load contracts');
		}
		contracts = payload.contracts;
	}

	function hydrate(contract: Contract) {
		form = {
			auth_subject: contract.auth_subject ?? '',
			auth_email: contract.normalized_email ?? '',
			account_id: contract.account_id ?? '',
			tenant_id: contract.tenant_id ?? '',
			contract_reference: contract.contract_reference,
			contract_status: contract.contract_status,
			contract_active: contract.contract_active === 1,
			service_entitled: contract.service_entitled === 1,
			policy_accepted: contract.policy_accepted === 1,
			effective_at: contract.effective_at ?? '',
			expires_at: contract.expires_at ?? '',
		};
		message = `Loaded ${contract.contract_reference} into the editor.`;
		errorMessage = '';
	}

	async function saveContract() {
		busy = true;
		message = '';
		errorMessage = '';
		try {
			const response = await fetch('/api/admin/contracts', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					auth_subject: form.auth_subject.trim() || null,
					auth_email: form.auth_email.trim() || null,
					account_id: form.account_id.trim() || null,
					tenant_id: form.tenant_id.trim() || null,
					contract_reference: form.contract_reference.trim(),
					contract_status: form.contract_status,
					contract_active: form.contract_active,
					service_entitled: form.service_entitled,
					policy_accepted: form.policy_accepted,
					effective_at: form.effective_at.trim() || null,
					expires_at: form.expires_at.trim() || null,
				}),
			});
			const payload = (await response.json().catch(() => ({}))) as { message?: string };
			if (!response.ok) {
				throw new Error(payload.message ?? 'Failed to save contract');
			}
			message = `Saved ${form.contract_reference}.`;
			await reload();
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Failed to save contract';
		} finally {
			busy = false;
		}
	}
</script>

<SEO title="Contract Ledger" description="Operator controls for .agency contract state." propertyName="agency" noindex={true} />

<section class="shell">
	<div class="shell-inner">
		<header class="hero">
			<p class="eyebrow">Operator Surface</p>
			<h1>Contract Ledger</h1>
			<p>Explicit contract authority for managed bearer access. Use this to override Stripe timing and define legal/commercial posture per user, account, or tenant.</p>
			<nav class="subnav">
				<a href="/admin/security">Overview</a>
				<a href="/admin/security/bearer-tokens">Bearer Governance</a>
				<a href="/admin/security/contracts" aria-current="page">Contracts</a>
			</nav>
		</header>

		<div class="layout">
			<section class="editor">
				<h2>Contract Record</h2>
				<div class="form-grid">
					<label>
						<span>Reference</span>
						<input bind:value={form.contract_reference} placeholder="msa_outerfields_2026" />
					</label>
					<label>
						<span>Status</span>
						<select bind:value={form.contract_status}>
							<option value="draft">draft</option>
							<option value="pending">pending</option>
							<option value="active">active</option>
							<option value="paused">paused</option>
							<option value="expired">expired</option>
							<option value="terminated">terminated</option>
						</select>
					</label>
					<label>
						<span>Auth Subject</span>
						<input bind:value={form.auth_subject} placeholder="user_..." />
					</label>
					<label>
						<span>Email</span>
						<input bind:value={form.auth_email} placeholder="user@example.com" />
					</label>
					<label>
						<span>Account</span>
						<input bind:value={form.account_id} placeholder="acct_..." />
					</label>
					<label>
						<span>Tenant</span>
						<input bind:value={form.tenant_id} placeholder="tenant_..." />
					</label>
					<label>
						<span>Effective At</span>
						<input bind:value={form.effective_at} placeholder="2026-03-07T00:00:00Z" />
					</label>
					<label>
						<span>Expires At</span>
						<input bind:value={form.expires_at} placeholder="2027-03-07T00:00:00Z" />
					</label>
				</div>
				<div class="toggles">
					<label><input type="checkbox" bind:checked={form.contract_active} /> Contract active</label>
					<label><input type="checkbox" bind:checked={form.service_entitled} /> Service entitled</label>
					<label><input type="checkbox" bind:checked={form.policy_accepted} /> Policy accepted</label>
				</div>
				<div class="actions">
					<button disabled={busy || !form.contract_reference.trim()} onclick={saveContract}>Save contract</button>
				</div>
				{#if message}<p class="success">{message}</p>{/if}
				{#if errorMessage}<p class="error">{errorMessage}</p>{/if}
			</section>

			<section class="records">
				<div class="records-header">
					<h2>Current Records</h2>
					<div class="toolbar">
						<input bind:value={search} placeholder="Search by reference, user, email, account" />
						<button onclick={reload}>Refresh</button>
					</div>
				</div>
				<div class="table-wrap">
					<table>
						<thead>
							<tr>
								<th>Reference</th>
								<th>Subject</th>
								<th>State</th>
								<th>Timing</th>
							</tr>
						</thead>
						<tbody>
							{#each contracts as contract}
								<tr onclick={() => hydrate(contract)}>
									<td>
										<strong>{contract.contract_reference}</strong>
										<div class="muted">{contract.updated_at}</div>
									</td>
									<td>
										<div>{contract.normalized_email ?? contract.auth_subject ?? 'unmapped'}</div>
										<div class="muted">{contract.account_id ?? 'no account'} / {contract.tenant_id ?? 'no tenant'}</div>
									</td>
									<td>
										<div class:good={contract.contract_active === 1} class:bad={contract.contract_active !== 1}>
											{contract.contract_status}
										</div>
										<div class="muted">entitled={contract.service_entitled === 1 ? 'yes' : 'no'} policy={contract.policy_accepted === 1 ? 'yes' : 'no'}</div>
									</td>
									<td>
										<div>{contract.effective_at ?? 'immediate'}</div>
										<div class="muted">{contract.expires_at ?? 'no expiry'}</div>
									</td>
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
	.eyebrow { text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.75rem; color: rgba(255,255,255,0.6); }
	.hero p { max-width: 72ch; color: rgba(255,255,255,0.74); }
	.subnav { display: flex; gap: 1rem; margin-top: 1rem; }
	.subnav a { color: inherit; text-decoration: none; padding-bottom: 0.25rem; border-bottom: 1px solid transparent; }
	.subnav a[aria-current='page'] { border-color: rgba(255,255,255,0.5); }
	.layout { display: grid; grid-template-columns: minmax(320px, 420px) 1fr; gap: 1.5rem; align-items: start; }
	.editor, .records { border: 1px solid rgba(255,255,255,0.12); border-radius: 20px; background: rgba(255,255,255,0.03); padding: 1.25rem; }
	.form-grid { display: grid; grid-template-columns: 1fr; gap: 0.85rem; }
	label span { display: block; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.06em; color: rgba(255,255,255,0.6); margin-bottom: 0.35rem; }
	input, select { width: 100%; border-radius: 12px; border: 1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.03); color: inherit; padding: 0.75rem 0.9rem; font: inherit; }
	.toggles { display: flex; flex-direction: column; gap: 0.75rem; margin: 1rem 0; }
	.toggles label { display: flex; align-items: center; gap: 0.65rem; }
	.actions, .toolbar, .records-header { display: flex; gap: 0.75rem; align-items: center; }
	.records-header { justify-content: space-between; margin-bottom: 1rem; }
	button { border: 0; border-radius: 999px; padding: 0.75rem 1rem; font: inherit; font-weight: 600; background: #f3f1e8; color: #111; }
	.table-wrap { overflow-x: auto; }
	table { width: 100%; border-collapse: collapse; }
	th, td { padding: 0.95rem 0.8rem; text-align: left; vertical-align: top; border-bottom: 1px solid rgba(255,255,255,0.08); }
	tbody tr { cursor: pointer; }
	tbody tr:hover { background: rgba(255,255,255,0.03); }
	.muted { color: rgba(255,255,255,0.58); font-size: 0.85rem; margin-top: 0.25rem; }
	.good { color: #8fd19e; }
	.bad { color: #ff9d9d; }
	.success { color: #8fd19e; margin-top: 1rem; }
	.error { color: #ff9d9d; margin-top: 1rem; }
	@media (max-width: 980px) {
		.layout { grid-template-columns: 1fr; }
		.records-header, .toolbar { flex-direction: column; align-items: stretch; }
	}
</style>
