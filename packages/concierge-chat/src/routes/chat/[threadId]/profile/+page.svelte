<script lang="ts">
	import { getFieldConfidenceBand, requiresExplicitConfirmation } from '$lib/profile/types';
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<section class="glass panel">
	<div class="section-header">
		<div>
			<div class="eyebrow">Profile Audit</div>
			<h1 class="section-title">{data.thread.title}</h1>
		</div>
		<a class="link-button" href={`/chat/${data.thread.id}`}>Back to thread</a>
	</div>

	<p class="muted">
		Inferred and confirmed values remain visibly distinct. Sensitive fields must be explicitly
		confirmed before they are used for external writes.
	</p>
</section>

<section class="grid-3 section-gap">
	<div class="glass panel">
		<strong>{data.audit.snapshot.confirmedCount}</strong>
		<div class="muted">Confirmed fields</div>
	</div>
	<div class="glass panel">
		<strong>{data.audit.snapshot.inferredCount}</strong>
		<div class="muted">Inferred fields</div>
	</div>
	<div class="glass panel">
		<strong>{data.audit.snapshot.candidateCount}</strong>
		<div class="muted">Candidate fields</div>
	</div>
</section>

<section class="section-gap audit-grid">
	{#each data.audit.sections as section}
		<div class="glass panel">
			<div class="section-header">
				<h2 class="section-title">{section.label}</h2>
				<span class="status-pill">{section.items.length} items</span>
			</div>

			{#if section.items.length === 0}
				<p class="muted">No fields in this state.</p>
			{:else}
				<div class="field-table">
					{#each section.items as field}
						<div class="field-row">
							<div>
								<strong>{field.label}</strong>
								<div>{field.value}</div>
								<div class="note">{field.note ?? 'No additional note.'}</div>
							</div>
							<div class="field-meta">
								<span class={`status-pill ${field.status === 'confirmed' ? 'good' : 'warn'}`}>
									{field.status}
								</span>
								<span>{Math.round(field.confidence * 100)}% / {getFieldConfidenceBand(field.confidence)}</span>
								<span>{field.fieldClass}</span>
								{#if requiresExplicitConfirmation(field)}
									<span class="status-pill danger">explicit confirmation</span>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/each}
</section>

<style>
	.panel {
		padding: 1.2rem;
	}

	.section-gap {
		margin-top: 1rem;
	}

	.section-header,
	.field-row {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.link-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.8rem 1.2rem;
		border-radius: 999px;
		background: var(--ink);
		color: white;
		text-decoration: none;
	}

	.audit-grid,
	.field-table {
		display: grid;
		gap: 1rem;
	}

	.field-row {
		padding: 1rem 0;
		border-top: 1px solid rgba(31, 27, 22, 0.08);
	}

	.field-meta {
		display: grid;
		gap: 0.35rem;
		justify-items: end;
		font-size: 0.88rem;
		color: var(--muted);
	}

	.note {
		margin-top: 0.35rem;
		color: var(--muted);
		font-size: 0.9rem;
	}
</style>
