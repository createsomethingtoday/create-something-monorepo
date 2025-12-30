<script lang="ts">
	// Progressive Form Section
	// Email-first intake with progressive disclosure

	let step = $state(1);
	let email = $state('');
	let facilityName = $state('');
	let courtCount = $state('');
	let message = $state('');
	let submitted = $state(false);

	function nextStep() {
		if (step < 4) {
			step++;
		}
	}

	async function handleSubmit(event: Event) {
		event.preventDefault();
		// TODO: Submit to API
		submitted = true;
	}
</script>

<section class="form-section">
	<div class="container">
		<h2 class="section-title">Request a Demo</h2>
		<p class="section-subtitle">
			See CLEARWAY in action with your facility's data.
		</p>

		{#if submitted}
			<div class="success-message">
				<span class="success-icon">&#x2713;</span>
				<h3>Thank you!</h3>
				<p>We'll be in touch within 24 hours to schedule your demo.</p>
			</div>
		{:else}
			<form class="progressive-form" onsubmit={handleSubmit}>
				<div class="form-step" class:active={step >= 1}>
					<label for="email">Email address</label>
					<div class="input-row">
						<input
							type="email"
							id="email"
							bind:value={email}
							placeholder="you@facility.com"
							required
						/>
						{#if step === 1}
							<button type="button" class="btn-next" onclick={nextStep} disabled={!email}>
								Continue
							</button>
						{/if}
					</div>
				</div>

				{#if step >= 2}
					<div class="form-step" class:active={step >= 2}>
						<label for="facility">Facility name</label>
						<div class="input-row">
							<input
								type="text"
								id="facility"
								bind:value={facilityName}
								placeholder="Lakeside Tennis Club"
							/>
							{#if step === 2}
								<button type="button" class="btn-next" onclick={nextStep} disabled={!facilityName}>
									Continue
								</button>
							{/if}
						</div>
					</div>
				{/if}

				{#if step >= 3}
					<div class="form-step" class:active={step >= 3}>
						<label for="courts">How many courts?</label>
						<div class="input-row">
							<select id="courts" bind:value={courtCount}>
								<option value="">Select...</option>
								<option value="1-2">1-2 courts</option>
								<option value="3-5">3-5 courts</option>
								<option value="6-10">6-10 courts</option>
								<option value="10+">10+ courts</option>
							</select>
							{#if step === 3}
								<button type="button" class="btn-next" onclick={nextStep} disabled={!courtCount}>
									Continue
								</button>
							{/if}
						</div>
					</div>
				{/if}

				{#if step >= 4}
					<div class="form-step" class:active={step >= 4}>
						<label for="message">Anything else? (optional)</label>
						<textarea
							id="message"
							bind:value={message}
							placeholder="Current pain points, specific requirements, questions..."
							rows="3"
						></textarea>
						<button type="submit" class="btn-submit">
							Request Demo
						</button>
					</div>
				{/if}
			</form>
		{/if}
	</div>
</section>

<style>
	.form-section {
		padding: var(--space-2xl) var(--space-md);
		background: var(--color-bg-pure);
	}

	.container {
		max-width: 32rem;
		margin: 0 auto;
	}

	.section-title {
		font-size: var(--text-h2);
		font-weight: 600;
		text-align: center;
		margin: 0 0 var(--space-xs);
		color: var(--color-fg-primary);
	}

	.section-subtitle {
		font-size: var(--text-body-lg);
		text-align: center;
		color: var(--color-fg-secondary);
		margin: 0 0 var(--space-xl);
	}

	.progressive-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.form-step {
		opacity: 0.5;
		transition: opacity var(--duration-standard) var(--ease-standard);
	}

	.form-step.active {
		opacity: 1;
	}

	label {
		display: block;
		font-size: var(--text-body-sm);
		font-weight: 500;
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-xs);
	}

	.input-row {
		display: flex;
		gap: var(--space-sm);
	}

	input,
	select,
	textarea {
		flex: 1;
		padding: 0.875rem 1rem;
		border-radius: var(--radius-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		color: var(--color-fg-primary);
		font-size: var(--text-body);
		transition: border-color var(--duration-micro) var(--ease-standard);
	}

	input:focus,
	select:focus,
	textarea:focus {
		outline: none;
		border-color: var(--clearway-accent);
	}

	input::placeholder,
	textarea::placeholder {
		color: var(--color-fg-muted);
	}

	select {
		cursor: pointer;
	}

	textarea {
		resize: vertical;
		min-height: 5rem;
	}

	.btn-next,
	.btn-submit {
		padding: 0.875rem 1.5rem;
		border-radius: var(--radius-md);
		font-size: var(--text-body);
		font-weight: 500;
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.btn-next {
		background: var(--color-bg-subtle);
		color: var(--color-fg-primary);
		border: 1px solid var(--color-border-default);
	}

	.btn-next:hover:not(:disabled) {
		background: var(--color-hover);
		border-color: var(--color-border-emphasis);
	}

	.btn-next:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-submit {
		width: 100%;
		margin-top: var(--space-sm);
		background: var(--clearway-accent);
		color: #000;
		border: none;
	}

	.btn-submit:hover {
		background: var(--clearway-accent-emphasis);
	}

	.success-message {
		text-align: center;
		padding: var(--space-xl);
		border-radius: var(--radius-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--clearway-accent);
	}

	.success-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 3rem;
		height: 3rem;
		border-radius: var(--radius-full);
		background: var(--clearway-accent);
		color: #000;
		font-size: 1.5rem;
		font-weight: bold;
		margin-bottom: var(--space-sm);
	}

	.success-message h3 {
		font-size: var(--text-h3);
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-xs);
	}

	.success-message p {
		color: var(--color-fg-secondary);
		margin: 0;
	}
</style>
