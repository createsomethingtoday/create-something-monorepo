<script lang="ts">
	/**
	 * LessonRemotion - Animated teaching visualizations
	 * 
	 * Pure Svelte animations for lesson concepts.
	 * Supports: ToolReceding, IDEvsTerminal
	 */
	import { Play, Pause, RotateCcw } from 'lucide-svelte';
	import { tweened } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';

	let {
		compositionId,
		caption = '',
		width = 800,
		height = 450,
		fps = 30,
		durationInFrames = 150,
		class: className = ''
	}: {
		compositionId: string;
		caption?: string;
		width?: number;
		height?: number;
		fps?: number;
		durationInFrames?: number;
		class?: string;
	} = $props();

	let isPlaying = $state(false);
	let animationProgress = tweened(0, { duration: 5000, easing: cubicOut });

	function play() {
		if (isPlaying) return;
		isPlaying = true;
		animationProgress.set(0, { duration: 0 });
		animationProgress.set(1, { duration: 5000 });
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
		animationProgress.set(0, { duration: 0 });
	}

	// Auto-stop when complete
	$effect(() => {
		if ($animationProgress >= 1) {
			isPlaying = false;
		}
	});

	// Derived animation values for ToolReceding
	const hammerOpacity = $derived(
		$animationProgress < 0.2 ? 1 :
		$animationProgress < 0.6 ? 1 - (($animationProgress - 0.2) / 0.4) * 0.7 :
		Math.max(0, 0.3 - (($animationProgress - 0.6) / 0.4) * 0.3)
	);
	const hammerScale = $derived(
		$animationProgress < 0.2 ? 1 :
		$animationProgress < 0.6 ? 1 - (($animationProgress - 0.2) / 0.4) * 0.2 :
		0.8
	);
	const hammerBlur = $derived(
		$animationProgress < 0.2 ? 0 :
		$animationProgress < 0.6 ? (($animationProgress - 0.2) / 0.4) * 8 :
		8
	);
	const nailProgress = $derived(
		$animationProgress < 0.2 ? 0 :
		$animationProgress < 0.8 ? (($animationProgress - 0.2) / 0.6) :
		1
	);
	const focusRingOpacity = $derived(
		$animationProgress < 0.2 ? 0 :
		$animationProgress < 0.4 ? (($animationProgress - 0.2) / 0.2) * 0.6 :
		$animationProgress < 0.6 ? 0.6 :
		$animationProgress < 0.8 ? 0.6 - (($animationProgress - 0.6) / 0.2) * 0.6 :
		0
	);
	const textOpacity = $derived(
		$animationProgress < 0.7 ? 0 :
		($animationProgress - 0.7) / 0.3
	);
	const phaseLabel = $derived(
		$animationProgress < 0.2 ? 'VORHANDENHEIT — Present-at-hand' :
		$animationProgress < 0.7 ? 'TRANSITION — Focus shifts' :
		'ZUHANDENHEIT — Ready-to-hand'
	);

	// Derived animation values for IDEvsTerminal
	const sidebarOpacity = $derived(Math.max(0, 1 - ($animationProgress * 4)));
	const tabsOpacity = $derived(Math.max(0, 1 - (($animationProgress - 0.1) * 4)));
	const statusBarOpacity = $derived(Math.max(0, 1 - (($animationProgress - 0.2) * 4)));
	const lineNumbersOpacity = $derived(Math.max(0, 1 - (($animationProgress - 0.25) * 4)));
	const minimapOpacity = $derived(Math.max(0, 1 - (($animationProgress - 0.3) * 4)));
	const editorBgOpacity = $derived(Math.max(0, 1 - (($animationProgress - 0.4) * 2.5)));
	const terminalOpacity = $derived(Math.min(1, Math.max(0, ($animationProgress - 0.5) * 3)));
	const idePhaseLabel = $derived(
		$animationProgress < 0.2 ? 'IDE — Chrome everywhere' :
		$animationProgress < 0.6 ? 'DISSOLVING — Removing what obscures' :
		'TERMINAL — Only the canvas remains'
	);
</script>

<section class="lesson-remotion {className}">
	<div class="remotion-label">
		<span class="label-icon">▶</span>
		<span>Animation: {compositionId}</span>
	</div>
	
	<div 
		class="remotion-container"
		style="aspect-ratio: {width} / {height};"
	>
		{#if compositionId === 'ToolReceding'}
			<!-- TOOL RECEDING ANIMATION -->
			<div class="animation-canvas">
				<!-- Phase label -->
				<div class="phase-label">{phaseLabel}</div>
				
				<!-- Work surface -->
				<div class="work-surface"></div>
				
				<!-- Nail -->
				<div 
					class="nail"
					style="bottom: {140 + (nailProgress * 50)}px; height: {70 - (nailProgress * 50)}px;"
				></div>
				<div 
					class="nail-head"
					style="bottom: {140 + 70 - (nailProgress * 50)}px;"
				></div>
				
				<!-- Hammer -->
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
				
				<!-- Focus ring -->
				<div 
					class="focus-ring"
					style="opacity: {focusRingOpacity};"
				></div>
				
				<!-- Philosophy quote -->
				<div 
					class="quote-overlay"
					style="opacity: {textOpacity};"
				>
					The hammer disappears when hammering.
				</div>
			</div>
		{:else if compositionId === 'IDEvsTerminal'}
			<!-- IDE VS TERMINAL ANIMATION -->
			<div class="animation-canvas ide-canvas">
				<!-- Phase label -->
				<div class="phase-label">{idePhaseLabel}</div>
				
				<div class="ide-window">
					<!-- Title bar -->
					<div class="ide-titlebar" style="opacity: {tabsOpacity};">
						<div class="window-buttons">
							<span class="btn-close"></span>
							<span class="btn-minimize"></span>
							<span class="btn-maximize"></span>
						</div>
						<span class="ide-title">Visual Studio Code</span>
					</div>
					
					<!-- Main content -->
					<div class="ide-content">
						<!-- Sidebar -->
						<div class="ide-sidebar" style="opacity: {sidebarOpacity};">
							{#each Array(5) as _, i}
								<div class="sidebar-icon"></div>
							{/each}
						</div>
						
						<!-- File explorer -->
						<div class="ide-explorer" style="opacity: {sidebarOpacity};">
							<div class="explorer-title">EXPLORER</div>
							{#each ['src', '  components', '    App.tsx', '  styles'] as item}
								<div class="explorer-item" style="padding-left: {item.startsWith('    ') ? 24 : item.startsWith('  ') ? 12 : 0}px;">
									{item.trim()}
								</div>
							{/each}
						</div>
						
						<!-- Editor area -->
						<div class="ide-editor">
							<!-- Tabs -->
							<div class="ide-tabs" style="opacity: {tabsOpacity};">
								<div class="tab active">App.tsx</div>
								<div class="tab">index.ts</div>
							</div>
							
							<!-- Code area -->
							<div class="code-area">
								<!-- Line numbers -->
								<div class="line-numbers" style="opacity: {lineNumbersOpacity};">
									{#each Array(10) as _, i}
										<div class="line-num">{i + 1}</div>
									{/each}
								</div>
								
								<!-- Code -->
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
								
								<!-- Minimap -->
								<div class="minimap" style="opacity: {minimapOpacity};">
									{#each Array(15) as _}
										<div class="minimap-line" style="width: {30 + Math.random() * 40}%;"></div>
									{/each}
								</div>
							</div>
						</div>
					</div>
					
					<!-- Status bar -->
					<div class="ide-statusbar" style="opacity: {statusBarOpacity};">
						<span>main</span>
						<span>TypeScript React</span>
					</div>
					
					<!-- Terminal overlay -->
					<div class="terminal-overlay" style="opacity: {terminalOpacity};">
						<span class="terminal-prompt">$</span>
						<span class="terminal-cursor" class:blink={$animationProgress > 0.7}></span>
					</div>
				</div>
				
				<!-- Final text -->
				{#if $animationProgress > 0.8}
					<div class="quote-overlay ide-quote" style="opacity: {($animationProgress - 0.8) / 0.2};">
						The blank canvas.
					</div>
				{/if}
			</div>
		{:else}
			<!-- Generic placeholder -->
			<div class="animation-canvas">
				<p class="placeholder-text">Animation: {compositionId}</p>
			</div>
		{/if}
		
		<!-- Progress bar -->
		<div class="animation-progress">
			<div class="progress-fill" style="width: {$animationProgress * 100}%"></div>
		</div>
	</div>

	<div class="remotion-controls">
		<button class="control-btn" onclick={togglePlay}>
			{#if isPlaying}
				<Pause size={18} />
			{:else}
				<Play size={18} />
			{/if}
		</button>
		<button class="control-btn" onclick={reset}>
			<RotateCcw size={18} />
		</button>
		<span class="frame-count">
			{Math.round($animationProgress * 100)}%
		</span>
	</div>

	{#if caption}
		<p class="remotion-caption">{caption}</p>
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
	}

	/* Animation Canvas */
	.animation-canvas {
		width: 100%;
		height: 100%;
		position: relative;
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

	/* ToolReceding Animation */
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
		transition: height 0.1s linear, bottom 0.1s linear;
	}

	.nail-head {
		position: absolute;
		left: 50%;
		transform: translateX(-50%);
		width: 16px;
		height: 5px;
		background: #999;
		border-radius: 2px;
		transition: bottom 0.1s linear;
	}

	.hammer {
		position: absolute;
		top: 120px;
		left: 50%;
		transform-origin: bottom center;
		transition: opacity 0.1s, filter 0.1s;
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
		transition: opacity 0.2s;
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
		transition: opacity 0.3s;
	}

	/* IDE vs Terminal Animation */
	.ide-canvas {
		padding: 20px;
	}

	.ide-window {
		width: 100%;
		height: calc(100% - 40px);
		border-radius: 8px;
		overflow: hidden;
		box-shadow: 0 10px 40px rgba(0,0,0,0.5);
		position: relative;
	}

	.ide-titlebar {
		height: 28px;
		background: #1e1e1e;
		display: flex;
		align-items: center;
		padding: 0 12px;
		gap: 8px;
		transition: opacity 0.3s;
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
		height: calc(100% - 52px);
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
		transition: opacity 0.3s;
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
		transition: opacity 0.3s;
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
		transition: opacity 0.3s;
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
		transition: opacity 0.3s;
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
		transition: opacity 0.3s;
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
		transition: opacity 0.3s;
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
		transition: opacity 0.3s;
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
		transition: opacity 0.3s;
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
		position: absolute;
		bottom: 60px;
		left: 0;
		right: 0;
		font-size: 24px;
	}

	/* Progress bar */
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
		transition: width 50ms linear;
	}

	/* Controls */
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
