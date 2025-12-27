<script lang="ts">
	import { page } from '$app/stores';
	import { canonNavigation, type NavSection } from './navigation.js';

	interface Props {
		/** Whether sidebar is open on mobile */
		mobileOpen?: boolean;
		/** Callback when mobile sidebar should close */
		onClose?: () => void;
	}

	let { mobileOpen = false, onClose }: Props = $props();

	const currentPath = $derived($page.url.pathname);

	function isActive(href: string): boolean {
		if (href === '/canon') {
			return currentPath === '/canon';
		}
		return currentPath.startsWith(href);
	}

	function handleLinkClick() {
		// Close mobile sidebar when link is clicked
		onClose?.();
	}
</script>

<!-- Mobile overlay -->
{#if mobileOpen}
	<div
		class="sidebar-overlay"
		onclick={onClose}
		onkeydown={(e) => e.key === 'Escape' && onClose?.()}
		role="button"
		tabindex="0"
		aria-label="Close sidebar"
	></div>
{/if}

<aside class="sidebar" class:sidebar-open={mobileOpen}>
	<div class="sidebar-header">
		<a href="/canon" class="sidebar-logo" onclick={handleLinkClick}>
			<span class="logo-text">Canon</span>
			<span class="logo-suffix">Design System</span>
		</a>
		<button class="sidebar-close" onclick={onClose} aria-label="Close sidebar">
			<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M18 6L6 18M6 6l12 12" />
			</svg>
		</button>
	</div>

	<nav class="sidebar-nav" aria-label="Documentation navigation">
		{#each canonNavigation as section}
			<div class="nav-section">
				<h3 class="nav-section-title">{section.title}</h3>
				<ul class="nav-list">
					{#each section.items as item}
						<li>
							<a
								href={item.href}
								class="nav-link"
								class:nav-link-active={isActive(item.href)}
								onclick={handleLinkClick}
								aria-current={isActive(item.href) ? 'page' : undefined}
							>
								<span class="nav-link-text">{item.label}</span>
								{#if item.badge}
									<span class="nav-badge">{item.badge}</span>
								{/if}
							</a>
						</li>
					{/each}
				</ul>
			</div>
		{/each}
	</nav>

	<div class="sidebar-footer">
		<a href="https://github.com/createsomethingtoday/create-something-monorepo" class="footer-link" target="_blank" rel="noopener">
			<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
				<path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
			</svg>
			<span>GitHub</span>
		</a>
	</div>
</aside>

<style>
	/* Sidebar container */
	.sidebar {
		position: fixed;
		top: 0;
		left: 0;
		width: 280px;
		height: 100vh;
		background: var(--color-bg-elevated);
		border-right: 1px solid var(--color-border-default);
		display: flex;
		flex-direction: column;
		z-index: var(--z-fixed);
		transform: translateX(-100%);
		transition: transform var(--duration-standard) var(--ease-standard);
	}

	.sidebar-open {
		transform: translateX(0);
	}

	/* Desktop: always visible */
	@media (min-width: 1024px) {
		.sidebar {
			transform: translateX(0);
		}
	}

	/* Mobile overlay */
	.sidebar-overlay {
		position: fixed;
		inset: 0;
		background: var(--color-overlay);
		z-index: calc(var(--z-fixed) - 1);
	}

	@media (min-width: 1024px) {
		.sidebar-overlay {
			display: none;
		}
	}

	/* Header */
	.sidebar-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-md);
		border-bottom: 1px solid var(--color-border-default);
	}

	.sidebar-logo {
		display: flex;
		flex-direction: column;
		text-decoration: none;
	}

	.logo-text {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		letter-spacing: var(--tracking-tight);
	}

	.logo-suffix {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: var(--tracking-wider);
	}

	.sidebar-close {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		background: transparent;
		border: none;
		border-radius: var(--radius-md);
		color: var(--color-fg-secondary);
		cursor: pointer;
		transition: background var(--duration-micro) var(--ease-standard);
	}

	.sidebar-close:hover {
		background: var(--color-hover);
	}

	@media (min-width: 1024px) {
		.sidebar-close {
			display: none;
		}
	}

	/* Navigation */
	.sidebar-nav {
		flex: 1;
		overflow-y: auto;
		padding: var(--space-md);
	}

	.nav-section {
		margin-bottom: var(--space-lg);
	}

	.nav-section:last-child {
		margin-bottom: 0;
	}

	.nav-section-title {
		font-size: var(--text-caption);
		font-weight: var(--font-semibold);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: var(--tracking-wider);
		margin-bottom: var(--space-xs);
		padding: 0 var(--space-xs);
	}

	.nav-list {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.nav-link {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-xs) var(--space-xs);
		border-radius: var(--radius-md);
		text-decoration: none;
		color: var(--color-fg-secondary);
		font-size: var(--text-body-sm);
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.nav-link:hover {
		background: var(--color-hover);
		color: var(--color-fg-primary);
	}

	.nav-link-active {
		background: var(--color-active);
		color: var(--color-fg-primary);
		font-weight: var(--font-medium);
	}

	.nav-link-text {
		flex: 1;
	}

	.nav-badge {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		background: var(--color-bg-subtle);
		padding: 2px 6px;
		border-radius: var(--radius-sm);
	}

	/* Footer */
	.sidebar-footer {
		padding: var(--space-md);
		border-top: 1px solid var(--color-border-default);
	}

	.footer-link {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		color: var(--color-fg-muted);
		text-decoration: none;
		font-size: var(--text-body-sm);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.footer-link:hover {
		color: var(--color-fg-primary);
	}
</style>
