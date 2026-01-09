<script lang="ts">
	/**
	 * OUTERFIELDS Documentation
	 *
	 * Comprehensive component library documentation for the PCN platform
	 */
	import {
		BookOpen, Code, Zap, Shield, Database, Globe, ArrowRight,
		Play, BarChart3, TrendingUp, Layout, Video, Users, CreditCard,
		Rocket, MessageSquare, Grid3X3, Calendar, Link, Infinity,
		Eye, Minimize2, Layers
	} from 'lucide-svelte';
	import type { ComponentType } from 'svelte';

	interface ComponentDoc {
		id: string;
		name: string;
		category: string;
		description: string;
		icon: ComponentType;
		props: { name: string; type: string; default?: string; description: string }[];
		features: string[];
		usage: string;
	}

	const components: ComponentDoc[] = [
		// Landing Page Components
		{
			id: 'hero-section',
			name: 'HeroSection',
			category: 'Landing Page',
			description: 'Full-width hero with gradient mesh background, animated ping badge, browser mockup preview, and stats row. Uses clamp() for responsive typography.',
			icon: Layout,
			props: [],
			features: [
				'Gradient mesh background with radial overlays',
				'Animated ping badge with pulsing dot',
				'Browser chrome mockup with frosted nav',
				'Responsive stats row (3 key metrics)',
				'CTA buttons with hover transforms'
			],
			usage: `<!-- Self-contained, no props required -->
<HeroSection />`
		},
		{
			id: 'platform-preview',
			name: 'PlatformPreview',
			category: 'Landing Page',
			description: 'Interactive tabbed preview showing User Portal and Admin Dashboard experiences. Uses Svelte 5 $state() for tab switching with frame chrome browser UI.',
			icon: Layers,
			props: [],
			features: [
				'Tab switching with $state() rune',
				'User portal: nav, hero, content rails',
				'Admin dashboard: sidebar, stats grid, chart',
				'Frosted glass frame chrome effect',
				'Responsive layout with scroll areas'
			],
			usage: `<!-- Svelte 5 with $state() rune -->
<script lang="ts">
  let activeTab = $state<'user' | 'admin'>('user');
</script>

<PlatformPreview />`
		},
		{
			id: 'feature-comparison',
			name: 'FeatureComparison',
			category: 'Landing Page',
			description: 'Side-by-side comparison table showing OUTERFIELDS advantages over Uscreen. Uses check/x icons for boolean values and highlighted text for strings.',
			icon: BarChart3,
			props: [],
			features: [
				'8 feature comparison rows',
				'Boolean values with Check/X icons',
				'String values with highlight styling',
				'Sticky headers on scroll',
				'Mobile-responsive table layout'
			],
			usage: `<!-- Comparison data is internal -->
<FeatureComparison />`
		},
		{
			id: 'pricing',
			name: 'Pricing',
			category: 'Landing Page',
			description: 'Three-tier pricing grid with Creator ($49), Professional ($149), and Business ($399) plans. Professional tier is highlighted with border emphasis.',
			icon: CreditCard,
			props: [],
			features: [
				'Three pricing tiers with feature lists',
				'Highlighted "Most Popular" tier',
				'Transaction fee disclosure (2.9% + 30¢)',
				'CTA buttons per tier',
				'Responsive grid (3→1 column)'
			],
			usage: `<Pricing />`
		},
		{
			id: 'demo-cta',
			name: 'DemoCTA',
			category: 'Landing Page',
			description: 'Call-to-action section with rocket badge, animated concentric rings, and dual CTA buttons. Used to drive demo signups.',
			icon: Rocket,
			props: [],
			features: [
				'Rocket emoji badge with animation',
				'Animated visual rings (3 concentric)',
				'Primary/secondary CTA buttons',
				'Glass card background effect',
				'Centered layout with max-width'
			],
			usage: `<DemoCTA />`
		},
		{
			id: 'testimonials',
			name: 'Testimonials',
			category: 'Landing Page',
			description: 'Creator success stories with quotes, avatar images, and revenue/subscriber stats. Two-column grid layout with glass card styling.',
			icon: MessageSquare,
			props: [],
			features: [
				'Quote cards with creator attribution',
				'Avatar images (64px circles)',
				'Revenue and subscriber metrics',
				'Star ratings display',
				'Two-column responsive grid'
			],
			usage: `<Testimonials />`
		},
		{
			id: 'ecosystem-features',
			name: 'EcosystemFeatures',
			category: 'Landing Page',
			description: 'Isometric 3D card layout showing Admin features (left tilt) and User features (right tilt). Uses CSS transforms for perspective effect.',
			icon: Grid3X3,
			props: [],
			features: [
				'Isometric 3D card transforms',
				'Admin features: Analytics, Content, Revenue, Community',
				'User features: Library, Progress, Community, Mobile',
				'Hover animations with scale',
				'Icon badges with gradient backgrounds'
			],
			usage: `<!-- CSS transforms: rotateY(8deg) rotateX(2deg) -->
<EcosystemFeatures />`
		},

		// Video Components
		{
			id: 'featured-videos',
			name: 'FeaturedVideos',
			category: 'Video',
			description: 'Interactive video grid with modal player, engagement heatmap, mini-player support, and live view counts via Cloudflare KV. Full-featured video experience.',
			icon: Video,
			props: [],
			features: [
				'6 video cards with thumbnails from R2 CDN',
				'Modal player with custom controls',
				'Engagement heatmap (Most Replayed visualization)',
				'Picture-in-picture mini-player mode',
				'Live view counts via videoStats store',
				'Fullscreen support with native API'
			],
			usage: `<!-- Integrates with videoPlayer and videoStats stores -->
<script lang="ts">
  import { videoPlayer } from '$lib/stores/videoPlayer';
  import { videoStats } from '$lib/stores/videoStats';
</script>

<FeaturedVideos />`
		},
		{
			id: 'mini-player',
			name: 'MiniPlayer',
			category: 'Video',
			description: 'Persistent picture-in-picture style player that stays in bottom-right corner. Syncs with videoPlayer store for seamless playback continuity.',
			icon: Minimize2,
			props: [],
			features: [
				'Fixed position bottom-right',
				'Play/pause toggle overlay',
				'Progress bar with fill animation',
				'Expand to modal action',
				'Close button to dismiss',
				'Store synchronization with $effect()'
			],
			usage: `<!-- Rendered conditionally via store state -->
{#if $videoPlayer.mode === 'mini'}
  <MiniPlayer />
{/if}`
		},

		// Architecture Components
		{
			id: 'platform-components',
			name: 'PlatformComponents',
			category: 'Architecture',
			description: 'Rams-style breakdown of 6 essential platform systems with expandable feature lists. Includes system overview diagram showing Creator → OUTERFIELDS → Viewers flow.',
			icon: Layers,
			props: [],
			features: [
				'6 component cards with icons',
				'Expandable feature lists on click',
				'$state() for active component tracking',
				'System overview diagram',
				'Arrow flow visualization',
				'Dynamic icon rendering via iconMap'
			],
			usage: `<!-- Uses $state() for accordion behavior -->
<script lang="ts">
  let activeComponent = $state<string | null>(null);
</script>

<PlatformComponents />`
		},
		{
			id: 'build-progress',
			name: 'BuildProgress',
			category: 'Architecture',
			description: 'Visual timeline showing 90-day build journey with milestone markers. Displays Concept → Core UI → Beta → Launch progression.',
			icon: Calendar,
			props: [],
			features: [
				'Progress bar with percentage fill',
				'4 milestone markers (Day 1, 30, 60, 90)',
				'Current milestone ping animation',
				'Complete/current/upcoming states',
				'Responsive milestone labels'
			],
			usage: `<!-- Milestones are internal data -->
<BuildProgress />`
		},
		{
			id: 'resource-links',
			name: 'ResourceLinks',
			category: 'Architecture',
			description: 'Two-column grid linking to Technical Documentation and Design Guidelines. Uses BookOpen and Palette icons with arrow hover effect.',
			icon: Link,
			props: [],
			features: [
				'Two resource cards (Docs, Design)',
				'Lucide icons with arrow indicators',
				'Hover border emphasis',
				'Glass card background',
				'Links to /docs and /design routes'
			],
			usage: `<ResourceLinks />`
		},
		{
			id: 'component-lab',
			name: 'ComponentLab',
			category: 'Architecture',
			description: 'Live previews of 3 design system components (Cinematic Player, Engagement Heatmap, Metric Card) with hover overlay linking to docs.',
			icon: Code,
			props: [],
			features: [
				'3 component preview cards',
				'Gradient placeholder visuals',
				'Hover overlay with "View Docs" button',
				'Badge labels for component names',
				'Links to component anchor IDs'
			],
			usage: `<ComponentLab />`
		},

		// Layout Components
		{
			id: 'navigation',
			name: 'Navigation',
			category: 'Layout',
			description: 'Fixed header with logo, nav links, and auth-aware buttons. Shows user info with role badge when logged in, or login/signup CTAs when not.',
			icon: Infinity,
			props: [
				{ name: 'user', type: 'User | null', default: 'null', description: 'Current user object with id, email, name, role' }
			],
			features: [
				'Fixed position with gradient background',
				'Infinity logo icon with brand name',
				'Nav links from constants/navigation.ts',
				'Auth state awareness via props',
				'User info with role badge (Admin)',
				'Logout button with icon',
				'Mobile-responsive link hiding'
			],
			usage: `<script lang="ts">
  interface Props {
    user?: { id: string; email: string; name?: string; role: string } | null;
  }
  let { user = null }: Props = $props();
</script>

<Navigation {user} />`
		},
		{
			id: 'footer',
			name: 'Footer',
			category: 'Layout',
			description: 'Minimal footer with copyright and links. Uses FOOTER_LINKS from constants for DRY compliance.',
			icon: Layout,
			props: [],
			features: [
				'Copyright with dynamic year',
				'Footer links from constants',
				'Flexbox layout (left/right)',
				'Mobile stacking behavior',
				'Border-top separator'
			],
			usage: `<!-- Links from FOOTER_LINKS constant -->
<Footer />`
		}
	];

	// Group components by category
	const categories = [...new Set(components.map(c => c.category))];

	const sections = [
		{
			icon: Zap,
			title: 'Quick Start',
			description: 'Get your content network up and running in under 15 minutes.',
			items: ['Account setup', 'First video upload', 'Customizing your portal', 'Publishing live']
		},
		{
			icon: Code,
			title: 'API Reference',
			description: 'Complete REST API documentation for developers.',
			items: ['Authentication', 'Content endpoints', 'User management', 'Webhooks']
		},
		{
			icon: Database,
			title: 'Content Management',
			description: 'Learn how to organize, tag, and deliver your content.',
			items: ['Video encoding', 'Adaptive streaming', 'Metadata & SEO', 'Content collections']
		},
		{
			icon: Shield,
			title: 'Security & Access',
			description: 'Configure access controls and protect your content.',
			items: ['DRM protection', 'Geo-restrictions', 'Token authentication', 'Rate limiting']
		},
		{
			icon: Globe,
			title: 'CDN & Delivery',
			description: 'Global content delivery with 280+ edge locations.',
			items: ['Edge caching', 'Performance optimization', 'Analytics integration', 'Custom domains']
		}
	];
</script>

<svelte:head>
	<title>Documentation | OUTERFIELDS</title>
	<meta name="description" content="OUTERFIELDS component library and API documentation - Build premium content networks." />
</svelte:head>

<div class="docs-page">
	<div class="docs-container">
		<header class="docs-header">
			<div class="header-icon">
				<BookOpen size={40} />
			</div>
			<h1>Documentation</h1>
			<p class="docs-subtitle">
				Component library and technical documentation for building premium content networks.
			</p>
		</header>

		<div class="search-section">
			<input type="text" placeholder="Search documentation..." class="search-input" />
		</div>

		<!-- Quick Start Sections -->
		<div class="docs-grid">
			{#each sections as section}
				<div class="doc-card">
					<div class="card-icon">
						<svelte:component this={section.icon} size={24} />
					</div>
					<h2>{section.title}</h2>
					<p class="card-description">{section.description}</p>
					<ul class="card-items">
						{#each section.items as item}
							<li>
								<a href="/docs/{section.title.toLowerCase().replace(/ /g, '-')}/{item.toLowerCase().replace(/ /g, '-')}">
									{item}
									<ArrowRight size={14} />
								</a>
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		</div>

		<!-- Component Library -->
		<section class="components-section">
			<div class="section-title">
				<Code size={24} />
				<h2>Component Library</h2>
			</div>
			<p class="section-description">
				{components.length} production-ready Svelte 5 components for building premium content experiences.
			</p>

			<!-- Category Navigation -->
			<div class="category-nav">
				{#each categories as category}
					<a href="#category-{category.toLowerCase().replace(/ /g, '-')}" class="category-link">
						{category}
						<span class="category-count">{components.filter(c => c.category === category).length}</span>
					</a>
				{/each}
			</div>

			<!-- Components by Category -->
			{#each categories as category}
				<div class="category-section" id="category-{category.toLowerCase().replace(/ /g, '-')}">
					<h3 class="category-title">{category} Components</h3>
					<div class="components-grid">
						{#each components.filter(c => c.category === category) as component}
							<div class="component-doc-card" id={component.id}>
								<div class="component-header">
									<div class="component-icon">
										<svelte:component this={component.icon} size={20} />
									</div>
									<div class="component-title-row">
										<h4>{component.name}</h4>
										<span class="component-category-badge">{component.category}</span>
									</div>
								</div>

								<p class="component-description">{component.description}</p>

								{#if component.props.length > 0}
									<div class="component-props">
										<h5>Props</h5>
										<div class="props-table">
											{#each component.props as prop}
												<div class="prop-row">
													<code class="prop-name">{prop.name}</code>
													<code class="prop-type">{prop.type}</code>
													{#if prop.default}
														<code class="prop-default">{prop.default}</code>
													{/if}
													<span class="prop-description">{prop.description}</span>
												</div>
											{/each}
										</div>
									</div>
								{/if}

								<div class="component-features">
									<h5>Features</h5>
									<ul>
										{#each component.features as feature}
											<li>{feature}</li>
										{/each}
									</ul>
								</div>

								<div class="component-usage">
									<h5>Usage</h5>
									<pre><code>{component.usage}</code></pre>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</section>

		<!-- Design Tokens Reference -->
		<section class="tokens-section">
			<div class="section-title">
				<Eye size={24} />
				<h2>Design Tokens</h2>
			</div>
			<p class="section-description">
				CSS custom properties used throughout the component library.
			</p>

			<div class="tokens-grid">
				<div class="token-card">
					<h4>Colors</h4>
					<div class="token-list">
						<div class="token-item">
							<span class="token-swatch" style="background: #ffffff"></span>
							<code>--color-primary</code>
							<span>#ffffff</span>
						</div>
						<div class="token-item">
							<span class="token-swatch" style="background: #000000"></span>
							<code>--color-bg-pure</code>
							<span>#000000</span>
						</div>
						<div class="token-item">
							<span class="token-swatch" style="background: rgba(255,255,255,0.05)"></span>
							<code>--color-bg-surface</code>
							<span>rgba(255,255,255,0.05)</span>
						</div>
						<div class="token-item">
							<span class="token-swatch" style="background: rgba(255,255,255,0.6)"></span>
							<code>--color-fg-muted</code>
							<span>rgba(255,255,255,0.6)</span>
						</div>
					</div>
				</div>

				<div class="token-card">
					<h4>Animation</h4>
					<div class="token-list">
						<div class="token-item">
							<code>--duration-micro</code>
							<span>200ms</span>
						</div>
						<div class="token-item">
							<code>--duration-standard</code>
							<span>300ms</span>
						</div>
						<div class="token-item">
							<code>--duration-complex</code>
							<span>500ms</span>
						</div>
						<div class="token-item">
							<code>--ease-standard</code>
							<span>cubic-bezier(0.4, 0, 0.2, 1)</span>
						</div>
					</div>
				</div>

				<div class="token-card">
					<h4>Typography</h4>
					<div class="token-list">
						<div class="token-item">
							<code>--text-display</code>
							<span>clamp(2.5rem, 4vw + 1.5rem, 5rem)</span>
						</div>
						<div class="token-item">
							<code>--text-h1</code>
							<span>clamp(2rem, 3vw + 1rem, 3.5rem)</span>
						</div>
						<div class="token-item">
							<code>--text-body</code>
							<span>1rem</span>
						</div>
						<div class="token-item">
							<code>--text-body-sm</code>
							<span>0.875rem</span>
						</div>
					</div>
				</div>
			</div>
		</section>

		<section class="help-section">
			<h2>Need Help?</h2>
			<p>Our team is here to support your integration journey.</p>
			<div class="help-actions">
				<a href="/contact" class="btn-secondary">Contact Support</a>
				<a href="https://github.com/outerfields" class="btn-outline" target="_blank" rel="noopener">
					View on GitHub
				</a>
			</div>
		</section>

		<footer class="docs-footer">
			<a href="/" class="back-link">&larr; Back to Home</a>
		</footer>
	</div>
</div>

<style>
	.docs-page {
		min-height: 100vh;
		padding: 8rem 1.5rem 4rem;
		background: var(--color-bg-pure);
	}

	.docs-container {
		max-width: 72rem;
		margin: 0 auto;
	}

	.docs-header {
		text-align: center;
		margin-bottom: 3rem;
	}

	.header-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 5rem;
		height: 5rem;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: 1rem;
		color: var(--color-primary);
		margin-bottom: 1.5rem;
	}

	.docs-header h1 {
		font-size: var(--text-h1);
		font-weight: 700;
		color: var(--color-fg-primary);
		margin: 0 0 0.75rem;
	}

	.docs-subtitle {
		font-size: 1.125rem;
		color: var(--color-fg-muted);
		margin: 0;
		max-width: 32rem;
		margin: 0 auto;
	}

	.search-section {
		max-width: 32rem;
		margin: 0 auto 3rem;
	}

	.search-input {
		width: 100%;
		padding: 1rem 1.25rem;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: 0.75rem;
		color: var(--color-fg-primary);
		font-size: 1rem;
		transition: border-color var(--duration-micro) var(--ease-standard);
	}

	.search-input::placeholder {
		color: var(--color-fg-subtle);
	}

	.search-input:focus {
		outline: none;
		border-color: var(--color-primary);
	}

	.docs-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(20rem, 1fr));
		gap: 1.5rem;
		margin-bottom: 4rem;
	}

	.doc-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: 1rem;
		padding: 1.5rem;
		transition: border-color var(--duration-micro) var(--ease-standard);
	}

	.doc-card:hover {
		border-color: var(--color-border-emphasis);
	}

	.card-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 3rem;
		height: 3rem;
		background: var(--color-bg-pure);
		border-radius: 0.75rem;
		color: var(--color-primary);
		margin-bottom: 1rem;
	}

	.doc-card h2 {
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--color-fg-primary);
		margin: 0 0 0.5rem;
	}

	.card-description {
		font-size: 0.875rem;
		color: var(--color-fg-muted);
		margin: 0 0 1rem;
		line-height: 1.5;
	}

	.card-items {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.card-items li {
		border-top: 1px solid var(--color-border-default);
	}

	.card-items a {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 0;
		color: var(--color-fg-secondary);
		text-decoration: none;
		font-size: 0.875rem;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.card-items a:hover {
		color: var(--color-primary);
	}

	.card-items a :global(svg) {
		opacity: 0;
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.card-items a:hover :global(svg) {
		opacity: 1;
	}

	/* Components Section */
	.components-section {
		margin-bottom: 4rem;
	}

	.section-title {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 0.5rem;
	}

	.section-title :global(svg) {
		color: var(--color-primary);
	}

	.section-title h2 {
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--color-fg-primary);
		margin: 0;
	}

	.section-description {
		font-size: 1rem;
		color: var(--color-fg-muted);
		margin: 0 0 2rem;
	}

	/* Category Navigation */
	.category-nav {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		margin-bottom: 2rem;
		padding-bottom: 1.5rem;
		border-bottom: 1px solid var(--color-border-default);
	}

	.category-link {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: 9999px;
		color: var(--color-fg-secondary);
		text-decoration: none;
		font-size: 0.875rem;
		font-weight: 500;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.category-link:hover {
		border-color: var(--color-border-emphasis);
		color: var(--color-fg-primary);
	}

	.category-count {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 1.25rem;
		height: 1.25rem;
		padding: 0 0.375rem;
		background: var(--color-bg-pure);
		border-radius: 9999px;
		font-size: 0.625rem;
		font-weight: 600;
		color: var(--color-fg-muted);
	}

	/* Category Sections */
	.category-section {
		margin-bottom: 3rem;
	}

	.category-title {
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--color-fg-primary);
		margin: 0 0 1.5rem;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid var(--color-border-default);
	}

	.components-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1.5rem;
	}

	.component-doc-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: 1rem;
		padding: 2rem;
		transition: border-color var(--duration-micro) var(--ease-standard);
	}

	.component-doc-card:hover {
		border-color: var(--color-border-emphasis);
	}

	.component-header {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.component-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.5rem;
		height: 2.5rem;
		background: var(--color-primary);
		border-radius: 0.75rem;
		color: var(--color-bg-pure);
		flex-shrink: 0;
	}

	.component-title-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.component-title-row h4 {
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--color-fg-primary);
		margin: 0;
	}

	.component-category-badge {
		font-size: 0.625rem;
		font-family: monospace;
		color: var(--color-fg-muted);
		background: var(--color-bg-pure);
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.component-description {
		font-size: 0.9375rem;
		color: var(--color-fg-secondary);
		margin: 0 0 1.5rem;
		line-height: 1.6;
	}

	/* Props Table */
	.component-props {
		margin-bottom: 1.5rem;
	}

	.component-props h5,
	.component-features h5,
	.component-usage h5 {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin: 0 0 0.75rem;
	}

	.props-table {
		background: var(--color-bg-pure);
		border: 1px solid var(--color-border-default);
		border-radius: 0.5rem;
		overflow: hidden;
	}

	.prop-row {
		display: grid;
		grid-template-columns: 1fr 1fr auto 2fr;
		gap: 1rem;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--color-border-default);
		align-items: center;
	}

	.prop-row:last-child {
		border-bottom: none;
	}

	.prop-name {
		font-size: 0.8125rem;
		color: var(--color-primary);
	}

	.prop-type {
		font-size: 0.75rem;
		color: var(--color-fg-muted);
	}

	.prop-default {
		font-size: 0.75rem;
		color: var(--color-fg-subtle);
		background: var(--color-bg-surface);
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
	}

	.prop-description {
		font-size: 0.8125rem;
		color: var(--color-fg-secondary);
	}

	.component-features {
		margin-bottom: 1.5rem;
	}

	.component-features ul {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
		gap: 0.5rem;
	}

	.component-features li {
		font-size: 0.875rem;
		color: var(--color-fg-secondary);
		padding-left: 1.25rem;
		position: relative;
	}

	.component-features li::before {
		content: '•';
		position: absolute;
		left: 0;
		color: var(--color-primary);
	}

	.component-usage pre {
		margin: 0;
		padding: 1rem 1.25rem;
		background: var(--color-bg-pure);
		border: 1px solid var(--color-border-default);
		border-radius: 0.5rem;
		overflow-x: auto;
	}

	.component-usage code {
		font-family: 'SF Mono', Monaco, 'Andale Mono', 'Ubuntu Mono', monospace;
		font-size: 0.8125rem;
		color: var(--color-fg-secondary);
		line-height: 1.6;
		white-space: pre;
	}

	/* Design Tokens Section */
	.tokens-section {
		margin-bottom: 4rem;
	}

	.tokens-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(20rem, 1fr));
		gap: 1.5rem;
	}

	.token-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: 1rem;
		padding: 1.5rem;
	}

	.token-card h4 {
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-fg-primary);
		margin: 0 0 1rem;
	}

	.token-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.token-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-size: 0.8125rem;
	}

	.token-swatch {
		width: 1.25rem;
		height: 1.25rem;
		border-radius: 0.25rem;
		border: 1px solid var(--color-border-default);
		flex-shrink: 0;
	}

	.token-item code {
		font-family: monospace;
		color: var(--color-primary);
		flex-shrink: 0;
	}

	.token-item span:last-child {
		color: var(--color-fg-muted);
		margin-left: auto;
	}

	/* Help Section */
	.help-section {
		text-align: center;
		padding: 3rem;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: 1rem;
		margin-bottom: 3rem;
	}

	.help-section h2 {
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--color-fg-primary);
		margin: 0 0 0.5rem;
	}

	.help-section p {
		font-size: 1rem;
		color: var(--color-fg-muted);
		margin: 0 0 1.5rem;
	}

	.help-actions {
		display: flex;
		gap: 1rem;
		justify-content: center;
		flex-wrap: wrap;
	}

	.btn-secondary {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		background: var(--color-bg-pure);
		border: 1px solid var(--color-border-default);
		border-radius: 0.5rem;
		color: var(--color-fg-primary);
		text-decoration: none;
		font-weight: 500;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.btn-secondary:hover {
		border-color: var(--color-border-emphasis);
		background: var(--color-bg-surface-hover);
	}

	.btn-outline {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		background: transparent;
		border: 1px solid var(--color-border-default);
		border-radius: 0.5rem;
		color: var(--color-fg-secondary);
		text-decoration: none;
		font-weight: 500;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.btn-outline:hover {
		border-color: var(--color-border-emphasis);
		color: var(--color-fg-primary);
	}

	.docs-footer {
		padding-top: 2rem;
		border-top: 1px solid var(--color-border-default);
	}

	.back-link {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		text-decoration: none;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.back-link:hover {
		color: var(--color-primary);
	}

	@media (max-width: 768px) {
		.prop-row {
			grid-template-columns: 1fr;
			gap: 0.25rem;
		}

		.prop-description {
			margin-top: 0.5rem;
		}
	}

	@media (max-width: 640px) {
		.docs-page {
			padding: 6rem 1rem 3rem;
		}

		.docs-grid {
			grid-template-columns: 1fr;
		}

		.category-nav {
			justify-content: center;
		}
	}
</style>
