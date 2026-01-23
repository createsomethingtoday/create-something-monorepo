<script lang="ts">
	import { SEO } from '@create-something/components';
	import type { LeadInput, LeadSource, FunnelStage } from '$lib/funnel';

	let submitting = $state(false);
	let message = $state<{ type: 'success' | 'error'; text: string } | null>(null);

	// Required fields
	let name = $state('');
	let source = $state<LeadSource>('linkedin');

	// Contact info
	let email = $state('');
	let company = $state('');
	let role = $state('');
	let linkedin_url = $state('');

	// Source details
	let source_detail = $state('');
	let campaign = $state('');

	// Pipeline
	let stage = $state<FunnelStage>('awareness');
	let estimated_value = $state<number | undefined>();
	let service_interest = $state('');

	// Notes
	let notes = $state('');

	const sources: { value: LeadSource; label: string }[] = [
		{ value: 'linkedin', label: 'LinkedIn' },
		{ value: 'website', label: 'Website' },
		{ value: 'referral', label: 'Referral' },
		{ value: 'cold', label: 'Cold Outreach' },
		{ value: 'event', label: 'Event' },
		{ value: 'other', label: 'Other' }
	];

	const stages: { value: FunnelStage; label: string }[] = [
		{ value: 'awareness', label: 'Awareness' },
		{ value: 'consideration', label: 'Consideration' },
		{ value: 'decision', label: 'Decision' },
		{ value: 'won', label: 'Won' },
		{ value: 'lost', label: 'Lost' }
	];

	async function handleSubmit(e: Event) {
		e.preventDefault();
		submitting = true;
		message = null;

		const input: LeadInput = {
			name,
			source,
			email: email || undefined,
			company: company || undefined,
			role: role || undefined,
			linkedin_url: linkedin_url || undefined,
			source_detail: source_detail || undefined,
			campaign: campaign || undefined,
			stage,
			estimated_value,
			service_interest: service_interest || undefined,
			notes: notes || undefined
		};

		try {
			const res = await fetch('/api/funnel/leads', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(input)
			});

			if (res.ok) {
				const data = await res.json();
				message = { type: 'success', text: `Lead "${name}" created successfully` };
				// Reset form
				name = '';
				email = '';
				company = '';
				role = '';
				linkedin_url = '';
				source = 'linkedin';
				source_detail = '';
				campaign = '';
				stage = 'awareness';
				estimated_value = undefined;
				service_interest = '';
				notes = '';
			} else {
				const err = await res.json();
				message = { type: 'error', text: err.message || 'Failed to create lead' };
			}
		} catch (err) {
			message = { type: 'error', text: 'Network error' };
		} finally {
			submitting = false;
		}
	}
</script>

<SEO
	title="Admin - Add Lead"
	description="Administrative dashboard"
	propertyName="agency"
	noindex={true}
/>

<main class="page">
	<header class="header">
		<a href="/admin/funnel" class="back-link">← Back to Dashboard</a>
		<h1>Add Lead</h1>
		<p class="subtitle">Add a new lead to the pipeline.</p>
	</header>

	{#if message}
		<div class="message" class:success={message.type === 'success'} class:error={message.type === 'error'}>
			{message.text}
		</div>
	{/if}

	<form onsubmit={handleSubmit}>
		<section class="section">
			<h2 class="section-title">Contact Information</h2>
			<div class="fields-grid">
				<div class="field full-width">
					<label for="name">Name <span class="required">*</span></label>
					<input type="text" id="name" bind:value={name} required placeholder="John Smith" />
				</div>
				<div class="field">
					<label for="email">Email</label>
					<input type="email" id="email" bind:value={email} placeholder="john@company.com" />
				</div>
				<div class="field">
					<label for="company">Company</label>
					<input type="text" id="company" bind:value={company} placeholder="Acme Inc" />
				</div>
				<div class="field">
					<label for="role">Role / Title</label>
					<input type="text" id="role" bind:value={role} placeholder="CTO" />
				</div>
				<div class="field">
					<label for="linkedin">LinkedIn URL</label>
					<input type="url" id="linkedin" bind:value={linkedin_url} placeholder="https://linkedin.com/in/..." />
				</div>
			</div>
		</section>

		<section class="section">
			<h2 class="section-title">Source</h2>
			<div class="fields-grid">
				<div class="field">
					<label for="source">Lead Source <span class="required">*</span></label>
					<select id="source" bind:value={source} required>
						{#each sources as s}
							<option value={s.value}>{s.label}</option>
						{/each}
					</select>
				</div>
				<div class="field">
					<label for="source_detail">Source Detail</label>
					<input type="text" id="source_detail" bind:value={source_detail} placeholder="e.g., Subtractive Triad post" />
				</div>
				<div class="field">
					<label for="campaign">Campaign</label>
					<input type="text" id="campaign" bind:value={campaign} placeholder="e.g., GTM Sprint 2" />
				</div>
			</div>
		</section>

		<section class="section">
			<h2 class="section-title">Pipeline</h2>
			<div class="fields-grid">
				<div class="field">
					<label for="stage">Stage</label>
					<select id="stage" bind:value={stage}>
						{#each stages as s}
							<option value={s.value}>{s.label}</option>
						{/each}
					</select>
				</div>
				<div class="field">
					<label for="value">Estimated Value ($)</label>
					<input type="number" id="value" bind:value={estimated_value} min="0" step="100" placeholder="10000" />
				</div>
				<div class="field full-width">
					<label for="interest">Service Interest</label>
					<input type="text" id="interest" bind:value={service_interest} placeholder="e.g., AI Integration, Web Development" />
				</div>
			</div>
		</section>

		<section class="section">
			<h2 class="section-title">Notes</h2>
			<div class="field">
				<label for="notes">Initial Notes</label>
				<textarea id="notes" bind:value={notes} rows="4" placeholder="How did they find us? What are their pain points? Any context..."></textarea>
			</div>
		</section>

		<div class="actions">
			<a href="/admin/funnel" class="cancel-btn">Cancel</a>
			<button type="submit" class="submit-btn" disabled={submitting || !name}>
				{submitting ? 'Creating...' : 'Create Lead'}
			</button>
		</div>
	</form>
</main>

<style>
	.page {
		max-width: 800px;
		margin: 0 auto;
		padding: var(--space-lg);
	}

	.header {
		margin-bottom: var(--space-xl);
	}

	.back-link {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		text-decoration: none;
		display: inline-block;
		margin-bottom: var(--space-sm);
	}

	.back-link:hover {
		color: var(--color-fg-primary);
	}

	.header h1 {
		font-size: var(--text-h1);
		margin: 0 0 var(--space-xs) 0;
	}

	.subtitle {
		color: var(--color-fg-muted);
		font-size: var(--text-body-sm);
	}

	.message {
		padding: var(--space-sm) var(--space-md);
		border-radius: var(--radius-md);
		margin-bottom: var(--space-lg);
		font-size: var(--text-body-sm);
	}

	.message.success {
		background: var(--color-success-muted);
		border: 1px solid var(--color-success-border);
		color: var(--color-success);
	}

	.message.error {
		background: var(--color-error-muted);
		border: 1px solid var(--color-error-border);
		color: var(--color-error);
	}

	.section {
		margin-bottom: var(--space-xl);
	}

	.section-title {
		font-size: var(--text-h3);
		color: var(--color-fg-secondary);
		margin: 0 0 var(--space-md) 0;
		padding-bottom: var(--space-xs);
		border-bottom: 1px solid var(--color-border-default);
	}

	.fields-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-md);
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.field.full-width {
		grid-column: 1 / -1;
	}

	.field label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.required {
		color: var(--color-error);
	}

	.field input,
	.field select,
	.field textarea {
		padding: var(--space-sm);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		color: var(--color-fg-primary);
		font-size: var(--text-body);
		font-family: inherit;
	}

	.field select {
		cursor: pointer;
	}

	.field input:focus,
	.field select:focus,
	.field textarea:focus {
		outline: none;
		border-color: var(--color-border-emphasis);
	}

	.field input::placeholder,
	.field textarea::placeholder {
		color: var(--color-fg-subtle);
	}

	.field textarea {
		resize: vertical;
		min-height: 100px;
	}

	.actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-md);
		padding-top: var(--space-lg);
		border-top: 1px solid var(--color-border-default);
	}

	.cancel-btn {
		padding: var(--space-sm) var(--space-lg);
		background: transparent;
		color: var(--color-fg-secondary);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		font-size: var(--text-body);
		text-decoration: none;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.cancel-btn:hover {
		border-color: var(--color-border-emphasis);
		color: var(--color-fg-primary);
	}

	.submit-btn {
		padding: var(--space-sm) var(--space-lg);
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		border: none;
		border-radius: var(--radius-md);
		font-size: var(--text-body);
		font-weight: 500;
		cursor: pointer;
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.submit-btn:hover:not(:disabled) {
		opacity: 0.9;
	}

	.submit-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	@media (max-width: 600px) {
		.fields-grid {
			grid-template-columns: 1fr;
		}

		.field.full-width {
			grid-column: 1;
		}
	}
</style>
