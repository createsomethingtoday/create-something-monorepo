<script lang="ts">
	import { tick } from 'svelte';
	import { Archive, Eye, LoaderCircle, MoreVertical, Pencil } from 'lucide-svelte';
	import { trackEvent } from '$lib/utils/analytics';
	import type { AssetActionDescriptor } from '$lib/utils/asset-actions';

	interface Props {
		assetId: string;
		status: string;
		actions?: AssetActionDescriptor[];
		isViewDisabled?: boolean;
		isViewLoading?: boolean;
		isEditDisabled?: boolean;
		isEditLoading?: boolean;
		onView?: (id: string) => void;
		onPreloadView?: (id: string) => void;
		onEdit?: (id: string) => void;
		onArchive?: (id: string) => void | Promise<void>;
	}

	let {
		assetId,
		status,
		actions = [],
		isViewDisabled = false,
		isViewLoading = false,
		isEditDisabled = false,
		isEditLoading = false,
		onView,
		onPreloadView,
		onEdit,
		onArchive
	}: Props = $props();

	let isOpen = $state(false);
	let isArchiving = $state(false);
	let triggerRef: HTMLButtonElement | undefined = $state();
	let dropdownRef: HTMLDivElement | undefined = $state();
	let dropdownPosition = $state({ top: 0, right: 0 });

	function updateDropdownPosition() {
		if (!triggerRef) return;
		const rect = triggerRef.getBoundingClientRect();
		dropdownPosition = {
			top: rect.bottom + 4,
			right: window.innerWidth - rect.right
		};
	}

	function toggle(event: MouseEvent) {
		event.stopPropagation();
		if (!isOpen) {
			updateDropdownPosition();
		}
		isOpen = !isOpen;
	}

	function handleClickOutside(event: MouseEvent) {
		const target = event.target as Node;
		if (triggerRef?.contains(target)) return;
		if (dropdownRef?.contains(target)) return;
		isOpen = false;
	}

	function trackOverflowAction(action: string) {
		trackEvent('dashboard_asset_overflow_action_clicked', {
			asset_id: assetId,
			asset_status: status,
			action
		});
	}

	function handleView(label = 'view_details') {
		if (isViewDisabled) return;

		trackOverflowAction(label);
		onView?.(assetId);
		isOpen = false;
	}

	function preloadView() {
		onPreloadView?.(assetId);
	}

	function handleEdit() {
		if (isEditDisabled) return;

		trackOverflowAction('edit');
		onEdit?.(assetId);
		isOpen = false;
	}

	async function handleArchive() {
		if (isArchiving) return;
		isArchiving = true;
		try {
			trackOverflowAction('archive');
			await onArchive?.(assetId);
			isOpen = false;
		} catch (err) {
			// Keep the menu open so the user can retry; the parent owns user-facing feedback.
			console.error('Archive action failed:', err);
		} finally {
			isArchiving = false;
		}
	}

	function closeDropdown() {
		isOpen = false;
	}

	function getMenuItems(): HTMLElement[] {
		if (!dropdownRef) return [];
		return Array.from(
			dropdownRef.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)')
		);
	}

	function focusMenuItem(index: number) {
		const items = getMenuItems();
		if (items.length === 0) return;
		const next = ((index % items.length) + items.length) % items.length;
		items[next].focus();
	}

	function handleTriggerKeydown(event: KeyboardEvent) {
		if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
			event.preventDefault();
			if (!isOpen) {
				updateDropdownPosition();
				isOpen = true;
			}
			void tick().then(() => focusMenuItem(event.key === 'ArrowDown' ? 0 : -1));
		} else if (event.key === 'Escape' && isOpen) {
			event.preventDefault();
			isOpen = false;
		}
	}

	function handleMenuKeydown(event: KeyboardEvent) {
		const items = getMenuItems();
		const currentIndex = items.indexOf(document.activeElement as HTMLElement);

		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				focusMenuItem(currentIndex + 1);
				break;
			case 'ArrowUp':
				event.preventDefault();
				focusMenuItem(currentIndex - 1);
				break;
			case 'Home':
				event.preventDefault();
				focusMenuItem(0);
				break;
			case 'End':
				event.preventDefault();
				focusMenuItem(items.length - 1);
				break;
			case 'Escape':
				event.preventDefault();
				isOpen = false;
				triggerRef?.focus();
				break;
			case 'Tab':
				// Menus close on Tab rather than trapping focus.
				isOpen = false;
				break;
		}
	}

	$effect(() => {
		if (!isOpen) return;
		document.addEventListener('click', handleClickOutside);
		window.addEventListener('scroll', closeDropdown, true);
		window.addEventListener('resize', closeDropdown);
		return () => {
			document.removeEventListener('click', handleClickOutside);
			window.removeEventListener('scroll', closeDropdown, true);
			window.removeEventListener('resize', closeDropdown);
		};
	});
</script>

{#if actions.length > 0}
	<div class="actions-container">
		<button
			type="button"
			class="trigger-btn"
			bind:this={triggerRef}
			onclick={toggle}
			onkeydown={handleTriggerKeydown}
			aria-haspopup="menu"
			aria-expanded={isOpen}
			aria-label="More asset actions"
		>
			<MoreVertical size={20} />
		</button>
	</div>
{/if}

{#if isOpen}
	<div
		class="dropdown-portal"
		bind:this={dropdownRef}
		style="top: {dropdownPosition.top}px; right: {dropdownPosition.right}px;"
		role="menu"
		tabindex="-1"
		onkeydown={handleMenuKeydown}
	>
		{#each actions as action (action.handler + action.label)}
			<button
				type="button"
				class="dropdown-item"
				class:dropdown-item-danger={action.handler === 'archive'}
				class:dropdown-item-loading={
					(action.handler === 'view' && isViewLoading) ||
					(action.handler === 'edit' && isEditLoading)
				}
				onmouseenter={() => action.handler === 'view' && preloadView()}
				onfocus={() => action.handler === 'view' && preloadView()}
				onclick={() =>
					action.handler === 'view'
						? handleView(action.label.toLowerCase().replace(/\s+/g, '_'))
						: action.handler === 'edit'
							? handleEdit()
							: handleArchive()}
				disabled={
					(action.handler === 'archive' && isArchiving) ||
					(action.handler === 'view' && isViewDisabled) ||
					(action.handler === 'edit' && isEditDisabled)
				}
				role="menuitem"
			>
				{#if action.handler === 'view'}
					{#if isViewLoading}
						<LoaderCircle size={16} class="spinner" />
					{:else}
						<Eye size={16} />
					{/if}
				{:else if action.handler === 'edit'}
					{#if isEditLoading}
						<LoaderCircle size={16} class="spinner" />
					{:else}
						<Pencil size={16} />
					{/if}
				{:else}
					<Archive size={16} />
				{/if}
				{#if action.handler === 'archive' && isArchiving}
					Archiving...
				{:else if action.handler === 'view' && isViewLoading}
					Opening...
				{:else if action.handler === 'edit' && isEditLoading}
					Opening...
				{:else}
					{action.label}
				{/if}
			</button>
		{/each}
	</div>
{/if}

<style>
	.actions-container {
		display: inline-flex;
	}

	.trigger-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		padding: 0;
		background: transparent;
		border: none;
		border-radius: var(--radius-md);
		color: var(--color-fg-muted);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.trigger-btn:hover {
		background: var(--color-hover);
		color: var(--color-fg-primary);
	}

	.trigger-btn:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}

	/* Portal dropdown - uses fixed positioning to escape overflow containers */
	.dropdown-portal {
		position: fixed;
		min-width: 10rem;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-lg);
		z-index: 9999;
		overflow: hidden;
	}

	.dropdown-item {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		width: 100%;
		padding: 0.625rem 1rem;
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		background: transparent;
		border: none;
		cursor: pointer;
		text-align: left;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.dropdown-item:hover {
		background: var(--color-hover);
		color: var(--color-fg-primary);
	}

	.dropdown-item-danger:hover {
		background: var(--color-error-muted);
		color: var(--color-error);
	}

	.dropdown-item:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: -2px;
	}

	.dropdown-item:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.dropdown-item-loading:disabled {
		opacity: 0.8;
	}

	:global(.spinner) {
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.dropdown-item :global(svg) {
		flex-shrink: 0;
	}
</style>
