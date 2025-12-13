<script lang="ts">
	/**
	 * TabbedSolutions Component
	 * Reusable tabbed interface for product solution pages
	 * Maverick X Design System
	 */

	import { inview } from '$lib/actions/inview';
	import Button from './Button.svelte';

	interface Solution {
		id: string;
		name: string;
		symbol?: string;
		headline?: string;
		description: string;
		details: string;
		image: string;
		features?: string[];
		stats?: Array<{ label: string; value: string }>;
	}

	interface Props {
		headline: string;
		solutions: Solution[];
		productPrefix: string;
		accentColor?: 'petrox' | 'lithx' | 'dme';
		labelType?: 'name' | 'symbol';
	}

	let {
		headline,
		solutions,
		productPrefix,
		accentColor = 'petrox',
		labelType = 'name'
	}: Props = $props();

	let activeTab = $state(solutions[0]?.id ?? '');
	let mobileOpen = $state(false);
	let visible = $state(false);
	let contentVisible = $state(false);

	const activeSolution = $derived(solutions.find((s) => s.id === activeTab));

	function handleTabChange(id: string) {
		contentVisible = false;
		setTimeout(() => {
			activeTab = id;
			mobileOpen = false;
			setTimeout(() => {
				contentVisible = true;
			}, 50);
		}, 200);
	}

	function openContactModal() {
		if (typeof window !== 'undefined') {
			// Map accentColor to categoryId: petrox, lithx, dme → petrox, lithx, water
			const categoryMap: Record<string, string> = {
				petrox: 'petrox',
				lithx: 'lithx',
				dme: 'water'
			};
			const categoryId = categoryMap[accentColor] ?? accentColor;

			window.dispatchEvent(new CustomEvent('openContactModal', {
				detail: {
					categoryId,
					productId: activeSolution?.id,
					applicationId: activeSolution?.id
				}
			}));
		}
	}

	// Initialize content visibility after mount
	$effect(() => {
		if (visible && !contentVisible) {
			setTimeout(() => {
				contentVisible = true;
			}, 300);
		}
	});

	// Color mappings
	const accentColors = {
		petrox: {
			bg: 'bg-[#FF7A00]',
			text: 'text-[#FF7A00]',
			bgLight: 'bg-[#FF7A00]/10',
			border: 'border-[#FF7A00]/30',
			shadow: 'shadow-[#FF7A00]/20',
			ring: 'ring-[#FF7A00]'
		},
		lithx: {
			bg: 'bg-[#00C2A8]',
			text: 'text-[#00C2A8]',
			bgLight: 'bg-[#00C2A8]/10',
			border: 'border-[#00C2A8]/30',
			shadow: 'shadow-[#00C2A8]/20',
			ring: 'ring-[#00C2A8]'
		},
		dme: {
			bg: 'bg-[#06B6D4]',
			text: 'text-[#06B6D4]',
			bgLight: 'bg-[#06B6D4]/10',
			border: 'border-[#06B6D4]/30',
			shadow: 'shadow-[#06B6D4]/20',
			ring: 'ring-[#06B6D4]'
		}
	};

	const colors = accentColors[accentColor];
</script>

<section use:inview oninview={() => (visible = true)} class="solutions-section">
	<div class="container">
		<!-- Header -->
		<div class="scroll-reveal" class:scroll-reveal-hidden={!visible}>
			<div class="solutions-header">
				<h2 class="solutions-title">{headline}</h2>
			</div>
		</div>

		<!-- Mobile: Solution Selector Button -->
		<div class="mobile-selector">
			<button type="button" onclick={() => (mobileOpen = !mobileOpen)} class="mobile-selector-btn">
				<div>
					<div class="mobile-selector-label">
						Selected {labelType === 'symbol' ? 'Metal' : 'Solution'}
					</div>
					<div class="mobile-selector-value">
						{productPrefix}
						{activeSolution?.symbol ?? activeSolution?.name}
					</div>
				</div>
				<svg
					class="mobile-selector-icon"
					class:rotate-180={mobileOpen}
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M19 9l-7 7-7-7"
					/>
				</svg>
			</button>
		</div>

		<!-- Mobile: Drawer -->
		{#if mobileOpen}
			<div class="mobile-drawer">
				<div class="mobile-drawer-content">
					{#each solutions as solution}
						<button
							type="button"
							onclick={() => handleTabChange(solution.id)}
							class="mobile-drawer-item"
							class:active={activeTab === solution.id}
							class:petrox={accentColor === 'petrox' && activeTab === solution.id}
							class:lithx={accentColor === 'lithx' && activeTab === solution.id}
							class:dme={accentColor === 'dme' && activeTab === solution.id}
						>
							{solution.name}
						</button>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Tab Navigation + Content -->
		<div class="solutions-grid">
			<!-- Left: Vertical Tabs (Desktop Only) -->
			<div class="scroll-reveal stagger-1" class:scroll-reveal-hidden={!visible}>
				<div role="tablist" aria-label="{productPrefix} Solutions" class="tabs-nav">
					<div class="tabs-list">
						{#each solutions as solution}
							<button
								type="button"
								onclick={() => handleTabChange(solution.id)}
								role="tab"
								aria-selected={activeTab === solution.id}
								aria-controls="panel-{solution.id}"
								id="tab-{solution.id}"
								class="tab-button"
								class:active={activeTab === solution.id}
								class:petrox={accentColor === 'petrox'}
								class:lithx={accentColor === 'lithx'}
								class:dme={accentColor === 'dme'}
							>
								{solution.name}
							</button>
						{/each}
					</div>
				</div>
			</div>

			<!-- Right: Two-Column Content -->
			{#if activeSolution}
				{#key activeTab}
					<div
						id="panel-{activeTab}"
						role="tabpanel"
						aria-labelledby="tab-{activeTab}"
						class="content-panel"
						class:content-visible={contentVisible}
					>
						<!-- Left Column: Text Content Card -->
						<div class="content-card" class:petrox={accentColor === 'petrox'}>
							<div>
								<div class="content-card-header">
									<h3 class="content-card-title">
										{productPrefix}
										{activeSolution.symbol ?? activeSolution.name}
									</h3>
									<p class="content-card-description">{activeSolution.description}</p>
								</div>

								{#if activeSolution.headline}
									<div
										class="content-card-highlight"
										class:petrox={accentColor === 'petrox'}
										class:lithx={accentColor === 'lithx'}
										class:dme={accentColor === 'dme'}
									>
										<p class="highlight-text">{activeSolution.headline}</p>
									</div>
								{/if}

								<p class="content-card-details">{activeSolution.details}</p>

								<!-- Features -->
								{#if activeSolution.features && activeSolution.features.length > 0}
									<div class="features-section">
										<h4 class="features-title">Key Features</h4>
										<ul class="features-list">
											{#each activeSolution.features as feature}
												<li
													class="feature-item"
													class:petrox={accentColor === 'petrox'}
													class:lithx={accentColor === 'lithx'}
													class:dme={accentColor === 'dme'}
												>
													<span class="feature-bullet"></span>
													<span>{feature}</span>
												</li>
											{/each}
										</ul>
									</div>
								{/if}

								<!-- Stats -->
								{#if activeSolution.stats && activeSolution.stats.length > 0}
									<div class="stats-grid">
										{#each activeSolution.stats as stat}
											<div
												class="stat-item"
												class:petrox={accentColor === 'petrox'}
												class:lithx={accentColor === 'lithx'}
												class:dme={accentColor === 'dme'}
											>
												<div class="stat-value">{stat.value}</div>
												<div class="stat-label">{stat.label}</div>
											</div>
										{/each}
									</div>
								{/if}
							</div>

							<Button
								title="Learn More"
								arrow
								light={accentColor !== 'petrox'}
								onclick={openContactModal}
							/>
						</div>

						<!-- Right Column: Image Card -->
						<div class="image-card">
							<img
								src={activeSolution.image}
								alt="{productPrefix} {activeSolution.name} product visualization"
								class="image-content"
							/>
						</div>
					</div>
				{/key}
			{/if}
		</div>
	</div>
</section>

<style>
	.solutions-section {
		padding: 7.5rem 0;
		background: #000000;
	}

	.solutions-header {
		margin-bottom: 4rem;
	}

	@media (max-width: 1179px) {
		.solutions-header {
			margin-bottom: 3rem;
		}
	}

	@media (max-width: 767px) {
		.solutions-header {
			margin-bottom: 2.5rem;
		}
	}

	.solutions-title {
		font-family: 'Inter Tight', 'Inter', system-ui, sans-serif;
		font-size: 2.5rem;
		font-weight: 500;
		color: #ffffff;
	}

	@media (max-width: 767px) {
		.solutions-title {
			font-size: 1.75rem;
		}
	}

	/* Mobile Selector */
	.mobile-selector {
		display: none;
		margin-bottom: 1.5rem;
	}

	@media (max-width: 1023px) {
		.mobile-selector {
			display: block;
		}
	}

	.mobile-selector-btn {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.5rem;
		background: rgba(255, 255, 255, 0.1);
		text-align: left;
	}

	.mobile-selector-label {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.6);
		margin-bottom: 0.25rem;
	}

	.mobile-selector-value {
		font-weight: 500;
		color: #ffffff;
	}

	.mobile-selector-icon {
		width: 1.25rem;
		height: 1.25rem;
		color: rgba(255, 255, 255, 0.6);
		transition: transform 0.3s ease;
	}

	/* Mobile Drawer */
	.mobile-drawer {
		display: none;
		overflow: hidden;
		margin-bottom: 1.5rem;
	}

	@media (max-width: 1023px) {
		.mobile-drawer {
			display: block;
		}
	}

	.mobile-drawer-content {
		background: rgba(255, 255, 255, 0.1);
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.mobile-drawer-item {
		width: 100%;
		text-align: left;
		padding: 0.75rem 1rem;
		color: #ffffff;
		transition: all 0.2s ease;
		background: rgba(255, 255, 255, 0.05);
	}

	.mobile-drawer-item:hover {
		background: rgba(255, 255, 255, 0.1);
	}

	.mobile-drawer-item.active {
		font-weight: 500;
	}

	.mobile-drawer-item.active.petrox {
		background: #ff7a00;
	}

	.mobile-drawer-item.active.lithx {
		background: #00c2a8;
	}

	.mobile-drawer-item.active.dme {
		background: #06b6d4;
	}

	/* Solutions Grid */
	.solutions-grid {
		display: grid;
		grid-template-columns: 240px 1fr;
		gap: 3rem;
	}

	@media (max-width: 1179px) {
		.solutions-grid {
			gap: 2.5rem;
		}
	}

	@media (max-width: 1023px) {
		.solutions-grid {
			grid-template-columns: 1fr;
			gap: 2rem;
		}
	}

	/* Tabs Navigation */
	.tabs-nav {
		display: block;
	}

	@media (max-width: 1023px) {
		.tabs-nav {
			display: none;
		}
	}

	.tabs-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.tab-button {
		width: 100%;
		text-align: left;
		padding: 0.75rem 1.5rem;
		color: #ffffff;
		transition: all 0.2s ease;
		background: rgba(255, 255, 255, 0.1);
	}

	.tab-button:hover {
		background: rgba(255, 255, 255, 0.15);
		transform: scale(1.02);
	}

	.tab-button:active {
		transform: scale(0.98);
	}

	.tab-button.active {
		font-weight: 500;
	}

	.tab-button.active.petrox {
		background: #ff7a00;
		box-shadow: 0 4px 6px -1px rgba(255, 122, 0, 0.2);
	}

	.tab-button.active.lithx {
		background: #00c2a8;
		box-shadow: 0 4px 6px -1px rgba(0, 194, 168, 0.2);
	}

	.tab-button.active.dme {
		background: #06b6d4;
		box-shadow: 0 4px 6px -1px rgba(6, 182, 212, 0.2);
	}

	/* Content Panel */
	.content-panel {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 2rem;
		opacity: 0;
		transform: translateY(20px);
		transition:
			opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1),
			transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.content-panel.content-visible {
		opacity: 1;
		transform: translateY(0);
	}

	@media (max-width: 1179px) {
		.content-panel {
			gap: 1.5rem;
		}
	}

	@media (max-width: 767px) {
		.content-panel {
			grid-template-columns: 1fr;
		}
	}

	/* Content Card */
	.content-card {
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		padding: 2rem;
		background: rgba(255, 255, 255, 0.05);
	}

	.content-card.petrox {
		background: #ffffff;
	}

	@media (max-width: 1179px) {
		.content-card {
			padding: 1.5rem;
		}
	}

	@media (max-width: 1023px) {
		.content-card {
			padding: 1.25rem;
		}
	}

	.content-card-header {
		margin-bottom: 1.5rem;
	}

	.content-card-title {
		font-family: 'Inter Tight', 'Inter', system-ui, sans-serif;
		font-size: 1.5rem;
		font-weight: 500;
		color: #ffffff;
		margin-bottom: 1rem;
	}

	.content-card.petrox .content-card-title {
		color: #212121;
	}

	.content-card-description {
		font-size: 1rem;
		line-height: 1.6;
		color: rgba(255, 255, 255, 0.7);
	}

	.content-card.petrox .content-card-description {
		color: #585858;
	}

	/* Highlight Box */
	.content-card-highlight {
		margin-bottom: 1.5rem;
		padding: 1rem;
		border-radius: 0;
	}

	.content-card-highlight.petrox {
		background: rgba(255, 122, 0, 0.05);
		border: 1px solid rgba(255, 122, 0, 0.1);
	}

	.content-card-highlight.lithx {
		background: rgba(0, 194, 168, 0.1);
		border: 1px solid rgba(0, 194, 168, 0.2);
	}

	.content-card-highlight.dme {
		background: rgba(6, 182, 212, 0.1);
		border: 1px solid rgba(6, 182, 212, 0.2);
	}

	.highlight-text {
		font-size: 0.875rem;
		font-weight: 600;
		line-height: 1.5;
	}

	.content-card.petrox .highlight-text {
		color: #ff7a00;
	}

	.content-card:not(.petrox) .highlight-text {
		color: #ffffff;
	}

	.content-card-details {
		font-size: 1rem;
		line-height: 1.6;
		margin-bottom: 1.5rem;
		color: rgba(255, 255, 255, 0.6);
	}

	.content-card.petrox .content-card-details {
		color: #888888;
	}

	/* Features */
	.features-section {
		margin-bottom: 1.5rem;
	}

	.features-title {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 0.75rem;
		color: rgba(255, 255, 255, 0.8);
	}

	.content-card.petrox .features-title {
		color: #585858;
	}

	.features-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.feature-item {
		display: flex;
		align-items: flex-start;
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.7);
	}

	.content-card.petrox .feature-item {
		color: #585858;
	}

	.feature-bullet {
		flex-shrink: 0;
		width: 0.375rem;
		height: 0.375rem;
		border-radius: 50%;
		margin-top: 0.5rem;
		margin-right: 0.5rem;
	}

	.feature-item.petrox .feature-bullet {
		background: #ff7a00;
	}

	.feature-item.lithx .feature-bullet {
		background: #00c2a8;
	}

	.feature-item.dme .feature-bullet {
		background: #06b6d4;
	}

	/* Stats Grid */
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1rem;
		margin-bottom: 2rem;
	}

	.stat-item {
		padding: 0.75rem;
	}

	.stat-item.petrox {
		background: #f5f5f5;
	}

	.stat-item.lithx,
	.stat-item.dme {
		background: rgba(255, 255, 255, 0.05);
	}

	.stat-value {
		font-size: 1.5rem;
		font-weight: 700;
	}

	.stat-item.petrox .stat-value {
		color: #ff7a00;
	}

	.stat-item.lithx .stat-value {
		color: #00c2a8;
	}

	.stat-item.dme .stat-value {
		color: #06b6d4;
	}

	.stat-label {
		font-size: 0.75rem;
		margin-top: 0.25rem;
		color: rgba(255, 255, 255, 0.6);
	}

	.stat-item.petrox .stat-label {
		color: #585858;
	}

	/* Image Card */
	.image-card {
		position: relative;
		aspect-ratio: 4 / 3;
		overflow: hidden;
		background: rgba(255, 255, 255, 0.05);
	}

	.image-content {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
</style>
