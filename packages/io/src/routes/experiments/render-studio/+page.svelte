<script lang="ts">
	/**
	 * Render Studio - Full architectural rendering workflow
	 *
	 * Canon advantage over Fenestra:
	 * - Presets are *visible and named* (user learns vocabulary)
	 * - SVG operations are explicit (no natural language interpretation)
	 * - Conditioning image is transparent (see what the AI sees)
	 */
	import { Footer, QuoteBlock } from '@create-something/components';
	import type { PageData } from './$types';
	import PresetPicker from './PresetPicker.svelte';
	import OperationPicker from './OperationPicker.svelte';
	import { applySvgOperation, type SvgOperation } from './svg-operations';

	let { data }: { data: PageData } = $props();
	const { experiment } = data;

	// SVG State
	let originalSvg = $state('');
	let workingSvg = $state('');
	let canonPng = $state<string | null>(null);
	let isProcessing = $state(false);
	let processingMessage = $state('');
	let error = $state<string | null>(null);

	// Render State
	let selectedPresets = $state({
		material: 'threshold-dwelling',
		lighting: 'golden-hour',
		angle: 'wide'
	});
	let renderedImage = $state<string | null>(null);
	let isRendering = $state(false);
	let renderProgress = $state(0);

	// Operation History (for undo)
	let operationHistory = $state<SvgOperation[]>([]);

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
		originalSvg = await file.text();
		workingSvg = originalSvg;
		operationHistory = [];
		await generateConditioningPreview();
	}

	// Transform SVG to Canon colors (white on black)
	function transformToCanonColors(svg: string): string {
		return svg
			.replace(/fill="white"/gi, 'fill="__CANON_BLACK__"')
			.replace(/fill="#fff(?:fff)?"/gi, 'fill="__CANON_BLACK__"')
			.replace(/fill='white'/gi, "fill='__CANON_BLACK__'")
			.replace(/fill='#fff(?:fff)?'/gi, "fill='__CANON_BLACK__'")
			.replace(/fill="black"/gi, 'fill="__CANON_WHITE__"')
			.replace(/fill="#000(?:000)?"/gi, 'fill="__CANON_WHITE__"')
			.replace(/fill='black'/gi, "fill='__CANON_WHITE__'")
			.replace(/fill='#000(?:000)?'/gi, "fill='__CANON_WHITE__'")
			.replace(/stroke="black"/gi, 'stroke="__CANON_WHITE__"')
			.replace(/stroke="#000(?:000)?"/gi, 'stroke="__CANON_WHITE__"')
			.replace(/stroke='black'/gi, "stroke='__CANON_WHITE__'")
			.replace(/stroke='#000(?:000)?'/gi, "stroke='__CANON_WHITE__'")
			.replace(/#f0f0f0/gi, '#0f0f0f')
			.replace(/#e8e8e8/gi, '#171717')
			.replace(/__CANON_BLACK__/g, '#000000')
			.replace(/__CANON_WHITE__/g, '#ffffff');
	}

	// Generate conditioning preview using Canvas API
	async function generateConditioningPreview() {
		if (!workingSvg) return;

		isProcessing = true;
		processingMessage = 'Generating conditioning preview...';
		error = null;

		try {
			const canonSvg = transformToCanonColors(workingSvg);

			const canvas = document.createElement('canvas');
			const ctx = canvas.getContext('2d');
			if (!ctx) throw new Error('Could not create canvas context');

			const img = new Image();
			const blob = new Blob([canonSvg], { type: 'image/svg+xml' });
			const url = URL.createObjectURL(blob);

			await new Promise<void>((resolve, reject) => {
				img.onload = () => {
					const targetWidth = 1024;
					const scale = targetWidth / img.width;
					canvas.width = targetWidth;
					canvas.height = img.height * scale;

					ctx.fillStyle = '#000000';
					ctx.fillRect(0, 0, canvas.width, canvas.height);
					ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

					canonPng = canvas.toDataURL('image/png');
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
			isProcessing = false;
			processingMessage = '';
		}
	}

	// Apply SVG operation
	function handleApplyOperation(operation: SvgOperation) {
		workingSvg = applySvgOperation(workingSvg, operation);
		operationHistory = [...operationHistory, operation];
		generateConditioningPreview();
	}

	// Undo last operation
	function undoLastOperation() {
		if (operationHistory.length === 0) return;

		// Replay all operations except the last one
		const newHistory = operationHistory.slice(0, -1);
		workingSvg = originalSvg;
		for (const op of newHistory) {
			workingSvg = applySvgOperation(workingSvg, op);
		}
		operationHistory = newHistory;
		generateConditioningPreview();
	}

	// Reset to original
	function resetSvg() {
		workingSvg = originalSvg;
		operationHistory = [];
		generateConditioningPreview();
	}

	// Handle preset changes
	function handlePresetChange(presets: { material: string; lighting: string; angle: string }) {
		selectedPresets = presets;
	}

	// Build prompt from presets
	function buildPrompt(): string {
		const materials: Record<string, string> = {
			'threshold-dwelling': 'concrete floors, steel frames, floor-to-ceiling glass, cedar accents, Miesian architecture',
			'modern-minimal': 'polished white walls, concrete floors, black steel window frames, minimal furniture',
			'warm-contemporary': 'oak hardwood floors, white plaster walls, brass light fixtures, linen textiles',
			'industrial': 'exposed brick walls, steel I-beams, Edison bulbs, concrete flooring, factory aesthetic',
			'scandinavian': 'light oak floors, white painted walls, wool textiles, natural light, hygge atmosphere'
		};

		const lighting: Record<string, string> = {
			'golden-hour': 'golden hour sunlight, warm amber tones, long dramatic shadows, sunset lighting',
			'blue-hour': 'blue hour lighting, cool blue exterior, warm interior glow, twilight atmosphere',
			'morning': 'soft morning light, diffused daylight, fresh atmosphere, gentle shadows',
			'midday': 'bright midday sun, clear natural daylight, high visibility, sharp shadows',
			'overcast': 'overcast sky lighting, even soft illumination, no harsh shadows, diffused light',
			'night': 'night scene, warm interior lighting, dark exterior, cozy ambiance'
		};

		const angles: Record<string, string> = {
			'wide': 'wide angle architectural photography, full room view, dramatic perspective',
			'detail': 'detail shot, close-up composition, focus on materials and textures',
			'corner': 'corner view, two walls visible, sense of spatial depth',
			'entrance': 'entrance view, welcoming perspective, leading into the space',
			'window': 'toward the window, interior-exterior connection, natural light emphasis'
		};

		return [
			'photorealistic architectural interior render',
			materials[selectedPresets.material] || materials['threshold-dwelling'],
			lighting[selectedPresets.lighting] || lighting['golden-hour'],
			angles[selectedPresets.angle] || angles['wide'],
			'professional photography, high resolution, 8k'
		].join(', ');
	}

	// Submit render to Replicate
	async function submitRender() {
		if (!canonPng) {
			error = 'No conditioning image available';
			return;
		}

		isRendering = true;
		renderProgress = 0;
		error = null;

		try {
			const prompt = buildPrompt();
			renderProgress = 10;

			// Submit to our API endpoint
			const response = await fetch('/api/render/submit', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					image: canonPng,
					prompt,
					presets: selectedPresets
				})
			});

			renderProgress = 30;

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Render submission failed');
			}

			const result = await response.json();
			renderProgress = 50;

			// Poll for completion
			if (result.predictionId) {
				await pollRenderStatus(result.predictionId);
			} else if (result.output) {
				// Direct result (demo mode)
				renderedImage = result.output;
				renderProgress = 100;
			}
		} catch (e) {
			error = e instanceof Error ? e.message : 'Render failed';
		} finally {
			isRendering = false;
		}
	}

	// Poll for render completion
	async function pollRenderStatus(predictionId: string) {
		const maxAttempts = 60; // 2 minutes max
		let attempts = 0;

		while (attempts < maxAttempts) {
			await new Promise((resolve) => setTimeout(resolve, 2000));

			const response = await fetch(`/api/render/status/${predictionId}`);
			if (!response.ok) {
				throw new Error('Failed to check render status');
			}

			const status = await response.json();
			renderProgress = Math.min(90, 50 + attempts * 2);

			if (status.status === 'succeeded') {
				renderedImage = status.output?.[0] || status.output;
				renderProgress = 100;
				return;
			} else if (status.status === 'failed') {
				throw new Error(status.error || 'Render failed');
			}

			attempts++;
		}

		throw new Error('Render timed out');
	}

	// Demo SVG for testing
	const demoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 150">
  <rect width="200" height="150" fill="white"/>
  <rect x="20" y="20" width="60" height="40" fill="none" stroke="black" stroke-width="2"/>
  <rect x="100" y="20" width="80" height="60" fill="none" stroke="black" stroke-width="2"/>
  <rect x="20" y="80" width="160" height="50" fill="none" stroke="black" stroke-width="2"/>
  <line x1="50" y1="60" x2="50" y2="80" stroke="black" stroke-width="1.5"/>
  <line x1="140" y1="80" x2="140" y2="100" stroke="black" stroke-width="1.5"/>
</svg>`;

	function loadDemo() {
		originalSvg = demoSvg;
		workingSvg = demoSvg;
		operationHistory = [];
		generateConditioningPreview();
	}
</script>

<svelte:head>
	<title>{experiment.title} | CREATE SOMETHING</title>
	<meta name="description" content={experiment.description} />
</svelte:head>

<article class="studio-page">
	<!-- Header -->
	<header class="studio-header">
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

	<!-- Main Studio Layout -->
	<div class="studio-layout">
		<!-- Left Panel: SVG Editor -->
		<section class="editor-panel">
			<h2>Floor Plan Editor</h2>

			<div class="upload-controls">
				<label class="upload-button">
					<input type="file" accept=".svg" onchange={handleFileUpload} />
					Upload SVG
				</label>
				<button class="demo-button" onclick={loadDemo}>Load Demo</button>
			</div>

			{#if error}
				<div class="error-message">{error}</div>
			{/if}

			{#if workingSvg}
				<div class="svg-workspace">
					<div class="svg-display">
						{@html workingSvg}
					</div>

					<div class="workspace-controls">
						<button
							class="control-button"
							onclick={undoLastOperation}
							disabled={operationHistory.length === 0}
						>
							Undo ({operationHistory.length})
						</button>
						<button
							class="control-button"
							onclick={resetSvg}
							disabled={operationHistory.length === 0}
						>
							Reset
						</button>
					</div>
				</div>

				<!-- Operation Picker -->
				<OperationPicker onApplyOperation={handleApplyOperation} />
			{:else}
				<div class="empty-state">
					<p>Upload an SVG floor plan or load the demo to begin.</p>
					<p class="hint">The editor supports pattern-based operations—no natural language, explicit vocabulary.</p>
				</div>
			{/if}
		</section>

		<!-- Right Panel: Preview & Render -->
		<section class="preview-panel">
			<h2>Render Preview</h2>

			<!-- Conditioning Image -->
			<div class="conditioning-section">
				<h3>ControlNet Conditioning</h3>
				{#if isProcessing}
					<div class="loading-state">{processingMessage}</div>
				{:else if canonPng}
					<div class="conditioning-preview">
						<img src={canonPng} alt="ControlNet conditioning input" />
					</div>
					<p class="preview-caption">
						This is what the AI sees. White lines on black preserve geometry.
					</p>
				{:else}
					<div class="empty-state small">
						<p>Conditioning preview appears here</p>
					</div>
				{/if}
			</div>

			<!-- Preset Picker -->
			{#if workingSvg}
				<div class="presets-section">
					<h3>Render Settings</h3>
					<PresetPicker onPresetChange={handlePresetChange} />
				</div>

				<!-- Render Button -->
				<div class="render-section">
					<button
						class="render-button"
						onclick={submitRender}
						disabled={isRendering || !canonPng}
					>
						{#if isRendering}
							Rendering... {renderProgress}%
						{:else}
							Generate Render
						{/if}
					</button>

					{#if isRendering}
						<div class="progress-bar">
							<div class="progress-fill" style="width: {renderProgress}%"></div>
						</div>
					{/if}
				</div>

				<!-- Rendered Result -->
				{#if renderedImage}
					<div class="result-section">
						<h3>Result</h3>
						<div class="result-image">
							<img src={renderedImage} alt="Rendered architectural visualization" />
						</div>
						<div class="result-actions">
							<a href={renderedImage} download="render.png" class="download-button">
								Download PNG
							</a>
						</div>
					</div>
				{/if}
			{/if}
		</section>
	</div>

	<!-- Philosophy Section -->
	<section class="section philosophy-section">
		<h2>Canon vs Fenestra</h2>
		<QuoteBlock
			quote="See what the AI sees. Control what the AI does."
			attribution="Canon Differentiation"
		/>

		<div class="comparison-grid">
			<div class="comparison-item">
				<h3>Fenestra</h3>
				<ul>
					<li>30-second renders</li>
					<li>Natural language editing</li>
					<li>Opaque conditioning</li>
					<li>SaaS dependency</li>
				</ul>
			</div>
			<div class="comparison-item">
				<h3>Render Studio</h3>
				<ul>
					<li>Explicit presets</li>
					<li>Pattern-based operations</li>
					<li>Visible conditioning</li>
					<li>Self-hosted capability</li>
				</ul>
			</div>
		</div>
	</section>

	<!-- Footer -->
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

<Footer />

<style>
	.studio-page {
		max-width: 1400px;
		margin: 0 auto;
		padding: var(--space-xl) var(--gutter);
	}

	/* Header */
	.studio-header {
		margin-bottom: var(--space-xl);
		padding-bottom: var(--space-lg);
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

	.studio-header h1 {
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
		font-size: 0.55rem;
		line-height: 1.15;
		color: var(--color-fg-muted);
		overflow-x: auto;
		margin: var(--space-lg) 0;
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
	}

	/* Studio Layout */
	.studio-layout {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-xl);
		margin-bottom: var(--space-2xl);
	}

	.editor-panel,
	.preview-panel {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.editor-panel h2,
	.preview-panel h2 {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0;
	}

	h3 {
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		color: var(--color-fg-secondary);
		margin: 0 0 var(--space-sm) 0;
	}

	/* Upload Controls */
	.upload-controls {
		display: flex;
		gap: var(--space-sm);
	}

	.upload-button {
		display: inline-flex;
		align-items: center;
		padding: var(--space-sm) var(--space-md);
		background: var(--color-fg-primary);
		border: none;
		border-radius: var(--radius-md);
		color: var(--color-bg-pure);
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.upload-button:hover {
		opacity: 0.9;
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

	/* Error Message */
	.error-message {
		padding: var(--space-sm) var(--space-md);
		background: var(--color-error-muted);
		border: 1px solid var(--color-error-border);
		border-radius: var(--radius-md);
		color: var(--color-error);
		font-size: var(--text-body-sm);
	}

	/* SVG Workspace */
	.svg-workspace {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-md);
	}

	.svg-display {
		background: white;
		border-radius: var(--radius-md);
		padding: var(--space-md);
		min-height: 200px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.svg-display :global(svg) {
		max-width: 100%;
		max-height: 300px;
	}

	.workspace-controls {
		display: flex;
		gap: var(--space-sm);
		margin-top: var(--space-sm);
		padding-top: var(--space-sm);
		border-top: 1px solid var(--color-border-default);
	}

	.control-button {
		padding: var(--space-xs) var(--space-sm);
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
		color: var(--color-fg-secondary);
		font-size: var(--text-caption);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.control-button:hover:not(:disabled) {
		background: var(--color-hover);
		border-color: var(--color-border-emphasis);
	}

	.control-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Empty State */
	.empty-state {
		padding: var(--space-xl);
		text-align: center;
		background: var(--color-bg-surface);
		border: 1px dashed var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.empty-state p {
		color: var(--color-fg-muted);
		font-size: var(--text-body-sm);
		margin: 0;
	}

	.empty-state .hint {
		margin-top: var(--space-sm);
		font-size: var(--text-caption);
	}

	.empty-state.small {
		padding: var(--space-lg);
	}

	/* Conditioning Section */
	.conditioning-section {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-md);
	}

	.conditioning-preview {
		background: #000;
		border-radius: var(--radius-md);
		overflow: hidden;
	}

	.conditioning-preview img {
		width: 100%;
		display: block;
	}

	.preview-caption {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		margin-top: var(--space-sm);
	}

	.loading-state {
		padding: var(--space-lg);
		text-align: center;
		color: var(--color-fg-muted);
		font-size: var(--text-body-sm);
	}

	/* Presets Section */
	.presets-section {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-md);
	}

	/* Render Section */
	.render-section {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.render-button {
		width: 100%;
		padding: var(--space-md);
		background: var(--color-fg-primary);
		border: none;
		border-radius: var(--radius-md);
		color: var(--color-bg-pure);
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.render-button:hover:not(:disabled) {
		opacity: 0.9;
	}

	.render-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.progress-bar {
		height: 4px;
		background: var(--color-bg-subtle);
		border-radius: var(--radius-full);
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		background: var(--color-fg-primary);
		transition: width var(--duration-standard) var(--ease-standard);
	}

	/* Result Section */
	.result-section {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-md);
	}

	.result-image {
		border-radius: var(--radius-md);
		overflow: hidden;
		margin-bottom: var(--space-sm);
	}

	.result-image img {
		width: 100%;
		display: block;
	}

	.result-actions {
		display: flex;
		gap: var(--space-sm);
	}

	.download-button {
		display: inline-flex;
		align-items: center;
		padding: var(--space-sm) var(--space-md);
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		color: var(--color-fg-primary);
		font-size: var(--text-body-sm);
		text-decoration: none;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.download-button:hover {
		background: var(--color-hover);
		border-color: var(--color-border-emphasis);
	}

	/* Philosophy Section */
	.section {
		margin-bottom: var(--space-2xl);
	}

	.philosophy-section h2 {
		font-size: var(--text-h2);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-md);
	}

	.comparison-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-md);
		margin-top: var(--space-lg);
	}

	.comparison-item {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-md);
	}

	.comparison-item h3 {
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
	}

	.comparison-item ul {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.comparison-item li {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		padding: var(--space-xs) 0;
		border-bottom: 1px solid var(--color-border-default);
	}

	.comparison-item li:last-child {
		border-bottom: none;
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

	/* Responsive */
	@media (max-width: 1024px) {
		.studio-layout {
			grid-template-columns: 1fr;
		}

		.comparison-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 640px) {
		.studio-header h1 {
			font-size: var(--text-h2);
		}

		.ascii-art {
			font-size: 0.4rem;
		}
	}
</style>
