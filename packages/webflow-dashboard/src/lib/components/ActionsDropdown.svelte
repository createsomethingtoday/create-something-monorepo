<script lang="ts">
	import { Button } from './ui';

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
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<circle cx="12" cy="12" r="1" />
			<circle cx="12" cy="5" r="1" />
			<circle cx="12" cy="19" r="1" />
		</svg>
	</Button>

	{#if isOpen}
		<div class="dropdown">
			<button type="button" class="dropdown-item" onclick={handleView}>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
					<path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
				</svg>
				View Details
			</button>

			{#if canEdit}
				<button type="button" class="dropdown-item" onclick={handleEdit}>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
					</svg>
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
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
					</svg>
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

	.dropdown-item svg {
		flex-shrink: 0;
	}
</style>
