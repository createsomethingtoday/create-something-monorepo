<script lang="ts">
	import { Archive, Eye, LoaderCircle, MoreVertical, Pencil } from 'lucide-svelte';
	import { trackEvent } from '$lib/utils/analytics';
	import type { AssetActionDescriptor } from '$lib/utils/asset-actions';

	interface Props {
		assetId: string;
		status: string;
		actions?: AssetActionDescriptor[];
		isEditDisabled?: boolean;
		isEditLoading?: boolean;
		onView?: (id: string) => void;
		onEdit?: (id: string) => void;
		onArchive?: (id: string) => Promise<void>;
	}

	let {
		assetId,
		status,
		actions = [],
		isEditDisabled = false,
		isEditLoading = false,
		onView,
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
		trackOverflowAction(label);
		onView?.(assetId);
		isOpen = false;
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
		} finally {
			isArchiving = false;
		}
	}

	$effect(() => {
		if (isOpen) {
			document.addEventListener('click', handleClickOutside);
			window.addEventListener('scroll', () => (isOpen = false), true);
			window.addEventListener('resize', () => (isOpen = false));
		}
		return () => {
			document.removeEventListener('click', handleClickOutside);
			window.removeEventListener('scroll', () => (isOpen = false), true);
			window.removeEventListener('resize', () => (isOpen = false));
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
			aria-haspopup="true"
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
	>
		{#each actions as action}
			<button
				type="button"
				class="dropdown-item"
				class:dropdown-item-danger={action.handler === 'archive'}
				class:dropdown-item-loading={action.handler === 'edit' && isEditLoading}
				onclick={() =>
					action.handler === 'view'
						? handleView(action.label.toLowerCase().replace(/\s+/g, '_'))
						: action.handler === 'edit'
							? handleEdit()
							: handleArchive()}
				disabled={
					(action.handler === 'archive' && isArchiving) ||
					(action.handler === 'edit' && isEditDisabled)
				}
				role="menuitem"
			>
				{#if action.handler === 'view'}
					<Eye size={16} />
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
