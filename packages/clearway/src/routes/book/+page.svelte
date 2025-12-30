<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';

	// Get booking params from URL
	const facility = $page.url.searchParams.get('facility') || '';
	const courtId = $page.url.searchParams.get('court') || '';
	const date = $page.url.searchParams.get('date') || '';
	const startTime = $page.url.searchParams.get('start') || '';

	// State
	let loading = $state(true);
	let error = $state<string | null>(null);
	let courtName = $state('');
	let facilityName = $state('');
	let formattedDate = $state('');
	let formattedTime = $state('');
	let priceCents = $state(0);
	let email = $state('');
	let name = $state('');
	let submitting = $state(false);

	// Format time for display
	function formatTime(isoString: string): string {
		const d = new Date(isoString);
		const hours = d.getHours();
		const ampm = hours >= 12 ? 'PM' : 'AM';
		const hour12 = hours % 12 || 12;
		return `${hour12} ${ampm}`;
	}

	// Format date for display
	function formatDate(dateStr: string): string {
		const d = new Date(dateStr + 'T00:00:00');
		return d.toLocaleDateString('en-US', {
			weekday: 'long',
			month: 'long',
			day: 'numeric',
			year: 'numeric'
		});
	}

	// Load court details
	async function loadDetails() {
		loading = true;
		error = null;

		try {
			const response = await fetch(`/api/availability?facility=${facility}&date=${date}`);
			if (!response.ok) {
				throw new Error('Failed to load court details');
			}

			const data = await response.json();
			facilityName = data.facility?.name || facility;

			// Find the court
			const court = data.courts?.find((c: any) => c.id === courtId);
			if (!court) {
				throw new Error('Court not found');
			}
			courtName = court.name;

			// Find the slot
			const slot = court.slots?.find((s: any) => s.startTime === startTime);
			if (!slot) {
				throw new Error('Time slot not found');
			}
			priceCents = slot.priceCents || 0;

			// Format for display
			formattedDate = formatDate(date);
			formattedTime = `${formatTime(startTime)} - ${formatTime(slot.endTime)}`;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load booking details';
		} finally {
			loading = false;
		}
	}

	// Submit booking
	async function handleSubmit(event: Event) {
		event.preventDefault();
		if (!email || !name) return;

		submitting = true;
		error = null;

		try {
			// Create reservation
			const reservationResponse = await fetch('/api/reservations', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					facility_slug: facility,
					court_id: courtId,
					date: date,
					start_time: startTime,
					member_email: email,
					member_name: name
				})
			});

			if (!reservationResponse.ok) {
				const errData = await reservationResponse.json();
				throw new Error(errData.message || 'Failed to create reservation');
			}

			const reservation = await reservationResponse.json();

			// Redirect to Stripe checkout
			const checkoutResponse = await fetch('/api/stripe/checkout', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					reservation_id: reservation.id
				})
			});

			if (!checkoutResponse.ok) {
				const errData = await checkoutResponse.json();
				throw new Error(errData.message || 'Failed to create checkout session');
			}

			const checkout = await checkoutResponse.json();

			// Redirect to Stripe
			if (checkout.checkoutUrl) {
				window.location.href = checkout.checkoutUrl;
			} else {
				throw new Error('No checkout URL returned');
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Booking failed';
			submitting = false;
		}
	}

	onMount(() => {
		if (facility && courtId && date && startTime) {
			loadDetails();
		} else {
			error = 'Missing booking parameters';
			loading = false;
		}
	});
</script>

<svelte:head>
	<title>Complete Your Booking | CLEARWAY</title>
</svelte:head>

<div class="page">
	<div class="container">
		<a href="/" class="back-link">
			<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="m15 18-6-6 6-6"/>
			</svg>
			Back
		</a>

		<h1>Complete Your Booking</h1>

		{#if loading}
			<div class="loading">
				<div class="spinner"></div>
				<p>Loading booking details...</p>
			</div>
		{:else if error && !courtName}
			<div class="error-box">
				<p>{error}</p>
				<a href="/" class="btn-secondary">Back to Home</a>
			</div>
		{:else}
			<div class="booking-card">
				<div class="summary">
					<h2>{courtName}</h2>
					<p class="facility">{facilityName}</p>
					<div class="details">
						<div class="detail">
							<span class="label">Date</span>
							<span class="value">{formattedDate}</span>
						</div>
						<div class="detail">
							<span class="label">Time</span>
							<span class="value">{formattedTime}</span>
						</div>
						<div class="detail">
							<span class="label">Price</span>
							<span class="value price">${(priceCents / 100).toFixed(0)}</span>
						</div>
					</div>
				</div>

				<form class="form" onsubmit={handleSubmit}>
					<div class="field">
						<label for="name">Your Name</label>
						<input
							type="text"
							id="name"
							bind:value={name}
							placeholder="John Smith"
							required
							disabled={submitting}
						/>
					</div>
					<div class="field">
						<label for="email">Email Address</label>
						<input
							type="email"
							id="email"
							bind:value={email}
							placeholder="you@example.com"
							required
							disabled={submitting}
						/>
					</div>

					{#if error}
						<div class="error-message">{error}</div>
					{/if}

					<button type="submit" class="btn-book" disabled={submitting || !name || !email}>
						{#if submitting}
							Processing...
						{:else}
							Pay ${(priceCents / 100).toFixed(0)} & Book
						{/if}
					</button>

					<p class="secure-note">
						<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
							<path d="M7 11V7a5 5 0 0 1 10 0v4"/>
						</svg>
						Secure payment via Stripe
					</p>
				</form>
			</div>
		{/if}
	</div>
</div>

<style>
	.page {
		min-height: 100vh;
		background: var(--color-bg-pure, #000000);
		color: var(--color-fg-primary, #ffffff);
		padding: var(--space-xl, 3rem) var(--space-md, 1rem);
	}

	.container {
		max-width: 480px;
		margin: 0 auto;
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--color-fg-secondary, rgba(255, 255, 255, 0.8));
		text-decoration: none;
		font-size: var(--text-body-sm, 0.875rem);
		margin-bottom: var(--space-lg, 1.5rem);
		transition: color 200ms ease;
	}

	.back-link:hover {
		color: var(--color-fg-primary, #ffffff);
	}

	h1 {
		font-size: var(--text-h2, 1.75rem);
		font-weight: 600;
		margin: 0 0 var(--space-lg, 1.5rem);
	}

	.loading {
		text-align: center;
		padding: var(--space-xl, 3rem);
		color: var(--color-fg-tertiary, rgba(255, 255, 255, 0.6));
	}

	.spinner {
		width: 32px;
		height: 32px;
		margin: 0 auto var(--space-sm, 1rem);
		border: 2px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
		border-top-color: var(--color-fg-secondary, rgba(255, 255, 255, 0.8));
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.error-box {
		text-align: center;
		padding: var(--space-lg, 1.5rem);
		border-radius: var(--radius-lg, 12px);
		background: var(--color-bg-surface, #111111);
		border: 1px solid var(--color-error, #d44d4d);
	}

	.error-box p {
		color: var(--color-error, #d44d4d);
		margin: 0 0 var(--space-md, 1rem);
	}

	.booking-card {
		border-radius: var(--radius-lg, 12px);
		background: var(--color-bg-surface, #111111);
		border: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
		overflow: hidden;
	}

	.summary {
		padding: var(--space-lg, 1.5rem);
		border-bottom: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
	}

	.summary h2 {
		font-size: var(--text-h3, 1.25rem);
		font-weight: 600;
		margin: 0 0 0.25rem;
	}

	.facility {
		color: var(--color-fg-tertiary, rgba(255, 255, 255, 0.6));
		font-size: var(--text-body-sm, 0.875rem);
		margin: 0 0 var(--space-md, 1rem);
	}

	.details {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.detail {
		display: flex;
		justify-content: space-between;
	}

	.label {
		color: var(--color-fg-tertiary, rgba(255, 255, 255, 0.6));
		font-size: var(--text-body-sm, 0.875rem);
	}

	.value {
		font-weight: 500;
	}

	.value.price {
		font-size: var(--text-body-lg, 1.125rem);
		font-weight: 600;
	}

	.form {
		padding: var(--space-lg, 1.5rem);
		display: flex;
		flex-direction: column;
		gap: var(--space-md, 1rem);
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.field label {
		font-size: var(--text-body-sm, 0.875rem);
		color: var(--color-fg-secondary, rgba(255, 255, 255, 0.8));
	}

	.field input {
		padding: 0.875rem 1rem;
		border-radius: var(--radius-md, 8px);
		background: var(--color-bg-subtle, #1a1a1a);
		border: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
		color: var(--color-fg-primary, #ffffff);
		font-size: var(--text-body, 1rem);
		transition: border-color 200ms ease;
	}

	.field input:focus {
		outline: none;
		border-color: var(--color-border-strong, rgba(255, 255, 255, 0.3));
	}

	.field input::placeholder {
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
	}

	.field input:disabled {
		opacity: 0.5;
	}

	.error-message {
		padding: 0.75rem 1rem;
		border-radius: var(--radius-md, 8px);
		background: var(--color-error-muted, rgba(212, 77, 77, 0.2));
		border: 1px solid var(--color-error-border, rgba(212, 77, 77, 0.3));
		color: var(--color-error, #d44d4d);
		font-size: var(--text-body-sm, 0.875rem);
	}

	.btn-book {
		padding: 1rem 1.5rem;
		border-radius: var(--radius-md, 8px);
		background: var(--color-fg-primary, #ffffff);
		color: var(--color-bg-pure, #000000);
		font-size: var(--text-body-lg, 1.125rem);
		font-weight: 600;
		border: none;
		cursor: pointer;
		transition: opacity 200ms ease, transform 200ms ease;
	}

	.btn-book:hover:not(:disabled) {
		opacity: 0.9;
		transform: scale(1.01);
	}

	.btn-book:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-secondary {
		display: inline-block;
		padding: 0.75rem 1.5rem;
		border-radius: var(--radius-md, 8px);
		background: var(--color-bg-subtle, #1a1a1a);
		color: var(--color-fg-primary, #ffffff);
		text-decoration: none;
		font-weight: 500;
		transition: background 200ms ease;
	}

	.btn-secondary:hover {
		background: var(--color-hover, rgba(255, 255, 255, 0.1));
	}

	.secure-note {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		color: var(--color-fg-tertiary, rgba(255, 255, 255, 0.6));
		font-size: var(--text-caption, 0.75rem);
		margin: 0;
	}
</style>
