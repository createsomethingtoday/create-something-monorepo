<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { SEO } from '@create-something/canon';
	import { FactList, ReportSection, ReportShell, SummaryItem } from '$lib/components/access';
	import type { ComposioCatalogPayload, HubToolAvailabilityPayload } from '$lib/server/mcp-tools';
	import type { McpAccessAssignment } from '$lib/server/mcp-access-assignments';

	let { data } = $props();

	const hubs = $derived((Array.isArray(data.hubs) ? data.hubs : []) as McpAccessAssignment[]);
	const selectedHub = $derived(hubs.find((hub) => hub.laneKey === data.selectedHub) ?? null);
	const catalog = $derived(data.catalog as ComposioCatalogPayload);
	const availability = $derived((data.availability ?? null) as HubToolAvailabilityPayload | null);
	const selectedToolkitSummary = $derived(availability?.selectedToolkit ?? null);
	const selectedToolkitLabel = $derived(catalog.selectedToolkit?.name ?? data.selectedToolkit ?? 'Selected toolkit');
	let connectBusy = $state(false);
	let connectMessage = $state('');
	let connectError = $state('');

	function formatDateTime(value: string | null | undefined): string {
		if (!value) return 'Not set';
		return new Date(value).toLocaleString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: 'numeric',
			minute: '2-digit',
		});
	}

	function buildHref(next: { hub?: string | null; toolkit?: string | null; q?: string | null }): string {
		const params = new URLSearchParams();
		const hub = next.hub ?? data.selectedHub;
		const toolkit = next.toolkit ?? data.selectedToolkit;
		const query = next.q ?? data.query;
		if (hub) params.set('hub', hub);
		if (toolkit) params.set('toolkit', toolkit);
		if (query) params.set('q', query);
		return params.size > 0 ? `?${params.toString()}` : '/mcp-access/tools';
	}

	function joinList(values: string[] | null | undefined): string {
		return values && values.length > 0 ? values.join(', ') : 'None';
	}

	function yesNo(value: boolean): string {
		return value ? 'Yes' : 'No';
	}

	function statusLabel(value: string): string {
		return value.replace(/_/g, ' ');
	}

	function hubScopeModel(hub: McpAccessAssignment | null): string {
		if (!hub) return 'Unavailable';
		if (hub.source !== 'legacy') return 'Partner-managed';
		return hub.toolkitProfile.length > 0 ? 'Legacy shared-auth defaults' : 'Legacy non-Composio review';
	}

	function legacyScopeNotice(hub: McpAccessAssignment | null): string | null {
		if (!hub || hub.source !== 'legacy') return null;
		if (hub.toolkitProfile.length > 0) {
			return 'This legacy lane uses the shared-auth bridge default for Composio toolkit scope. Authorization is explicit here, but live Hub discovery remains unverified.';
		}
		return 'This legacy lane is active for non-Composio review services only. The catalog stays available, but Hub-scoped Composio readiness is expected to remain empty.';
	}

	const selectedHubLegacyNotice = $derived(legacyScopeNotice(selectedHub));
	const selectedHubHasComposioScope = $derived(Boolean(selectedHub?.toolkitProfile.length));
	const servicesEmptyNote = $derived(
		selectedHub?.source === 'legacy' && !selectedHubHasComposioScope
			? 'This legacy reviewer lane has no Composio toolkit scope, so this table is expected to stay empty.'
			: 'No scoped services were derived for this lane.',
	);
	const selectedToolkitEmptyNote = $derived(
		data.selectedToolkit
			? selectedHub?.source === 'legacy' && !selectedHubHasComposioScope
				? 'This legacy reviewer lane does not authorize Composio toolkits. Selected catalog toolkits will remain out of scope here.'
				: 'No live tools were returned for the selected toolkit.'
			: 'Choose a toolkit to inspect per-tool readiness in the selected Hub.',
	);
	const canSelfServeLegacyConnect = $derived(
		Boolean(
			selectedHub &&
				selectedHub.source === 'legacy' &&
				data.selectedToolkit &&
				selectedToolkitSummary?.authorized &&
				selectedToolkitSummary.registered &&
				selectedToolkitSummary.requiresAuth,
		),
	);
	const connectActionLabel = $derived(
		selectedToolkitSummary?.connectionStatus === 'active'
			? `Reconnect ${selectedToolkitLabel}`
			: `Connect ${selectedToolkitLabel}`,
	);

	const hubFacts = $derived(
		selectedHub
			? [
					{ label: 'Lane', value: selectedHub.displayName },
					{ label: 'Lane Key', value: selectedHub.laneKey },
					{ label: 'Source', value: selectedHub.source },
					{ label: 'Scope Model', value: hubScopeModel(selectedHub) },
					{ label: 'Hub URL', value: selectedHub.hubUrl },
					{ label: 'Host Key', value: selectedHub.hostKey ?? 'Not set' },
					{ label: 'Toolkit Scope', value: joinList(selectedHub.toolkitProfile) },
					{ label: 'Allowed Prefixes', value: joinList(selectedHub.allowedToolPrefixes) },
				]
			: [],
	);

	async function connectSelectedToolkit() {
		if (!selectedHub || !data.selectedToolkit) return;

		connectBusy = true;
		connectMessage = '';
		connectError = '';

		try {
			const response = await fetch(
				`/api/me/hubs/${selectedHub.laneKey}/toolkits/${data.selectedToolkit}/connect-link`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						callback_url: window.location.href,
					}),
				},
			);
			const payload = (await response.json().catch(() => ({}))) as {
				message?: string;
				connect_link?: string;
			};
			if (!response.ok) {
				throw new Error(payload.message ?? `Failed to start ${selectedToolkitLabel} connection`);
			}
			if (!payload.connect_link) {
				throw new Error(`No ${selectedToolkitLabel} connect link was returned`);
			}
			connectMessage = `Opening ${selectedToolkitLabel} connection flow…`;
			await invalidateAll();
			window.location.assign(payload.connect_link);
		} catch (error) {
			connectError = error instanceof Error ? error.message : `Failed to start ${selectedToolkitLabel} connection`;
		} finally {
			connectBusy = false;
		}
	}
</script>

<SEO
	title="MCP Tools | CREATE SOMETHING AGENCY"
	description="Composio toolkit inventory and Hub-scoped readiness for your CREATE SOMETHING access lane."
	propertyName="agency"
	noindex={true}
/>

<ReportShell
	eyebrow="MCP Access"
	title="Tools"
	lede="Browse the Composio toolkit catalog, select a Hub lane, and inspect whether a selected toolkit is authorized, registered, and connected. Live Hub discovery visibility remains unverified in this v1 view."
	sideLabel="Signed in as"
	sideValue={data.user.email}
	sideMeta={`Updated ${formatDateTime(data.entitlement.updatedAt)}`}
>
	<svelte:fragment slot="summary">
		<SummaryItem
			label="Hubs"
			value={String(hubs.length)}
			note={selectedHub ? selectedHub.displayName : 'No assignment found'}
		/>
		<SummaryItem
			label="Catalog"
			value={`${catalog.snapshot.totalToolkits} toolkits`}
			note={`${catalog.snapshot.totalEstimatedTools} estimated tools`}
		/>
		<SummaryItem
			label="Selected Toolkit"
			value={catalog.selectedToolkit?.name ?? 'Choose a toolkit'}
			note={catalog.selectedToolkit?.slug ?? 'Catalog search'}
		/>
		<SummaryItem label="Visibility" value="Unverified" note="Authorization + registration + connection only" />
	</svelte:fragment>

	<ReportSection
		title="Scope"
		description="Select the Hub lane and toolkit you want to inspect. Search applies to the catalog and the live tool list for the selected toolkit."
		fullWidth={true}
	>
		<div class="scope-grid">
			<div>
				<label class="field-label" for="hub-select">Hub lane</label>
				<div class="chip-list">
					{#if hubs.length === 0}
						<p class="empty-note">No Hub assignments were resolved for this identity.</p>
					{:else}
						{#each hubs as hub}
							<a class:selected={hub.laneKey === data.selectedHub} class="chip" href={buildHref({ hub: hub.laneKey })}>
								{hub.displayName}
							</a>
						{/each}
					{/if}
				</div>
			</div>

			<form method="GET" class="search-form">
				{#if data.selectedHub}
					<input type="hidden" name="hub" value={data.selectedHub} />
				{/if}
				{#if data.selectedToolkit}
					<input type="hidden" name="toolkit" value={data.selectedToolkit} />
				{/if}
				<label class="field-label" for="catalog-search">Search</label>
				<div class="search-row">
					<input
						id="catalog-search"
						name="q"
						type="search"
						value={data.query ?? ''}
						placeholder="Search toolkits or tools"
					/>
					<button type="submit">Apply</button>
				</div>
			</form>
		</div>

		{#if hubFacts.length > 0}
			<div class="facts-wrap">
				<FactList items={hubFacts} />
			</div>
		{/if}

		{#if selectedHubLegacyNotice}
			<div class="warning-block legacy-block">
				<p>{selectedHubLegacyNotice}</p>
			</div>
		{/if}
	</ReportSection>

	<ReportSection
		title="Composio Catalog"
		description="Toolkit inventory comes from the repo’s generated MCP fleet registry. Live tool names are fetched only for the selected toolkit."
		fullWidth={true}
	>
		{#if catalog.warnings.length > 0}
			<div class="warning-block">
				{#each catalog.warnings as warning}
					<p>{warning}</p>
				{/each}
			</div>
		{/if}

		<div class="catalog-grid">
			<div class="panel">
				<h3>Toolkits</h3>
				<p class="panel-note">
					Showing {catalog.toolkits.length} of {catalog.total} matching toolkits.
				</p>
				<div class="toolkit-list">
					{#each catalog.toolkits as toolkit}
						<a
							class:selected={toolkit.slug === data.selectedToolkit}
							class="toolkit-link"
							href={buildHref({ toolkit: toolkit.slug })}
						>
							<span>{toolkit.name}</span>
							<span class="toolkit-meta">{toolkit.estimatedToolCount}</span>
						</a>
					{/each}
				</div>
			</div>

			<div class="panel">
				<h3>Selected Toolkit</h3>
				{#if catalog.selectedToolkit}
					<p class="panel-note">
						{catalog.selectedToolkit.description}
					</p>
					<table class="data-table">
						<thead>
							<tr>
								<th>Toolkit</th>
								<th>Auth</th>
								<th>Estimated Tools</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td>{catalog.selectedToolkit.name}</td>
								<td>{catalog.selectedToolkit.requiresAuth ? 'Required' : 'No auth'}</td>
								<td>{catalog.selectedToolkit.estimatedToolCount}</td>
							</tr>
						</tbody>
					</table>

					{#if catalog.tools.length > 0}
						<table class="data-table">
							<thead>
								<tr>
									<th>Tool</th>
									<th>Proxy Name</th>
								</tr>
							</thead>
							<tbody>
								{#each catalog.tools as tool}
									<tr>
										<td>
											<div class="tool-cell">
												<strong>{tool.name}</strong>
												<span>{tool.description || tool.slug}</span>
											</div>
										</td>
										<td><code>{tool.proxyToolName}</code></td>
									</tr>
								{/each}
							</tbody>
						</table>
					{:else}
						<p class="empty-note">Select a toolkit to load live tool names.</p>
					{/if}
				{:else}
					<p class="empty-note">Choose a toolkit from the left column.</p>
				{/if}
			</div>
		</div>
	</ReportSection>

	{#if availability}
		<ReportSection
			title="Hub Services"
			description="This view is Hub-scoped for authorization, but connection state is still client-scoped because partner toolkit bindings are stored at the client level today."
			fullWidth={true}
		>
			{#if availability.warnings.length > 0}
				<div class="warning-block">
					{#each availability.warnings as warning}
						<p>{warning}</p>
					{/each}
				</div>
			{/if}

			<div class="summary-grid">
				<div class="summary-card">
					<span>Scoped toolkits</span>
					<strong>{availability.summary.scopedToolkits}</strong>
				</div>
				<div class="summary-card">
					<span>Connected toolkits</span>
					<strong>{availability.summary.connectedToolkits}</strong>
				</div>
				<div class="summary-card">
					<span>Ready by policy</span>
					<strong>{availability.summary.readyToolkits}</strong>
				</div>
				<div class="summary-card">
					<span>Estimated tools in scope</span>
					<strong>{availability.summary.estimatedToolsInScope}</strong>
				</div>
			</div>

			{#if availability.services.length > 0}
				<table class="data-table">
					<thead>
						<tr>
							<th>Service</th>
							<th>Authorized</th>
							<th>Registered</th>
							<th>Connection</th>
							<th>Ready by policy</th>
						</tr>
					</thead>
					<tbody>
						{#each availability.services as service}
							<tr>
								<td>
									<div class="tool-cell">
										<strong>{service.name}</strong>
										<span>{service.serverName}</span>
									</div>
								</td>
								<td>{yesNo(service.authorized)}</td>
								<td>{yesNo(service.registered)}</td>
								<td>{statusLabel(service.connectionStatus)}</td>
								<td>{yesNo(service.readyByPolicy)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{:else}
				<p class="empty-note">{servicesEmptyNote}</p>
			{/if}
		</ReportSection>

		<ReportSection
			title="Selected Toolkit In This Hub"
			description="Per-tool rows combine lane authorization, registry registration, and client-scoped connection state. Live discovery visibility is not checked in this page."
			fullWidth={true}
		>
			{#if availability.selectedToolkit}
				<div class="selected-toolkit-card">
					<strong>{availability.selectedToolkit.toolkit}</strong>
					<span>Authorized: {yesNo(availability.selectedToolkit.authorized)}</span>
					<span>Registered: {yesNo(availability.selectedToolkit.registered)}</span>
					<span>Connection: {statusLabel(availability.selectedToolkit.connectionStatus)}</span>
					<span>Ready by policy: {yesNo(availability.selectedToolkit.readyByPolicy)}</span>
				</div>

				{#if canSelfServeLegacyConnect}
					<div class="action-block">
						<p class="panel-note">
							This legacy shared-auth lane can start the provider connect flow self-serve for the selected toolkit.
						</p>
						<div class="action-row">
							<button type="button" disabled={connectBusy} onclick={connectSelectedToolkit}>
								{connectBusy ? 'Opening…' : connectActionLabel}
							</button>
						</div>
						{#if connectMessage}
							<p class="feedback success">{connectMessage}</p>
						{/if}
						{#if connectError}
							<p class="feedback error">{connectError}</p>
						{/if}
					</div>
				{:else if selectedHub?.source === 'legacy' && availability.selectedToolkit.requiresAuth}
					<p class="empty-note">
						Self-serve connect is available only when the selected toolkit is both in scope and registered for this legacy lane.
					</p>
				{/if}
			{/if}

			{#if availability.tools.length > 0}
				<table class="data-table">
					<thead>
						<tr>
							<th>Tool</th>
							<th>Authorized</th>
							<th>Registered</th>
							<th>Connection</th>
							<th>Ready</th>
							<th>Reason</th>
						</tr>
					</thead>
					<tbody>
						{#each availability.tools as tool}
							<tr>
								<td>
									<div class="tool-cell">
										<strong>{tool.name}</strong>
										<span><code>{tool.proxyToolName}</code></span>
									</div>
								</td>
								<td>{yesNo(tool.authorized)}</td>
								<td>{yesNo(tool.registered)}</td>
								<td>{statusLabel(tool.connectionStatus)}</td>
								<td>{yesNo(tool.readyByPolicy)}</td>
								<td>{statusLabel(tool.reason)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{:else}
				<p class="empty-note">{selectedToolkitEmptyNote}</p>
			{/if}
		</ReportSection>
	{/if}
</ReportShell>

<style>
	.scope-grid,
	.catalog-grid {
		display: grid;
		gap: 1rem;
	}

	.scope-grid {
		grid-template-columns: minmax(0, 1fr) minmax(16rem, 24rem);
	}

	.catalog-grid {
		grid-template-columns: minmax(16rem, 20rem) minmax(0, 1fr);
		align-items: start;
	}

	.field-label {
		display: block;
		margin-bottom: 0.45rem;
		font-size: 0.82rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-fg-muted);
	}

	.search-form {
		min-width: 0;
	}

	.search-row {
		display: flex;
		gap: 0.6rem;
	}

	input[type='search'] {
		flex: 1;
		min-width: 0;
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.65rem;
		padding: 0.72rem 0.9rem;
		color: var(--color-fg-primary);
	}

	button {
		border: 1px solid rgba(255, 255, 255, 0.12);
		background: rgba(255, 255, 255, 0.04);
		color: var(--color-fg-primary);
		border-radius: 0.65rem;
		padding: 0.72rem 0.95rem;
		cursor: pointer;
	}

	button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.chip-list {
		display: flex;
		flex-wrap: wrap;
		gap: 0.55rem;
	}

	.chip,
	.toolkit-link {
		display: inline-flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.65rem;
		border: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(255, 255, 255, 0.02);
		color: var(--color-fg-primary);
		text-decoration: none;
		border-radius: 999px;
		padding: 0.45rem 0.8rem;
	}

	.toolkit-link {
		border-radius: 0.75rem;
		width: 100%;
	}

	.chip.selected,
	.toolkit-link.selected {
		border-color: rgba(255, 255, 255, 0.24);
		background: rgba(255, 255, 255, 0.08);
	}

	.panel {
		min-width: 0;
	}

	.panel h3 {
		margin: 0 0 0.35rem;
		font-size: 0.96rem;
	}

	.panel-note,
	.empty-note,
	.tool-cell span,
	.warning-block p {
		color: var(--color-fg-muted);
		font-size: 0.9rem;
		line-height: 1.55;
	}

	.toolkit-list {
		display: grid;
		gap: 0.5rem;
		max-height: 32rem;
		overflow: auto;
		padding-right: 0.2rem;
	}

	.toolkit-meta {
		font-family: ui-monospace, monospace;
		color: var(--color-fg-muted);
	}

	.warning-block {
		display: grid;
		gap: 0.3rem;
		margin-bottom: 1rem;
		padding: 0.8rem 0.9rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 0.8rem;
		background: rgba(255, 255, 255, 0.03);
	}

	.legacy-block {
		margin-top: 1rem;
	}

	.data-table {
		width: 100%;
		border-collapse: collapse;
		margin-top: 0.95rem;
		font-size: 0.92rem;
	}

	.data-table th,
	.data-table td {
		padding: 0.7rem 0.6rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
		text-align: left;
		vertical-align: top;
	}

	.data-table th {
		font-size: 0.78rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-fg-muted);
	}

	.tool-cell {
		display: grid;
		gap: 0.18rem;
	}

	.summary-grid {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 0.8rem;
		margin-bottom: 1rem;
	}

	.summary-card,
	.selected-toolkit-card,
	.action-block {
		display: grid;
		gap: 0.25rem;
		padding: 0.85rem 0.95rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 0.8rem;
		background: rgba(255, 255, 255, 0.02);
	}

	.action-block {
		margin-top: 0.95rem;
	}

	.action-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.65rem;
	}

	.summary-card span,
	.selected-toolkit-card span {
		color: var(--color-fg-muted);
		font-size: 0.88rem;
	}

	.summary-card strong,
	.selected-toolkit-card strong {
		font-size: 1.05rem;
	}

	.feedback {
		margin: 0;
		font-size: 0.84rem;
	}

	.feedback.success {
		color: #8de8a5;
	}

	.feedback.error {
		color: #ff8a80;
	}

	.facts-wrap {
		margin-top: 1rem;
	}

	code {
		font-family: ui-monospace, monospace;
		font-size: 0.84rem;
	}

	@media (max-width: 900px) {
		.scope-grid,
		.catalog-grid,
		.summary-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
