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
		service_tier: string;
		monthly_recurring_revenue_cents: number | null;
		gross_margin_floor_percent: number | null;
		owner_compensation_fit: string | null;
		contract_active: number;
		service_entitled: number;
		policy_accepted: number;
		effective_at: string | null;
		expires_at: string | null;
		operator_load_budget_json: string;
		expansion_triggers_json: string;
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
		service_tier: string;
		monthly_recurring_revenue: string;
		gross_margin_floor_percent: string;
		owner_compensation_fit: string;
		contract_active: boolean;
		service_entitled: boolean;
		policy_accepted: boolean;
		effective_at: string;
		expires_at: string;
		operator_load_budget_json: string;
		expansion_triggers_json: string;
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
		service_tier: 'policy_os_trial',
		monthly_recurring_revenue: '12500',
		gross_margin_floor_percent: '70',
		owner_compensation_fit: 'fits',
		contract_active: true,
		service_entitled: true,
		policy_accepted: true,
		effective_at: '',
		expires_at: '',
		operator_load_budget_json: JSON.stringify(
			{
				max_live_review_meetings_per_month: 1,
				async_review_frequency: 'weekly',
				covered_workflow_count: 1,
				covered_downstream_systems: 3,
				monthly_policy_tuning_limit: 'bounded',
			},
			null,
			2
		),
		expansion_triggers_json: JSON.stringify(
			['new workflow', 'extra downstream system', 'custom UI', 'higher meeting cadence'],
			null,
			2
		),
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
			service_tier: contract.service_tier ?? 'policy_os_trial',
			monthly_recurring_revenue: dollarsFromCents(contract.monthly_recurring_revenue_cents),
			gross_margin_floor_percent: contract.gross_margin_floor_percent?.toString() ?? '',
			owner_compensation_fit: contract.owner_compensation_fit ?? 'fits',
			contract_active: contract.contract_active === 1,
			service_entitled: contract.service_entitled === 1,
			policy_accepted: contract.policy_accepted === 1,
			effective_at: contract.effective_at ?? '',
			expires_at: contract.expires_at ?? '',
			operator_load_budget_json: formatJson(contract.operator_load_budget_json, '{}'),
			expansion_triggers_json: formatJson(contract.expansion_triggers_json, '[]'),
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
					service_tier: form.service_tier,
					monthly_recurring_revenue_cents: centsFromDollars(form.monthly_recurring_revenue),
					gross_margin_floor_percent: parseOptionalInteger(form.gross_margin_floor_percent),
					owner_compensation_fit: form.owner_compensation_fit,
					contract_active: form.contract_active,
					service_entitled: form.service_entitled,
					policy_accepted: form.policy_accepted,
					effective_at: form.effective_at.trim() || null,
					expires_at: form.expires_at.trim() || null,
					operator_load_budget: parseJsonObject(form.operator_load_budget_json),
					expansion_triggers: parseStringArray(form.expansion_triggers_json),
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

	function dollarsFromCents(cents: number | null): string {
		return typeof cents === 'number' ? String(cents / 100) : '';
	}

	function centsFromDollars(value: string): number | null {
		const normalized = value.replace(/[$,\s]/g, '');
		if (!normalized) return null;
		const parsed = Number.parseFloat(normalized);
		return Number.isFinite(parsed) ? Math.round(parsed * 100) : null;
	}

	function parseOptionalInteger(value: string): number | null {
		const parsed = Number.parseInt(value.trim(), 10);
		return Number.isFinite(parsed) ? parsed : null;
	}

	function formatJson(raw: string | null | undefined, fallback: string): string {
		try {
			return JSON.stringify(JSON.parse(raw || fallback), null, 2);
		} catch {
			return fallback;
		}
	}

	function parseJsonObject(raw: string): Record<string, unknown> {
		const parsed = JSON.parse(raw || '{}') as unknown;
		if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
			throw new Error('Operator-load budget must be a JSON object');
		}
		return parsed as Record<string, unknown>;
	}

	function parseStringArray(raw: string): string[] {
		const parsed = JSON.parse(raw || '[]') as unknown;
		if (!Array.isArray(parsed) || parsed.some((value) => typeof value !== 'string')) {
			throw new Error('Expansion triggers must be a JSON string array');
		}
		return parsed as string[];
	}

	function formatCurrencyFromCents(cents: number | null): string {
		if (typeof cents !== 'number') return 'no MRR';
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			maximumFractionDigits: 0,
		}).format(cents / 100);
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
						<span>Service Tier</span>
						<select bind:value={form.service_tier}>
							<option value="mcp_only">mcp_only</option>
							<option value="policy_os_trial">policy_os_trial</option>
							<option value="policy_os_core">policy_os_core</option>
						</select>
					</label>
					<label>
						<span>Monthly Recurring Revenue</span>
						<input bind:value={form.monthly_recurring_revenue} placeholder="12500" />
					</label>
					<label>
						<span>Gross Margin Floor %</span>
						<input bind:value={form.gross_margin_floor_percent} placeholder="70" />
					</label>
					<label>
						<span>Owner Compensation Fit</span>
						<select bind:value={form.owner_compensation_fit}>
							<option value="fits">fits</option>
							<option value="watch">watch</option>
							<option value="does_not_fit">does_not_fit</option>
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
				<label>
					<span>Operator Load Budget JSON</span>
					<textarea bind:value={form.operator_load_budget_json} rows="8" spellcheck="false"></textarea>
				</label>
				<label>
					<span>Expansion Triggers JSON</span>
					<textarea bind:value={form.expansion_triggers_json} rows="5" spellcheck="false"></textarea>
				</label>
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
										<div class="muted">{contract.service_tier} · {formatCurrencyFromCents(contract.monthly_recurring_revenue_cents)}</div>
										<div class="muted">margin={contract.gross_margin_floor_percent ?? 'n/a'}% owner={contract.owner_compensation_fit ?? 'n/a'}</div>
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
	textarea { width: 100%; min-height: 7rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.03); color: inherit; padding: 0.75rem 0.9rem; font: inherit; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; resize: vertical; }
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
