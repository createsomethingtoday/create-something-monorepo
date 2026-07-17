<script lang="ts">
	import { SEO } from '@create-something/canon';
	let { data } = $props();
	const metrics = $derived([
		['Active maps', data.summary.active_maps], ['Archived maps', data.summary.archived_maps],
		['Workspaces', data.summary.workspace_count], ['Versions', data.summary.version_count],
		['Active shares', data.summary.active_shares], ['Prepared handoffs', data.summary.prepared_handoffs]
	]);
</script>

<SEO title="Map Operations | CREATE SOMETHING AGENCY" description="Privacy-safe Map product operations." propertyName="agency" noindex={true} />
<main>
	<header><p>Operator surface</p><h1>Map operations</h1><span>Signed in as {data.operatorEmail}. Aggregate state only; canvas JSON and share tokens are intentionally absent.</span></header>
	<section class="metrics">{#each metrics as metric}<article><span>{metric[0]}</span><strong>{metric[1]}</strong></article>{/each}</section>
	<section class="panel"><h2>Commercial gate</h2><dl><dt>Explicit approval</dt><dd>{data.commercial.approvalRecorded ? 'Recorded' : 'Not recorded'}</dd><dt>Monthly configuration</dt><dd>{data.commercial.monthlyConfigured ? 'Present' : 'Missing'}</dd><dt>Yearly configuration</dt><dd>{data.commercial.yearlyConfigured ? 'Present' : 'Missing'}</dd><dt>Checkout</dt><dd>{data.commercial.checkoutEnabled ? 'Enabled' : 'Fail closed'}</dd></dl></section>
	<section class="panel"><h2>Entitlement lifecycle</h2>{#if data.entitlements.length}<ul>{#each data.entitlements as item}<li><span>{item.entitlement_status.replace('_', ' ')}</span><strong>{item.count}</strong></li>{/each}</ul>{:else}<p>No Map subscription entitlements recorded.</p>{/if}</section>
	<footer><a href="/api/map/health">Credential-free health</a><a href="https://github.com/createsomethingtoday/create-something-monorepo/actions/workflows/agency-map-production-monitor.yml">Synthetic receipts</a><span>Runbook: docs/guides/MAP_PRODUCT_OPERATIONS.md</span></footer>
</main>

<style>
	main { max-width: 1100px; margin: 0 auto; padding: 7rem 1.5rem 5rem; color: #f5f5f5; } header { margin-bottom: 2.5rem; } header p { color: #fbbf24; text-transform: uppercase; letter-spacing: .12em; font-size: .7rem; } h1 { margin: .5rem 0; font-size: clamp(2.5rem, 6vw, 5rem); letter-spacing: -.06em; } header span, .panel p, footer { color: #a1a1aa; }
	.metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: .7rem; } article, .panel { border: 1px solid #27272a; border-radius: .75rem; padding: 1.2rem; background: #0c0c0d; } article { display: grid; gap: .5rem; } article span { color: #a1a1aa; font-size: .75rem; } article strong { font-size: 2rem; }
	.panel { margin-top: 1rem; } h2 { margin: 0 0 1rem; font-size: 1rem; } dl { display: grid; grid-template-columns: 1fr auto; gap: .6rem; } dt { color: #a1a1aa; } dd { margin: 0; } ul { list-style: none; padding: 0; margin: 0; } li { display: flex; justify-content: space-between; border-top: 1px solid #27272a; padding: .7rem 0; text-transform: capitalize; }
	footer { display: flex; flex-wrap: wrap; gap: 1rem; margin-top: 2rem; font-size: .75rem; } footer a { color: #d4d4d8; }
	@media (max-width: 700px) { .metrics { grid-template-columns: 1fr 1fr; } }
</style>
