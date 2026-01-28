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
		gap: var(--space-xs);
		padding: var(--space-xs);
		background: transparent;
		border: none;
		border-radius: var(--radius-full);
		cursor: pointer;
		transition: background var(--duration-micro) var(--ease-standard);
	}

	.trigger:hover {
		background: var(--color-hover);
	}

	.trigger:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}

	.avatar {
		width: 32px;
		height: 32px;
		border-radius: var(--radius-full);
		background-color: var(--color-bg-surface);
		background-size: cover;
		background-position: center;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
	}

	.initials {
		font-size: var(--text-body-sm);
		font-weight: 600;
		color: var(--color-fg-secondary);
	}

	.chevron {
		color: var(--color-fg-muted);
		transition: transform var(--duration-micro) var(--ease-standard);
		display: flex;
	}

	.chevron.open {
		transform: rotate(180deg);
	}

	.dropdown {
		position: absolute;
		top: calc(100% + var(--space-xs));
		right: 0;
		min-width: 220px;
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-lg);
		padding: var(--space-xs);
		z-index: 50;
		animation: fadeIn var(--duration-micro) var(--ease-standard);
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
		padding: var(--space-sm);
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.user-name {
		font-size: var(--text-body);
		font-weight: 600;
		color: var(--color-fg-primary);
	}

	.user-email {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	.user-tier {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-transform: capitalize;
		margin-top: var(--space-xs);
	}

	.divider {
		height: 1px;
		background: var(--color-border-default);
		margin: var(--space-xs) 0;
	}

	.menu-item {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		width: 100%;
		padding: var(--space-sm);
		background: transparent;
		border: none;
		border-radius: var(--radius-md);
		color: var(--color-fg-secondary);
		font-size: var(--text-body-sm);
		text-decoration: none;
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.menu-item:hover {
		background: var(--color-hover);
		color: var(--color-fg-primary);
	}

	.menu-item:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: -2px;
	}

	.menu-item.logout {
		color: var(--color-error);
	}

	.menu-item.logout:hover {
		background: var(--color-error-muted);
	}
</style>
