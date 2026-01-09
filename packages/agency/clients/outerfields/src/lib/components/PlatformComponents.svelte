<script lang="ts">
	/**
	 * OUTERFIELDS Platform Components
	 *
	 * Rams-style breakdown of platform architecture - showing the essential components
	 */
	import { Video, CreditCard, BarChart3, Users, Palette, Globe, Check, ChevronUp, ChevronDown, ArrowDown } from 'lucide-svelte';
	import type { ComponentType } from 'svelte';

	// Icon mapping for dynamic rendering
	const iconMap: Record<string, ComponentType> = {
		video_library: Video,
		payments: CreditCard,
		analytics: BarChart3,
		groups: Users,
		palette: Palette,
		public: Globe
	};

	interface Component {
		id: string;
		number: string;
		name: string;
		description: string;
		icon: string;
		features: string[];
	}

	const components: Component[] = [
		{
			id: 'content',
			number: '01',
			name: 'Content Engine',
			description: 'The heart of your platform. Upload, organize, and deliver content with enterprise-grade reliability.',
			icon: 'video_library',
			features: ['Adaptive streaming', 'Auto-transcoding', 'Secure delivery', 'Global CDN']
		},
		{
			id: 'monetization',
			number: '02',
			name: 'Monetization Layer',
			description: 'Flexible revenue models that adapt to your business. From subscriptions to one-time purchases.',
			icon: 'payments',
			features: ['Subscription tiers', 'Pay-per-view', 'Bundle pricing', 'Trial periods']
		},
		{
			id: 'analytics',
			number: '03',
			name: 'Analytics Core',
			description: 'Understand your audience with real-time insights. Make data-driven decisions.',
			icon: 'analytics',
			features: ['Engagement metrics', 'Revenue tracking', 'Cohort analysis', 'Churn prediction']
		},
		{
			id: 'community',
			number: '04',
			name: 'Community Hub',
			description: 'Build lasting relationships with your audience. Forums, comments, and direct messaging.',
			icon: 'groups',
			features: ['Discussion forums', 'Comment threads', 'Member profiles', 'Private messaging']
		},
		{
			id: 'branding',
			number: '05',
			name: 'Brand System',
			description: 'Your platform, your identity. Complete white-label customization without code.',
			icon: 'palette',
			features: ['Custom domains', 'Logo & colors', 'Email templates', 'Landing pages']
		},
		{
			id: 'delivery',
			number: '06',
			name: 'Delivery Network',
			description: 'Global infrastructure that scales with you. 99.9% uptime, worldwide performance.',
			icon: 'public',
			features: ['280+ edge locations', 'Auto-scaling', 'DDoS protection', 'SSL certificates']
		}
	];

	let activeComponent = $state<string | null>(null);

	function toggleComponent(id: string) {
		activeComponent = activeComponent === id ? null : id;
	}
</script>

<section class="components-section" id="architecture">
	<div class="components-container">
		<div class="section-header">
			<span class="section-badge">Architecture</span>
			<h2 class="section-title">Platform Components</h2>
			<p class="section-description">
				Six essential systems working in harmony. Each component is designed to do one thing well.
			</p>
		</div>

		<div class="components-grid">
			{#each components as component}
				{@const Icon = iconMap[component.icon]}
				<button
					class="component-card"
					class:active={activeComponent === component.id}
					onclick={() => toggleComponent(component.id)}
				>
					<div class="component-header">
						<span class="component-number">{component.number}</span>
						<span class="component-icon">
							<Icon size={20} />
						</span>
					</div>

					<h3 class="component-name">{component.name}</h3>
					<p class="component-description">{component.description}</p>

					<div class="component-features" class:expanded={activeComponent === component.id}>
						<div class="features-list">
							{#each component.features as feature}
								<span class="feature-item">
									<Check size={14} />
									{feature}
								</span>
							{/each}
						</div>
					</div>

					<span class="expand-indicator">
						{#if activeComponent === component.id}
							<ChevronUp size={20} />
						{:else}
							<ChevronDown size={20} />
						{/if}
					</span>
				</button>
			{/each}
		</div>

		<div class="architecture-diagram">
			<div class="diagram-header">
				<span class="diagram-badge">System Overview</span>
				<h3 class="diagram-title">How It All Connects</h3>
			</div>
			<div class="diagram-visual">
				<div class="diagram-layer creator">
					<span class="layer-label">Creator</span>
					<div class="layer-nodes">
						<span class="node">Upload</span>
						<span class="node">Manage</span>
						<span class="node">Analyze</span>
					</div>
				</div>
				<div class="diagram-connector">
					<ArrowDown size={24} />
				</div>
				<div class="diagram-layer platform">
					<span class="layer-label">OUTERFIELDS</span>
					<div class="layer-nodes">
						<span class="node">Process</span>
						<span class="node">Store</span>
						<span class="node">Deliver</span>
					</div>
				</div>
				<div class="diagram-connector">
					<ArrowDown size={24} />
				</div>
				<div class="diagram-layer viewer">
					<span class="layer-label">Viewers</span>
					<div class="layer-nodes">
						<span class="node">Watch</span>
						<span class="node">Engage</span>
						<span class="node">Subscribe</span>
					</div>
				</div>
			</div>
		</div>
	</div>
</section>

<style>
	.components-section {
		padding: 6rem 1.5rem;
		background: var(--color-bg-pure);
	}

	.components-container {
		max-width: 72rem;
		margin: 0 auto;
	}

	.section-header {
		text-align: center;
		margin-bottom: 4rem;
	}

	.section-badge {
		display: inline-block;
		padding: 0.375rem 0.75rem;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-fg-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 1rem;
	}

	.section-title {
		font-size: clamp(2rem, 4vw, 3rem);
		font-weight: 700;
		color: var(--color-fg-primary);
		margin: 0 0 1rem;
	}

	.section-description {
		font-size: 1.125rem;
		color: var(--color-fg-muted);
		max-width: 36rem;
		margin: 0 auto;
		line-height: 1.7;
	}

	.components-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1.5rem;
		margin-bottom: 4rem;
	}

	.component-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: 1rem;
		padding: 1.5rem;
		text-align: left;
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.component-card:hover {
		border-color: var(--color-border-strong);
	}

	.component-card.active {
		border-color: var(--color-fg-primary);
	}

	.component-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1rem;
	}

	.component-number {
		font-size: 0.75rem;
		font-weight: 700;
		color: var(--color-fg-subtle);
		letter-spacing: 0.1em;
	}

	.component-icon {
		width: 2.5rem;
		height: 2.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-bg-pure);
		border: 1px solid var(--color-border-default);
		border-radius: 0.5rem;
		color: var(--color-fg-primary);
	}

	.component-name {
		font-size: 1.125rem;
		font-weight: 700;
		color: var(--color-fg-primary);
		margin: 0 0 0.5rem;
	}

	.component-description {
		font-size: 0.875rem;
		color: var(--color-fg-muted);
		line-height: 1.6;
		margin: 0 0 1rem;
	}

	.component-features {
		max-height: 0;
		overflow: hidden;
		transition: max-height var(--duration-standard) var(--ease-standard);
	}

	.component-features.expanded {
		max-height: 10rem;
	}

	.features-list {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		padding-top: 1rem;
		border-top: 1px solid var(--color-border-default);
	}

	.feature-item {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.25rem 0.5rem;
		background: var(--color-bg-pure);
		border: 1px solid var(--color-border-default);
		border-radius: 0.25rem;
		font-size: 0.75rem;
		color: var(--color-fg-secondary);
	}

	.expand-indicator {
		display: flex;
		justify-content: center;
		margin-top: 0.5rem;
		color: var(--color-fg-subtle);
	}

	/* Architecture Diagram */
	.architecture-diagram {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: 1rem;
		padding: 2rem;
	}

	.diagram-header {
		text-align: center;
		margin-bottom: 2rem;
	}

	.diagram-badge {
		display: inline-block;
		padding: 0.25rem 0.5rem;
		background: var(--color-bg-pure);
		border: 1px solid var(--color-border-default);
		border-radius: 0.25rem;
		font-size: 0.625rem;
		font-weight: 600;
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 0.5rem;
	}

	.diagram-title {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--color-fg-primary);
		margin: 0;
	}

	.diagram-visual {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}

	.diagram-layer {
		width: 100%;
		max-width: 32rem;
		padding: 1.5rem;
		background: var(--color-bg-pure);
		border: 1px solid var(--color-border-default);
		border-radius: 0.75rem;
		text-align: center;
	}

	.diagram-layer.platform {
		border-color: var(--color-fg-primary);
	}

	.layer-label {
		display: block;
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		margin-bottom: 1rem;
	}

	.diagram-layer.platform .layer-label {
		color: var(--color-fg-primary);
	}

	.layer-nodes {
		display: flex;
		justify-content: center;
		gap: 1rem;
	}

	.node {
		padding: 0.5rem 1rem;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: 0.5rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-fg-secondary);
	}

	.diagram-layer.platform .node {
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		border-color: var(--color-fg-primary);
	}

	.diagram-connector {
		color: var(--color-fg-subtle);
	}

	@media (max-width: 1024px) {
		.components-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 640px) {
		.components-grid {
			grid-template-columns: 1fr;
		}

		.layer-nodes {
			flex-wrap: wrap;
		}
	}
</style>
