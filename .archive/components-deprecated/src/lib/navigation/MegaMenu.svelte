<script lang="ts">
	/**
	 * MegaMenu Component
	 *
	 * Large dropdown navigation with sections and rich content.
	 * Supports hover/click activation, keyboard navigation, and responsive behavior.
	 *
	 * Canon principle: Complex navigation should feel simple.
	 *
	 * @example
	 * <MegaMenu
	 *   items={[
	 *     {
	 *       id: 'products',
	 *       label: 'Products',
	 *       sections: [
	 *         {
	 *           title: 'Features',
	 *           links: [
	 *             { label: 'Analytics', href: '/analytics', description: 'Track your metrics' },
	 *             { label: 'Reports', href: '/reports', description: 'Generate insights' }
	 *           ]
	 *         }
	 *       ]
	 *     }
	 *   ]}
	 * />
	 */
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	interface MenuLink {
		/** Link label */
		label: string;
		/** Link URL */
		href: string;
		/** Optional description */
		description?: string;
		/** Optional icon name */
		icon?: string;
		/** External link */
		external?: boolean;
	}

	interface MenuSection {
		/** Section title */
		title?: string;
		/** Links in this section */
		links: MenuLink[];
	}

	interface MenuItem {
		/** Unique identifier */
		id: string;
		/** Trigger label */
		label: string;
		/** Direct link (no dropdown) */
		href?: string;
		/** Dropdown sections */
		sections?: MenuSection[];
		/** Featured content (appears on right) */
		featured?: {
			title: string;
			description: string;
			href: string;
			image?: string;
		};
	}

	interface Props {
		/** Menu items */
		items: MenuItem[];
		/** Activation mode */
		activation?: 'hover' | 'click';
		/** Open delay for hover (ms) */
		openDelay?: number;
		/** Close delay for hover (ms) */
		closeDelay?: number;
		/** Panel width */
		panelWidth?: 'auto' | 'full' | string;
		/** Additional classes */
		class?: string;
		/** Icon snippet */
		icon?: import('svelte').Snippet<[MenuLink]>;
	}

	let {
		items,
		activation = 'hover',
		openDelay = 150,
		closeDelay = 300,
		panelWidth = 'auto',
		class: className = '',
		icon
	}: Props = $props();

	let menuElement: HTMLElement;
	let activeItemId = $state<string | null>(null);
	let openTimeout: ReturnType<typeof setTimeout>;
	let closeTimeout: ReturnType<typeof setTimeout>;
	let focusedIndex = $state(-1);

	// Check for reduced motion preference
	const prefersReducedMotion = browser
		? window.matchMedia('(prefers-reduced-motion: reduce)').matches
		: false;

	function openPanel(id: string) {
		clearTimeout(closeTimeout);

		if (activation === 'hover') {
			openTimeout = setTimeout(() => {
				activeItemId = id;
			}, prefersReducedMotion ? 0 : openDelay);
		} else {
			activeItemId = activeItemId === id ? null : id;
		}
	}

	function closePanel() {
		clearTimeout(openTimeout);

		if (activation === 'hover') {
			closeTimeout = setTimeout(() => {
				activeItemId = null;
				focusedIndex = -1;
			}, prefersReducedMotion ? 0 : closeDelay);
		}
	}

	function closeImmediately() {
		clearTimeout(openTimeout);
		clearTimeout(closeTimeout);
		activeItemId = null;
		focusedIndex = -1;
	}

	function handleTriggerClick(item: MenuItem) {
		if (item.href && !item.sections) {
			// Direct link, navigate
			return;
		}

		if (activation === 'click') {
			openPanel(item.id);
		}
	}

	function handleTriggerMouseEnter(item: MenuItem) {
		if (activation === 'hover' && item.sections) {
			openPanel(item.id);
		}
	}

	function handleTriggerMouseLeave() {
		if (activation === 'hover') {
			closePanel();
		}
	}

	function handlePanelMouseEnter() {
		clearTimeout(closeTimeout);
	}

	function handlePanelMouseLeave() {
		if (activation === 'hover') {
			closePanel();
		}
	}

	function handleKeydown(event: KeyboardEvent, index: number) {
		const activeItem = items.find(i => i.id === activeItemId);

		switch (event.key) {
			case 'Escape':
				event.preventDefault();
				closeImmediately();
				break;

			case 'ArrowDown':
				event.preventDefault();
				if (!activeItemId && items[index].sections) {
					openPanel(items[index].id);
					focusedIndex = 0;
				} else if (activeItem?.sections) {
					const totalLinks = activeItem.sections.reduce((acc, s) => acc + s.links.length, 0);
					focusedIndex = Math.min(focusedIndex + 1, totalLinks - 1);
				}
				break;

			case 'ArrowUp':
				event.preventDefault();
				if (focusedIndex > 0) {
					focusedIndex--;
				} else if (focusedIndex === 0) {
					focusedIndex = -1;
				}
				break;

			case 'ArrowLeft':
				event.preventDefault();
				if (index > 0) {
					const prevTrigger = menuElement?.querySelector(`[data-index="${index - 1}"]`) as HTMLElement;
					prevTrigger?.focus();
					if (items[index - 1].sections) {
						openPanel(items[index - 1].id);
					} else {
						closeImmediately();
					}
				}
				break;

			case 'ArrowRight':
				event.preventDefault();
				if (index < items.length - 1) {
					const nextTrigger = menuElement?.querySelector(`[data-index="${index + 1}"]`) as HTMLElement;
					nextTrigger?.focus();
					if (items[index + 1].sections) {
						openPanel(items[index + 1].id);
					} else {
						closeImmediately();
					}
				}
				break;

			case 'Enter':
			case ' ':
				if (items[index].sections && !activeItemId) {
					event.preventDefault();
					openPanel(items[index].id);
					focusedIndex = 0;
				}
				break;

			case 'Tab':
				closeImmediately();
				break;
		}
	}

	function handleLinkKeydown(event: KeyboardEvent, sectionIndex: number, linkIndex: number) {
		const activeItem = items.find(i => i.id === activeItemId);
		if (!activeItem?.sections) return;

		switch (event.key) {
			case 'Escape':
				event.preventDefault();
				closeImmediately();
				const trigger = menuElement?.querySelector(`[data-id="${activeItem.id}"]`) as HTMLElement;
				trigger?.focus();
				break;

			case 'ArrowDown':
				event.preventDefault();
				const totalLinks = activeItem.sections.reduce((acc, s) => acc + s.links.length, 0);
				focusedIndex = Math.min(focusedIndex + 1, totalLinks - 1);
				break;

			case 'ArrowUp':
				event.preventDefault();
				if (focusedIndex > 0) {
					focusedIndex--;
				}
				break;

			case 'Tab':
				closeImmediately();
				break;
		}
	}

	// Focus management for links
	$effect(() => {
		if (focusedIndex >= 0 && activeItemId && browser) {
			const links = menuElement?.querySelectorAll(`[data-panel="${activeItemId}"] a`);
			(links?.[focusedIndex] as HTMLElement)?.focus();
		}
	});

	// Close on click outside
	function handleClickOutside(event: MouseEvent) {
		if (menuElement && !menuElement.contains(event.target as Node)) {
			closeImmediately();
		}
	}

	onMount(() => {
		if (browser) {
			document.addEventListener('click', handleClickOutside);
			return () => {
				document.removeEventListener('click', handleClickOutside);
				clearTimeout(openTimeout);
				clearTimeout(closeTimeout);
			};
		}
	});

	const panelWidthStyle = panelWidth === 'auto'
		? ''
		: panelWidth === 'full'
			? 'width: 100%; left: 0; right: 0;'
			: `width: ${panelWidth};`;
</script>

<nav
	bind:this={menuElement}
	class="mega-menu {className}"
	class:reduced-motion={prefersReducedMotion}
	role="navigation"
	aria-label="Main navigation"
>
	<ul class="menu-list" role="menubar">
		{#each items as item, index (item.id)}
			<li class="menu-item" role="none">
				{#if item.href && !item.sections}
					<!-- Direct link -->
					<a
						href={item.href}
						class="menu-trigger"
						role="menuitem"
						data-index={index}
					>
						{item.label}
					</a>
				{:else}
					<!-- Dropdown trigger -->
					<button
						type="button"
						class="menu-trigger"
						class:active={activeItemId === item.id}
						role="menuitem"
						aria-haspopup="true"
						aria-expanded={activeItemId === item.id}
						data-index={index}
						data-id={item.id}
						onclick={() => handleTriggerClick(item)}
						onmouseenter={() => handleTriggerMouseEnter(item)}
						onmouseleave={handleTriggerMouseLeave}
						onkeydown={(e) => handleKeydown(e, index)}
					>
						{item.label}
						<svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M6 9l6 6 6-6" />
						</svg>
					</button>

					<!-- Dropdown panel -->
					{#if activeItemId === item.id && item.sections}
						<div
							class="menu-panel"
							class:has-featured={!!item.featured}
							style={panelWidthStyle}
							role="menu"
							aria-label="{item.label} menu"
							data-panel={item.id}
							onmouseenter={handlePanelMouseEnter}
							onmouseleave={handlePanelMouseLeave}
						>
							<div class="panel-content">
								<!-- Sections -->
								<div class="panel-sections">
									{#each item.sections as section, sectionIndex}
										<div class="panel-section">
											{#if section.title}
												<h3 class="section-title">{section.title}</h3>
											{/if}
											<ul class="section-links">
												{#each section.links as link, linkIndex}
													<li>
														<a
															href={link.href}
															class="section-link"
															target={link.external ? '_blank' : undefined}
															rel={link.external ? 'noopener noreferrer' : undefined}
															role="menuitem"
															onkeydown={(e) => handleLinkKeydown(e, sectionIndex, linkIndex)}
														>
															{#if icon && link.icon}
																<span class="link-icon">
																	{@render icon(link)}
																</span>
															{/if}
															<span class="link-content">
																<span class="link-label">{link.label}</span>
																{#if link.description}
																	<span class="link-description">{link.description}</span>
																{/if}
															</span>
															{#if link.external}
																<svg class="external-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
																	<path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
																</svg>
															{/if}
														</a>
													</li>
												{/each}
											</ul>
										</div>
									{/each}
								</div>

								<!-- Featured content -->
								{#if item.featured}
									<div class="panel-featured">
										<a href={item.featured.href} class="featured-card">
											{#if item.featured.image}
												<img
													src={item.featured.image}
													alt=""
													class="featured-image"
												/>
											{/if}
											<div class="featured-content">
												<h4 class="featured-title">{item.featured.title}</h4>
												<p class="featured-description">{item.featured.description}</p>
											</div>
										</a>
									</div>
								{/if}
							</div>
						</div>
					{/if}
				{/if}
			</li>
		{/each}
	</ul>
</nav>

<style>
	.mega-menu {
		position: relative;
	}

	.menu-list {
		display: flex;
		align-items: center;
		gap: var(--space-xs, 0.5rem);
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.menu-item {
		position: relative;
	}

	.menu-trigger {
		display: flex;
		align-items: center;
		gap: 4px;
		padding: var(--space-sm, 1rem) var(--space-md, 1.618rem);
		background: transparent;
		border: none;
		color: var(--color-fg-secondary, rgba(255, 255, 255, 0.8));
		font-family: inherit;
		font-size: var(--text-body, 1rem);
		cursor: pointer;
		text-decoration: none;
		border-radius: var(--radius-md, 8px);
		transition:
			color var(--duration-micro, 200ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1)),
			background var(--duration-micro, 200ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1));
	}

	.menu-trigger:hover,
	.menu-trigger.active {
		color: var(--color-fg-primary, #fff);
		background: var(--color-hover, rgba(255, 255, 255, 0.05));
	}

	.menu-trigger:focus-visible {
		outline: 2px solid var(--color-focus, rgba(255, 255, 255, 0.5));
		outline-offset: 2px;
	}

	.chevron {
		width: 16px;
		height: 16px;
		transition: transform var(--duration-micro, 200ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1));
	}

	.menu-trigger.active .chevron {
		transform: rotate(180deg);
	}

	/* Panel */
	.menu-panel {
		position: absolute;
		top: 100%;
		left: 50%;
		transform: translateX(-50%);
		min-width: 400px;
		max-width: 800px;
		margin-top: var(--space-xs, 0.5rem);
		background: var(--color-bg-elevated, #0a0a0a);
		border: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
		border-radius: var(--radius-lg, 12px);
		box-shadow: var(--shadow-xl, 0 20px 60px rgba(0, 0, 0, 0.4));
		animation: panelIn var(--duration-micro, 200ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1));
		z-index: 100;
	}

	.menu-panel.has-featured {
		min-width: 600px;
	}

	@keyframes panelIn {
		from {
			opacity: 0;
			transform: translateX(-50%) translateY(-8px);
		}
		to {
			opacity: 1;
			transform: translateX(-50%) translateY(0);
		}
	}

	.panel-content {
		display: flex;
		gap: var(--space-md, 1.618rem);
		padding: var(--space-lg, 2.618rem);
	}

	/* Sections */
	.panel-sections {
		display: flex;
		gap: var(--space-lg, 2.618rem);
		flex: 1;
	}

	.panel-section {
		min-width: 160px;
	}

	.section-title {
		font-size: var(--text-caption, 0.75rem);
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
		margin: 0 0 var(--space-sm, 1rem);
	}

	.section-links {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.section-link {
		display: flex;
		align-items: flex-start;
		gap: var(--space-sm, 1rem);
		padding: var(--space-sm, 1rem);
		margin: 0 calc(var(--space-sm, 1rem) * -1);
		color: var(--color-fg-primary, #fff);
		text-decoration: none;
		border-radius: var(--radius-md, 8px);
		transition: background var(--duration-micro, 200ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1));
	}

	.section-link:hover {
		background: var(--color-hover, rgba(255, 255, 255, 0.05));
	}

	.section-link:focus-visible {
		outline: 2px solid var(--color-focus, rgba(255, 255, 255, 0.5));
		outline-offset: -2px;
	}

	.link-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		flex-shrink: 0;
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
	}

	.link-content {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.link-label {
		font-size: var(--text-body, 1rem);
		font-weight: 500;
	}

	.link-description {
		font-size: var(--text-body-sm, 0.875rem);
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
	}

	.external-icon {
		width: 14px;
		height: 14px;
		flex-shrink: 0;
		color: var(--color-fg-subtle, rgba(255, 255, 255, 0.2));
		margin-left: auto;
	}

	/* Featured */
	.panel-featured {
		width: 240px;
		flex-shrink: 0;
		padding-left: var(--space-md, 1.618rem);
		border-left: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
	}

	.featured-card {
		display: block;
		text-decoration: none;
		color: inherit;
		border-radius: var(--radius-md, 8px);
		overflow: hidden;
		background: var(--color-bg-surface, #111);
		transition: transform var(--duration-micro, 200ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1));
	}

	.featured-card:hover {
		transform: translateY(-2px);
	}

	.featured-card:focus-visible {
		outline: 2px solid var(--color-focus, rgba(255, 255, 255, 0.5));
		outline-offset: 2px;
	}

	.featured-image {
		width: 100%;
		height: 120px;
		object-fit: cover;
	}

	.featured-content {
		padding: var(--space-sm, 1rem);
	}

	.featured-title {
		font-size: var(--text-body, 1rem);
		font-weight: 600;
		color: var(--color-fg-primary, #fff);
		margin: 0 0 4px;
	}

	.featured-description {
		font-size: var(--text-body-sm, 0.875rem);
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
		margin: 0;
	}

	/* Reduced motion */
	.mega-menu.reduced-motion .menu-panel {
		animation: none;
	}

	.mega-menu.reduced-motion .menu-trigger,
	.mega-menu.reduced-motion .section-link,
	.mega-menu.reduced-motion .chevron,
	.mega-menu.reduced-motion .featured-card {
		transition: none;
	}

	@media (prefers-reduced-motion: reduce) {
		.menu-panel {
			animation: none;
		}

		.menu-trigger,
		.section-link,
		.chevron,
		.featured-card {
			transition: none;
		}
	}

	/* Responsive - hide on mobile */
	@media (max-width: 768px) {
		.mega-menu {
			display: none;
		}
	}
</style>
