<script lang="ts">
	/**
	 * Card Component
	 *
	 * Flexible, Canon-based card with AI Studio patterns:
	 * - Polymorphic rendering (a/button/div)
	 * - Image with zoom on hover
	 * - Lift + shadow hover effects
	 * - Snippet slots for maximum flexibility
	 * - Tag badges and metadata support
	 */
	import type { Snippet } from 'svelte';

	type CardVariant = 'default' | 'elevated' | 'ghost';
	type CardSize = 'sm' | 'md' | 'lg';

	interface Props {
		// Content props
		title?: string;
		description?: string;
		image?: string;
		imageAlt?: string;
		tag?: string;
		date?: string;
		meta?: string;

		// Behavior props
		href?: string;
		onclick?: () => void;

		// Styling props
		variant?: CardVariant;
		size?: CardSize;
		aspectRatio?: 'video' | 'poster' | 'square' | 'wide';
		class?: string;

		// Snippet slots for flexibility
		children?: Snippet;
		headerAction?: Snippet;
		footer?: Snippet;
		badge?: Snippet;
	}

	let {
		title,
		description,
		image,
		imageAlt,
		tag,
		date,
		meta,
		href,
		onclick,
		variant = 'default',
		size = 'md',
		aspectRatio = 'video',
		class: className = '',
		children,
		headerAction,
		footer,
		badge
	}: Props = $props();

	// Determine element type
	const Element = $derived(href ? 'a' : onclick ? 'button' : 'div');
	const isInteractive = $derived(!!href || !!onclick);
</script>

<svelte:element
	this={Element}
	href={href}
	onclick={onclick}
	class="card card-{variant} card-{size} {isInteractive ? 'card-interactive' : ''} {className}"
	role={onclick && !href ? 'button' : undefined}
	tabindex={isInteractive && !href ? 0 : undefined}
>
	<!-- Image Section -->
	{#if image}
		<div class="card-image aspect-{aspectRatio}">
			<img src={image} alt={imageAlt || title || 'Card image'} loading="lazy" />
			
			<!-- Tag badge overlay -->
			{#if tag}
				<span class="card-tag">{tag}</span>
			{/if}

			<!-- Custom badge slot -->
			{#if badge}
				<div class="card-badge-slot">
					{@render badge()}
				</div>
			{/if}
		</div>
	{/if}

	<!-- Content Body -->
	<div class="card-body">
		<!-- Header with optional action -->
		<div class="card-header">
			<div class="card-header-content">
				{#if date}
					<span class="card-date">{date}</span>
				{/if}
				{#if title}
					<h3 class="card-title">{title}</h3>
				{/if}
			</div>

			{#if headerAction}
				<div class="card-header-action">
					{@render headerAction()}
				</div>
			{/if}
		</div>

		<!-- Description or custom children -->
		<div class="card-content">
			{#if children}
				{@render children()}
			{:else if description}
				<p class="card-description">{description}</p>
			{/if}
		</div>

		<!-- Meta info -->
		{#if meta}
			<span class="card-meta">{meta}</span>
		{/if}

		<!-- Footer slot -->
		{#if footer}
			<div class="card-footer">
				{@render footer()}
			</div>
		{/if}
	</div>
</svelte:element>

<style>
	/* Base Card */
	.card {
		display: flex;
		flex-direction: column;
		width: 100%;
		overflow: hidden;
		border-radius: var(--radius-xl);
		transition: all var(--duration-standard) var(--ease-standard);
		text-decoration: none;
		color: inherit;
	}

	/* Interactive cards */
	.card-interactive {
		cursor: pointer;
	}

	.card-interactive:hover {
		transform: translateY(-4px);
	}

	.card-interactive:active {
		transform: translateY(-2px);
	}

	.card-interactive:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}

	/* Variants */
	.card-default {
		background: var(--color-card-dark);
		border: 1px solid var(--color-border-default);
	}

	.card-default:hover {
		border-color: var(--color-border-emphasis);
		box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3), 0 0 0 1px var(--color-border-emphasis);
	}

	.card-elevated {
		background: var(--color-bg-elevated);
		box-shadow: var(--shadow-lg);
	}

	.card-elevated:hover {
		box-shadow: 0 25px 50px rgba(0, 0, 0, 0.4);
	}

	.card-ghost {
		background: transparent;
		border: 1px solid transparent;
	}

	.card-ghost:hover {
		background: var(--color-bg-surface);
		border-color: var(--color-border-default);
	}

	/* Sizes */
	.card-sm .card-body {
		padding: var(--space-sm);
	}

	.card-md .card-body {
		padding: var(--space-md);
	}

	.card-lg .card-body {
		padding: var(--space-lg);
	}

	/* Image Section */
	.card-image {
		position: relative;
		width: 100%;
		overflow: hidden;
		background: var(--color-bg-surface);
	}

	.card-image img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: transform var(--duration-standard) var(--ease-standard);
	}

	.card-interactive:hover .card-image img {
		transform: scale(1.05);
	}

	/* Aspect ratios */
	.aspect-video {
		aspect-ratio: 16 / 9;
	}

	.aspect-poster {
		aspect-ratio: 2 / 3;
	}

	.aspect-square {
		aspect-ratio: 1 / 1;
	}

	.aspect-wide {
		aspect-ratio: 21 / 9;
	}

	/* Tag badge */
	.card-tag {
		position: absolute;
		top: var(--space-sm);
		left: var(--space-sm);
		padding: 0.25rem 0.625rem;
		background: rgba(0, 0, 0, 0.6);
		backdrop-filter: blur(8px);
		color: white;
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		border-radius: var(--radius-full);
	}

	/* Custom badge slot */
	.card-badge-slot {
		position: absolute;
		top: var(--space-sm);
		right: var(--space-sm);
	}

	/* Body */
	.card-body {
		display: flex;
		flex-direction: column;
		flex-grow: 1;
	}

	/* Header */
	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: var(--space-sm);
		margin-bottom: var(--space-xs);
	}

	.card-header-content {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		flex: 1;
		min-width: 0;
	}

	.card-header-action {
		flex-shrink: 0;
		margin: -0.25rem -0.25rem 0 0;
	}

	/* Date */
	.card-date {
		font-size: 0.6875rem;
		font-weight: 500;
		color: var(--color-fg-subtle);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	/* Title */
	.card-title {
		font-size: var(--text-body-lg);
		font-weight: 700;
		color: var(--color-fg-primary);
		margin: 0;
		line-height: 1.3;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.card-sm .card-title {
		font-size: var(--text-body);
	}

	.card-lg .card-title {
		font-size: var(--text-h3);
	}

	.card-interactive:hover .card-title {
		color: var(--color-brand);
	}

	/* Content */
	.card-content {
		flex-grow: 1;
	}

	.card-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		line-height: 1.6;
		margin: 0;
		display: -webkit-box;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	/* Meta */
	.card-meta {
		font-size: 0.6875rem;
		color: var(--color-fg-subtle);
		margin-top: var(--space-sm);
	}

	/* Footer */
	.card-footer {
		margin-top: var(--space-md);
		padding-top: var(--space-md);
		border-top: 1px solid var(--color-border-default);
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	/* Button reset */
	button.card {
		border: none;
		font: inherit;
		text-align: inherit;
	}
</style>
