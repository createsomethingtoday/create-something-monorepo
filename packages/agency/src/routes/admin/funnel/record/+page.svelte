<script lang="ts">
	import { SEO } from '@create-something/canon';
	import type { FunnelMetricsInput } from '$lib/funnel';

	let date = $state(new Date().toISOString().split('T')[0]);
	let submitting = $state(false);
	let message = $state<{ type: 'success' | 'error'; text: string } | null>(null);

	// LinkedIn metrics
	let linkedin_impressions = $state<number | undefined>();
	let linkedin_reach = $state<number | undefined>();
	let linkedin_followers = $state<number | undefined>();
	let linkedin_follower_delta = $state<number | undefined>();
	let linkedin_engagements = $state<number | undefined>();
	let linkedin_profile_views = $state<number | undefined>();

	// Website metrics
	let website_visits = $state<number | undefined>();
	let website_unique_visitors = $state<number | undefined>();
	let content_downloads = $state<number | undefined>();

	// Pipeline metrics
	let discovery_calls_scheduled = $state<number | undefined>();
	let discovery_calls_completed = $state<number | undefined>();
	let proposals_sent = $state<number | undefined>();
	let deals_closed = $state<number | undefined>();
	let revenue_closed = $state<number | undefined>();

	// Notes
	let notes = $state('');

	async function handleSubmit(e: Event) {
		e.preventDefault();
		submitting = true;
		message = null;

		const input: FunnelMetricsInput = {
			date,
			linkedin_impressions,
			linkedin_reach,
			linkedin_followers,
			linkedin_follower_delta,
			linkedin_engagements,
			linkedin_profile_views,
			website_visits,
			website_unique_visitors,
			content_downloads,
			discovery_calls_scheduled,
			discovery_calls_completed,
			proposals_sent,
			deals_closed,
			revenue_closed,
			notes: notes || undefined
		};

		try {
			const res = await fetch('/api/funnel', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(input)
			});

			if (res.ok) {
				message = { type: 'success', text: `Metrics recorded for ${date}` };
			} else {
				const err = (await res.json()) as { message?: string };
				message = { type: 'error', text: err.message || 'Failed to record metrics' };
			}
		} catch (err) {
			message = { type: 'error', text: 'Network error' };
		} finally {
			submitting = false;
		}
	}
</script>

<SEO
	title="Admin - Record Metrics"
	description="Administrative dashboard"
	propertyName="agency"
	noindex={true}
/>

<main class="page">
	<header class="header">
		<a href="/admin/funnel" class="back-link">← Back to Dashboard</a>
		<h1>Record Daily Metrics</h1>
		<p class="subtitle">Enter metrics for a specific date. Existing data for the date will be updated.</p>
	</header>

	{#if message}
		<div class="message" class:success={message.type === 'success'} class:error={message.type === 'error'}>
			{message.text}
		</div>
	{/if}

	<form onsubmit={handleSubmit}>
		<section class="section">
			<h2 class="section-title">Date</h2>
			<div class="field">
				<label for="date">Metrics Date</label>
				<input type="date" id="date" bind:value={date} required />
			</div>
		</section>

		<section class="section">
			<h2 class="section-title">LinkedIn Metrics</h2>
			<p class="section-help">From LinkedIn Analytics → Content & Activity</p>
			<div class="fields-grid">
				<div class="field">
					<label for="impressions">Impressions</label>
					<input type="number" id="impressions" bind:value={linkedin_impressions} min="0" placeholder="0" />
				</div>
				<div class="field">
					<label for="reach">Reach (Members)</label>
					<input type="number" id="reach" bind:value={linkedin_reach} min="0" placeholder="0" />
				</div>
				<div class="field">
					<label for="engagements">Engagements</label>
					<input type="number" id="engagements" bind:value={linkedin_engagements} min="0" placeholder="0" />
				</div>
				<div class="field">
					<label for="profile_views">Profile Views</label>
					<input type="number" id="profile_views" bind:value={linkedin_profile_views} min="0" placeholder="0" />
				</div>
				<div class="field">
					<label for="followers">Total Followers</label>
					<input type="number" id="followers" bind:value={linkedin_followers} min="0" placeholder="0" />
				</div>
				<div class="field">
					<label for="follower_delta">New Followers</label>
					<input type="number" id="follower_delta" bind:value={linkedin_follower_delta} placeholder="0" />
				</div>
			</div>
		</section>

		<section class="section">
			<h2 class="section-title">Website Metrics</h2>
			<p class="section-help">From Cloudflare Analytics or your analytics tool</p>
			<div class="fields-grid">
				<div class="field">
					<label for="visits">Total Visits</label>
					<input type="number" id="visits" bind:value={website_visits} min="0" placeholder="0" />
				</div>
				<div class="field">
					<label for="unique">Unique Visitors</label>
					<input type="number" id="unique" bind:value={website_unique_visitors} min="0" placeholder="0" />
				</div>
				<div class="field">
					<label for="downloads">Content Downloads</label>
					<input type="number" id="downloads" bind:value={content_downloads} min="0" placeholder="0" />
				</div>
			</div>
		</section>

		<section class="section">
			<h2 class="section-title">Pipeline Metrics</h2>
			<p class="section-help">Sales activity for the day</p>
			<div class="fields-grid">
				<div class="field">
					<label for="calls_scheduled">Calls Scheduled</label>
					<input type="number" id="calls_scheduled" bind:value={discovery_calls_scheduled} min="0" placeholder="0" />
				</div>
				<div class="field">
					<label for="calls_completed">Calls Completed</label>
					<input type="number" id="calls_completed" bind:value={discovery_calls_completed} min="0" placeholder="0" />
				</div>
				<div class="field">
					<label for="proposals">Proposals Sent</label>
					<input type="number" id="proposals" bind:value={proposals_sent} min="0" placeholder="0" />
				</div>
				<div class="field">
					<label for="deals">Deals Closed</label>
					<input type="number" id="deals" bind:value={deals_closed} min="0" placeholder="0" />
				</div>
				<div class="field">
					<label for="revenue">Revenue Closed ($)</label>
					<input type="number" id="revenue" bind:value={revenue_closed} min="0" step="0.01" placeholder="0.00" />
				</div>
			</div>
		</section>

		<section class="section">
			<h2 class="section-title">Notes</h2>
			<div class="field">
				<label for="notes">Daily Notes (optional)</label>
				<textarea id="notes" bind:value={notes} rows="3" placeholder="Top performing posts, observations, etc."></textarea>
			</div>
		</section>

		<div class="actions">
			<button type="submit" class="submit-btn" disabled={submitting}>
				{submitting ? 'Saving...' : 'Record Metrics'}
			</button>
		</div>
	</form>
</main>

<style>
	.page {
		max-width: var(--content-width-xl);
		margin: 0 auto;
		padding: var(--space-performance-lg);
	}

	.header {
		margin-bottom: var(--space-performance-xl);
	}

	.back-link {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-muted);
		text-decoration: none;
		display: inline-block;
		margin-bottom: var(--space-performance-sm);
	}

	.back-link:hover {
		color: var(--color-performance-fg-primary);
	}

	.header h1 {
		font-size: var(--text-performance-h1);
		margin: 0 0 var(--space-performance-xs) 0;
	}

	.subtitle {
		color: var(--color-performance-fg-muted);
		font-size: var(--text-performance-body-sm);
	}

	.message {
		padding: var(--space-performance-sm) var(--space-performance-md);
		border-radius: var(--radius-performance-scale-md);
		margin-bottom: var(--space-performance-lg);
		font-size: var(--text-performance-body-sm);
	}

	.message.success {
		background: var(--color-performance-success-muted);
		border: 1px solid var(--color-performance-success-border);
		color: var(--color-performance-success);
	}

	.message.error {
		background: var(--color-performance-error-muted);
		border: 1px solid var(--color-performance-error-border);
		color: var(--color-performance-error);
	}

	.section {
		margin-bottom: var(--space-performance-xl);
	}

	.section-title {
		font-size: var(--text-performance-h3);
		color: var(--color-performance-fg-secondary);
		margin: 0 0 var(--space-performance-xs) 0;
		padding-bottom: var(--space-performance-xs);
	}

	.section-help {
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-muted);
		margin: 0 0 var(--space-performance-md) 0;
	}

	.fields-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: var(--space-performance-md);
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--space-performance-xs);
	}

	.field label {
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.field input,
	.field textarea {
		padding: var(--space-performance-sm);
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-md);
		color: var(--color-performance-fg-primary);
		font-size: var(--text-performance-body);
		font-family: inherit;
	}

	.field input:focus,
	.field textarea:focus {
		outline: none;
		border-color: var(--color-performance-border-emphasis);
	}

	.field input::placeholder,
	.field textarea::placeholder {
		color: var(--color-performance-fg-subtle);
	}

	.field textarea {
		resize: vertical;
		min-height: 80px;
	}

	.actions {
		display: flex;
		justify-content: flex-end;
		padding-top: var(--space-performance-lg);
	}

	.submit-btn {
		padding: var(--space-performance-sm) var(--space-performance-lg);
		background: var(--color-performance-fg-primary);
		color: var(--color-performance-bg-pure);
		border: none;
		border-radius: var(--radius-performance-scale-md);
		font-size: var(--text-performance-body);
		font-weight: 500;
		cursor: pointer;
		transition: opacity var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.submit-btn:hover:not(:disabled) {
		opacity: 0.9;
	}

	.submit-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
