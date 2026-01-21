<script lang="ts">
	import { Button } from './ui';
	import { MoreVertical, Eye, Pencil, Archive } from 'lucide-svelte';

	interface Props {
		assetId: string;
		status: string;
		onView?: (id: string) => void;
		onEdit?: (id: string) => void;
		onArchive?: (id: string) => Promise<void>;
	}

	let { assetId, status, onView, onEdit, onArchive }: Props = $props();

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

	function handleView() {
		onView?.(assetId);
		isOpen = false;
	}

	function handleEdit() {
		onEdit?.(assetId);
		isOpen = false;
	}

	async function handleArchive() {
		if (isArchiving) return;
		isArchiving = true;
		try {
			await onArchive?.(assetId);
			isOpen = false;
		} finally {
			isArchiving = false;
		}
	}

	// Clean status for comparison
	const cleanedStatus = status
		.replace(/^\d*️⃣/u, '')
		.replace(/🆕/u, '')
		.replace(/📅/u, '')
		.replace(/🚀/u, '')
		.replace(/☠️/u, '')
		.replace(/❌/u, '')
		.trim();

	const canEdit = ['Published', 'Upcoming', 'Scheduled'].includes(cleanedStatus);
	const canArchive = !cleanedStatus.includes('Delisted');

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

<div class="actions-container">
	<button
		type="button"
		class="trigger-btn"
		bind:this={triggerRef}
		onclick={toggle}
		aria-haspopup="true"
		aria-expanded={isOpen}
	>
		<MoreVertical size={20} />
	</button>
</div>

{#if isOpen}
	<div
		class="dropdown-portal"
		bind:this={dropdownRef}
		style="top: {dropdownPosition.top}px; right: {dropdownPosition.right}px;"
		role="menu"
	>
		<button type="button" class="dropdown-item" onclick={handleView} role="menuitem">
			<Eye size={16} />
			View Details
		</button>

		{#if canEdit}
			<button type="button" class="dropdown-item" onclick={handleEdit} role="menuitem">
				<Pencil size={16} />
				Edit
			</button>
		{/if}

		{#if canArchive}
			<button
				type="button"
				class="dropdown-item dropdown-item-danger"
				onclick={handleArchive}
				disabled={isArchiving}
				role="menuitem"
			>
				<Archive size={16} />
				{isArchiving ? 'Archiving...' : 'Archive'}
			</button>
		{/if}
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

	/* Portal dropdown - uses fixed positioning to escape overflow containers */
	.dropdown-portal {
		position: fixed;
		min-width: 10rem;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
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

	.dropdown-item:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.dropdown-item :global(svg) {
		flex-shrink: 0;
	}
</style>
