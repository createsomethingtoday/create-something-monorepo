<script lang="ts">
	/**
	 * Spritz - RSVP Speed Reading Component
	 *
	 * Displays text one word at a time with Optimal Recognition Point (ORP)
	 * highlighting for faster reading comprehension.
	 *
	 * Use cases:
	 * - Video intro/transition/outro text
	 * - Interactive documentation
	 * - Speed reading training
	 *
	 * @example
	 * ```svelte
	 * <Spritz content="Welcome to the tutorial. Let's get started." wpm={350} />
	 * ```
	 */

	import { onMount, onDestroy } from 'svelte';
	import { SpritzEngine, calculateORP } from './vanilla/spritz-engine.js';
	import type { SpritzMessage, SpritzPlaybackState } from './types.js';

	// Props
	let {
		content,
		wpm = 300,
		autoplay = false,
		loop = false,
		showControls = true,
		showProgress = true,
		showWpmControl = true,
		minWpm = 100,
		maxWpm = 800,
		wpmStep = 50,
		class: className = ''
	}: {
		content: string | SpritzMessage[];
		wpm?: number;
		autoplay?: boolean;
		loop?: boolean;
		showControls?: boolean;
		showProgress?: boolean;
		showWpmControl?: boolean;
		minWpm?: number;
		maxWpm?: number;
		wpmStep?: number;
		class?: string;
	} = $props();

	// State
	let engine: SpritzEngine | null = $state(null);
	let currentWord = $state('');
	let orpIndex = $state(0);
	let playbackState = $state<SpritzPlaybackState>('stopped');
	let currentWordIndex = $state(0);
	let totalWords = $state(0);
	let currentWpm = $state(wpm);
	let currentMessageIndex = $state(0);
	let currentLabel = $state('');

	// Derived
	let messages = $derived(normalizeContent(content));
	let progress = $derived(totalWords > 0 ? (currentWordIndex / totalWords) * 100 : 0);
	let isPlaying = $derived(playbackState === 'playing');
	let isComplete = $derived(currentWordIndex >= totalWords - 1 && playbackState === 'stopped');

	function normalizeContent(c: string | SpritzMessage[]): SpritzMessage[] {
		if (typeof c === 'string') {
			return [{ text: c }];
		}
		return c;
	}

	function initEngine() {
		engine = new SpritzEngine({
			wpm: currentWpm,
			onWord: (word, idx) => {
				currentWord = word;
				orpIndex = idx;
			},
			onStateChange: (state) => {
				playbackState = state;
			},
			onProgress: (current, total) => {
				currentWordIndex = current;
				totalWords = total;
			},
			onComplete: () => {
				if (loop) {
					// Move to next message or loop back
					if (currentMessageIndex < messages.length - 1) {
						currentMessageIndex++;
						loadCurrentMessage();
						engine?.play();
					} else {
						currentMessageIndex = 0;
						loadCurrentMessage();
						engine?.play();
					}
				}
			}
		});

		loadCurrentMessage();
	}

	function loadCurrentMessage() {
		const msg = messages[currentMessageIndex];
		if (msg && engine) {
			currentLabel = msg.label || '';
			engine.setText(msg.text);
		}
	}

	function handlePlay() {
		engine?.play();
	}

	function handlePause() {
		engine?.pause();
	}

	function handleToggle() {
		engine?.toggle();
	}

	function handleRestart() {
		currentMessageIndex = 0;
		loadCurrentMessage();
		playbackState = 'stopped';
	}

	function handleSkipBack() {
		engine?.skipBackward(5);
	}

	function handleSkipForward() {
		engine?.skipForward(5);
	}

	function handleWpmChange(e: Event) {
		const target = e.target as HTMLInputElement;
		currentWpm = parseInt(target.value, 10);
		engine?.setWPM(currentWpm);
	}

	function handleWpmDecrease() {
		currentWpm = Math.max(minWpm, currentWpm - wpmStep);
		engine?.setWPM(currentWpm);
	}

	function handleWpmIncrease() {
		currentWpm = Math.min(maxWpm, currentWpm + wpmStep);
		engine?.setWPM(currentWpm);
	}

	// Keyboard shortcuts
	function handleKeydown(e: KeyboardEvent) {
		switch (e.key) {
			case ' ':
				e.preventDefault();
				handleToggle();
				break;
			case 'ArrowLeft':
				e.preventDefault();
				handleSkipBack();
				break;
			case 'ArrowRight':
				e.preventDefault();
				handleSkipForward();
				break;
			case 'ArrowUp':
				e.preventDefault();
				handleWpmIncrease();
				break;
			case 'ArrowDown':
				e.preventDefault();
				handleWpmDecrease();
				break;
			case 'r':
			case 'R':
				e.preventDefault();
				handleRestart();
				break;
		}
	}

	// Split word into before/orp/after parts
	let wordParts = $derived(() => {
		const before = currentWord.slice(0, orpIndex);
		const orp = currentWord[orpIndex] || '';
		const after = currentWord.slice(orpIndex + 1);
		return { before, orp, after };
	});

	onMount(() => {
		initEngine();
		if (autoplay) {
			engine?.play();
		}
	});

	onDestroy(() => {
		engine?.destroy();
	});

	// Watch for content changes
	$effect(() => {
		if (engine && content) {
			currentMessageIndex = 0;
			loadCurrentMessage();
		}
	});
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex a11y_no_noninteractive_element_interactions -->
<div
	class="spritz {className}"
	class:spritz--playing={isPlaying}
	class:spritz--complete={isComplete}
	tabindex="0"
	role="application"
	aria-label="Speed reading display"
	onkeydown={handleKeydown}
>
	{#if currentLabel}
		<div class="spritz-label">{currentLabel}</div>
	{/if}

	<div class="spritz-redicle" aria-live="polite" aria-atomic="true">
		<div class="spritz-word">
			<span class="spritz-before">{wordParts().before}</span>
			<span class="spritz-orp">{wordParts().orp}</span>
			<span class="spritz-after">{wordParts().after}</span>
		</div>
	</div>

	{#if showProgress}
		<div class="spritz-progress" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
			<div class="spritz-progress-bar" style="width: {progress}%"></div>
		</div>
	{/if}

	{#if showControls}
		<div class="spritz-controls">
			<button
				class="spritz-btn"
				onclick={handleSkipBack}
				aria-label="Skip back 5 words"
				title="Skip back (←)"
			>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<polyline points="11 17 6 12 11 7"></polyline>
					<polyline points="18 17 13 12 18 7"></polyline>
				</svg>
			</button>

			<button
				class="spritz-btn spritz-btn--primary"
				onclick={handleToggle}
				aria-label={isPlaying ? 'Pause' : 'Play'}
				title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
			>
				{#if isPlaying}
					<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
						<rect x="6" y="4" width="4" height="16"></rect>
						<rect x="14" y="4" width="4" height="16"></rect>
					</svg>
				{:else}
					<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
						<polygon points="5 3 19 12 5 21 5 3"></polygon>
					</svg>
				{/if}
			</button>

			<button
				class="spritz-btn"
				onclick={handleSkipForward}
				aria-label="Skip forward 5 words"
				title="Skip forward (→)"
			>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<polyline points="13 17 18 12 13 7"></polyline>
					<polyline points="6 17 11 12 6 7"></polyline>
				</svg>
			</button>

			<button
				class="spritz-btn"
				onclick={handleRestart}
				aria-label="Restart"
				title="Restart (R)"
			>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<polyline points="1 4 1 10 7 10"></polyline>
					<path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
				</svg>
			</button>
		</div>
	{/if}

	{#if showWpmControl}
		<div class="spritz-wpm">
			<button
				class="spritz-btn"
				onclick={handleWpmDecrease}
				aria-label="Decrease speed"
				title="Slower (↓)"
				disabled={currentWpm <= minWpm}
			>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<line x1="5" y1="12" x2="19" y2="12"></line>
				</svg>
			</button>

			<input
				type="range"
				class="spritz-wpm-slider"
				min={minWpm}
				max={maxWpm}
				step={wpmStep}
				value={currentWpm}
				oninput={handleWpmChange}
				aria-label="Words per minute"
			/>

			<span class="spritz-wpm-label">{currentWpm} WPM</span>

			<button
				class="spritz-btn"
				onclick={handleWpmIncrease}
				aria-label="Increase speed"
				title="Faster (↑)"
				disabled={currentWpm >= maxWpm}
			>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<line x1="12" y1="5" x2="12" y2="19"></line>
					<line x1="5" y1="12" x2="19" y2="12"></line>
				</svg>
			</button>
		</div>
	{/if}
</div>

<style>
	/**
	 * Spritz Component Styles - Canon Design System
	 *
	 * "Weniger, aber besser" - Dieter Rams
	 *
	 * Requires Canon tokens to be imported by consuming app:
	 * @import '@create-something/components/styles/tokens.css';
	 */

	.spritz {
		--spritz-orp-color: var(--color-error);
		--spritz-word-spacing: 0.05em;

		display: flex;
		flex-direction: column;
		gap: var(--space-md);
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		transition: border-color var(--duration-micro) var(--ease-standard);
	}

	.spritz:focus {
		outline: none;
	}

	.spritz:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}

	.spritz--playing {
		border-color: var(--color-border-emphasis);
	}

	.spritz-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: var(--tracking-widest);
		text-align: center;
	}

	.spritz-redicle {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 4rem;
		padding: var(--space-lg) var(--space-xl);
		background: var(--color-bg-elevated);
		border-radius: var(--radius-md);
		overflow: hidden;
	}

	.spritz-redicle::before {
		content: '';
		position: absolute;
		top: 0;
		bottom: 0;
		left: 50%;
		width: 1px;
		background: var(--color-border-default);
		opacity: 0.5;
	}

	.spritz-redicle::after {
		content: '';
		position: absolute;
		top: 0;
		left: 50%;
		transform: translateX(-50%);
		width: 0;
		height: 0;
		border-left: 6px solid transparent;
		border-right: 6px solid transparent;
		border-top: 6px solid var(--spritz-orp-color);
	}

	.spritz-word {
		font-family: var(--font-mono);
		font-size: var(--text-h1);
		font-weight: var(--font-medium);
		letter-spacing: var(--spritz-word-spacing);
		line-height: 1;
		white-space: nowrap;
		color: var(--color-fg-primary);
	}

	.spritz-before {
		display: inline-block;
		text-align: right;
		min-width: 8ch;
		color: var(--color-fg-secondary);
	}

	.spritz-orp {
		display: inline-block;
		color: var(--spritz-orp-color);
		font-weight: var(--font-bold);
		text-align: center;
		width: 1ch;
	}

	.spritz-after {
		display: inline-block;
		text-align: left;
		min-width: 8ch;
		color: var(--color-fg-secondary);
	}

	.spritz-progress {
		width: 100%;
		height: 4px;
		background: var(--color-bg-subtle);
		border-radius: var(--radius-full);
		overflow: hidden;
	}

	.spritz-progress-bar {
		height: 100%;
		background: var(--color-fg-tertiary);
		border-radius: var(--radius-full);
		transition: width var(--duration-micro) var(--ease-standard);
	}

	.spritz--complete .spritz-progress-bar {
		background: var(--color-success);
	}

	.spritz-controls {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-sm);
	}

	.spritz-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 2.5rem;
		height: 2.5rem;
		padding: var(--space-xs);
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		color: var(--color-fg-secondary);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.spritz-btn:hover:not(:disabled) {
		background: var(--color-hover);
		border-color: var(--color-border-emphasis);
		color: var(--color-fg-primary);
	}

	.spritz-btn:active:not(:disabled) {
		transform: scale(var(--scale-subtle));
	}

	.spritz-btn:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}

	.spritz-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.spritz-btn--primary {
		min-width: 3rem;
		height: 3rem;
		background: var(--color-fg-primary);
		border-color: var(--color-fg-primary);
		color: var(--color-bg-pure);
	}

	.spritz-btn--primary:hover:not(:disabled) {
		background: var(--color-fg-secondary);
		border-color: var(--color-fg-secondary);
		color: var(--color-bg-pure);
	}

	.spritz-wpm {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-sm);
	}

	.spritz-wpm-label {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		font-variant-numeric: tabular-nums;
		min-width: 6ch;
		text-align: center;
	}

	.spritz-wpm-slider {
		width: 100%;
		max-width: 10rem;
		height: 4px;
		appearance: none;
		background: var(--color-bg-subtle);
		border-radius: var(--radius-full);
		cursor: pointer;
	}

	.spritz-wpm-slider::-webkit-slider-thumb {
		appearance: none;
		width: 16px;
		height: 16px;
		background: var(--color-fg-primary);
		border-radius: var(--radius-full);
		cursor: pointer;
		transition: transform var(--duration-micro) var(--ease-standard);
	}

	.spritz-wpm-slider::-webkit-slider-thumb:hover {
		transform: scale(var(--scale-small));
	}

	.spritz-wpm-slider::-moz-range-thumb {
		width: 16px;
		height: 16px;
		background: var(--color-fg-primary);
		border: none;
		border-radius: var(--radius-full);
		cursor: pointer;
	}

	.spritz-wpm-slider:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 4px;
	}

	@media (prefers-reduced-motion: reduce) {
		.spritz,
		.spritz-btn,
		.spritz-progress-bar {
			transition-duration: 0.01ms;
		}

		.spritz-btn:active:not(:disabled) {
			transform: none;
		}

		.spritz-wpm-slider::-webkit-slider-thumb:hover {
			transform: none;
		}
	}
</style>
