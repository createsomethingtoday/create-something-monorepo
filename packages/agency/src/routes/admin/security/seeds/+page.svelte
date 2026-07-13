<script lang="ts">
	import { SEO } from '@create-something/canon';
	import { invalidateAll } from '$app/navigation';

	let { data } = $props();

	type Seed = {
		normalized_email: string;
		auth_subject: string | null;
		account_id: string;
		tenant_id: string;
		workspace_account_id: string | null;
		service_tier: string;
		managed_bearer_allowed: number;
		org_membership_active: number;
		service_entitled: number;
		policy_accepted: number;
		contract_active: number;
		billing_active: number;
		status: string;
		updated_at: string;
	};

	type SeedPayload = {
		auth_email: string;
		account_id: string;
		tenant_id: string;
		workspace_account_id: string;
		service_tier: string;
		status: string;
		policy_accepted: boolean;
		managed_bearer_allowed: boolean;
		org_membership_active: boolean;
		service_entitled: boolean;
		contract_active: boolean;
		billing_active: boolean;
		metadata_json: string;
	};

	const seeds = $derived(data.seeds as Seed[]);

	const emptyForm = (): SeedPayload => ({
		auth_email: '',
		account_id: '',
		tenant_id: '',
		workspace_account_id: '',
		service_tier: 'mcp_only',
		status: 'seeded',
		policy_accepted: false,
		managed_bearer_allowed: true,
		org_membership_active: true,
		service_entitled: true,
		contract_active: true,
		billing_active: true,
		metadata_json: '{}',
	});

	let form = $state<SeedPayload>(emptyForm());
	let busy = $state(false);
	let successMessage = $state('');
	let errorMessage = $state('');
	let importText = $state(`auth_email,account_id,tenant_id,workspace_account_id,service_tier,managed_bearer_allowed,org_membership_active,service_entitled,policy_accepted,contract_active,billing_active,status,invited_at,metadata_json
operator@exampleclient.com,acct_example_client,tenant_example_client,acct_example_client,mcp_only,1,1,1,0,1,1,seeded,2026-03-07T19:30:00Z,"{""source"":""client_onboarding_batch_1""}"`);

	function selectSeed(seed: Seed) {
		form = {
			auth_email: seed.normalized_email,
			account_id: seed.account_id,
			tenant_id: seed.tenant_id,
			workspace_account_id: seed.workspace_account_id ?? seed.account_id,
			service_tier: seed.service_tier,
			status: seed.status,
			policy_accepted: seed.policy_accepted === 1,
			managed_bearer_allowed: seed.managed_bearer_allowed === 1,
			org_membership_active: seed.org_membership_active === 1,
			service_entitled: seed.service_entitled === 1,
			contract_active: seed.contract_active === 1,
			billing_active: seed.billing_active === 1,
			metadata_json: '{}',
		};
		successMessage = '';
		errorMessage = '';
	}

	function resetForm() {
		form = emptyForm();
		successMessage = '';
		errorMessage = '';
	}

	async function saveSeed() {
		busy = true;
		successMessage = '';
		errorMessage = '';

		try {
			const metadata = JSON.parse(form.metadata_json || '{}') as Record<string, unknown>;
			const response = await fetch('/api/admin/identity-seeds', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					auth_email: form.auth_email,
					account_id: form.account_id,
					tenant_id: form.tenant_id,
					workspace_account_id: form.workspace_account_id || form.account_id,
					service_tier: form.service_tier,
					status: form.status,
					policy_accepted: form.policy_accepted,
					managed_bearer_allowed: form.managed_bearer_allowed,
					org_membership_active: form.org_membership_active,
					service_entitled: form.service_entitled,
					contract_active: form.contract_active,
					billing_active: form.billing_active,
					metadata,
				}),
			});
			const payload = (await response.json().catch(() => ({}))) as { message?: string };
			if (!response.ok) {
				throw new Error(payload.message ?? 'Failed to save identity seed');
			}
			successMessage = 'Seed saved.';
			await invalidateAll();
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Failed to save seed';
		} finally {
			busy = false;
		}
	}

	async function importSeeds() {
		busy = true;
		successMessage = '';
		errorMessage = '';

		try {
			const response = await fetch('/api/admin/identity-seeds', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ import_text: importText }),
			});
			const payload = (await response.json().catch(() => ({}))) as {
				message?: string;
				imported_count?: number;
				error_count?: number;
				errors?: string[];
			};
			if (!response.ok) {
				throw new Error(payload.message ?? payload.errors?.join('\n') ?? 'Failed to import identity seeds');
			}

			successMessage = `Imported ${payload.imported_count ?? 0} seed${payload.imported_count === 1 ? '' : 's'}${payload.error_count ? ` with ${payload.error_count} row warning${payload.error_count === 1 ? '' : 's'}.` : '.'}`;
			errorMessage = payload.errors?.length ? payload.errors.join('\n') : '';
			await invalidateAll();
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Failed to import seeds';
		} finally {
			busy = false;
		}
	}
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

		<div class="grid">
			<section class="panel form-panel">
				<div class="panel-header">
					<h2>Create or Update Seed</h2>
					<button class="link-button" type="button" onclick={resetForm}>Reset</button>
				</div>

				<div class="form-grid">
					<label>
						Email
						<input bind:value={form.auth_email} type="email" placeholder="operator@example.com" />
					</label>
					<label>
						Account ID
						<input bind:value={form.account_id} type="text" placeholder="acct_example" />
					</label>
					<label>
						Tenant ID
						<input bind:value={form.tenant_id} type="text" placeholder="tenant_example" />
					</label>
					<label>
						Workspace Account ID
						<input bind:value={form.workspace_account_id} type="text" placeholder="acct_example" />
					</label>
					<label>
						Service Tier
						<input bind:value={form.service_tier} type="text" />
					</label>
					<label>
						Status
						<input bind:value={form.status} type="text" />
					</label>
				</div>

				<div class="toggle-grid">
					<label><input bind:checked={form.managed_bearer_allowed} type="checkbox" /> Managed bearer allowed</label>
					<label><input bind:checked={form.org_membership_active} type="checkbox" /> Org membership active</label>
					<label><input bind:checked={form.service_entitled} type="checkbox" /> Service entitled</label>
					<label><input bind:checked={form.policy_accepted} type="checkbox" /> Policy accepted</label>
					<label><input bind:checked={form.contract_active} type="checkbox" /> Contract active</label>
					<label><input bind:checked={form.billing_active} type="checkbox" /> Billing active</label>
				</div>

				<label class="metadata-field">
					Metadata JSON
					<textarea bind:value={form.metadata_json} rows="5" spellcheck="false"></textarea>
				</label>

				<div class="actions">
					<button disabled={busy} type="button" onclick={saveSeed}>
						{busy ? 'Saving…' : 'Save seed'}
					</button>
				</div>

				{#if successMessage}
					<p class="success">{successMessage}</p>
				{/if}
				{#if errorMessage}
					<p class="error">{errorMessage}</p>
				{/if}
			</section>

			<section class="panel form-panel">
				<div class="panel-header">
					<h2>Bulk Import</h2>
					<a href="/docs/examples/agency-user-seed.csv">Example CSV</a>
				</div>
				<p class="muted import-copy">Paste the documented CSV or TSV columns here. Existing seeded emails are updated in place; new rows are inserted.</p>
				<label class="metadata-field">
					Seed Import Text
					<textarea bind:value={importText} rows="10" spellcheck="false"></textarea>
				</label>
				<div class="actions">
					<button disabled={busy} type="button" onclick={importSeeds}>
						{busy ? 'Importing…' : 'Import batch'}
					</button>
				</div>
			</section>

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
									<tr class="seed-row" onclick={() => selectSeed(row)}>
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
	</div>
</section>

<style>
	.shell {
		padding: 2rem 1.5rem 4rem;
	}
	.shell-inner {
		max-width: 1280px;
		margin: 0 auto;
	}
	.hero {
		margin-bottom: 2rem;
	}
	.eyebrow {
		text-transform: uppercase;
		letter-spacing: 0.12em;
		font-size: 0.75rem;
		color: var(--color-performance-fg-tertiary);
	}
	h1 {
		margin: 0.5rem 0;
	}
	p, .muted {
		color: var(--color-performance-fg-secondary);
	}
	.subnav {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		margin-top: 1rem;
	}
	.subnav a,
	.panel-header a,
	.link-button {
		color: var(--color-performance-fg-primary);
		text-decoration: none;
	}
	.link-button {
		background: transparent;
		border: 0;
		cursor: pointer;
		padding: 0;
		font: inherit;
	}
	.grid {
		display: grid;
		grid-template-columns: 26rem 26rem minmax(0, 1fr);
		gap: 1.25rem;
	}
	.panel {
		border: 1px solid var(--color-performance-border-default);
		border-radius: 20px;
		padding: 1.25rem;
	}
	.panel-header {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 1rem;
	}
	.form-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.85rem;
		margin-top: 1rem;
	}
	label {
		display: grid;
		gap: 0.4rem;
		font-size: 0.92rem;
	}
	input,
	textarea {
		border-radius: 12px;
		border: 1px solid var(--color-performance-border-default);
		background: var(--color-performance-hover);
		color: var(--color-performance-fg-primary);
		padding: 0.8rem 0.9rem;
		font: inherit;
	}
	.metadata-field,
	.form-panel {
		min-width: 0;
	}
	.metadata-field {
		margin-top: 1rem;
	}
	.toggle-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
		margin-top: 1rem;
	}
	.toggle-grid label {
		display: flex;
		align-items: center;
		gap: 0.55rem;
	}
	.actions {
		margin-top: 1rem;
	}
	button {
		border: 1px solid var(--color-performance-border-default);
		border-radius: 999px;
		padding: 0.75rem 1rem;
		background: var(--color-performance-fg-primary);
		color: var(--color-performance-bg-surface);
		font: inherit;
		cursor: pointer;
	}
	button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
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
		border-bottom: 1px solid var(--color-performance-border-default);
		vertical-align: top;
	}
	.seed-row {
		cursor: pointer;
	}
	.seed-row:hover {
		background: var(--color-performance-hover);
	}
	.mono {
		font-family: inherit;
		word-break: break-word;
	}
	.empty {
		color: var(--color-performance-fg-secondary);
	}
	.success {
		color: var(--color-performance-success);
	}
	.error {
		color: var(--color-performance-error);
		white-space: pre-wrap;
	}
	.import-copy {
		margin-top: 0.75rem;
	}
	@media (max-width: 980px) {
		.grid,
		.form-grid,
		.toggle-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
