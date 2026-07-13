<script lang="ts">
	/**
	 * User Menu
	 *
	 * Dropdown menu showing user avatar, name, and actions.
	 * Provides logout functionality and navigation to account settings.
	 *
	 * Canon: The menu recedes; only the user remains visible.
	 */

	import type { User } from '../types.js';

	interface Props {
		/** Current user */
		user: User;
		/** Called when logout is clicked */
		onLogout: () => void;
		/** Link to account settings */
		settingsHref?: string;
		/** Custom avatar URL (overrides gravatar) */
		avatarUrl?: string;
		/** User's display name */
		name?: string;
	}

	let { user, onLogout, settingsHref = '/account', avatarUrl, name }: Props = $props();

	let isOpen = $state(false);
	let menuRef = $state<HTMLDivElement | null>(null);

	// Get display name or fallback to email
	const displayName = $derived(name || user.email.split('@')[0]);

	// Get initials for avatar fallback
	const initials = $derived(
		displayName
			.split(' ')
			.map((n) => n[0])
			.join('')
			.toUpperCase()
			.slice(0, 2)
	);

	// Generate gravatar URL if no custom avatar
	const gravatarUrl = $derived.by(() => {
		if (avatarUrl) return avatarUrl;
		// Simple hash for gravatar (not cryptographically secure, just for avatar)
		const hash = user.email
			.toLowerCase()
			.trim()
			.split('')
			.reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0)
			.toString(16);
		return `https://www.gravatar.com/avatar/${hash}?d=blank&s=80`;
	});

	function toggle() {
		isOpen = !isOpen;
	}

	function close() {
		isOpen = false;
	}

	function handleLogout() {
		close();
		onLogout();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			close();
		}
	}

	function handleClickOutside(e: MouseEvent) {
		if (menuRef && !menuRef.contains(e.target as Node)) {
			close();
		}
	}

	$effect(() => {
		if (isOpen) {
			document.addEventListener('click', handleClickOutside);
			document.addEventListener('keydown', handleKeydown);
		}
		return () => {
			document.removeEventListener('click', handleClickOutside);
			document.removeEventListener('keydown', handleKeydown);
		};
	});
</script>

<div class="user-menu" bind:this={menuRef}>
	<button class="trigger" onclick={toggle} aria-expanded={isOpen} aria-haspopup="true">
		<span class="avatar" style="background-image: url({gravatarUrl})">
			{#if !avatarUrl}
				<span class="initials">{initials}</span>
			{/if}
		</span>
		<span class="chevron" class:open={isOpen}>
			<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M6 9l6 6 6-6" />
			</svg>
		</span>
	</button>

	{#if isOpen}
		<div class="dropdown" role="menu">
			<div class="user-info">
				<span class="user-name">{displayName}</span>
				<span class="user-email">{user.email}</span>
				<span class="user-tier">{user.tier}</span>
			</div>

			<div class="divider"></div>

			<a href={settingsHref} class="menu-item" role="menuitem" onclick={close}>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<circle cx="12" cy="12" r="3" />
					<path
						d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
					/>
				</svg>
				Account settings
			</a>

			<button type="button" class="menu-item logout" role="menuitem" onclick={handleLogout}>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
					<polyline points="16 17 21 12 16 7" />
					<line x1="21" y1="12" x2="9" y2="12" />
				</svg>
				Sign out
			</button>
		</div>
	{/if}
</div>

<style>
	.user-menu {
		position: relative;
	}

	.trigger {
		display: flex;
		align-items: center;
		gap: var(--space-performance-xs);
		padding: var(--space-performance-xs);
		background: transparent;
		border: none;
		border-radius: var(--radius-performance-scale-full);
		cursor: pointer;
		transition: background var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.trigger:hover {
		background: var(--color-performance-hover);
	}

	.trigger:focus-visible {
		outline: 2px solid var(--color-performance-focus);
		outline-offset: 2px;
	}

	.avatar {
		width: 32px;
		height: 32px;
		border-radius: var(--radius-performance-scale-full);
		background-color: var(--color-performance-bg-surface);
		background-size: cover;
		background-position: center;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
	}

	.initials {
		font-size: var(--text-performance-body-sm);
		font-weight: 600;
		color: var(--color-performance-fg-secondary);
	}

	.chevron {
		color: var(--color-performance-fg-muted);
		transition: transform var(--duration-performance-micro) var(--ease-performance-standard);
		display: flex;
	}

	.chevron.open {
		transform: rotate(180deg);
	}

	.dropdown {
		position: absolute;
		top: calc(100% + var(--space-performance-xs));
		right: 0;
		min-width: 220px;
		border-radius: var(--radius-performance-scale-lg);
		background-color: var(--glass-performance-bg-medium);
		backdrop-filter: blur(var(--glass-performance-blur-lg)) var(--glass-performance-saturate-lg);
		-webkit-backdrop-filter: blur(var(--glass-performance-blur-lg)) var(--glass-performance-saturate-lg);
		border: 1px solid var(--glass-performance-border-medium);
		box-shadow: var(--glass-performance-shadow-md);
		padding: var(--space-performance-xs);
		z-index: 50;
		overflow: hidden;
		animation: fadeIn var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.dropdown::before {
		content: '';
		position: absolute;
		inset: 0;
		background: var(--liquid-glass-performance-highlight-subtle);
		pointer-events: none;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(-4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.user-info {
		position: relative;
		z-index: 1;
		padding: var(--space-performance-sm);
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.user-name {
		font-size: var(--text-performance-body);
		font-weight: 600;
		color: var(--color-performance-fg-primary);
	}

	.user-email {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-tertiary);
	}

	.user-tier {
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-muted);
		text-transform: capitalize;
		margin-top: var(--space-performance-xs);
	}

	.divider {
		position: relative;
		z-index: 1;
		height: 1px;
		background: var(--glass-performance-border-light);
		margin: var(--space-performance-xs) 0;
	}

	.menu-item {
		position: relative;
		z-index: 1;
		display: flex;
		align-items: center;
		gap: var(--space-performance-sm);
		width: 100%;
		padding: var(--space-performance-sm);
		background: transparent;
		border: none;
		border-radius: var(--radius-performance-scale-md);
		color: var(--color-performance-fg-secondary);
		font-size: var(--text-performance-body-sm);
		text-decoration: none;
		cursor: pointer;
		transition: all var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.menu-item:hover {
		background: var(--color-performance-hover);
		color: var(--color-performance-fg-primary);
	}

	.menu-item:focus-visible {
		outline: 2px solid var(--color-performance-focus);
		outline-offset: -2px;
	}

	.menu-item.logout {
		color: var(--color-performance-error);
	}

	.menu-item.logout:hover {
		background: var(--color-performance-error-muted);
	}

	@media (prefers-reduced-transparency: reduce) {
		.dropdown {
			backdrop-filter: none;
			-webkit-backdrop-filter: none;
			background-color: var(--color-performance-bg-surface);
			border-color: var(--color-performance-border-emphasis);
		}

		.dropdown::before {
			display: none;
		}
	}
</style>
