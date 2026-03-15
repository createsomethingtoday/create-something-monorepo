<script lang="ts">
	/**
	 * OUTERFIELDS Design Guidelines
	 *
	 * Typography, color palettes, accessibility standards, and component library
	 */
	import { Palette, Type, Accessibility, Layout, Sparkles, Box, ArrowUpRight, Play } from 'lucide-svelte';
	import { videoPlayer } from '$lib/stores/videoPlayer';
	import VideoModal from '$lib/components/VideoModal.svelte';

	// Sample video for component preview
	const sampleVideo = {
		id: 'v1',
		title: 'Weatherford, TX Promo',
		description: 'Showcasing the best of Weatherford, Texas',
		duration: '0:57',
		thumbnail: 'https://pub-cbac02584c2c4411aa214a7070ccd208.r2.dev/thumbnails/weatherford-promo.jpg',
		category: 'Promo',
		src: 'https://pub-cbac02584c2c4411aa214a7070ccd208.r2.dev/videos/weatherford-promo.mp4'
	};

	const components = [
		{
			name: 'Video Modal',
			description: 'Full-screen video player with engagement heatmap and controls',
			category: 'Media',
			demo: () => videoPlayer.play(sampleVideo),
			docsUrl: '#video-modal-docs'
		},
		{
			name: 'Play Button',
			description: 'Glassmorphism play button with hover states',
			category: 'Interactive',
			docsUrl: '#play-button-docs'
		},
		{
			name: 'Hero Section',
			description: 'Landing page hero with Sketchfab 3D embed',
			category: 'Layout',
			docsUrl: '#hero-docs'
		},
		{
			name: 'Pricing Cards',
			description: 'Three-tier pricing with brand accent highlights',
			category: 'Commerce',
			docsUrl: '#pricing-docs'
		}
	];

	const colors = [
		{ name: 'Primary', value: '#7c2bee', usage: 'Buttons and highlights' },
		{ name: 'Background', value: '#000000', usage: 'Page backgrounds' },
		{ name: 'Surface', value: '#111111', usage: 'Cards that sit above the page' },
		{ name: 'Subtle', value: '#1a1a1a', usage: 'Secondary backgrounds' },
		{ name: 'Text Primary', value: '#ffffff', usage: 'Headlines and body text' },
		{ name: 'Text Muted', value: 'rgba(255,255,255,0.46)', usage: 'Captions and supporting text' },
		{ name: 'Border', value: 'rgba(255,255,255,0.1)', usage: 'Lines between sections' },
		{ name: 'Success', value: '#44aa44', usage: 'When things go right' },
		{ name: 'Error', value: '#d44d4d', usage: 'When things go wrong' }
	];

	const typography = [
		{ name: 'Display', size: 'clamp(2.5rem, 4vw + 1.5rem, 5rem)', weight: '700', usage: 'Hero headlines' },
		{ name: 'H1', size: 'clamp(2rem, 3vw + 1rem, 3.5rem)', weight: '700', usage: 'Page titles' },
		{ name: 'H2', size: 'clamp(1.5rem, 2vw + 0.75rem, 2.25rem)', weight: '600', usage: 'Section headers' },
		{ name: 'H3', size: 'clamp(1.25rem, 1.5vw + 0.5rem, 1.75rem)', weight: '600', usage: 'Card titles' },
		{ name: 'Body', size: '1rem', weight: '400', usage: 'Body text' },
		{ name: 'Small', size: '0.875rem', weight: '400', usage: 'Captions, metadata' }
	];
</script>

<svelte:head>
	<title>Design Guidelines | OUTERFIELDS</title>
	<meta name="description" content="See how we design OUTERFIELDS. Our colors, type, and accessibility choices, all in one place." />
</svelte:head>

<div class="design-page">
	<div class="design-container">
		<header class="design-header">
			<div class="header-icon">
				<Palette size={40} />
			</div>
			<h1>Design Guidelines</h1>
			<p class="design-subtitle">
				See our colors, type, and how we make the platform work for everyone.
			</p>
		</header>

		<section class="lab-section">
			<div class="lab-container">
				<div class="lab-header">
					<div class="header-content">
						<h2 class="lab-title">Component Lab</h2>
						<p class="lab-description">Live previews of our atomic design system elements.</p>
					</div>
					<a href="/docs" class="view-all">
						View Full System
						<ArrowUpRight size={16} />
					</a>
				</div>

			<div class="components-grid">
				<!-- Cinematic Player -->
				<div class="component-card">
					<div class="card-header">
						<h3 class="component-name">Cinematic Player</h3>
						<span class="component-version">v2.1.0</span>
					</div>
					<div class="card-preview">
						<div class="preview-video">
							<img
								src="https://pub-cbac02584c2c4411aa214a7070ccd208.r2.dev/thumbnails/weatherford-promo.jpg"
								alt="Video preview"
								loading="lazy"
							/>
							<div class="video-gradient"></div>
							<div class="video-controls">
								<button class="play-button" onclick={() => videoPlayer.play(sampleVideo)} aria-label="Play video">
									<Play size={20} />
								</button>
								<div class="progress-bar">
									<div class="progress-fill"></div>
								</div>
							</div>
						</div>
						<div class="preview-overlay">
							<a href="/docs#video-modal-docs" class="docs-button primary">View Docs</a>
						</div>
					</div>
					<div class="card-footer">
						<p class="component-description">
							Watch videos in a full-screen player. Tracks when viewers replay parts. Click the play button to try it.
						</p>
					</div>
				</div>

				<!-- Engagement Heatmap -->
				<div class="component-card">
					<div class="card-header">
						<h3 class="component-name">Engagement Heatmap</h3>
						<span class="component-version">v1.0.0</span>
					</div>
					<div class="card-preview">
						<div class="preview-heatmap">
							<div class="heatmap-mock">
								<div class="heatmap-header">
									<div class="heatmap-label">Most Replayed</div>
									<div class="heatmap-time">2:34</div>
								</div>
								<div class="heatmap-bars">
									<div class="heatmap-bar" style="--height: 30%"></div>
									<div class="heatmap-bar" style="--height: 45%"></div>
									<div class="heatmap-bar peak" style="--height: 90%"></div>
									<div class="heatmap-bar" style="--height: 75%"></div>
									<div class="heatmap-bar" style="--height: 60%"></div>
									<div class="heatmap-bar" style="--height: 50%"></div>
									<div class="heatmap-bar peak" style="--height: 85%"></div>
									<div class="heatmap-bar" style="--height: 55%"></div>
									<div class="heatmap-bar" style="--height: 40%"></div>
									<div class="heatmap-bar" style="--height: 35%"></div>
								</div>
								<div class="heatmap-timeline">
									<div class="timeline-track">
										<div class="timeline-progress"></div>
										<div class="timeline-cursor"></div>
									</div>
								</div>
							</div>
						</div>
						<div class="preview-overlay">
							<a href="/docs#heatmap-docs" class="docs-button primary">View Docs</a>
						</div>
					</div>
					<div class="card-footer">
						<p class="component-description">
							See which parts of your videos viewers watch most. The heatmap shows engagement patterns in real time.
						</p>
					</div>
				</div>

				<!-- Metric Card -->
				<div class="component-card">
					<div class="card-header">
						<h3 class="component-name">Metric Card</h3>
						<span class="component-version">v3.0.1</span>
					</div>
					<div class="card-preview">
						<div class="preview-metric">
							<div class="metric-mock">
								<div class="metric-header">
									<div class="metric-label">Total Views</div>
									<div class="metric-status">Live</div>
								</div>
								<div class="metric-value">45.2K</div>
								<div class="metric-bar">
									<div class="metric-fill" style="width: 78%"></div>
								</div>
							</div>
						</div>
						<div class="preview-overlay">
							<a href="/docs#metric-docs" class="docs-button primary">View Docs</a>
						</div>
					</div>
					<div class="card-footer">
						<p class="component-description">
							Display metrics with progress bars and status indicators. Updates live as data changes.
						</p>
					</div>
				</div>
			</div>
		</div>
		</section>

		<section class="design-section">
			<div class="section-header">
				<Sparkles size={24} />
				<h2>Brand Principles</h2>
			</div>
			<div class="principles-grid">
				<div class="principle-card">
					<h3>Premium</h3>
					<p>Each piece earns its place. Nothing extra. Nothing distracting.</p>
				</div>
				<div class="principle-card">
					<h3>Accessible</h3>
					<p>We follow web accessibility guidelines. Text is easy to read on any screen, at any size.</p>
				</div>
				<div class="principle-card">
					<h3>Immersive</h3>
					<p>Content takes center stage. Interface fades into the background.</p>
				</div>
			</div>
		</section>

		<section class="design-section">
			<div class="section-header">
				<Palette size={24} />
				<h2>Color Palette</h2>
			</div>
			<div class="colors-grid">
				{#each colors as color}
					<div class="color-card">
						<div class="color-swatch" style="background: {color.value}"></div>
						<div class="color-info">
							<span class="color-name">{color.name}</span>
							<code class="color-value">{color.value}</code>
							<span class="color-usage">{color.usage}</span>
						</div>
					</div>
				{/each}
			</div>
		</section>

		<section class="design-section">
			<div class="section-header">
				<Type size={24} />
				<h2>Typography</h2>
			</div>
			<div class="typography-list">
				{#each typography as type}
					<div class="type-row">
						<div class="type-preview" style="font-size: {type.size}; font-weight: {type.weight}">
							{type.name}
						</div>
						<div class="type-info">
							<code>{type.size}</code>
							<span class="type-weight">Weight: {type.weight}</span>
							<span class="type-usage">{type.usage}</span>
						</div>
					</div>
				{/each}
			</div>
		</section>

		<section class="design-section">
			<div class="section-header">
				<Layout size={24} />
				<h2>Spacing</h2>
			</div>
			<p class="section-description">
				We use a spacing scale based on the golden ratio. It creates rhythm and balance.
			</p>
			<div class="spacing-grid">
				<div class="spacing-item">
					<div class="spacing-visual" style="width: 0.5rem; height: 0.5rem"></div>
					<code>--space-xs</code>
					<span>0.5rem (8px)</span>
				</div>
				<div class="spacing-item">
					<div class="spacing-visual" style="width: 1rem; height: 1rem"></div>
					<code>--space-sm</code>
					<span>1rem (16px)</span>
				</div>
				<div class="spacing-item">
					<div class="spacing-visual" style="width: 1.618rem; height: 1.618rem"></div>
					<code>--space-md</code>
					<span>1.618rem (26px)</span>
				</div>
				<div class="spacing-item">
					<div class="spacing-visual" style="width: 2.618rem; height: 2.618rem"></div>
					<code>--space-lg</code>
					<span>2.618rem (42px)</span>
				</div>
				<div class="spacing-item">
					<div class="spacing-visual" style="width: 4.236rem; height: 4.236rem"></div>
					<code>--space-xl</code>
					<span>4.236rem (68px)</span>
				</div>
			</div>
		</section>

		<section class="design-section">
			<div class="section-header">
				<Accessibility size={24} />
				<h2>Accessibility</h2>
			</div>
			<div class="accessibility-grid">
				<div class="a11y-card">
					<h3>Color Contrast</h3>
					<p>Text colors have enough contrast to read easily. We test against web accessibility guidelines (WCAG AA).</p>
				</div>
				<div class="a11y-card">
					<h3>Focus States</h3>
					<p>You can see which element you're on when using a keyboard. Every button and link shows a clear outline.</p>
				</div>
				<div class="a11y-card">
					<h3>Motion</h3>
					<p>If you prefer less motion, we turn animations off. We respect your system settings.</p>
				</div>
				<div class="a11y-card">
					<h3>Screen Readers</h3>
					<p>We use proper HTML structure so screen readers can navigate easily. Every page has clear headings.</p>
				</div>
			</div>
		</section>

		<footer class="design-footer">
			<a href="/" class="back-link">&larr; Back to Home</a>
		</footer>
	</div>
</div>

<!-- Video Modal Component -->
<VideoModal />

<style>
	.design-page {
		min-height: 100vh;
		padding: 8rem 1.5rem 4rem;
		background: var(--color-bg-pure);
	}

	.design-container {
		max-width: 64rem;
		margin: 0 auto;
	}

	.design-header {
		text-align: center;
		margin-bottom: 4rem;
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

	.design-header h1 {
		font-size: var(--text-h1);
		font-weight: 700;
		color: var(--color-fg-primary);
		margin: 0 0 0.75rem;
	}

	.design-subtitle {
		font-size: 1.125rem;
		color: var(--color-fg-muted);
		margin: 0;
		max-width: 32rem;
		margin: 0 auto;
	}

	.design-section {
		margin-bottom: 4rem;
	}

	.section-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 1.5rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid var(--color-border-default);
	}

	.section-header :global(svg) {
		color: var(--color-primary);
	}

	.section-header h2 {
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--color-fg-primary);
		margin: 0;
	}

	.section-description {
		color: var(--color-fg-muted);
		margin: 0 0 1.5rem;
	}

	.principles-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1.5rem;
	}

	.principle-card {
		padding: 1.5rem;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: 1rem;
	}

	.principle-card h3 {
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--color-fg-primary);
		margin: 0 0 0.5rem;
	}

	.principle-card p {
		font-size: 0.875rem;
		color: var(--color-fg-muted);
		margin: 0;
		line-height: 1.5;
	}

	.colors-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
		gap: 1rem;
	}

	.color-card {
		display: flex;
		gap: 1rem;
		padding: 1rem;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: 0.75rem;
	}

	.color-swatch {
		width: 3.5rem;
		height: 3.5rem;
		border-radius: 0.5rem;
		border: 1px solid var(--color-border-default);
		flex-shrink: 0;
	}

	.color-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		min-width: 0;
	}

	.color-name {
		font-weight: 600;
		color: var(--color-fg-primary);
		font-size: 0.875rem;
	}

	.color-value {
		font-size: 0.75rem;
		color: var(--color-fg-muted);
		background: var(--color-bg-subtle);
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
		width: fit-content;
	}

	.color-usage {
		font-size: 0.75rem;
		color: var(--color-fg-subtle);
	}

	.typography-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.type-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.5rem;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: 0.75rem;
	}

	.type-preview {
		color: var(--color-fg-primary);
		line-height: 1.2;
	}

	.type-info {
		display: flex;
		align-items: center;
		gap: 1rem;
		font-size: 0.75rem;
	}

	.type-info code {
		color: var(--color-fg-muted);
		background: var(--color-bg-subtle);
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
	}

	.type-weight {
		color: var(--color-fg-subtle);
	}

	.type-usage {
		color: var(--color-fg-muted);
	}

	.spacing-grid {
		display: flex;
		gap: 2rem;
		flex-wrap: wrap;
	}

	.spacing-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}

	.spacing-visual {
		background: var(--color-primary);
		border-radius: 0.25rem;
	}

	.spacing-item code {
		font-size: 0.75rem;
		color: var(--color-fg-secondary);
	}

	.spacing-item span {
		font-size: 0.75rem;
		color: var(--color-fg-muted);
	}

	.accessibility-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1rem;
	}

	.a11y-card {
		padding: 1.5rem;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: 0.75rem;
	}

	.a11y-card h3 {
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-fg-primary);
		margin: 0 0 0.5rem;
	}

	.a11y-card p {
		font-size: 0.875rem;
		color: var(--color-fg-muted);
		margin: 0;
		line-height: 1.5;
	}

	.design-footer {
		margin-top: 4rem;
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

	/* Component Lab Styles */
	.lab-section {
		margin-bottom: 4rem;
	}

	.lab-container {
		padding: 2rem;
		background: linear-gradient(135deg, rgba(124, 43, 238, 0.03) 0%, transparent 50%);
		border: 1px solid var(--color-border-default);
		border-radius: 1rem;
	}

	.lab-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 2rem;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.header-content {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.lab-title {
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--color-fg-primary);
		margin: 0;
	}

	.lab-description {
		font-size: 0.875rem;
		color: var(--color-fg-muted);
		margin: 0;
	}

	.view-all {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: 0.5rem;
		color: var(--color-fg-secondary);
		text-decoration: none;
		font-size: 0.875rem;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.view-all:hover {
		border-color: var(--color-primary);
		color: var(--color-primary);
		background: rgba(124, 43, 238, 0.05);
	}

	.components-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1.5rem;
	}

	.component-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: 1rem;
		overflow: hidden;
		transition: all var(--duration-standard) var(--ease-standard);
		position: relative;
	}

	.component-card:hover {
		border-color: var(--color-border-emphasis);
		transform: translateY(-4px);
		box-shadow: 0 8px 24px rgba(124, 43, 238, 0.15);
	}

	.card-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.25rem;
		border-bottom: 1px solid var(--color-border-default);
	}

	.component-name {
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-fg-primary);
		margin: 0;
	}

	.component-version {
		font-size: 0.75rem;
		color: var(--color-fg-muted);
		background: var(--color-bg-subtle);
		padding: 0.25rem 0.5rem;
		border-radius: 0.375rem;
	}

	.card-preview {
		position: relative;
		height: 200px;
		overflow: hidden;
	}

	.preview-overlay {
		position: absolute;
		inset: 0;
		background: rgba(0, 0, 0, 0.8);
		backdrop-filter: blur(8px);
		display: flex;
		align-items: center;
		justify-content: center;
		opacity: 0;
		transition: opacity var(--duration-standard) var(--ease-standard);
	}

	.component-card:hover .preview-overlay {
		opacity: 1;
	}

	.docs-button {
		padding: 0.75rem 1.5rem;
		background: var(--color-primary);
		color: white;
		border: none;
		border-radius: 0.5rem;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.docs-button:hover {
		filter: brightness(1.15);
		transform: scale(1.05);
	}

	.card-footer {
		padding: 1rem 1.25rem;
	}

	.component-description {
		font-size: 0.875rem;
		color: var(--color-fg-muted);
		margin: 0;
		line-height: 1.5;
	}

	/* Video Preview Styles */
	.preview-video {
		position: relative;
		width: 100%;
		height: 100%;
	}

	.preview-video img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.video-gradient {
		position: absolute;
		inset: 0;
		background: linear-gradient(to top, rgba(0, 0, 0, 0.8) 0%, transparent 60%);
	}

	.video-controls {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		padding: 1rem;
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.play-button {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.1);
		backdrop-filter: blur(10px);
		border: 1px solid rgba(255, 255, 255, 0.2);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		color: white;
		transition: all var(--duration-micro) var(--ease-standard);
		flex-shrink: 0;
	}

	.play-button:hover {
		background: rgba(255, 255, 255, 0.2);
		border-color: rgba(255, 255, 255, 0.4);
		transform: scale(1.1);
	}

	.progress-bar {
		flex: 1;
		height: 4px;
		background: rgba(255, 255, 255, 0.2);
		border-radius: 2px;
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		width: 35%;
		background: var(--color-primary);
		border-radius: 2px;
		animation: progress-animate 3s ease-in-out infinite;
	}

	@keyframes progress-animate {
		0%, 100% { width: 35%; }
		50% { width: 60%; }
	}

	/* Heatmap Preview Styles */
	.preview-heatmap {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-bg-pure);
		padding: 1.5rem;
	}

	.heatmap-mock {
		width: 100%;
		max-width: 300px;
	}

	.heatmap-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1rem;
	}

	.heatmap-label {
		font-size: 0.75rem;
		color: var(--color-fg-secondary);
		font-weight: 500;
	}

	.heatmap-time {
		font-size: 0.75rem;
		color: var(--color-primary);
		font-weight: 600;
	}

	.heatmap-bars {
		display: flex;
		align-items: flex-end;
		gap: 4px;
		height: 80px;
		margin-bottom: 0.75rem;
	}

	.heatmap-bar {
		flex: 1;
		height: var(--height);
		background: var(--color-border-emphasis);
		border-radius: 2px 2px 0 0;
		animation: bar-grow 1s ease-out;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.heatmap-bar:hover {
		background: var(--color-primary);
	}

	.heatmap-bar.peak {
		background: var(--color-primary);
	}

	@keyframes bar-grow {
		from {
			height: 0;
			opacity: 0;
		}
		to {
			height: var(--height);
			opacity: 1;
		}
	}

	.heatmap-timeline {
		width: 100%;
	}

	.timeline-track {
		position: relative;
		width: 100%;
		height: 4px;
		background: var(--color-border-default);
		border-radius: 2px;
		overflow: hidden;
	}

	.timeline-progress {
		position: absolute;
		left: 0;
		top: 0;
		height: 100%;
		width: 45%;
		background: var(--color-primary);
		border-radius: 2px;
		animation: timeline-progress 3s ease-in-out infinite;
	}

	@keyframes timeline-progress {
		0%, 100% { width: 45%; }
		50% { width: 70%; }
	}

	.timeline-cursor {
		position: absolute;
		left: 45%;
		top: 50%;
		transform: translate(-50%, -50%);
		width: 12px;
		height: 12px;
		background: var(--color-primary);
		border: 2px solid var(--color-bg-pure);
		border-radius: 50%;
		animation: cursor-move 3s ease-in-out infinite;
		box-shadow: 0 0 8px rgba(124, 43, 238, 0.5);
	}

	@keyframes cursor-move {
		0%, 100% { left: 45%; }
		50% { left: 70%; }
	}

	/* Metric Preview Styles */
	.preview-metric {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-bg-pure);
		padding: 1.5rem;
	}

	.metric-mock {
		width: 100%;
		max-width: 250px;
	}

	.metric-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.75rem;
	}

	.metric-label {
		font-size: 0.75rem;
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		font-weight: 500;
	}

	.metric-status {
		font-size: 0.75rem;
		color: var(--color-success);
		font-weight: 600;
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.metric-status::before {
		content: '';
		width: 6px;
		height: 6px;
		background: var(--color-success);
		border-radius: 50%;
		animation: pulse 2s ease-in-out infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; transform: scale(1); }
		50% { opacity: 0.5; transform: scale(0.8); }
	}

	.metric-value {
		font-size: 2.5rem;
		font-weight: 700;
		color: var(--color-fg-primary);
		margin-bottom: 0.75rem;
		animation: count-up 2s ease-out;
	}

	@keyframes count-up {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.metric-bar {
		height: 8px;
		background: var(--color-border-default);
		border-radius: 4px;
		overflow: hidden;
	}

	.metric-fill {
		height: 100%;
		background: linear-gradient(90deg, var(--color-brand, #7c2bee) 0%, var(--color-data-3, #c084fc) 100%);
		border-radius: var(--radius-sm);
		animation: fill-animate 2s ease-out;
	}

	@keyframes fill-animate {
		from { width: 0; }
		to { width: 78%; }
	}

	@media (max-width: 768px) {
		.components-grid {
			grid-template-columns: 1fr;
		}

		.lab-header {
			flex-direction: column;
			align-items: flex-start;
		}

		.principles-grid {
			grid-template-columns: 1fr;
		}

		.accessibility-grid {
			grid-template-columns: 1fr;
		}

		.type-row {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.75rem;
		}

		.type-info {
			flex-wrap: wrap;
		}
	}

	@media (max-width: 640px) {
		.design-page {
			padding: 6rem 1rem 3rem;
		}
	}
</style>
