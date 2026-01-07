<script lang="ts">
	import { QuoteBlock } from '@create-something/components';
	import { Sparkles, CheckCircle2, AlertCircle } from 'lucide-svelte';
	import type { PageData } from './$types';
	import PreviewCanvas from './PreviewCanvas.svelte';

	let { data }: { data: PageData } = $props();
	const { experiment } = data;

	// State
	let svgContent = $state('');
	let canonSvg = $state('');
	let previewPng = $state<string | null>(null);
	let isLoading = $state(false);
	let error = $state<string | null>(null);
	let crop = $state<[number, number, number, number] | null>(null);
	let viewBoxWidth = $state(200); // SVG viewBox width
	let viewBoxHeight = $state(150); // SVG viewBox height

	// Render validation state
	let isRendering = $state(false);
	let renderResult = $state<string | null>(null);
	let renderError = $state<string | null>(null);
	let renderProgress = $state(0);
	let isDemoMode = $state(false);
	let renderStartTime = $state(0);
	let renderDuration = $state(0);

	// File upload handler
	async function handleFileUpload(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		if (!file.name.endsWith('.svg')) {
			error = 'Please upload an SVG file';
			return;
		}

		error = null;
		svgContent = await file.text();
		await generatePreview();
	}

	// Transform SVG to Canon colors (white on black) - client-side
	function transformToCanonColors(svg: string): string {
		return svg
			// Background: white → black
			.replace(/fill="white"/gi, 'fill="__CANON_BLACK__"')
			.replace(/fill="#fff(?:fff)?"/gi, 'fill="__CANON_BLACK__"')
			.replace(/fill='white'/gi, "fill='__CANON_BLACK__'")
			.replace(/fill='#fff(?:fff)?'/gi, "fill='__CANON_BLACK__'")
			// Foreground: black → white
			.replace(/fill="black"/gi, 'fill="__CANON_WHITE__"')
			.replace(/fill="#000(?:000)?"/gi, 'fill="__CANON_WHITE__"')
			.replace(/fill='black'/gi, "fill='__CANON_WHITE__'")
			.replace(/fill='#000(?:000)?'/gi, "fill='__CANON_WHITE__'")
			.replace(/stroke="black"/gi, 'stroke="__CANON_WHITE__"')
			.replace(/stroke="#000(?:000)?"/gi, 'stroke="__CANON_WHITE__"')
			.replace(/stroke='black'/gi, "stroke='__CANON_WHITE__'")
			.replace(/stroke='#000(?:000)?'/gi, "stroke='__CANON_WHITE__'")
			// Grays → inverted grays
			.replace(/#f0f0f0/gi, '#0f0f0f')
			.replace(/#e8e8e8/gi, '#171717')
			// Finalize placeholders
			.replace(/__CANON_BLACK__/g, '#000000')
			.replace(/__CANON_WHITE__/g, '#ffffff');
	}

	// Generate preview using browser Canvas API
	async function generatePreview() {
		if (!svgContent) return;

		isLoading = true;
		error = null;

		try {
			// Transform to Canon colors
			canonSvg = transformToCanonColors(svgContent);

			// Extract viewBox dimensions for accurate crop coordinate conversion
			const parser = new DOMParser();
			const svgDoc = parser.parseFromString(canonSvg, 'image/svg+xml');
			const svgEl = svgDoc.querySelector('svg');

			if (svgEl) {
				// Try to get dimensions from viewBox
				const viewBox = svgEl.getAttribute('viewBox');
				if (viewBox) {
					const [, , w, h] = viewBox.split(/\s+/).map(Number);
					if (w && h) {
						viewBoxWidth = w;
						viewBoxHeight = h;
					}
				}
				// Or from explicit width/height attributes
				const explicitWidth = parseFloat(svgEl.getAttribute('width') || '0');
				const explicitHeight = parseFloat(svgEl.getAttribute('height') || '0');
				if (explicitWidth > 0) viewBoxWidth = explicitWidth;
				if (explicitHeight > 0) viewBoxHeight = explicitHeight;
			}

			// Apply crop if specified
			let processedSvg = canonSvg;
			if (crop) {
				const [cropX, cropY, cropWidth, cropHeight] = crop;
				const viewBoxMatch = processedSvg.match(/viewBox=["']([^"']+)["']/);
				if (viewBoxMatch) {
					processedSvg = processedSvg.replace(
						viewBoxMatch[0],
						`viewBox="${cropX} ${cropY} ${cropWidth} ${cropHeight}"`
					);
				} else {
					processedSvg = processedSvg.replace(
						'<svg',
						`<svg viewBox="${cropX} ${cropY} ${cropWidth} ${cropHeight}"`
					);
				}
			}

			// Convert SVG to PNG using Canvas
			const canvas = document.createElement('canvas');
			const ctx = canvas.getContext('2d');
			if (!ctx) throw new Error('Could not create canvas context');

			const img = new Image();
			const blob = new Blob([processedSvg], { type: 'image/svg+xml' });
			const url = URL.createObjectURL(blob);

			await new Promise<void>((resolve, reject) => {
				img.onload = () => {
					// Set canvas size (1024px width, maintain aspect ratio)
					const targetWidth = 1024;
					const scale = targetWidth / img.width;
					canvas.width = targetWidth;
					canvas.height = img.height * scale;

					// Fill with black background
					ctx.fillStyle = '#000000';
					ctx.fillRect(0, 0, canvas.width, canvas.height);

					// Draw the SVG
					ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

					// Convert to PNG data URL
					previewPng = canvas.toDataURL('image/png');
					URL.revokeObjectURL(url);
					resolve();
				};
				img.onerror = () => {
					URL.revokeObjectURL(url);
					reject(new Error('Failed to load SVG'));
				};
				img.src = url;
			});
		} catch (e) {
			error = e instanceof Error ? e.message : 'Unknown error';
		} finally {
			isLoading = false;
		}
	}

	// Handle crop selection from canvas
	function handleCropChange(newCrop: [number, number, number, number] | null) {
		crop = newCrop;
		if (svgContent) {
			generatePreview();
		}
	}

	// Test Render - validate preview with actual AI
	async function handleTestRender() {
		if (!previewPng) return;

		isRendering = true;
		renderError = null;
		renderResult = null;
		renderProgress = 10;
		renderStartTime = Date.now();

		try {
			// Submit render request
			const response = await fetch('/api/render/submit', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					image: previewPng,
					prompt:
						'architectural floor plan, photorealistic interior render, modern materials, natural lighting',
					presets: {
						material: 'threshold-dwelling',
						lighting: 'golden-hour',
						angle: 'wide'
					}
				})
			});

			if (!response.ok) {
				throw new Error(`Failed to submit render request: ${response.status}`);
			}

			const result = await response.json();
			renderProgress = 20;

			// Check if demo mode
			if (result.demo) {
				isDemoMode = true;
				renderResult = result.output;
				renderProgress = 100;
				renderDuration = Math.round((Date.now() - renderStartTime) / 1000);
				return;
			}

			isDemoMode = false;

			// If already succeeded
			if (result.status === 'succeeded' && result.output) {
				renderResult = result.output;
				renderProgress = 100;
				renderDuration = Math.round((Date.now() - renderStartTime) / 1000);
				return;
			}

			// Poll for completion
			const predictionId = result.predictionId;
			if (!predictionId) {
				throw new Error('No prediction ID returned from API');
			}
			await pollRenderStatus(predictionId);
		} catch (err) {
			renderError = err instanceof Error ? err.message : 'Unknown error occurred';
		} finally {
			isRendering = false;
		}
	}

	// Poll render status
	async function pollRenderStatus(predictionId: string) {
		const maxAttempts = 60; // 2 minutes max
		let attempts = 0;

		while (attempts < maxAttempts) {
			await new Promise((resolve) => setTimeout(resolve, 2000));

			const response = await fetch(`/api/render/status/${predictionId}`);

			if (!response.ok) {
				throw new Error(`Failed to check render status: ${response.status}`);
			}

			const status = await response.json();
			renderProgress = Math.min(20 + attempts * 1.3, 95);

			if (status.status === 'succeeded') {
				renderResult = status.output;
				renderProgress = 100;
				renderDuration = Math.round((Date.now() - renderStartTime) / 1000);
				return;
			}

			if (status.status === 'failed') {
				throw new Error(status.error || 'Render failed');
			}

			attempts++;
		}

		throw new Error('Render timeout - exceeded 2 minutes');
	}

	// Reset render state for another test
	function resetRender() {
		renderResult = null;
		renderError = null;
		renderProgress = 0;
		isDemoMode = false;
		renderDuration = 0;
	}

	// Download image as file
	function downloadImage(dataUrl: string, filename: string) {
		const link = document.createElement('a');
		link.href = dataUrl;
		link.download = filename;
		link.click();
	}

	// Demo SVG for testing
	const demoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 150">
  <rect width="200" height="150" fill="white"/>
  <rect x="20" y="20" width="60" height="40" fill="none" stroke="black" stroke-width="2"/>
  <rect x="100" y="20" width="80" height="60" fill="none" stroke="black" stroke-width="2"/>
  <rect x="20" y="80" width="160" height="50" fill="none" stroke="black" stroke-width="2"/>
  <text x="50" y="45" font-size="10" text-anchor="middle">Kitchen</text>
  <text x="140" y="55" font-size="10" text-anchor="middle">Living</text>
  <text x="100" y="110" font-size="10" text-anchor="middle">Primary Suite</text>
</svg>`;

	function loadDemo() {
		svgContent = demoSvg;
		crop = null;
		generatePreview();
	}
</script>

<svelte:head>
	<title>{experiment.title} | CREATE SOMETHING</title>
	<meta name="description" content={experiment.description} />
</svelte:head>

<article class="experiment-page">
	<!-- Header -->
	<header class="experiment-header">
		<div class="header-meta">
			<span class="category">{experiment.category}</span>
			<span class="separator">/</span>
			<span class="reading-time">{experiment.reading_time_minutes} min read</span>
		</div>
		<h1>{experiment.title}</h1>
		<p class="subtitle">{experiment.description}</p>
	</header>

	<!-- ASCII Art -->
	{#if experiment.ascii_art}
		<pre class="ascii-art">{experiment.ascii_art}</pre>
	{/if}

	<!-- Interactive Demo -->
	<section class="section demo-section">
		<h2>Interactive Demo</h2>
		<p>
			Upload an SVG floor plan to see how ControlNet will interpret it. The preview shows the
			Canon-styled conditioning image (white on black) that guides the AI render.
		</p>

		<div class="demo-controls">
			<div class="upload-area">
				<label class="upload-button">
					<input type="file" accept=".svg" onchange={handleFileUpload} />
					Upload SVG
				</label>
				<button class="demo-button" onclick={loadDemo}>Load Demo</button>
			</div>

			{#if error}
				<div class="error-message">{error}</div>
			{/if}
		</div>

		{#if svgContent}
			<div class="preview-container">
				<div class="preview-column">
					<h3>Original SVG</h3>
					<div class="svg-display">
						{@html svgContent}
					</div>
					<p class="preview-caption">
						Click and drag to select a crop region (optional)
					</p>
				</div>

				<div class="preview-column">
					<h3>ControlNet Conditioning</h3>
					{#if isLoading}
						<div class="loading-state">Generating preview...</div>
					{:else if previewPng}
						<PreviewCanvas
							pngDataUrl={previewPng}
							viewBoxWidth={viewBoxWidth}
							viewBoxHeight={viewBoxHeight}
							onCropChange={handleCropChange}
						/>
					{:else}
						<div class="empty-state">
							Preview will appear here
						</div>
					{/if}
					<p class="preview-caption">
						Canon colors: white lines on black. This is what the AI sees.
					</p>
				</div>
			</div>
		{/if}

		{#if crop}
			<div class="crop-info">
				<strong>Crop region:</strong>
				<code>[{crop.join(', ')}]</code>
			</div>
		{/if}

		{#if previewPng && !isRendering}
			<div class="test-render-section">
				<button class="test-render-button" onclick={handleTestRender}>
					<Sparkles class="button-icon" />
					<span>Test Render</span>
					<span class="button-subtitle">Validate preview with actual AI</span>
				</button>
				<p class="test-render-description">
					This will send your preview to ControlNet and show the result, proving the preview
					accurately represents what the AI receives.
				</p>
			</div>
		{/if}

		{#if isRendering}
			<div class="rendering-progress">
				<div class="progress-bar">
					<div class="progress-fill" style="width: {renderProgress}%"></div>
				</div>
				<p class="progress-text">Rendering... {renderProgress}%</p>
			</div>
		{/if}

		{#if renderError}
			<div class="error-message">{renderError}</div>
		{/if}

		{#if renderResult}
			<div class="validation-section">
				<div class="validation-header">
					<h2>Validation Result</h2>
					{#if renderDuration > 0}
						<span class="render-time">Rendered in {renderDuration}s</span>
					{/if}
				</div>

				{#if isDemoMode}
					<div class="demo-notice">
						<AlertCircle class="notice-icon" />
						<div>
							<strong>Demo Mode:</strong> Replicate API not configured. Showing conditioning image
							as placeholder.
						</div>
					</div>
				{/if}

				<div class="comparison-grid">
					<div class="comparison-column">
						<h3>Our Preview (What We Think AI Sees)</h3>
						<img src={previewPng} alt="Our conditioning preview" class="comparison-image" />
						<button
							class="download-button"
							onclick={() => downloadImage(previewPng || '', 'controlnet-preview.png')}
						>
							Download Preview
						</button>
					</div>
					<div class="comparison-column">
						<h3>{isDemoMode ? 'Conditioning (Demo)' : 'Actual AI Render'}</h3>
						<img src={renderResult} alt="Actual render result" class="comparison-image" />
						<button
							class="download-button"
							onclick={() => downloadImage(renderResult || '', 'ai-render.png')}
						>
							Download Render
						</button>
						{#if !isDemoMode}
							<p class="validation-status">
								<CheckCircle2 class="status-icon" />
								<span>Preview accurately represents ControlNet input</span>
							</p>
						{/if}
					</div>
				</div>

				<div class="render-actions">
					<button class="secondary-button" onclick={resetRender}>
						Try Another Render
					</button>
				</div>
			</div>
		{/if}
	</section>

	<!-- How It Works -->
	<section class="section">
		<h2>How It Works</h2>
		<p>
			ControlNet uses edge-detected images to guide AI image generation. By converting your
			architectural SVG to a high-contrast PNG, we preserve the geometry while allowing the
			AI to render photorealistic materials and lighting.
		</p>
		<p>
			<strong>Validation:</strong> Unlike black-box tools, this experiment proves the preview
			is accurate. Click "Test Render" to send your preview to ControlNet and see the actual
			result side-by-side. The comparison validates that our preview accurately represents what
			the AI receives.
		</p>

		<div class="pipeline-diagram">
			<div class="pipeline-step">
				<div class="step-icon">SVG</div>
				<div class="step-label">Your Drawing</div>
			</div>
			<div class="pipeline-arrow">→</div>
			<div class="pipeline-step">
				<div class="step-icon">PNG</div>
				<div class="step-label">Canon Colors</div>
			</div>
			<div class="pipeline-arrow">→</div>
			<div class="pipeline-step">
				<div class="step-icon">AI</div>
				<div class="step-label">ControlNet</div>
			</div>
			<div class="pipeline-arrow">→</div>
			<div class="pipeline-step">
				<div class="step-icon">JPG</div>
				<div class="step-label">Photorealistic</div>
			</div>
		</div>
	</section>

	<!-- Philosophy -->
	<section class="section">
		<h2>Philosophical Alignment</h2>
		<QuoteBlock
			quote="See what the AI sees. Control what the AI does."
			attribution="Canon Differentiation"
		/>
		<p>
			Unlike black-box rendering tools, this preview makes the conditioning input <em>visible</em>.
			You see exactly what geometry the AI will preserve. The Test Render feature validates
			this transparency—proving the preview accurately represents ControlNet's input.
		</p>

		<h3>Fenestra Comparison</h3>
		<p>
			Fenestra offers 30-second renders with natural language editing—fast, but opaque.
			This tool offers explicit control—slower, but transparent.
		</p>
		<ul>
			<li><strong>Fenestra</strong>: "Add people to the terrace" → AI interprets</li>
			<li><strong>This</strong>: See conditioning → choose presets → understand result</li>
		</ul>
	</section>

	<!-- Tags -->
	<footer class="experiment-footer">
		<div class="tags">
			{#each experiment.tags as tag}
				<span class="tag">{tag}</span>
			{/each}
		</div>
		<p class="principles">
			Tests: {experiment.tests_principles?.join(', ') ?? 'None specified'}
		</p>
	</footer>
</article>

<style>
	.experiment-page {
		max-width: var(--width-content);
		margin: 0 auto;
		padding: var(--space-xl) var(--gutter);
	}

	/* Header */
	.experiment-header {
		margin-bottom: var(--space-2xl);
		padding-bottom: var(--space-xl);
		border-bottom: 1px solid var(--color-border-default);
	}

	.header-meta {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		margin-bottom: var(--space-sm);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.separator {
		color: var(--color-fg-subtle);
	}

	.experiment-header h1 {
		font-size: var(--text-h1);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
		line-height: var(--leading-tight);
	}

	.subtitle {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
	}

	/* ASCII Art */
	.ascii-art {
		font-family: var(--font-mono);
		font-size: 0.65rem;
		line-height: 1.2;
		color: var(--color-fg-muted);
		text-align: center;
		overflow-x: auto;
		margin: var(--space-xl) 0;
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
	}

	/* Sections */
	.section {
		margin-bottom: var(--space-2xl);
	}

	.section h2 {
		font-size: var(--text-h2);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-md);
	}

	.section h3 {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-top: var(--space-lg);
		margin-bottom: var(--space-sm);
	}

	.section p {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
		margin-bottom: var(--space-sm);
	}

	.section ul {
		margin: var(--space-sm) 0;
		padding-left: var(--space-md);
	}

	.section li {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
		margin-bottom: var(--space-xs);
	}

	.section em {
		font-style: italic;
	}

	.section strong {
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
	}

	/* Demo Section */
	.demo-controls {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
		margin-bottom: var(--space-lg);
	}

	.upload-area {
		display: flex;
		gap: var(--space-sm);
	}

	.upload-button {
		display: inline-flex;
		align-items: center;
		padding: var(--space-sm) var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		color: var(--color-fg-primary);
		font-size: var(--text-body-sm);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.upload-button:hover {
		background: var(--color-hover);
		border-color: var(--color-border-emphasis);
	}

	.upload-button input {
		display: none;
	}

	.demo-button {
		padding: var(--space-sm) var(--space-md);
		background: transparent;
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		color: var(--color-fg-secondary);
		font-size: var(--text-body-sm);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.demo-button:hover {
		background: var(--color-hover);
		border-color: var(--color-border-emphasis);
		color: var(--color-fg-primary);
	}

	.error-message {
		padding: var(--space-sm) var(--space-md);
		background: var(--color-error-muted);
		border: 1px solid var(--color-error-border);
		border-radius: var(--radius-md);
		color: var(--color-error);
		font-size: var(--text-body-sm);
	}

	/* Preview Container */
	.preview-container {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-lg);
		margin-top: var(--space-md);
	}

	.preview-column {
		display: flex;
		flex-direction: column;
	}

	.preview-column h3 {
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		color: var(--color-fg-secondary);
		margin: 0 0 var(--space-sm) 0;
	}

	.svg-display {
		background: white;
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		padding: var(--space-md);
		aspect-ratio: 4/3;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.svg-display :global(svg) {
		max-width: 100%;
		max-height: 100%;
	}

	.preview-caption {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		margin-top: var(--space-xs);
	}

	.loading-state,
	.empty-state {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		aspect-ratio: 4/3;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--color-fg-muted);
		font-size: var(--text-body-sm);
	}

	.crop-info {
		margin-top: var(--space-md);
		padding: var(--space-sm) var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.crop-info code {
		font-family: var(--font-mono);
		color: var(--color-fg-primary);
	}

	/* Test Render Section */
	.test-render-section {
		margin-top: var(--space-lg);
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		text-align: center;
	}

	.test-render-button {
		display: inline-flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-md) var(--space-lg);
		background: var(--color-bg-elevated);
		border: 2px solid var(--color-border-emphasis);
		border-radius: var(--radius-md);
		color: var(--color-fg-primary);
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.test-render-button :global(.button-icon) {
		width: 24px;
		height: 24px;
		margin-bottom: var(--space-xs);
	}

	.test-render-button:hover {
		background: var(--color-hover);
		border-color: var(--color-fg-primary);
		transform: translateY(-2px);
	}

	.button-subtitle {
		font-size: var(--text-caption);
		font-weight: var(--font-normal);
		color: var(--color-fg-muted);
	}

	.test-render-description {
		margin-top: var(--space-sm);
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	/* Rendering Progress */
	.rendering-progress {
		margin-top: var(--space-lg);
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
	}

	.progress-bar {
		width: 100%;
		height: 8px;
		background: var(--color-bg-pure);
		border-radius: var(--radius-full);
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		background: var(--color-fg-primary);
		transition: width var(--duration-standard) var(--ease-standard);
	}

	.progress-text {
		margin-top: var(--space-sm);
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		text-align: center;
	}

	/* Validation Section */
	.validation-section {
		margin-top: var(--space-2xl);
		padding-top: var(--space-xl);
		border-top: 1px solid var(--color-border-default);
	}

	.validation-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--space-md);
	}

	.validation-header h2 {
		margin: 0;
	}

	.render-time {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		font-family: var(--font-mono);
	}

	.demo-notice {
		display: flex;
		align-items: flex-start;
		gap: var(--space-sm);
		margin-bottom: var(--space-md);
		padding: var(--space-sm) var(--space-md);
		background: var(--color-warning-muted);
		border: 1px solid var(--color-warning-border);
		border-radius: var(--radius-md);
		color: var(--color-warning);
		font-size: var(--text-body-sm);
	}

	.demo-notice :global(.notice-icon) {
		width: 20px;
		height: 20px;
		flex-shrink: 0;
		margin-top: 2px;
	}

	.comparison-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-lg);
		margin-top: var(--space-md);
	}

	.comparison-column {
		display: flex;
		flex-direction: column;
	}

	.comparison-column h3 {
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		color: var(--color-fg-secondary);
		margin: 0 0 var(--space-sm) 0;
	}

	.comparison-image {
		width: 100%;
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		background: var(--color-bg-pure);
	}

	.validation-status {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-xs);
		margin-top: var(--space-sm);
		padding: var(--space-sm);
		background: var(--color-success-muted);
		border: 1px solid var(--color-success-border);
		border-radius: var(--radius-sm);
		color: var(--color-success);
		font-size: var(--text-body-sm);
	}

	.validation-status :global(.status-icon) {
		width: 18px;
		height: 18px;
		flex-shrink: 0;
	}

	.download-button {
		margin-top: var(--space-sm);
		padding: var(--space-xs) var(--space-sm);
		background: transparent;
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
		color: var(--color-fg-secondary);
		font-size: var(--text-body-sm);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
		width: 100%;
	}

	.download-button:hover {
		background: var(--color-hover);
		border-color: var(--color-border-emphasis);
		color: var(--color-fg-primary);
	}

	.render-actions {
		margin-top: var(--space-lg);
		text-align: center;
	}

	.secondary-button {
		padding: var(--space-sm) var(--space-lg);
		background: transparent;
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		color: var(--color-fg-secondary);
		font-size: var(--text-body-sm);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.secondary-button:hover {
		background: var(--color-hover);
		border-color: var(--color-border-emphasis);
		color: var(--color-fg-primary);
	}

	/* Pipeline Diagram */
	.pipeline-diagram {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-sm);
		margin: var(--space-lg) 0;
		flex-wrap: wrap;
	}

	.pipeline-step {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-xs);
	}

	.step-icon {
		width: 64px;
		height: 64px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		font-family: var(--font-mono);
		font-size: var(--text-body-sm);
		color: var(--color-fg-primary);
	}

	.step-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.pipeline-arrow {
		font-size: var(--text-h3);
		color: var(--color-fg-muted);
	}

	/* Footer */
	.experiment-footer {
		margin-top: var(--space-2xl);
		padding-top: var(--space-lg);
		border-top: 1px solid var(--color-border-default);
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-xs);
		margin-bottom: var(--space-sm);
	}

	.tag {
		padding: var(--space-xs) var(--space-sm);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-full);
	}

	.principles {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		font-family: var(--font-mono);
	}

	@media (max-width: 768px) {
		.experiment-header h1 {
			font-size: var(--text-h2);
		}

		.ascii-art {
			font-size: 0.5rem;
		}

		.preview-container {
			grid-template-columns: 1fr;
		}

		.comparison-grid {
			grid-template-columns: 1fr;
		}

		.pipeline-diagram {
			flex-direction: column;
		}

		.pipeline-arrow {
			transform: rotate(90deg);
		}
	}
</style>
