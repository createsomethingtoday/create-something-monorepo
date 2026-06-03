<script lang="ts">
	import type { AgencyGovernedActionGate } from '$lib/agency-access';
	import { runThreadAction } from '$chat/client-actions';
	import { buildControlPlaneBridgeHref } from '$lib/control-plane';
	import type { WidgetOf } from './types';

export let widget: WidgetOf<'appointment_picker'>;
export let threadId = '';
export let governedActionGate: AgencyGovernedActionGate | null = null;
export let intakeProtectedActionsBlocked = false;
export let intakeProtectionMessage = '';
export let showInternalControls = true;

	let pending = false;
	let actionError = '';
	let selectedSlotId = '';

	$: availableSlots = widget.data.slots.filter((slot) => slot.availability !== 'held');
	$: if (
		widget.data.selectedSlotId &&
		selectedSlotId !== widget.data.selectedSlotId
	) {
		selectedSlotId = widget.data.selectedSlotId;
	} else if (
		!widget.data.selectedSlotId &&
		(!selectedSlotId || !availableSlots.some((slot) => slot.id === selectedSlotId))
	) {
		selectedSlotId = availableSlots[0]?.id ?? '';
	}

	$: governedAccessHref = governedActionGate
		? buildControlPlaneBridgeHref(governedActionGate.controlPlaneSurface, { threadId })
		: '';
	$: completionGovernedGate =
		showInternalControls && widget.data.status === 'booked' ? governedActionGate : null;
	$: canCompleteReview =
		showInternalControls &&
		widget.data.status === 'booked' &&
		widget.data.completionLabel &&
		!completionGovernedGate;

	async function bookReview() {
		if (!selectedSlotId) {
			actionError = 'Choose a recruiter review slot first.';
			return;
		}

		pending = true;
		actionError = '';

		try {
			await runThreadAction(threadId, {
				type: 'book_appointment',
				slotId: selectedSlotId
			});
		} catch (error) {
			actionError =
				error instanceof Error ? error.message : 'Unable to book the recruiter review.';
		} finally {
			pending = false;
		}
	}

	async function completeReview() {
		pending = true;
		actionError = '';

		try {
			await runThreadAction(threadId, {
				type: 'complete_review'
			});
		} catch (error) {
			actionError =
				error instanceof Error ? error.message : 'Unable to complete the recruiter review.';
		} finally {
			pending = false;
		}
	}
</script>

<div class="stack" data-thread-id={threadId}>
	<div class="copy">
		<p>{widget.data.description}</p>
		<div class="recruiter">
			<strong>{widget.data.recruiterName}</strong>
			<span>{widget.data.recruiterTitle}</span>
		</div>
	</div>

	<div class="match-list">
		{#each widget.data.matches as match}
			<div class="match-row">
				<div>
					<strong>{match.roleTitle}</strong>
					<div class="match-meta">{match.facility} • {match.location}</div>
				</div>
				<div class="match-details">
					<span>{match.payPackage}</span>
					<span>{match.shift}</span>
					<span>{match.startWindow}</span>
				</div>
			</div>
		{/each}
	</div>

	{#if widget.data.status === 'ready'}
		<div class="slot-list">
			{#each widget.data.slots as slot}
				<label class={`slot-row ${selectedSlotId === slot.id ? 'selected' : ''}`}>
					<div class="slot-copy">
						<div>
							<strong>{slot.label}</strong>
							<div class="window">{slot.window}</div>
						</div>
						<span class={`status-pill ${slot.availability === 'open' ? 'good' : 'warn'}`}>
							{slot.availability}
						</span>
					</div>
					<div class="slot-control">
						<input
							type="radio"
							name={`review-slot-${threadId}`}
							value={slot.id}
							bind:group={selectedSlotId}
							disabled={slot.availability === 'held' || pending || intakeProtectedActionsBlocked}
						/>
						<span>
							{slot.availability === 'held'
								? 'Booked'
								: selectedSlotId === slot.id
									? 'Selected'
									: 'Choose'}
						</span>
					</div>
				</label>
			{/each}
		</div>
	{/if}

	{#if widget.data.bookedLabel}
		<div class="booked-note">
			<strong>Booked:</strong> {widget.data.bookedLabel}
		</div>
	{/if}

	{#if widget.data.status === 'ready'}
		<div class="actions">
			<button
				type="button"
				on:click={bookReview}
				disabled={pending || !selectedSlotId || intakeProtectedActionsBlocked}
			>
				{pending ? 'Booking...' : widget.data.confirmLabel}
			</button>
		</div>
	{:else if canCompleteReview}
		<div class="actions">
			<button type="button" class="secondary" on:click={completeReview} disabled={pending || intakeProtectedActionsBlocked}>
				{pending ? 'Queuing packet...' : widget.data.completionLabel}
			</button>
		</div>
	{/if}

	{#if intakeProtectedActionsBlocked}
		<div class="access-note warn">
			<strong>Secure verification required</strong>
			<p>{intakeProtectionMessage}</p>
		</div>
	{/if}

	{#if completionGovernedGate}
		<div class={`access-note ${completionGovernedGate.tone}`}>
			<strong>{completionGovernedGate.label}</strong>
			<p>{completionGovernedGate.message}</p>
			<a href={governedAccessHref} target="_blank" rel="noreferrer">
				{completionGovernedGate.ctaLabel}
			</a>
		</div>
	{/if}

	{#if actionError}
		<p class="error-text">{actionError}</p>
	{/if}
</div>

<style>
	.stack {
		display: grid;
		gap: 0.9rem;
	}

	.copy,
	.match-list,
	.slot-list,
	.actions {
		display: grid;
		gap: 0.75rem;
	}

	.actions {
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
	}

	.recruiter {
		display: grid;
		gap: 0.15rem;
		color: var(--muted);
		font-size: 0.92rem;
	}

	.match-row,
	.slot-row {
		display: grid;
		gap: 0.75rem;
		padding: 0.95rem 1rem;
		border-radius: 16px;
		background: var(--surface-soft);
		border: 1px solid var(--line);
	}

	.match-meta,
	.window {
		margin-top: 0.2rem;
		color: var(--muted);
		font-size: 0.9rem;
	}

	.match-details,
	.slot-copy,
	.slot-control {
		display: flex;
		justify-content: space-between;
		gap: 0.75rem;
		flex-wrap: wrap;
		align-items: center;
	}

	.slot-row.selected {
		border-color: var(--line-accent);
		box-shadow: 0 0 0 1px rgba(167, 184, 255, 0.16);
	}

	.slot-control {
		font-size: 0.9rem;
		color: var(--muted);
	}

	.booked-note {
		padding: 0.8rem 0.95rem;
		border-radius: 16px;
		background: var(--surface-soft);
		border: 1px solid var(--line);
	}

	.access-note {
		display: grid;
		gap: 0.45rem;
		padding: 0.9rem 1rem;
		border-radius: 16px;
		border: 1px solid var(--line);
		background: var(--surface-soft);
	}

	.access-note.warn {
		border-color: rgba(255, 214, 153, 0.24);
	}

	.access-note.danger {
		border-color: rgba(255, 150, 144, 0.24);
	}

	.secondary {
		background: var(--surface-overlay);
		color: var(--ink);
		border: 1px solid var(--line);
	}

	p {
		margin: 0;
	}

	a {
		color: var(--accent);
		text-decoration: none;
		font-weight: 600;
	}

	.error-text {
		color: var(--danger);
		font-size: 0.92rem;
	}
</style>
