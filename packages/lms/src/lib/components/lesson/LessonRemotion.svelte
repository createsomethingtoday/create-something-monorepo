<script lang="ts">
	/**
	 * LessonRemotion - Animated teaching visualizations
	 * 
	 * Renders animations from shared specs for consistency with Remotion.
	 * Supports: ToolReceding, IDEvsTerminal
	 */
	import { Play, Pause, RotateCcw } from 'lucide-svelte';
	import { tweened } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';
	import { animationSpecs, getCurrentPhase, getRevealOpacity, type AnimationSpec } from '$lib/animations/specs';

	let {
		compositionId,
		caption = '',
		class: className = ''
	}: {
		compositionId: string;
		caption?: string;
		class?: string;
	} = $props();

	// Get spec for this composition
	const spec: AnimationSpec | undefined = animationSpecs[compositionId];
	const duration = spec?.duration ?? 5000;

	let isPlaying = $state(false);
	let hasInitialized = $state(false);
	let progress = tweened(0, { duration, easing: cubicOut });
	
	// Ensure proper initialization after mount
	$effect(() => {
		if (!hasInitialized) {
			progress.set(0, { duration: 0 });
			hasInitialized = true;
		}
	});

	function play() {
		if (isPlaying) return;
		isPlaying = true;
		progress.set(0, { duration: 0 });
		progress.set(1, { duration });
	}

	function pause() {
		isPlaying = false;
	}

	function togglePlay() {
		if (isPlaying) {
			pause();
		} else {
			play();
		}
	}

	function reset() {
		isPlaying = false;
		progress.set(0, { duration: 0 });
	}

	// Auto-stop when complete
	$effect(() => {
		if ($progress >= 1) {
			isPlaying = false;
		}
	});

	// Phase and reveal from spec
	const currentPhase = $derived(spec ? getCurrentPhase(spec, p) : null);
	const revealOpacity = $derived(spec ? getRevealOpacity(spec, p) : 0);

	// Use explicit progress value, defaulting to 0 for start state
	const p = $derived(hasInitialized ? $progress : 0);

	// ============================================
	// TOOL RECEDING ANIMATION
	// Keyframes from spec: motion-studio/src/specs/tool-receding.ts
	// ============================================
	const hammerOpacity = $derived(
		p < 0.2 ? 1 :
		p < 0.6 ? 1 - ((p - 0.2) / 0.4) * 0.7 :
		Math.max(0, 0.3 - ((p - 0.6) / 0.4) * 0.3)
	);
	const hammerScale = $derived(
		p < 0.2 ? 1 :
		p < 0.6 ? 1 - ((p - 0.2) / 0.4) * 0.2 :
		0.8
	);
	const hammerBlur = $derived(
		p < 0.2 ? 0 :
		p < 0.6 ? ((p - 0.2) / 0.4) * 8 :
		8
	);
	const nailProgress = $derived(
		p < 0.2 ? 0 :
		p < 0.8 ? ((p - 0.2) / 0.6) :
		1
	);
	const focusRingOpacity = $derived(
		p < 0.2 ? 0 :
		p < 0.4 ? ((p - 0.2) / 0.2) * 0.6 :
		p < 0.6 ? 0.6 :
		p < 0.8 ? 0.6 - ((p - 0.6) / 0.2) * 0.6 :
		0
	);

	// ============================================
	// IDE VS TERMINAL ANIMATION
	// Keyframes from spec: motion-studio/src/specs/ide-vs-terminal.ts
	// ============================================
	const sidebarOpacity = $derived(Math.max(0, 1 - (p * 4)));
	const tabsOpacity = $derived(Math.max(0, 1 - ((p - 0.1) * 4)));
	const statusBarOpacity = $derived(Math.max(0, 1 - ((p - 0.2) * 4)));
	const lineNumbersOpacity = $derived(Math.max(0, 1 - ((p - 0.25) * 4)));
	const minimapOpacity = $derived(Math.max(0, 1 - ((p - 0.3) * 4)));
	const editorBgOpacity = $derived(Math.max(0, 1 - ((p - 0.4) * 2.5)));
	const terminalOpacity = $derived(Math.min(1, Math.max(0, (p - 0.5) * 3)));
</script>

<section class="lesson-remotion {className}">
	<div class="remotion-label">
		<span class="label-icon">▶</span>
		<span>{spec?.name ?? compositionId}</span>
	</div>
	
	<div 
		class="remotion-container"
		style="aspect-ratio: {spec?.canvas.width ?? 800} / {spec?.canvas.height ?? 450};"
	>
		{#if compositionId === 'ToolReceding' && spec}
			<!-- TOOL RECEDING ANIMATION -->
			<div class="animation-canvas">
				<div class="phase-label">{currentPhase?.label ?? ''}</div>
				
				<div class="work-surface"></div>
				
				<div 
					class="nail"
					style="bottom: {140 + (nailProgress * 50)}px; height: {70 - (nailProgress * 50)}px;"
				></div>
				<div 
					class="nail-head"
					style="bottom: {140 + 70 - (nailProgress * 50)}px;"
				></div>
				
				<div 
					class="hammer"
					style="
						opacity: {hammerOpacity};
						transform: translateX(-50%) scale({hammerScale});
						filter: blur({hammerBlur}px);
					"
				>
					<div class="hammer-handle"></div>
					<div class="hammer-head"></div>
				</div>
				
				<div class="focus-ring" style="opacity: {focusRingOpacity};"></div>
				
				{#if spec.reveal && revealOpacity > 0}
					<div class="quote-overlay" style="opacity: {revealOpacity};">
						{spec.reveal.text}
					</div>
				{/if}
			</div>
		{:else if compositionId === 'IDEvsTerminal' && spec}
			<!-- IDE VS TERMINAL ANIMATION -->
			<div class="animation-canvas ide-canvas">
				<div class="phase-label">{currentPhase?.label ?? ''}</div>
				
				<div class="ide-window">
					<div class="ide-titlebar" style="opacity: {tabsOpacity};">
						<div class="window-buttons">
							<span class="btn-close"></span>
							<span class="btn-minimize"></span>
							<span class="btn-maximize"></span>
						</div>
						<span class="ide-title">Visual Studio Code</span>
					</div>
					
					<div class="ide-content">
						<div class="ide-sidebar" style="opacity: {sidebarOpacity};">
							{#each Array(5) as _}
								<div class="sidebar-icon"></div>
							{/each}
						</div>
						
						<div class="ide-explorer" style="opacity: {sidebarOpacity};">
							<div class="explorer-title">EXPLORER</div>
							{#each ['src', '  components', '    App.tsx', '  styles'] as item}
								<div class="explorer-item" style="padding-left: {item.startsWith('    ') ? 24 : item.startsWith('  ') ? 12 : 0}px;">
									{item.trim()}
								</div>
							{/each}
						</div>
						
						<div class="ide-editor">
							<div class="ide-tabs" style="opacity: {tabsOpacity};">
								<div class="tab active">App.tsx</div>
								<div class="tab">index.ts</div>
							</div>
							
							<div class="code-area">
								<div class="line-numbers" style="opacity: {lineNumbersOpacity};">
									{#each Array(10) as _, i}
										<div class="line-num">{i + 1}</div>
									{/each}
								</div>
								
								<div class="code-content" style="opacity: {editorBgOpacity};">
									<pre>{`import React from 'react';

const App = () => {
  return (
    <div>
      <h1>Hello</h1>
    </div>
  );
};`}</pre>
								</div>
								
								<div class="minimap" style="opacity: {minimapOpacity};">
									{#each Array(15) as _}
										<div class="minimap-line" style="width: {30 + Math.random() * 40}%;"></div>
									{/each}
								</div>
							</div>
						</div>
					</div>
					
					<div class="ide-statusbar" style="opacity: {statusBarOpacity};">
						<span>main</span>
						<span>TypeScript React</span>
					</div>
					
					<div class="terminal-overlay" style="opacity: {terminalOpacity};">
						<span class="terminal-prompt">$</span>
						<span class="terminal-cursor" class:blink={p > 0.7}></span>
					</div>
				</div>
				
				{#if spec.reveal && revealOpacity > 0}
					<div class="quote-overlay ide-quote" style="opacity: {revealOpacity};">
						{spec.reveal.text}
					</div>
				{/if}
			</div>
		{:else}
			<!-- Unknown composition -->
			<div class="animation-canvas">
				<p class="placeholder-text">Animation: {compositionId}</p>
			</div>
		{/if}
		
		<div class="animation-progress">
			<div class="progress-fill" style="width: {$progress * 100}%"></div>
		</div>
	</div>

	<div class="remotion-controls">
		<button class="control-btn" onclick={togglePlay} aria-label={isPlaying ? 'Pause' : 'Play'}>
			{#if isPlaying}
				<Pause size={18} />
			{:else}
				<Play size={18} />
			{/if}
		</button>
		<button class="control-btn" onclick={reset} aria-label="Reset">
			<RotateCcw size={18} />
		</button>
		<span class="frame-count">
			{Math.round($progress * 100)}%
		</span>
	</div>

	{#if caption || spec?.description}
		<p class="remotion-caption">{caption || spec?.description}</p>
	{/if}
</section>

<style>
	.lesson-remotion {
		max-width: 900px;
		margin: var(--space-2xl) auto;
		padding: 0 var(--space-lg);
	}

	.remotion-label {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		font-family: var(--font-mono);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		margin-bottom: var(--space-md);
	}

	.label-icon {
		color: var(--color-success);
	}

	.remotion-container {
		background: #000;
		border-radius: var(--radius-lg);
		overflow: hidden;
		position: relative;
		min-height: 300px;
	}

	.animation-canvas {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}

	.phase-label {
		position: absolute;
		top: 24px;
		left: 0;
		right: 0;
		text-align: center;
		font-family: var(--font-mono);
		font-size: 11px;
		color: #666;
		letter-spacing: 0.15em;
		text-transform: uppercase;
	}

	/* Tool Receding */
	.work-surface {
		position: absolute;
		bottom: 100px;
		left: 50%;
		transform: translateX(-50%);
		width: 300px;
		height: 40px;
		background: linear-gradient(to bottom, #333, #222);
		border-radius: 4px;
	}

	.nail {
		position: absolute;
		left: 50%;
		transform: translateX(-50%);
		width: 6px;
		background: linear-gradient(to right, #888, #aaa, #888);
		border-radius: 2px 2px 0 0;
	}

	.nail-head {
		position: absolute;
		left: 50%;
		transform: translateX(-50%);
		width: 16px;
		height: 5px;
		background: #999;
		border-radius: 2px;
	}

	.hammer {
		position: absolute;
		top: 120px;
		left: 50%;
		transform-origin: bottom center;
	}

	.hammer-handle {
		width: 14px;
		height: 120px;
		background: linear-gradient(to right, #5c4033, #8b6914, #5c4033);
		border-radius: 3px;
		margin: 0 auto;
	}

	.hammer-head {
		position: absolute;
		top: -15px;
		left: 50%;
		transform: translateX(-50%);
		width: 60px;
		height: 30px;
		background: linear-gradient(to bottom, #666, #444);
		border-radius: 4px;
	}

	.focus-ring {
		position: absolute;
		bottom: 160px;
		left: 50%;
		transform: translateX(-50%);
		width: 50px;
		height: 50px;
		border: 2px solid #fff;
		border-radius: 50%;
	}

	.quote-overlay {
		position: absolute;
		bottom: 40px;
		left: 0;
		right: 0;
		text-align: center;
		font-size: 18px;
		font-weight: 300;
		color: #fff;
	}

	/* IDE vs Terminal */
	.ide-canvas {
		padding: 20px;
		box-sizing: border-box;
	}

	.ide-window {
		width: 100%;
		height: 100%;
		border-radius: 8px;
		overflow: hidden;
		box-shadow: 0 10px 40px rgba(0,0,0,0.5);
		position: relative;
		display: flex;
		flex-direction: column;
	}

	.ide-titlebar {
		height: 28px;
		background: #1e1e1e;
		display: flex;
		align-items: center;
		padding: 0 12px;
		gap: 8px;
	}

	.window-buttons {
		display: flex;
		gap: 6px;
	}

	.btn-close, .btn-minimize, .btn-maximize {
		width: 10px;
		height: 10px;
		border-radius: 50%;
	}

	.btn-close { background: #ff5f56; }
	.btn-minimize { background: #ffbd2e; }
	.btn-maximize { background: #27ca40; }

	.ide-title {
		font-size: 11px;
		color: #666;
		margin-left: 12px;
	}

	.ide-content {
		display: flex;
		flex: 1;
		min-height: 0;
	}

	.ide-sidebar {
		width: 40px;
		background: #1e1e1e;
		border-right: 1px solid #333;
		padding: 8px 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
	}

	.sidebar-icon {
		width: 20px;
		height: 20px;
		background: #444;
		border-radius: 3px;
	}

	.ide-explorer {
		width: 140px;
		background: #1e1e1e;
		border-right: 1px solid #333;
		padding: 8px;
	}

	.explorer-title {
		font-size: 10px;
		color: #666;
		margin-bottom: 8px;
		letter-spacing: 0.05em;
	}

	.explorer-item {
		font-family: var(--font-mono);
		font-size: 11px;
		color: #888;
		padding: 3px 0;
	}

	.ide-editor {
		flex: 1;
		display: flex;
		flex-direction: column;
		background: #1e1e1e;
	}

	.ide-tabs {
		height: 28px;
		background: #1e1e1e;
		border-bottom: 1px solid #333;
		display: flex;
	}

	.tab {
		padding: 0 16px;
		font-size: 11px;
		color: #666;
		display: flex;
		align-items: center;
	}

	.tab.active {
		background: #252526;
		color: #ccc;
	}

	.code-area {
		flex: 1;
		display: flex;
		position: relative;
	}

	.line-numbers {
		width: 40px;
		background: #1e1e1e;
		padding: 8px 4px;
		text-align: right;
	}

	.line-num {
		font-family: var(--font-mono);
		font-size: 11px;
		line-height: 18px;
		color: #555;
	}

	.code-content {
		flex: 1;
		background: #1e1e1e;
		padding: 8px;
	}

	.code-content pre {
		font-family: var(--font-mono);
		font-size: 11px;
		line-height: 18px;
		color: #9cdcfe;
		margin: 0;
	}

	.minimap {
		width: 60px;
		background: #1e1e1e;
		padding: 8px;
	}

	.minimap-line {
		height: 2px;
		background: #444;
		margin-bottom: 2px;
		border-radius: 1px;
	}

	.ide-statusbar {
		height: 24px;
		background: #007acc;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 12px;
		font-size: 11px;
		color: #fff;
	}

	.terminal-overlay {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: #000;
		display: flex;
		align-items: flex-start;
		padding: 20px;
	}

	.terminal-prompt {
		font-family: var(--font-mono);
		font-size: 14px;
		color: #fff;
	}

	.terminal-cursor {
		display: inline-block;
		width: 8px;
		height: 16px;
		background: #fff;
		margin-left: 8px;
		vertical-align: text-bottom;
	}

	.terminal-cursor.blink {
		animation: blink 1s step-end infinite;
	}

	@keyframes blink {
		50% { opacity: 0; }
	}

	.ide-quote {
		bottom: 60px;
		font-size: 24px;
	}

	/* Progress & Controls */
	.animation-progress {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		height: 3px;
		background: #333;
	}

	.progress-fill {
		height: 100%;
		background: #fff;
	}

	.remotion-controls {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		margin-top: var(--space-md);
	}

	.control-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-subtle);
		border-radius: var(--radius-md);
		color: var(--color-fg-secondary);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.control-btn:hover {
		background: var(--color-bg-elevated);
		color: var(--color-fg-primary);
	}

	.frame-count {
		font-family: var(--font-mono);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		margin-left: var(--space-sm);
	}

	.remotion-caption {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		text-align: center;
		margin-top: var(--space-md);
		margin-bottom: 0;
	}

	.placeholder-text {
		font-size: var(--text-h3);
		color: #666;
	}
</style>
