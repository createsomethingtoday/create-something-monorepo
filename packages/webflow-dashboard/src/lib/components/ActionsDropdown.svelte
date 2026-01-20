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
	let dropdownRef: HTMLDivElement | undefined = $state();

	function toggle() {
		isOpen = !isOpen;
	}

	function handleClickOutside(event: MouseEvent) {
		if (dropdownRef && !dropdownRef.contains(event.target as Node)) {
			isOpen = false;
		}
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
		}
		return () => {
			document.removeEventListener('click', handleClickOutside);
		};
	});
</script>

<div class="actions-container" bind:this={dropdownRef}>
	<Button variant="ghost" size="icon" onclick={toggle} class="trigger-btn">
		<MoreVertical size={20} />
	</Button>

	{#if isOpen}
		<div class="dropdown">
			<button type="button" class="dropdown-item" onclick={handleView}>
				<Eye size={16} />
				View Details
			</button>

			{#if canEdit}
				<button type="button" class="dropdown-item" onclick={handleEdit}>
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
				>
					<Archive size={16} />
					{isArchiving ? 'Archiving...' : 'Archive'}
				</button>
			{/if}
		</div>
	{/if}
</div>

<style>
	.actions-container {
		position: relative;
		display: inline-flex;
	}

	.dropdown {
		position: absolute;
		right: 0;
		top: 100%;
		margin-top: var(--space-xs);
		min-width: 10rem;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-lg);
		z-index: 50;
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
