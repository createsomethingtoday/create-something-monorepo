<script lang="ts">
	/**
	 * ShimmerButton - Button with animated shimmer effect
	 * 
	 * Premium button with rotating shimmer highlight.
	 * Port of MagicUI ShimmerButton for Svelte.
	 * 
	 * @example
	 * <ShimmerButton>Get Started</ShimmerButton>
	 */
	import type { Snippet } from 'svelte';
	
	interface Props {
		class?: string;
		shimmerColor?: string;
		shimmerSize?: string;
		borderRadius?: string;
		shimmerDuration?: string;
		background?: string;
		children?: Snippet;
		onclick?: (e: MouseEvent) => void;
		href?: string;
		disabled?: boolean;
	}
	
	let {
		class: className = '',
		shimmerColor = '#ffffff',
		shimmerSize = '0.05em',
		borderRadius = '100px',
		shimmerDuration = '3s',
		background = 'rgba(0, 0, 0, 1)',
		children,
		onclick,
		href,
		disabled = false
	}: Props = $props();
</script>

{#if href}
	<a
		{href}
		class="shimmer-button {className}"
		class:disabled
		style="
			--spread: 90deg;
			--shimmer-color: {shimmerColor};
			--radius: {borderRadius};
			--speed: {shimmerDuration};
			--cut: {shimmerSize};
			--bg: {background};
		"
	>
		<!-- Spark container -->
		<div class="spark-container">
			<div class="spark">
				<div class="spark-inner"></div>
			</div>
		</div>
		
		<!-- Content -->
		<span class="content">
			{@render children?.()}
		</span>
		
		<!-- Highlight -->
		<div class="highlight"></div>
		
		<!-- Backdrop -->
		<div class="backdrop"></div>
	</a>
{:else}
	<button
		type="button"
		class="shimmer-button {className}"
		class:disabled
		{disabled}
		onclick={onclick}
		style="
			--spread: 90deg;
			--shimmer-color: {shimmerColor};
			--radius: {borderRadius};
			--speed: {shimmerDuration};
			--cut: {shimmerSize};
			--bg: {background};
		"
	>
		<!-- Spark container -->
		<div class="spark-container">
			<div class="spark">
				<div class="spark-inner"></div>
			</div>
		</div>
		
		<!-- Content -->
		<span class="content">
			{@render children?.()}
		</span>
		
		<!-- Highlight -->
		<div class="highlight"></div>
		
		<!-- Backdrop -->
		<div class="backdrop"></div>
	</button>
{/if}

<style>
	.shimmer-button {
		position: relative;
		z-index: 0;
		display: inline-flex;
		cursor: pointer;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		border-radius: var(--radius);
		border: 1px solid rgba(255, 255, 255, 0.1);
		padding: 0.75rem 1.5rem;
		white-space: nowrap;
		color: white;
		background: var(--bg);
		font-weight: 600;
		text-decoration: none;
		transform: translateZ(0);
		transition: transform 300ms ease-in-out;
	}
	
	.shimmer-button:active {
		transform: translateY(1px);
	}
	
	.shimmer-button.disabled {
		opacity: 0.5;
		cursor: not-allowed;
		pointer-events: none;
	}
	
	.spark-container {
		position: absolute;
		inset: 0;
		z-index: -30;
		overflow: visible;
		filter: blur(2px);
		container-type: size;
	}
	
	.spark {
		position: absolute;
		inset: 0;
		aspect-ratio: 1;
		height: 100cqh;
		animation: shimmer-slide var(--speed) ease-in-out infinite alternate;
	}
	
	.spark-inner {
		position: absolute;
		inset: -100%;
		width: auto;
		rotate: 0deg;
		background: conic-gradient(
			from calc(270deg - (var(--spread) * 0.5)),
			transparent 0,
			var(--shimmer-color) var(--spread),
			transparent var(--spread)
		);
		animation: spin-around calc(var(--speed) * 2) infinite linear;
	}
	
	.content {
		position: relative;
		z-index: 1;
	}
	
	.highlight {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		border-radius: 1rem;
		padding: 0.375rem 1rem;
		box-shadow: inset 0 -8px 10px rgba(255, 255, 255, 0.12);
		transform: translateZ(0);
		transition: all 300ms ease-in-out;
	}
	
	.shimmer-button:hover .highlight {
		box-shadow: inset 0 -6px 10px rgba(255, 255, 255, 0.24);
	}
	
	.shimmer-button:active .highlight {
		box-shadow: inset 0 -10px 10px rgba(255, 255, 255, 0.24);
	}
	
	.backdrop {
		position: absolute;
		inset: var(--cut);
		z-index: -20;
		border-radius: var(--radius);
		background: var(--bg);
	}
	
	@keyframes shimmer-slide {
		to {
			transform: translate(calc(100cqw - 100%), 0);
		}
	}
	
	@keyframes spin-around {
		0% { transform: translateZ(0) rotate(0); }
		15%, 35% { transform: translateZ(0) rotate(90deg); }
		65%, 85% { transform: translateZ(0) rotate(270deg); }
		100% { transform: translateZ(0) rotate(360deg); }
	}
</style>
