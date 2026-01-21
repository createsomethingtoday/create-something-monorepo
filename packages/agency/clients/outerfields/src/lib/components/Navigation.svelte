<script lang="ts">
	/**
	 * OUTERFIELDS Navigation
	 *
	 * Fixed navigation with logo, links, and auth buttons
	 * Mobile hamburger menu for touch devices
	 */
	import { Infinity, LogOut, User, Menu, X } from 'lucide-svelte';
	import { page } from '$app/stores';
	import { NAV_LINKS } from '$lib/constants/navigation';

	interface Props {
		user?: {
			id: string;
			email: string;
			name: string;
			membership: boolean;
			createdAt: string;
		} | null;
	}

	let { user = null }: Props = $props();

	// Mobile menu state
	let isMobileMenuOpen = $state(false);

	function toggleMobileMenu() {
		isMobileMenuOpen = !isMobileMenuOpen;
	}

	function closeMobileMenu() {
		isMobileMenuOpen = false;
	}

	async function handleLogout() {
		await fetch('/api/auth/logout', { method: 'POST' });
		window.location.href = '/';
	}
</script>

<header class="nav-header">
	<div class="nav-container">
		<div class="nav-left">
			<!-- Logo -->
			<a href="/" class="logo-link" onclick={closeMobileMenu}>
				<div class="logo-icon">
					<Infinity size={32} />
				</div>
				<span class="logo-text">OUTERFIELDS</span>
			</a>

			<!-- Desktop Nav Links -->
			<nav class="nav-links desktop-only">
				{#each NAV_LINKS as link}
					<a
						href={link.href}
						class="nav-link"
						class:active={$page.url.pathname === link.href}
					>
						{link.label}
					</a>
				{/each}
			</nav>
		</div>

		<div class="nav-right">
			{#if user}
				<span class="user-info">
					<User size={16} />
					<span class="user-name">{user.name || user.email}</span>
					{#if user.membership}
						<span class="role-badge">Member</span>
					{/if}
				</span>
				<button class="btn-logout" onclick={handleLogout}>
					<LogOut size={16} />
					<span>Log Out</span>
				</button>
			{:else}
				<a href="/login" class="nav-link desktop-only">Log In</a>
				<a href="/login" class="btn-primary desktop-only">Get Started</a>
			{/if}

			<!-- Mobile Menu Toggle -->
			<button
				class="mobile-menu-toggle"
				onclick={toggleMobileMenu}
				aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
				aria-expanded={isMobileMenuOpen}
			>
				{#if isMobileMenuOpen}
					<X size={24} />
				{:else}
					<Menu size={24} />
				{/if}
			</button>
		</div>
	</div>

	<!-- Mobile Menu Overlay -->
	{#if isMobileMenuOpen}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div class="mobile-menu-overlay" onclick={closeMobileMenu} role="presentation"></div>
		<nav class="mobile-menu">
			<div class="mobile-menu-links">
				{#each NAV_LINKS as link}
					<a
						href={link.href}
						class="mobile-nav-link"
						class:active={$page.url.pathname === link.href}
						onclick={closeMobileMenu}
					>
						{link.label}
					</a>
				{/each}
			</div>

			<div class="mobile-menu-actions">
				{#if user}
					<div class="mobile-user-info">
						<User size={18} />
						<span>{user.name || user.email}</span>
						{#if user.membership}
							<span class="role-badge">Member</span>
						{/if}
					</div>
					<button class="mobile-logout-btn" onclick={() => { closeMobileMenu(); handleLogout(); }}>
						<LogOut size={18} />
						<span>Log Out</span>
					</button>
				{:else}
					<a href="/login" class="mobile-login-link" onclick={closeMobileMenu}>Log In</a>
					<a href="/login" class="mobile-cta-btn" onclick={closeMobileMenu}>Get Started</a>
				{/if}
			</div>
		</nav>
	{/if}
</header>

<style>
	.nav-header {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 50;
		padding: 1rem 1.5rem;
		background: linear-gradient(to bottom, rgba(0, 0, 0, 0.9), transparent);
		transition: background var(--duration-standard) var(--ease-standard);
		overflow-x: hidden;
		max-width: 100vw;
	}

	.nav-container {
		max-width: var(--container-max-width);
		margin: 0 auto;
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
	}

	.nav-left {
		display: flex;
		align-items: center;
		gap: 3rem;
	}

	.logo-link {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		text-decoration: none;
		color: var(--color-fg-primary);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.logo-link:hover {
		color: var(--color-primary);
	}

	.logo-icon {
		width: 2rem;
		height: 2rem;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--color-primary);
	}

	.logo-text {
		font-size: 1.25rem;
		font-weight: 700;
		letter-spacing: -0.02em;
	}

	.nav-links {
		display: flex;
		align-items: center;
		gap: 2rem;
	}

	.nav-link {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-fg-muted);
		text-decoration: none;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.nav-link:hover,
	.nav-link.active {
		color: var(--color-fg-primary);
	}

	.nav-right {
		display: flex;
		align-items: center;
		gap: 1.5rem;
	}

	.user-info {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		color: var(--color-fg-secondary);
	}

	.user-info :global(svg) {
		opacity: 0.7;
	}

	.user-name {
		max-width: 150px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.role-badge {
		padding: 0.125rem 0.5rem;
		background: var(--color-primary);
		border-radius: 9999px;
		font-size: 0.625rem;
		font-weight: 600;
		color: var(--color-fg-primary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.btn-logout {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		background: transparent;
		border: 1px solid var(--color-border-default);
		border-radius: 0.5rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-fg-secondary);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.btn-logout:hover {
		background: var(--color-bg-surface);
		border-color: var(--color-border-emphasis);
		color: var(--color-fg-primary);
	}

	/* Mobile Menu Toggle */
	.mobile-menu-toggle {
		display: none;
		width: 44px;
		height: 44px;
		align-items: center;
		justify-content: center;
		background: transparent;
		border: none;
		color: var(--color-fg-primary);
		cursor: pointer;
		border-radius: var(--radius-md);
		transition: background var(--duration-micro) var(--ease-standard);
	}

	.mobile-menu-toggle:hover {
		background: rgba(255, 255, 255, 0.1);
	}

	/* Mobile Menu Overlay */
	.mobile-menu-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.6);
		z-index: 40;
		animation: fadeIn var(--duration-micro) var(--ease-standard);
	}

	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	/* Mobile Menu */
	.mobile-menu {
		position: fixed;
		top: 0;
		right: 0;
		width: min(320px, 85vw);
		height: 100vh;
		background: var(--color-bg-pure);
		border-left: 1px solid var(--color-border-default);
		z-index: 51;
		display: flex;
		flex-direction: column;
		padding: 5rem 1.5rem 2rem;
		animation: slideIn var(--duration-standard) var(--ease-standard);
	}

	@keyframes slideIn {
		from { transform: translateX(100%); }
		to { transform: translateX(0); }
	}

	.mobile-menu-links {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.mobile-nav-link {
		display: block;
		padding: 1rem;
		font-size: 1.125rem;
		font-weight: 500;
		color: var(--color-fg-secondary);
		text-decoration: none;
		border-radius: var(--radius-md);
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.mobile-nav-link:hover,
	.mobile-nav-link.active {
		background: var(--color-bg-surface);
		color: var(--color-fg-primary);
	}

	.mobile-menu-actions {
		margin-top: auto;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding-top: 2rem;
		border-top: 1px solid var(--color-border-default);
	}

	.mobile-user-info {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem;
		background: var(--color-bg-surface);
		border-radius: var(--radius-md);
		font-size: 0.9375rem;
		color: var(--color-fg-secondary);
	}

	.mobile-user-info :global(svg) {
		opacity: 0.7;
	}

	.mobile-logout-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		width: 100%;
		padding: 1rem;
		background: transparent;
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		font-size: 1rem;
		font-weight: 500;
		color: var(--color-fg-secondary);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.mobile-logout-btn:hover {
		background: var(--color-bg-surface);
		border-color: var(--color-border-emphasis);
		color: var(--color-fg-primary);
	}

	.mobile-login-link {
		display: block;
		padding: 1rem;
		text-align: center;
		font-size: 1rem;
		font-weight: 500;
		color: var(--color-fg-secondary);
		text-decoration: none;
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.mobile-login-link:hover {
		background: var(--color-bg-surface);
		border-color: var(--color-border-emphasis);
		color: var(--color-fg-primary);
	}

	.mobile-cta-btn {
		display: block;
		padding: 1rem;
		text-align: center;
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-bg-pure);
		background: var(--color-fg-primary);
		text-decoration: none;
		border-radius: var(--radius-md);
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.mobile-cta-btn:hover {
		opacity: 0.9;
	}

	/* Tablet - show mobile menu earlier to prevent overflow */
	@media (max-width: 1024px) {
		.nav-header {
			padding: 0.75rem 1rem;
		}

		.desktop-only {
			display: none !important;
		}

		.mobile-menu-toggle {
			display: flex;
		}

		.user-info .user-name {
			display: none;
		}

		.btn-logout span {
			display: none;
		}

		.btn-logout {
			display: none;
		}

		.user-info {
			display: none;
		}
	}
</style>
