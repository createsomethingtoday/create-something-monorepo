<script lang="ts">
	import { onMount } from 'svelte';

	// Frames demonstrating "creation through removal"
	// All frames are 12 content lines for consistent sizing
	// 5 essential frames - each represents a conceptual stage, not a visual transition
	// "Less, but better" - fewer frames, each meaningful
	const frames = [
		// Frame 0: Maximum noise - the obscured state
		`╔═══════════════════════════════════════════════════════════════════════════════╗
║ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ ║
║ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ ║
║ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ ║
║ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ ║
║ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ ║
║ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ ║
║ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ ║
║ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ ║
║ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ ║
║ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ ║
║ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ ║
╚═══════════════════════════════════════════════════════════════════════════════╝`,
		// Frame 1: Labels emerge - WHO
		`╔═══════════════════════════════════════════════════════════════════════════════╗
║ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ ║
║ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ ║
║ ░░DRY░░░░░░░░░░░░░Rams░░░░░░░░░░░░░░Heidegger░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ ║
║ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ ║
║ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ ║
║ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ ║
║ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ ║
║ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ ║
║ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ ║
║ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ ║
║ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ ║
╚═══════════════════════════════════════════════════════════════════════════════╝`,
		// Frame 2: Actions appear - WHAT
		`╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║                                                                               ║
║   DRY              Rams              Heidegger                                ║
║   ─────            ─────             ─────────                                ║
║   Unify            Remove            Reconnect                                ║
║                                                                               ║
║                                                                               ║
║                                                                               ║
║                                                                               ║
║                                                                               ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝`,
		// Frame 3: Questions visible - HOW
		`╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║                                                                               ║
║   DRY              Rams              Heidegger                                ║
║   ─────            ─────             ─────────                                ║
║   Unify            Remove            Reconnect                                ║
║                                                                               ║
║   "Have I built    "Does this earn   "Does this serve                         ║
║    this before?"    its existence?"   the whole?"                             ║
║                                                                               ║
║                                                                               ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝`,
		// Frame 4: Final - revealed - WHY
		`╔═══════════════════════════════════════════════════════════════════════════════╗
║   SUBTRACTIVE TRIAD                                                           ║
║                                                                               ║
║   DRY              Rams              Heidegger                                ║
║   ─────            ─────             ─────────                                ║
║   Unify            Remove            Reconnect                                ║
║                                                                               ║
║   "Have I built    "Does this earn   "Does this serve                         ║
║    this before?"    its existence?"   the whole?"                             ║
║                                                                               ║
║                                                                               ║
║              "Creation is removing what obscures."                            ║
╚═══════════════════════════════════════════════════════════════════════════════╝`
	];

	let currentFrame = $state(0);
	let isPlaying = $state(false);
	let interval: ReturnType<typeof setInterval> | null = null;

	function play() {
		if (isPlaying) return;
		isPlaying = true;
		currentFrame = 0;
		interval = setInterval(() => {
			if (currentFrame < frames.length - 1) {
				currentFrame++;
			} else {
				stop();
			}
		}, 600);
	}

	function stop() {
		isPlaying = false;
		if (interval) {
			clearInterval(interval);
			interval = null;
		}
	}

	function reset() {
		stop();
		currentFrame = 0;
	}

	function showFinal() {
		stop();
		currentFrame = frames.length - 1;
	}

	onMount(() => {
		return () => {
			if (interval) clearInterval(interval);
		};
	});
</script>

<div class="subtractive-animation">
	<div class="frame-container">
		<pre class="frame">{frames[currentFrame]}</pre>
	</div>

	<div class="controls">
		<button onclick={reset} disabled={currentFrame === 0 && !isPlaying} class="control-btn">
			Reset
		</button>
		<button onclick={play} disabled={isPlaying} class="control-btn primary">
			{currentFrame === frames.length - 1 ? 'Replay' : 'Reveal'}
		</button>
		<button onclick={showFinal} disabled={currentFrame === frames.length - 1} class="control-btn">
			Skip
		</button>
	</div>

	<p class="caption">
		Frame {currentFrame + 1} of {frames.length}
		{#if currentFrame === frames.length - 1}
			<span class="revealed">— Revealed</span>
		{/if}
	</p>
</div>

<style>
	.subtractive-animation {
		width: 100%;
	}

	.frame-container {
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
		overflow-x: auto;
		padding: 1rem;
	}

	.frame {
		font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
		font-size: 0.65rem;
		line-height: 1.3;
		color: var(--color-fg-secondary);
		margin: 0;
		white-space: pre;
	}

	@media (min-width: 768px) {
		.frame {
			font-size: 0.75rem;
		}
	}

	@media (min-width: 1024px) {
		.frame {
			font-size: 0.85rem;
		}
	}

	.controls {
		display: flex;
		gap: 0.5rem;
		margin-top: 1rem;
		justify-content: center;
	}

	.control-btn {
		padding: 0.5rem 1rem;
		font-size: var(--text-caption);
		font-family: inherit;
		background: transparent;
		border: 1px solid var(--color-border-emphasis);
		color: var(--color-fg-tertiary);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.control-btn:hover:not(:disabled) {
		border-color: var(--color-fg-muted);
		color: var(--color-fg-secondary);
	}

	.control-btn:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.control-btn.primary {
		border-color: var(--color-fg-muted);
		color: var(--color-fg-secondary);
	}

	.caption {
		text-align: center;
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		margin-top: 0.75rem;
	}

	.revealed {
		color: var(--color-fg-secondary);
	}
</style>
