<script lang="ts">
	interface TimeSlot {
		start_at: string;
		end_at: string;
		duration_minutes: number;
	}

	interface Props {
		slots: TimeSlot[];
		selectedSlot: TimeSlot | null;
		onSlotSelect: (slot: TimeSlot) => void;
		loading?: boolean;
		timezone: string;
	}

	let { slots, selectedSlot, onSlotSelect, loading = false, timezone }: Props = $props();

	function formatTime(isoString: string): string {
		const date = new Date(isoString);
		return date.toLocaleTimeString('en-US', {
			hour: 'numeric',
			minute: '2-digit',
			hour12: true,
			timeZone: timezone
		});
	}

	function isSelected(slot: TimeSlot): boolean {
		if (!selectedSlot) return false;
		return slot.start_at === selectedSlot.start_at;
	}

	// Group slots by morning/afternoon/evening
	const groupedSlots = $derived.by(() => {
		const groups: { label: string; slots: TimeSlot[] }[] = [
			{ label: 'Morning', slots: [] },
			{ label: 'Afternoon', slots: [] },
			{ label: 'Evening', slots: [] }
		];

		for (const slot of slots) {
			const date = new Date(slot.start_at);
			const hour = parseInt(
				date.toLocaleTimeString('en-US', {
					hour: 'numeric',
					hour12: false,
					timeZone: timezone
				})
			);

			if (hour < 12) {
				groups[0].slots.push(slot);
			} else if (hour < 17) {
				groups[1].slots.push(slot);
			} else {
				groups[2].slots.push(slot);
			}
		}

		return groups.filter((g) => g.slots.length > 0);
	});
</script>

<div class="time-slot-picker" class:loading>
	{#if loading}
		<div class="loading-state">
			<div class="skeleton-group">
				<div class="skeleton-label"></div>
				<div class="skeleton-slots">
					{#each Array(4) as _}
						<div class="skeleton-slot"></div>
					{/each}
				</div>
			</div>
			<div class="skeleton-group">
				<div class="skeleton-label"></div>
				<div class="skeleton-slots">
					{#each Array(3) as _}
						<div class="skeleton-slot"></div>
					{/each}
				</div>
			</div>
		</div>
	{:else if slots.length === 0}
		<div class="empty-state">
			<p class="empty-text">No available times for this date.</p>
			<p class="empty-hint">Try selecting a different day.</p>
		</div>
	{:else}
		<div class="slot-groups">
			{#each groupedSlots as group}
				<div class="slot-group">
					<span class="group-label">{group.label}</span>
					<div class="slots-grid">
						{#each group.slots as slot}
							<button
								type="button"
								class="slot"
								class:selected={isSelected(slot)}
								onclick={() => onSlotSelect(slot)}
								aria-pressed={isSelected(slot)}
							>
								{formatTime(slot.start_at)}
							</button>
						{/each}
					</div>
				</div>
			{/each}
		</div>

		<p class="timezone-note">
			Times shown in {timezone.replace('_', ' ')}
		</p>
	{/if}
</div>

<style>
	.time-slot-picker {
		min-height: 200px;
	}

	.time-slot-picker.loading {
		opacity: 0.6;
	}

	.loading-state {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.skeleton-group {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.skeleton-label {
		width: 80px;
		height: 16px;
		background: var(--color-bg-surface);
		border-radius: var(--radius-sm);
		animation: pulse 1.5s ease-in-out infinite;
	}

	.skeleton-slots {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-xs);
	}

	.skeleton-slot {
		width: 80px;
		height: 40px;
		background: var(--color-bg-surface);
		border-radius: var(--radius-md);
		animation: pulse 1.5s ease-in-out infinite;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: var(--space-xl);
		text-align: center;
	}

	.empty-text {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-xs);
	}

	.empty-hint {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.slot-groups {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	.slot-group {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.group-label {
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		color: var(--color-fg-tertiary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.slots-grid {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-xs);
	}

	.slot {
		padding: var(--space-sm) var(--space-md);
		background: transparent;
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		font-size: var(--text-body-sm);
		color: var(--color-fg-primary);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.slot:hover {
		background: var(--color-hover);
		border-color: var(--color-border-emphasis);
	}

	.slot:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}

	.slot.selected {
		background: var(--color-bg-surface);
		border-color: var(--color-border-emphasis);
		font-weight: var(--font-medium);
	}

	.timezone-note {
		margin-top: var(--space-md);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}
</style>
