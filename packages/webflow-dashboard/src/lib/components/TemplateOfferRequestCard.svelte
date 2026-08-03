<script lang="ts">
	import type { Asset } from '$lib/server/airtable';
	import { trackEvent } from '$lib/utils/analytics';
	import { formatCompactCurrency } from '$lib/utils/format';
	import { computeTemplateHealth } from '$lib/utils/template-health';
	import {
		RECOVERY_REENTRY_QUALIFIED_SALES_30D,
		isRecoveryOfferStrategy
	} from '$lib/utils/template-lifecycle-policy';
	import { toast } from '$lib/stores/toast';
	import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Textarea } from './ui';
	import { CheckCircle2, Send, Tag } from 'lucide-svelte';

	interface Props {
		asset: Asset;
	}

	type OfferStrategy =
		| 'Limited-time sale'
		| 'Creator-managed price test'
		| 'Prune recovery test'
		| 'Exit sale before delist'
		| 'Retention save';
	type PostOfferAction =
		| 'Return to standard checkout'
		| 'Review search visibility after expiry'
		| 'Move to detail-only after expiry'
		| 'Delist / archive after expiry';

	let { asset }: Props = $props();

	// Build the yyyy-mm-dd value from local calendar parts. toISOString() would use
	// the UTC date, which is a day off for users west of UTC in the evening.
	function toDateInputValue(date: Date): string {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}

	const defaultEndDate = toDateInputValue(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000));

	let offerLabel = $state('');
	let offerPrice = $state('');
	let startsAt = $state('');
	let endsAt = $state(defaultEndDate);
	let offerStrategy = $state<OfferStrategy>('Creator-managed price test');
	let postOfferAction = $state<PostOfferAction>('Review search visibility after expiry');
	let notes = $state('');
	let termsAccepted = $state(false);
	let visibilityTermsAccepted = $state(false);
	let isSubmitting = $state(false);
	let errorMessage = $state('');
	let successMessage = $state('');
	let didInitializeOfferLabel = $state(false);

	const canRequestOffer = $derived(asset.type === 'Template' && asset.status === 'Published');
	const health = $derived(computeTemplateHealth(asset));
	const hasActiveOffer = $derived(
		Boolean(
			asset.activeOfferLabel ||
				asset.activeOfferCtaUrl ||
				asset.activeOfferStrategy ||
				asset.activeOfferEndsAt ||
				asset.activeOfferVisibility ||
				asset.activeOfferPrice !== undefined
		)
	);
	const canSurfaceOfferRequest = $derived(
		canRequestOffer && (hasActiveOffer || health.automation.code === 'run_recovery_offer')
	);
	const requiresVisibilityAck = $derived(
		postOfferAction === 'Move to detail-only after expiry' ||
			postOfferAction === 'Delist / archive after expiry'
	);
	const isRecoveryStrategy = $derived(isRecoveryOfferStrategy(offerStrategy));
	const isRecoveryBlocked = $derived(isRecoveryStrategy && Boolean(asset.recoveryOfferUsed));
	const isSubmitDisabled = $derived(
		isSubmitting || !canSurfaceOfferRequest || isRecoveryBlocked
	);

	$effect(() => {
		if (didInitializeOfferLabel) return;
		offerLabel = asset.activeOfferLabel || 'Limited offer';
		didInitializeOfferLabel = true;
	});

	$effect(() => {
		if (!requiresVisibilityAck) {
			visibilityTermsAccepted = false;
		}
	});

	$effect(() => {
		if (asset.recoveryOfferUsed && isRecoveryStrategy) {
			offerStrategy = 'Creator-managed price test';
		}
	});

	function resetMessages() {
		errorMessage = '';
		successMessage = '';
	}

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (isSubmitDisabled) return;

		isSubmitting = true;
		resetMessages();

		try {
			const response = await fetch(`/api/assets/${asset.id}/offers`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					offerLabel,
					offerPrice,
					startsAt: startsAt || undefined,
					endsAt,
					offerStrategy,
					postOfferAction,
					notes,
					termsAccepted,
					visibilityTermsAccepted
				})
			});

			const result = (await response.json()) as {
				success?: boolean;
				message?: string;
				offerId?: string;
				approvalStatus?: 'Pending';
			};

			if (!response.ok || !result.success) {
				throw new Error(result.message || 'Failed to submit price change request');
			}

			successMessage =
				'Price change request submitted. Marketplace review applies the new price to your template before any public change.';
			toast.success('Price change request submitted');
			trackEvent('template_offer_request_submitted', {
				asset_id: asset.id,
				offer_strategy: offerStrategy,
				post_offer_action: postOfferAction,
				approval_status: result.approvalStatus,
				has_active_offer: hasActiveOffer,
				automation_code: health.automation.code,
				automation_confidence: health.automation.confidence,
				has_offer_price: Boolean(offerPrice.trim()),
				requires_visibility_ack: requiresVisibilityAck,
				visibility_terms_accepted: visibilityTermsAccepted,
				is_recovery_strategy: isRecoveryStrategy,
				recovery_offer_used: Boolean(asset.recoveryOfferUsed),
				qualified_sales_30d: asset.qualifiedSales30d ?? null,
				reentry_sales_threshold: health.reentrySalesThreshold,
				search_visibility: asset.searchVisibility || null,
				offer_id: result.offerId
			});

			notes = '';
			termsAccepted = false;
			visibilityTermsAccepted = false;
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : 'Failed to submit price change request';
			toast.error(errorMessage);
			trackEvent('template_offer_request_failed', {
				asset_id: asset.id,
				offer_strategy: offerStrategy,
				post_offer_action: postOfferAction,
				has_active_offer: hasActiveOffer,
				automation_code: health.automation.code,
				automation_confidence: health.automation.confidence,
				has_offer_price: Boolean(offerPrice.trim()),
				requires_visibility_ack: requiresVisibilityAck,
				visibility_terms_accepted: visibilityTermsAccepted,
				is_recovery_strategy: isRecoveryStrategy,
				recovery_offer_used: Boolean(asset.recoveryOfferUsed),
				qualified_sales_30d: asset.qualifiedSales30d ?? null,
				reentry_sales_threshold: health.reentrySalesThreshold,
				search_visibility: asset.searchVisibility || null
			});
		} finally {
			isSubmitting = false;
		}
	}
</script>

<Card>
	<CardHeader>
		<div class="offer-request-header">
			<div class="offer-request-title">
				<Tag size={16} />
				<CardTitle>Request Recovery Price Change</CardTitle>
			</div>
			<Badge variant="secondary">Applied by marketplace review</Badge>
		</div>
	</CardHeader>
	<CardContent>
		{#if canSurfaceOfferRequest}
			<div class="offer-request-intro">
				<p>
					This template is in a search-visibility review window. Request a temporary price change
					as a recovery test: marketplace review applies the new price to your template's
					checkout, the template stays searchable during the window, and buyer response decides
					what happens next. For a standard price change outside this window, contact support.
				</p>
				{#if asset.priceString || asset.activeOfferPrice !== undefined}
					<div class="price-context">
						{#if asset.priceString}
							<span>Marketplace price: <strong>{asset.priceString}</strong></span>
						{/if}
						{#if asset.searchVisibility}
							<span>Search visibility: <strong>{asset.searchVisibility}</strong></span>
						{/if}
						{#if asset.qualifiedSales30d !== undefined || asset.recoveryOfferUsed}
							<span>
								Re-entry sales:
								<strong>{asset.qualifiedSales30d ?? 0}/{RECOVERY_REENTRY_QUALIFIED_SALES_30D}</strong>
							</span>
						{/if}
						{#if asset.recoveryOfferUsed}
							<span>Recovery offer: <strong>Used</strong></span>
						{/if}
						{#if asset.activeOfferPrice !== undefined}
							<span>Current offer: <strong>{formatCompactCurrency(asset.activeOfferPrice)}</strong></span>
						{/if}
					</div>
				{/if}
			</div>

			<form class="offer-request-form" onsubmit={handleSubmit}>
				<div class="form-grid">
					<div class="form-field">
						<Label for="offerLabel">Offer label</Label>
						<Input
							id="offerLabel"
							bind:value={offerLabel}
							maxlength={80}
							placeholder="Limited offer"
							oninput={resetMessages}
						/>
					</div>

					<div class="form-field">
						<Label for="offerPrice">Requested price</Label>
						<Input
							id="offerPrice"
							bind:value={offerPrice}
							type="number"
							min="0"
							max="10000"
							step="0.01"
							placeholder="29"
							required
							oninput={resetMessages}
						/>
					</div>

					<div class="form-field">
						<Label for="offerStrategy">Offer purpose</Label>
						<select
							id="offerStrategy"
							class="form-control native-select"
							bind:value={offerStrategy}
							onchange={resetMessages}
						>
							<option value="Creator-managed price test">Creator-managed price test</option>
							<option value="Limited-time sale">Limited-time sale</option>
							<option value="Prune recovery test" disabled={asset.recoveryOfferUsed}
								>Recovery window before marketplace review</option
							>
							<option value="Exit sale before delist" disabled={asset.recoveryOfferUsed}
								>Exit sale before archive</option
							>
							<option value="Retention save" disabled={asset.recoveryOfferUsed}
								>Retention save</option
							>
						</select>
					</div>

					<div class="form-field">
						<Label for="postOfferAction">After offer ends</Label>
						<select
							id="postOfferAction"
							class="form-control native-select"
							bind:value={postOfferAction}
							onchange={resetMessages}
						>
							<option value="Review search visibility after expiry">Review search visibility</option>
							<option value="Return to standard checkout">Return to standard checkout</option>
							<option value="Move to detail-only after expiry">Move to detail-only</option>
							<option value="Delist / archive after expiry">Delist / archive after review</option>
						</select>
					</div>

					<div class="form-field">
						<Label for="endsAt">Offer ends</Label>
						<Input id="endsAt" bind:value={endsAt} type="date" required oninput={resetMessages} />
					</div>

					<div class="form-field">
						<Label for="startsAt">Start date</Label>
						<Input id="startsAt" bind:value={startsAt} type="date" oninput={resetMessages} />
					</div>

					<div class="form-field form-field--wide">
						<Label for="offerNotes">Notes</Label>
						<Textarea
							id="offerNotes"
							bind:value={notes}
							maxlength={1000}
							placeholder="Add sale context, timing, or why this price should be tested."
							oninput={resetMessages}
						/>
					</div>
				</div>

				<label class="terms-row">
					<input type="checkbox" bind:checked={termsAccepted} required onchange={resetMessages} />
					<span>
						I understand this price change is applied to my template's checkout price by
						marketplace review, existing buyer access is not affected, and the outcome of this
						window informs the template's search visibility.
					</span>
				</label>

				{#if requiresVisibilityAck}
					<label class="terms-row terms-row--visibility">
						<input
							type="checkbox"
							bind:checked={visibilityTermsAccepted}
							required
							onchange={resetMessages}
						/>
						<span>
							I understand this lifecycle choice can remove the template from marketplace search
							after the offer window while keeping buyer access and direct links intact.
						</span>
					</label>
				{/if}

				{#if isRecoveryBlocked}
					<p class="form-message form-message--error">
						Recovery offers are one-time. This template needs
						{RECOVERY_REENTRY_QUALIFIED_SALES_30D} qualified sales in 30 days before search re-entry.
					</p>
				{/if}

				{#if errorMessage}
					<p class="form-message form-message--error">{errorMessage}</p>
				{/if}
				{#if successMessage}
					<p class="form-message form-message--success">
						<CheckCircle2 size={14} />
						{successMessage}
					</p>
				{/if}

				<div class="form-actions">
					<Button type="submit" disabled={isSubmitDisabled}>
						<Send size={14} />
						{isSubmitting ? 'Submitting...' : 'Submit offer request'}
					</Button>
				</div>
			</form>
		{:else}
			<div class="offer-unavailable">
				<p>
					Recovery price changes become available when marketplace health policy flags this
					template for a search-visibility review. For a standard price change at any time,
					contact support.
				</p>
			</div>
		{/if}
	</CardContent>
</Card>

<style>
	.offer-request-header,
	.offer-request-title,
	.form-message,
	.price-context,
	.terms-row {
		display: flex;
		align-items: center;
	}

	.offer-request-header {
		justify-content: space-between;
		gap: var(--space-md);
		flex-wrap: wrap;
	}

	.offer-request-title {
		gap: var(--space-xs);
	}

	.offer-request-intro {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		margin-bottom: var(--space-md);
	}

	.offer-request-intro p,
	.offer-unavailable p {
		margin: 0;
		color: var(--color-fg-secondary);
		font-size: var(--text-body-sm);
		line-height: 1.5;
	}

	.price-context {
		gap: var(--space-sm);
		flex-wrap: wrap;
		color: var(--color-fg-muted);
		font-size: var(--text-caption);
	}

	.price-context strong {
		color: var(--color-fg-primary);
		font-variant-numeric: tabular-nums;
	}

	.offer-request-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.form-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--space-sm) var(--space-md);
	}

	.form-field {
		min-width: 0;
	}

	.form-field--wide {
		grid-column: 1 / -1;
	}

	.native-select {
		height: 2.25rem;
		width: 100%;
	}

	.terms-row {
		align-items: flex-start;
		gap: var(--space-sm);
		color: var(--color-fg-secondary);
		font-size: var(--text-body-sm);
		line-height: 1.45;
	}

	.terms-row input {
		margin-top: 0.15rem;
		accent-color: var(--color-info-ink);
	}

	.form-message {
		gap: 0.35rem;
		margin: 0;
		font-size: var(--text-body-sm);
		line-height: 1.45;
	}

	.form-message--error {
		color: var(--color-error-ink);
	}

	.form-message--success {
		color: var(--color-success-ink);
	}

	.form-actions {
		display: flex;
		justify-content: flex-end;
	}

	.offer-unavailable {
		padding: 0.72rem;
		border: 1px solid color-mix(in srgb, var(--color-border-default) 72%, transparent);
		border-radius: var(--radius-sm);
		background: var(--color-bg-subtle);
	}

	@media (max-width: 780px) {
		.form-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
