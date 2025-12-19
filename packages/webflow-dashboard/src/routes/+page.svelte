<script lang="ts">
	import type { PageData } from './$types';
	import { Header } from '$lib/components/layout';
	import { MetricCard } from '$lib/components/dashboard';
	import { AssetGrid } from '$lib/components/assets';
	import { Package, CheckCircle, Clock, DollarSign } from 'lucide-svelte';

	let { data }: { data: PageData } = $props();

	function formatCurrency(value: number): string {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		}).format(value);
	}
</script>

<svelte:head>
	<title>Dashboard | Webflow Asset Dashboard</title>
</svelte:head>

<Header userEmail={data.user?.email} />

<main class="main">
	<div class="content">
		<header class="page-header">
			<h1 class="heading">Dashboard</h1>
			<p class="subtitle">
				Welcome back, {data.user?.email ?? 'Creator'}
			</p>
		</header>

		<section class="metrics-grid">
			<MetricCard
				title="Total Assets"
				value={data.stats?.totalAssets ?? 0}
				subtitle="All templates & cloneables"
			>
				{#snippet icon()}
					<Package />
				{/snippet}
			</MetricCard>

			<MetricCard
				title="Published"
				value={data.stats?.publishedAssets ?? 0}
				subtitle="Live on marketplace"
				trend="up"
				trendValue="+2 this month"
			>
				{#snippet icon()}
					<CheckCircle />
				{/snippet}
			</MetricCard>

			<MetricCard
				title="In Review"
				value={data.stats?.inReviewAssets ?? 0}
				subtitle="Pending approval"
			>
				{#snippet icon()}
					<Clock />
				{/snippet}
			</MetricCard>

			<MetricCard
				title="Total Revenue"
				value={formatCurrency(data.stats?.totalRevenue ?? 0)}
				subtitle="Lifetime earnings"
				trend="up"
				trendValue="+12% vs last month"
			>
				{#snippet icon()}
					<DollarSign />
				{/snippet}
			</MetricCard>
		</section>

		<section class="assets-section">
			<div class="section-header">
				<h2 class="section-title">Recent Assets</h2>
				<a href="/assets" class="view-all">View all</a>
			</div>
			<AssetGrid
				assets={data.assets ?? []}
				emptyMessage="No assets yet. Create your first template to get started."
			/>
		</section>
	</div>
</main>

<style>
	.main {
		min-height: calc(100vh - 60px);
	}

	.content {
		max-width: 1400px;
		margin: 0 auto;
		padding: 2rem 1.5rem;
	}

	.page-header {
		margin-bottom: 2rem;
	}

	.heading {
		font-family: var(--webflow-font-medium);
		font-size: 2rem;
		font-weight: 600;
		line-height: 1.2;
		color: var(--webflow-fg-primary);
		margin: 0;
	}

	.subtitle {
		font-size: 1rem;
		color: var(--webflow-fg-secondary);
		margin: 0.5rem 0 0;
	}

	.metrics-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
		gap: 1.5rem;
		margin-bottom: 3rem;
	}

	.assets-section {
		margin-top: 2rem;
	}

	.section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1.5rem;
	}

	.section-title {
		font-family: var(--webflow-font-medium);
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--webflow-fg-primary);
		margin: 0;
	}

	.view-all {
		font-size: 0.875rem;
		color: var(--webflow-blue);
		text-decoration: none;
		transition: opacity var(--webflow-duration) var(--webflow-ease);
	}

	.view-all:hover {
		opacity: 0.8;
	}
</style>
