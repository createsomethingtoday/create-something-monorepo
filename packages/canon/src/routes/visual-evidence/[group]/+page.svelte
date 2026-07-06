<script lang="ts">
	import '$lib/styles/canon.css';

	import Button from '$lib/components/Button.svelte';
	import Alert from '$lib/components/feedback/Alert.svelte';
	import Dialog from '$lib/components/feedback/Dialog.svelte';
	import Progress from '$lib/components/feedback/Progress.svelte';
	import Skeleton from '$lib/components/feedback/Skeleton.svelte';
	import Spinner from '$lib/components/feedback/Spinner.svelte';
	import Toast from '$lib/components/feedback/Toast.svelte';
	import Checkbox from '$lib/components/form/Checkbox.svelte';
	import CheckboxGroup from '$lib/components/form/CheckboxGroup.svelte';
	import Radio from '$lib/components/form/Radio.svelte';
	import RadioGroup from '$lib/components/form/RadioGroup.svelte';
	import Select from '$lib/components/form/Select.svelte';
	import Switch from '$lib/components/form/Switch.svelte';
	import TextArea from '$lib/components/form/TextArea.svelte';
	import TextField from '$lib/components/form/TextField.svelte';
	import Breadcrumbs from '$lib/components/navigation/Breadcrumbs.svelte';
	import DropdownMenu from '$lib/components/navigation/DropdownMenu.svelte';
	import Pagination from '$lib/components/navigation/Pagination.svelte';
	import Popover from '$lib/components/navigation/Popover.svelte';
	import Tabs from '$lib/components/navigation/Tabs.svelte';
	import Tooltip from '$lib/components/navigation/Tooltip.svelte';
	import ClearActionFooter from '$lib/components/clear/ClearActionFooter.svelte';
	import ClearArtifactCard from '$lib/components/clear/ClearArtifactCard.svelte';
	import ClearContentHighlights from '$lib/components/clear/ClearContentHighlights.svelte';
	import ClearDecisionPanel from '$lib/components/clear/ClearDecisionPanel.svelte';
	import ClearErrorPage from '$lib/components/clear/ClearErrorPage.svelte';
	import ClearLogoStrip from '$lib/components/clear/ClearLogoStrip.svelte';
	import ClearMetadataRail from '$lib/components/clear/ClearMetadataRail.svelte';
	import ClearPageSection from '$lib/components/clear/ClearPageSection.svelte';
	import ClearPillarGrid from '$lib/components/clear/ClearPillarGrid.svelte';
	import ClearPlatformHero from '$lib/components/clear/ClearPlatformHero.svelte';
	import ClearProofStrip from '$lib/components/clear/ClearProofStrip.svelte';
	import ClearQuoteMetricPanel from '$lib/components/clear/ClearQuoteMetricPanel.svelte';
	import ClearReceiptGrid from '$lib/components/clear/ClearReceiptGrid.svelte';
	import ClearSecurityPanel from '$lib/components/clear/ClearSecurityPanel.svelte';
	import ClearStateRows from '$lib/components/clear/ClearStateRows.svelte';
	import ClearUseCaseBand from '$lib/components/clear/ClearUseCaseBand.svelte';
	import ClearWorkflowMiniArtifact from '$lib/components/clear/ClearWorkflowMiniArtifact.svelte';
	import DataTable, { type DataTableColumn } from '$lib/components/data/DataTable.svelte';
	import StatusBadge, { type StatusBadgeTone } from '$lib/components/data/StatusBadge.svelte';

	let { data }: { data: { group: string } } = $props();
	let textValue = $state('operator@example.com');
	let notesValue = $state('Evidence attached to the release handoff.');
	let checkedValue = $state(true);
	let radioValue = $state('review');
	let selectValue = $state('ship');
	let switchValue = $state(true);
	let activeTab = $state('overview');
	let menuOpen = $state(true);
	let popoverOpen = $state(true);
	let page = $state(4);

	const menuItems = [
		{ id: 'copy', label: 'Copy receipt' },
		{ id: 'open', label: 'Open source' },
		{ id: 'archive', label: 'Archive', disabled: true },
		{ id: 'delete', label: 'Delete', destructive: true, divider: true }
	];
	const tabs = [
		{ id: 'overview', label: 'Overview' },
		{ id: 'evidence', label: 'Evidence' },
		{ id: 'handoff', label: 'Handoff' }
	];
	const clearProofItems = [
		{ label: 'Policy', value: 'Attached' },
		{ label: 'Gate', value: 'Passed' },
		{ label: 'Rollback', value: 'Named' }
	];

	const findingColumns: DataTableColumn[] = [
		{ key: 'id', label: 'ID', mono: true, width: '4.5rem' },
		{ key: 'title', label: 'Finding', sortable: true },
		{ key: 'status', label: 'Status' },
		{ key: 'priority', label: 'Priority' },
		{ key: 'updated_at', label: 'Updated', mono: true, align: 'right', sortable: true }
	];
	const findingRows = [
		{ id: 'f-42', title: 'Cursor stale beyond 24h', status: 'needs_decision', priority: 'P0', updated_at: '2026-07-05T18:12:04Z' },
		{ id: 'f-41', title: 'Webhook retries exhausted', status: 'flagged', priority: 'P1', updated_at: '2026-07-05T16:40:19Z' },
		{ id: 'f-39', title: 'Categorize new intake items', status: 'in_progress', priority: 'P2', updated_at: '2026-07-04T22:05:51Z' },
		{ id: 'f-35', title: 'Backfill notification receipts', status: 'shipped', priority: 'P2', updated_at: '2026-07-03T09:18:33Z' },
		{ id: 'f-28', title: 'Legacy source audit', status: 'parked', priority: 'P3', updated_at: '2026-06-27T11:02:47Z' }
	];
	const statusTones: Record<string, { tone: StatusBadgeTone; emphasis?: boolean }> = {
		needs_decision: { tone: 'warning', emphasis: true },
		flagged: { tone: 'warning' },
		in_progress: { tone: 'info' },
		shipped: { tone: 'success' },
		parked: { tone: 'neutral' }
	};
	const priorityTones: Record<string, StatusBadgeTone> = {
		P0: 'error',
		P1: 'warning',
		P2: 'info',
		P3: 'neutral'
	};
</script>

<svelte:head>
	<title>Canon visual evidence: {data.group}</title>
</svelte:head>

<main class="visual-page" data-visual-evidence={data.group}>
	<header class="visual-header">
		<p>Canon visual evidence</p>
		<h1>{data.group}</h1>
	</header>

	{#if data.group === 'form'}
		<section class="visual-grid" aria-label="Form visual evidence">
			<TextField label="Operator email" description="Receipt owner" bind:value={textValue} required />
			<TextField label="Blocked field" value="Cannot edit" error="Approval is required." />
			<TextArea label="Handoff notes" bind:value={notesValue} />
			<Select label="Release plan" bind:value={selectValue}>
				<option value="review">Review</option>
				<option value="ship">Ship</option>
				<option value="rollback">Rollback</option>
			</Select>
			<Checkbox label="Approval recorded" description="The approval note is linked." bind:checked={checkedValue} />
			<Switch label="Daily digest" description="Send a morning summary." bind:checked={switchValue} />
			<CheckboxGroup legend="Evidence artifacts" orientation="horizontal">
				<Checkbox label="Run log" checked />
				<Checkbox label="Screenshot" checked />
				<Checkbox label="Rollback note" />
			</CheckboxGroup>
			<RadioGroup legend="Decision mode" name="decision-mode" bind:value={radioValue} orientation="horizontal">
				<Radio name="decision-mode" value="run" label="Run" checked={radioValue === 'run'} />
				<Radio name="decision-mode" value="review" label="Review" checked={radioValue === 'review'} />
				<Radio name="decision-mode" value="stop" label="Stop" checked={radioValue === 'stop'} />
			</RadioGroup>
		</section>
	{:else if data.group === 'feedback'}
		<section class="visual-grid" aria-label="Feedback visual evidence">
			<Alert variant="warning" title="Approval required" dismissible>
				This deployment needs an owner note before production promotion.
			</Alert>
			<Progress value={72} label="Evidence review" showValue />
			<Spinner label="Checking policy gate" />
			<div class="skeleton-stack" aria-label="Skeleton states">
				<Skeleton width="100%" height="1rem" />
				<Skeleton width="72%" height="1rem" />
				<Skeleton variant="rectangular" height="5rem" />
			</div>
			<Toast
				variant="success"
				title="Evidence attached"
				message="The handoff includes command output and rollback notes."
				duration={0}
			/>
			<Dialog open={true} title="Review decision" description="Confirm evidence, owner, and rollback path.">
				<p>The release is ready after the validation log is attached.</p>
			</Dialog>
		</section>
	{:else if data.group === 'navigation'}
		<section class="visual-grid" aria-label="Navigation visual evidence">
			<Breadcrumbs
				showHomeIcon
				items={[
					{ label: 'Canon', href: '/canon' },
					{ label: 'Components', href: '/canon/components' },
					{ label: 'Navigation' }
				]}
			/>
			<Tabs {tabs} bind:activeTab>
				{#snippet children(tabId)}
					<p>{tabId} content stays readable inside the panel.</p>
				{/snippet}
			</Tabs>
			<div class="visual-scroll">
				<Pagination totalPages={12} bind:page />
			</div>
			<div class="visual-overlay-fixture">
				<DropdownMenu items={menuItems} bind:open={menuOpen}>
					{#snippet trigger({ open })}
						<span>Actions {open ? 'open' : 'closed'}</span>
					{/snippet}
				</DropdownMenu>
			</div>
			<div class="visual-overlay-fixture visual-overlay-fixture--large">
				<Popover bind:open={popoverOpen}>
					{#snippet trigger()}
						<Button variant="secondary">Policy context</Button>
					{/snippet}
					<p>Write actions need an approval note and rollback path.</p>
				</Popover>
			</div>
			<div>
				<Tooltip content="Open command search" delay={0}>
					<Button variant="ghost">Search</Button>
				</Tooltip>
			</div>
		</section>
	{:else if data.group === 'data'}
		<section class="data-stack" aria-label="Database-layer visual evidence">
			<div class="data-panel">
				<h2 class="data-panel-title">Findings <span class="data-count">5</span></h2>
				<DataTable
					caption="Findings queue"
					columns={findingColumns}
					rows={findingRows}
					rowKey={(row) => row.id}
					sortKey="updated_at"
					sortDirection="desc"
					onsort={() => {}}
					onrowclick={() => {}}
				>
					{#snippet cell({ column, value })}
						{#if column.key === 'status'}
							<StatusBadge
								label={String(value).replace('_', ' ')}
								tone={statusTones[String(value)]?.tone ?? 'neutral'}
								emphasis={statusTones[String(value)]?.emphasis ?? false}
								variant="dot"
							/>
						{:else if column.key === 'priority'}
							<StatusBadge label={String(value)} tone={priorityTones[String(value)] ?? 'neutral'} />
						{:else}
							{String(value ?? '')}
						{/if}
					{/snippet}
				</DataTable>
			</div>
			<div class="data-panel">
				<h2 class="data-panel-title">Dense variant</h2>
				<DataTable columns={findingColumns.slice(0, 3)} rows={findingRows.slice(0, 3)} dense />
			</div>
			<div class="data-panel">
				<h2 class="data-panel-title">Empty state</h2>
				<DataTable columns={findingColumns} rows={[]} />
			</div>
			<div class="data-panel">
				<h2 class="data-panel-title">StatusBadge tones</h2>
				<div class="badge-row">
					<StatusBadge label="shipped" tone="success" />
					<StatusBadge label="failed" tone="error" />
					<StatusBadge label="needs decision" tone="warning" emphasis />
					<StatusBadge label="in progress" tone="info" />
					<StatusBadge label="parked" tone="neutral" />
				</div>
				<div class="badge-row">
					<StatusBadge label="current" tone="success" variant="dot" />
					<StatusBadge label="aging" tone="warning" variant="dot" />
					<StatusBadge label="stale" tone="error" variant="dot" />
					<StatusBadge label="queued" tone="info" variant="dot" />
					<StatusBadge label="skipped" tone="neutral" variant="dot" />
				</div>
			</div>
		</section>
	{:else}
		<section class="clear-stack" aria-label="Clear visual evidence">
			<ClearPlatformHero
				eyebrow="Governed workflow"
				title="Map the action before the agent runs."
				description="Name the object, approval rule, stop condition, and receipt before execution."
			/>
			<ClearPageSection
				title="Proof stays beside the claim."
				description="Each component keeps evidence, owner, and next action visible."
			/>
			<div class="clear-component-grid">
				<div>
					<ClearArtifactCard eyebrow="Receipt" title="Workflow map" detail="Objects, tools, approvals, and stop states are named." />
				</div>
				<div class="clear-component-span-2">
					<ClearProofStrip items={clearProofItems} />
				</div>
				<div class="clear-component-span-2">
					<ClearPillarGrid
						items={[
							{ title: 'Database', detail: 'State is named.' },
							{ title: 'Automation', detail: 'Tool path is tested.' },
							{ title: 'Judgment', detail: 'Policy is attached.' }
						]}
					/>
				</div>
				<div class="clear-component-span-2">
					<ClearDecisionPanel
						title="Decision state"
						items={[
							{
								label: 'Review',
								title: 'Approval needed',
								summary: 'The write path changes customer data.',
								detail: 'The policy requires operator review.',
								tone: 'review',
								evidence: ['Target named', 'Policy attached'],
								receipts: ['approval-log']
							}
						]}
					/>
				</div>
				<div>
					<ClearStateRows
						eyebrow="Workflow"
						title="Run state"
						states={[
							{ label: 'Map', state: 'READY', tone: 'run', detail: 'Workflow map exists.' },
							{ label: 'Ship', state: 'WAIT', tone: 'wait', detail: 'Needs owner approval.' }
						]}
						receipts={['visual-evidence', 'rollback-note']}
					/>
				</div>
				<div class="clear-component-span-2">
					<ClearReceiptGrid receipts={[{ number: '01', label: 'Validation', detail: 'Checks passed.' }]} />
				</div>
				<div>
					<ClearContentHighlights
						title="Evidence highlights"
						items={[
							{ title: 'Run log', detail: 'Command output attached.' },
							{ title: 'Rollback', detail: 'Recovery path named.' },
							{ title: 'Owner', detail: 'Operator assigned.' }
						]}
					/>
				</div>
				<div>
					<ClearMetadataRail
						eyebrow="Release"
						title="Metadata"
						groups={[
							{
								title: 'Run',
								items: [
									{ label: 'Owner', value: 'Operator' },
									{ label: 'State', value: 'Ready' },
									{ label: 'Receipt', value: 'Attached' }
								]
							}
						]}
						tags={['Canon', 'Visual evidence']}
					/>
				</div>
				<div class="clear-component-span-2">
					<ClearQuoteMetricPanel
						eyebrow="Proof"
						quote="The system should stop when the write target is ambiguous."
						source="Canon policy"
						metrics={[{ label: 'Checks', value: '840/840' }]}
					/>
				</div>
				<div class="clear-mini-artifact">
					<ClearWorkflowMiniArtifact kind="decision" ariaLabel="Decision workflow miniature" />
				</div>
			</div>
			<ClearLogoStrip eyebrow="Trusted by" items={[{ label: 'CREATE', detail: 'Verified' }, { label: 'Canon', detail: 'Ready' }]} />
			<ClearSecurityPanel
				eyebrow="Controls"
				title="Security controls"
				description="Access and approval stay visible."
				items={[
					{ label: 'Access', title: 'Scoped', detail: 'The route names its write surface.' },
					{ label: 'Approval', title: 'Required', detail: 'Promotion pauses without an owner note.' }
				]}
				logs={[
					{ label: 'policy', value: 'attached' },
					{ label: 'rollback', value: 'named' }
				]}
			/>
			<ClearUseCaseBand
				title="Use cases"
				items={[
					{ title: 'Review', detail: 'Pause before production writes.' },
					{ title: 'Handoff', detail: 'Attach receipts for the next operator.' }
				]}
			/>
			<ClearErrorPage
				status={503}
				propertyLabel="Canon"
				title="Recovery path"
				description="The route failed safely."
				primaryLabel="Return to Canon"
				primaryHref="/visual-evidence/clear"
			/>
			<ClearActionFooter
				title="Keep the proof attached."
				description="The final action names the workflow, owner, and receipt."
				items={clearProofItems}
			/>
		</section>
	{/if}
</main>

<style>
	.visual-page {
		min-height: 100vh;
		padding: 2rem;
		background: var(--color-bg-pure);
		color: var(--color-fg-primary);
	}

	.visual-header {
		margin: 0 auto 1.5rem;
		max-width: 72rem;
	}

	.visual-header p {
		margin: 0 0 0.25rem;
		color: var(--color-fg-muted);
		font-family: var(--font-mono);
		font-size: 0.78rem;
		text-transform: uppercase;
	}

	.visual-header h1 {
		margin: 0;
		font-size: 2rem;
	}

	.visual-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
		gap: 1rem;
		max-width: 72rem;
		margin: 0 auto;
	}

	.visual-scroll {
		max-width: 100%;
		overflow-x: auto;
	}

	.visual-overlay-fixture {
		min-height: 13.5rem;
		min-width: 0;
	}

	.visual-overlay-fixture--large {
		min-height: 14rem;
	}

	.clear-stack {
		display: grid;
		gap: 1.5rem;
		margin-inline: -2rem;
	}

	.clear-component-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1rem;
		width: min(72rem, calc(100% - 2.5rem));
		margin-inline: auto;
	}

	.clear-component-grid > * {
		min-width: 0;
	}

	.clear-component-span-2 {
		grid-column: span 2;
	}

	.clear-mini-artifact {
		display: grid;
		min-height: 14rem;
		place-items: center;
		border: 1px solid var(--color-clear-border, #e1e1e1);
		background: var(--color-clear-panel, #ffffff);
	}

	.skeleton-stack {
		display: grid;
		gap: 0.65rem;
		padding: 1rem;
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
	}

	.data-stack {
		display: grid;
		gap: 1.5rem;
		max-width: 72rem;
		margin: 0 auto;
	}

	.data-panel {
		min-width: 0;
		padding: 1rem;
		background: var(--color-shell-surface, var(--color-bg-surface));
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
	}

	.data-panel-title {
		margin: 0 0 0.75rem;
		font-size: var(--text-h3);
		font-weight: var(--font-medium);
	}

	.data-count {
		font-family: var(--font-mono);
		color: var(--color-fg-muted);
	}

	.badge-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		align-items: center;
	}

	.badge-row + .badge-row {
		margin-top: 0.75rem;
	}

	@media (max-width: 760px) {
		.visual-page {
			padding: 1rem;
		}

		.visual-grid {
			grid-template-columns: minmax(0, 1fr);
		}

		.clear-stack {
			margin-inline: -1rem;
		}

		.clear-component-grid {
			grid-template-columns: 1fr;
			width: min(100% - 2rem, 72rem);
		}

		.clear-component-span-2 {
			grid-column: span 1;
		}
	}
</style>
