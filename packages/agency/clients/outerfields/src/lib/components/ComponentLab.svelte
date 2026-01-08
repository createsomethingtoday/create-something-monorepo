<script lang="ts">
	/**
	 * OUTERFIELDS Component Lab
	 *
	 * Live previews of design system components
	 */
	import { ArrowUpRight, Play, Code } from 'lucide-svelte';

	interface Component {
		id: string;
		name: string;
		version: string;
		description: string;
		type: 'video' | 'nav' | 'metric';
	}

	const components: Component[] = [
		{
			id: 'player',
			name: 'Cinematic Player',
			version: 'v2.1.0',
			description: 'Responsive video container with custom controls overlay and gradient masking for immersive viewing.',
			type: 'video'
		},
		{
			id: 'glass-nav',
			name: 'Glass Nav',
			version: 'v1.4.2',
			description: 'Top-level navigation utilizing backdrop-filter blur and semi-transparent layers.',
			type: 'nav'
		},
		{
			id: 'metric-card',
			name: 'Metric Card',
			version: 'v3.0.1',
			description: 'High-contrast data visualization card with status indicators and subtle effects.',
			type: 'metric'
		}
	];
</script>

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
			{#each components as component}
				<div class="component-card">
					<div class="card-header">
						<h3 class="component-name">{component.name}</h3>
						<span class="component-version">{component.version}</span>
					</div>

					<div class="card-preview">
						{#if component.type === 'video'}
							<div class="preview-video">
								<img
									src="https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=640&h=360&fit=crop"
									alt="Video preview"
									loading="lazy"
								/>
								<div class="video-gradient"></div>
								<div class="video-controls">
									<Play size={20} />
									<div class="progress-bar">
										<div class="progress-fill"></div>
									</div>
								</div>
							</div>
						{:else if component.type === 'nav'}
							<div class="preview-nav">
								<div class="nav-mock">
									<div class="nav-left">
										<div class="nav-dot"></div>
										<div class="nav-bar"></div>
									</div>
									<div class="nav-links">
										<div class="nav-link"></div>
										<div class="nav-link"></div>
									</div>
									<div class="nav-avatar"></div>
								</div>
							</div>
						{:else if component.type === 'metric'}
							<div class="preview-metric">
								<div class="metric-mock">
									<div class="metric-header">
										<div class="metric-label"></div>
										<div class="metric-status"></div>
									</div>
									<div class="metric-value"></div>
									<div class="metric-bar"></div>
								</div>
							</div>
						{/if}

						<div class="preview-overlay">
							<button class="copy-button">
								<Code size={16} />
								Copy Code
							</button>
							<button class="docs-button">View Docs</button>
						</div>
					</div>

					<div class="card-footer">
						<p class="component-description">{component.description}</p>
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>

<style>
	.lab-section {
		padding: 6rem 1.5rem;
		background: var(--color-bg-pure);
	}

	.lab-container {
		max-width: 72rem;
		margin: 0 auto;
	}

	.lab-header {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		padding-bottom: 1.5rem;
		margin-bottom: 2rem;
		border-bottom: 1px solid var(--color-border-default);
	}

	.lab-title {
		font-size: 1.75rem;
		font-weight: 700;
		color: var(--color-fg-primary);
		margin: 0 0 0.5rem;
	}

	.lab-description {
		font-size: 1rem;
		color: var(--color-fg-muted);
		margin: 0;
	}

	.view-all {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-fg-primary);
		text-decoration: none;
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.view-all:hover {
		opacity: 0.7;
	}

	.components-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 2rem;
	}

	.component-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: 0.75rem;
		overflow: hidden;
		transition: border-color var(--duration-micro) var(--ease-standard);
	}

	.component-card:hover {
		border-color: var(--color-border-strong);
	}

	.card-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1.25rem;
		border-bottom: 1px solid var(--color-border-default);
	}

	.component-name {
		font-size: 1rem;
		font-weight: 700;
		color: var(--color-fg-primary);
		margin: 0;
	}

	.component-version {
		font-size: 0.625rem;
		font-family: monospace;
		color: var(--color-fg-subtle);
		background: rgba(0, 0, 0, 0.4);
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
	}

	.card-preview {
		position: relative;
		aspect-ratio: 16 / 10;
		background: var(--color-bg-pure);
		overflow: hidden;
	}

	.preview-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		background: rgba(0, 0, 0, 0.85);
		backdrop-filter: blur(4px);
		opacity: 0;
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.component-card:hover .preview-overlay {
		opacity: 1;
	}

	.copy-button {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		border: none;
		border-radius: 0.5rem;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.copy-button:hover {
		opacity: 0.9;
	}

	.docs-button {
		background: none;
		border: none;
		color: var(--color-fg-muted);
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.docs-button:hover {
		color: var(--color-fg-primary);
	}

	.card-footer {
		padding: 1rem 1.25rem;
		background: rgba(0, 0, 0, 0.2);
	}

	.component-description {
		font-size: 0.75rem;
		color: var(--color-fg-subtle);
		line-height: 1.6;
		margin: 0;
	}

	/* Video Preview */
	.preview-video {
		position: relative;
		width: 100%;
		height: 100%;
	}

	.preview-video img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		opacity: 0.6;
	}

	.video-gradient {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		height: 3rem;
		background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
	}

	.video-controls {
		position: absolute;
		bottom: 1rem;
		left: 1rem;
		right: 1rem;
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.progress-bar {
		flex: 1;
		height: 4px;
		background: rgba(255, 255, 255, 0.2);
		border-radius: 2px;
	}

	.progress-fill {
		width: 33%;
		height: 100%;
		background: var(--color-fg-primary);
		border-radius: 2px;
	}

	/* Nav Preview */
	.preview-nav {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1.5rem;
		background: radial-gradient(ellipse at center, rgba(255, 255, 255, 0.02), transparent);
	}

	.nav-mock {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 1rem;
		background: rgba(255, 255, 255, 0.1);
		backdrop-filter: blur(8px);
		border: 1px solid rgba(255, 255, 255, 0.05);
		border-radius: 0.5rem;
	}

	.nav-left {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.nav-dot {
		width: 0.75rem;
		height: 0.75rem;
		background: rgba(255, 255, 255, 0.2);
		border-radius: 50%;
	}

	.nav-bar {
		width: 3rem;
		height: 0.75rem;
		background: rgba(255, 255, 255, 0.2);
		border-radius: 9999px;
	}

	.nav-links {
		display: flex;
		gap: 0.5rem;
	}

	.nav-link {
		width: 2rem;
		height: 0.75rem;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 9999px;
	}

	.nav-avatar {
		width: 1rem;
		height: 1rem;
		background: var(--color-fg-primary);
		border-radius: 50%;
	}

	/* Metric Preview */
	.preview-metric {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		background: radial-gradient(ellipse at top right, rgba(255, 255, 255, 0.05), transparent);
	}

	.metric-mock {
		width: 75%;
		aspect-ratio: 4 / 3;
		background: var(--color-bg-pure);
		border: 1px solid var(--color-border-default);
		border-radius: 0.5rem;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
	}

	.metric-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
	}

	.metric-label {
		width: 33%;
		height: 0.5rem;
		background: rgba(255, 255, 255, 0.4);
		border-radius: 0.25rem;
	}

	.metric-status {
		width: 0.5rem;
		height: 0.5rem;
		background: #22c55e;
		border-radius: 50%;
	}

	.metric-value {
		width: 50%;
		height: 1.5rem;
		background: var(--color-fg-primary);
		border-radius: 0.25rem;
	}

	.metric-bar {
		width: 100%;
		height: 0.5rem;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 0.25rem;
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

		.lab-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 1rem;
		}
	}
</style>
