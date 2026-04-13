<script lang="ts">
	import type { DistributionCatalogEntry } from '$lib/distribution/catalog';
	import {
		formatKind,
		formatHostList,
		getArtifactById,
		getArtifactLink,
		getCompatibilityActions,
		getCompatibilityHosts,
		getGooseInstallActions,
		getGooseQuickstart,
		getInstallActionLabel,
		getInstallModeNote,
		getInstallPayload,
		getRelatedEntries,
		isLaunchMode
	} from '$lib/distribution/catalog';

	let {
		entryId,
		title = 'Package in Goose',
		subtitle = 'Install the extension, then bundle the matching policy pack and recipe.',
		detailHref = undefined,
		detailLabel = 'Open the full install catalog →'
	}: {
		entryId: string;
		title?: string;
		subtitle?: string;
		detailHref?: string;
		detailLabel?: string;
	} = $props();

	let copiedActionKey = $state<string | null>(null);

	const entry = $derived.by(() => getArtifactById(entryId));
	const gooseActions = $derived.by(() => (entry ? getGooseInstallActions(entry) : []));
	const gooseQuickstart = $derived.by(() => (entry ? getGooseQuickstart(entry) : []));
	const relatedEntries = $derived.by(() => (entry ? getRelatedEntries(entry) : []));
	const compatibilityHosts = $derived.by(() => (entry ? getCompatibilityHosts(entry) : []));
	const compatibilityActions = $derived.by(() => (entry ? getCompatibilityActions(entry) : []));

	function getPrimaryAction(artifact: DistributionCatalogEntry) {
		return getGooseInstallActions(artifact)[0];
	}

	async function copyToClipboard(actionKey: string, payload: string) {
		await navigator.clipboard.writeText(payload);
		copiedActionKey = actionKey;

		setTimeout(() => {
			if (copiedActionKey === actionKey) {
				copiedActionKey = null;
			}
		}, 1800);
	}
</script>

{#if entry}
	<section class="install-section">
		<div class="section-header">
			<h2 class="section-title">{title}</h2>
			<p class="section-subtitle">{subtitle}</p>
			{#if detailHref}
				<p class="section-link">
					<a href={detailHref}>{detailLabel}</a>
				</p>
			{/if}
		</div>

		<div class="primary-shell">
			<div class="entry-summary">
				<p class="entry-kicker">{formatKind(entry.kind)}</p>
				<h3 class="entry-title">{entry.title}</h3>
				<p class="entry-description">{entry.description}</p>
			</div>

			<div class="primary-grid">
				{#if gooseQuickstart.length > 0}
					<article class="install-card primary-card quickstart-card">
						<div class="card-copy">
							<p class="card-label">Goose quickstart</p>
							<p class="card-note">Follow these steps in order for local Goose Desktop testing.</p>
						</div>

						<ol class="quickstart-list">
							{#each gooseQuickstart as step}
								{@const actionKey = `${entry.id}:quickstart:${step.id}`}
								<li class="quickstart-item">
									<div class="quickstart-copy">
										<p class="quickstart-title">{step.title}</p>
										<p class="card-note">{step.instruction}</p>
									</div>

									<button type="button" class="install-button secondary" onclick={() => copyToClipboard(actionKey, step.payload)}>
										{copiedActionKey === actionKey
											? 'Copied!'
											: step.kind === 'deeplink'
												? 'Copy deeplink'
												: step.kind === 'verify'
													? 'Copy verification step'
													: 'Copy step'}
									</button>

									<pre class="payload-block"><code>{step.payload}</code></pre>
								</li>
							{/each}
						</ol>
					</article>
				{/if}

				{#each gooseActions as action, index}
					{@const payload = getInstallPayload(action)}
					{@const actionKey = `${entry.id}:primary:${index}`}
					<article class="install-card primary-card">
						<div class="card-copy">
							<p class="card-label">{action.label}</p>
							<p class="card-note">{getInstallModeNote(action)}</p>
						</div>

						{#if isLaunchMode(action)}
							<a href={payload} class="install-button primary">
								{getInstallActionLabel(action)}
							</a>
						{:else}
							<button type="button" class="install-button primary" onclick={() => copyToClipboard(actionKey, payload)}>
								{copiedActionKey === actionKey ? 'Copied!' : getInstallActionLabel(action)}
							</button>
						{/if}

						<pre class="payload-block"><code>{payload}</code></pre>
					</article>
				{/each}

			</div>
		</div>

		{#if relatedEntries.length > 0}
			<div class="bundle-shell">
				<div class="bundle-header">
					<h3 class="bundle-title">Bundle With Policies And Recipes</h3>
					<p class="bundle-copy">
						Goose is the standard package layer. These related artifacts let you ship the extension with policy and workflow behavior instead of only the transport.
					</p>
				</div>

				<div class="bundle-grid">
					{#each relatedEntries as related}
						{@const relatedAction = getPrimaryAction(related)}
						{@const relatedPayload = getInstallPayload(relatedAction)}
						{@const relatedLink = getArtifactLink(related)}
						{@const relatedActionKey = `${related.id}:related`}
						<article class="install-card bundle-card">
							<p class="bundle-kind">{formatKind(related.kind)}</p>
							<h4 class="bundle-card-title">{related.title}</h4>
							<p class="bundle-description">{related.description}</p>

							{#if isLaunchMode(relatedAction)}
								<a href={relatedPayload} class="install-button secondary">
									{getInstallActionLabel(relatedAction)}
								</a>
							{:else}
								<button
									type="button"
									class="install-button secondary"
									onclick={() => copyToClipboard(relatedActionKey, relatedPayload)}
								>
									{copiedActionKey === relatedActionKey ? 'Copied!' : getInstallActionLabel(relatedAction)}
								</button>
							{/if}

							<p class="card-note">{getInstallModeNote(relatedAction)}</p>

							{#if relatedLink}
								<a href={relatedLink} class="artifact-link">Open detail page</a>
							{/if}
						</article>
					{/each}
				</div>
			</div>
		{/if}

		{#if compatibilityActions.length > 0}
			<details class="compatibility-shell">
				<summary>Compatibility outputs for {formatHostList(compatibilityHosts)}</summary>
				<p class="compatibility-copy">
					These are adapters for other hosts. The standard package is still the Goose extension plus its related policy and recipe artifacts.
				</p>

				<div class="compatibility-grid">
					{#each compatibilityActions as action, index}
						{@const payload = getInstallPayload(action)}
						{@const actionKey = `${entry.id}:compat:${index}`}
						<article class="install-card compatibility-card">
							<p class="card-label">{action.label}</p>
							<p class="card-note">{getInstallModeNote(action)}</p>

							{#if isLaunchMode(action)}
								<a href={payload} class="install-button secondary">
									{getInstallActionLabel(action)}
								</a>
							{:else}
								<button
									type="button"
									class="install-button secondary"
									onclick={() => copyToClipboard(actionKey, payload)}
								>
									{copiedActionKey === actionKey ? 'Copied!' : getInstallActionLabel(action)}
								</button>
							{/if}

							<pre class="payload-block"><code>{payload}</code></pre>
						</article>
					{/each}
				</div>
			</details>
		{/if}
	</section>
{:else}
	<section class="install-section">
		<h2 class="section-title">{title}</h2>
		<p class="install-unavailable">
			Install details for <code>{entryId}</code> are not available in the distribution catalog yet.
		</p>
	</section>
{/if}

<style>
	.install-section {
		padding: var(--space-xl) 0;
	}

	.section-header {
		text-align: center;
		max-width: 46rem;
		margin: 0 auto var(--space-lg);
	}

	.section-title {
		font-size: var(--text-h2);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.section-subtitle {
		font-size: var(--text-body);
		color: var(--color-fg-muted);
		margin-bottom: var(--space-sm);
	}

	.section-link {
		margin: 0;
	}

	.section-link a,
	.artifact-link {
		color: var(--color-fg-accent, rgba(198, 211, 255, 0.92));
		text-decoration: none;
		font-weight: var(--font-semibold);
	}

	.primary-shell,
	.bundle-shell,
	.compatibility-shell {
		max-width: var(--content-width-xl);
		margin: 0 auto;
	}

	.primary-shell {
		display: grid;
		grid-template-columns: minmax(0, 1.1fr) minmax(0, 1.4fr);
		gap: var(--space-lg);
		align-items: start;
	}

	.entry-kicker,
	.bundle-kind {
		font-size: var(--text-caption);
		font-family: var(--font-mono);
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-fg-muted);
		margin: 0 0 var(--space-xs);
	}

	.entry-title,
	.bundle-title {
		font-size: var(--text-h3);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-sm);
	}

	.entry-description,
	.bundle-copy,
	.bundle-description,
	.compatibility-copy {
		font-size: var(--text-body);
		line-height: 1.65;
		color: var(--color-fg-secondary);
		margin: 0;
	}

	.primary-grid,
	.bundle-grid,
	.compatibility-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--space-md);
	}

	.install-card {
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.quickstart-card {
		grid-column: 1 / -1;
	}

	.quickstart-list {
		list-style: decimal;
		margin: var(--space-md) 0 0;
		padding-left: 1.25rem;
		display: grid;
		gap: var(--space-md);
	}

	.quickstart-item {
		display: grid;
		gap: var(--space-sm);
	}

	.quickstart-title {
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0;
	}

	.card-label,
	.bundle-card-title {
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-xs);
	}

	.card-note {
		font-size: var(--text-caption);
		line-height: 1.5;
		color: var(--color-fg-muted);
		margin: 0 0 var(--space-sm);
	}

	.install-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		padding: 0.85rem 1rem;
		border-radius: var(--radius-md);
		font-weight: var(--font-semibold);
		text-decoration: none;
		border: 1px solid transparent;
		cursor: pointer;
		margin-bottom: var(--space-sm);
	}

	.install-button.primary {
		background: var(--color-fg-primary);
		color: var(--color-bg-base);
	}

	.install-button.secondary {
		background: transparent;
		border-color: var(--color-border-default);
		color: var(--color-fg-primary);
	}

	.payload-block {
		margin: 0;
		padding: var(--space-sm);
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.06);
		color: var(--color-fg-secondary);
		font-family: var(--font-mono);
		font-size: 0.8rem;
		line-height: 1.6;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}

	.bundle-shell {
		margin-top: var(--space-xl);
	}

	.bundle-header {
		margin-bottom: var(--space-md);
	}

	.compatibility-shell {
		margin-top: var(--space-xl);
		padding-top: var(--space-md);
		border-top: 1px solid var(--color-border-default);
	}

	.compatibility-shell summary {
		cursor: pointer;
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
	}

	.compatibility-copy {
		margin: var(--space-sm) 0 var(--space-md);
	}

	.install-unavailable {
		text-align: center;
		color: var(--color-fg-muted);
	}

	@media (max-width: 900px) {
		.primary-shell,
		.primary-grid,
		.bundle-grid,
		.compatibility-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
