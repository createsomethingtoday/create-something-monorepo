<script lang="ts">
	import { SEO } from '@create-something/canon';
	import {
		DISTRIBUTION_CATALOG_ENTRIES,
		DISTRIBUTION_KIND_LABELS,
		DISTRIBUTION_KIND_ORDER,
		formatHostList,
		formatKind,
		getArtifactField,
		getArtifactLink,
		getArtifactsByKind,
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

	const SECTION_COPY: Record<(typeof DISTRIBUTION_KIND_ORDER)[number], string> = {
		distro:
			'The distro is the top-level package. Use it when you want CREATE SOMETHING shipped as one Goose-standard bundle.',
		extension:
			'Extensions package the MCPs themselves. They are the canonical install unit for CREATE SOMETHING capabilities in Goose.',
		policy_pack:
			'Policy packs package prompt templates, persistent instructions, and adversary rules so behavior travels with the tool.',
		recipe:
			'Recipes package extensions and instructions into shareable workflows that can be launched consistently.'
	};

	const sections = DISTRIBUTION_KIND_ORDER
		.map((kind) => ({
			kind,
			label: DISTRIBUTION_KIND_LABELS[kind],
			description: SECTION_COPY[kind],
			entries: getArtifactsByKind(kind)
		}))
		.filter((section) => section.entries.length > 0);

	let copiedActionKey = $state<string | null>(null);

	async function copyToClipboard(actionKey: string, payload: string) {
		await navigator.clipboard.writeText(payload);
		copiedActionKey = actionKey;

		setTimeout(() => {
			if (copiedActionKey === actionKey) {
				copiedActionKey = null;
			}
		}, 1800);
	}

	function getVerificationAction(step: { command?: string; prompt?: string }) {
		return 'command' in step ? step.command : step.prompt;
	}
</script>

<SEO
	title="Goose Standard Install Catalog | CREATE SOMETHING .agency"
	description="Goose-first packaging for CREATE SOMETHING MCPs, policy packs, recipes, and distro assets, with compatibility outputs available as secondary adapters."
	keywords="Goose extensions, Goose recipes, Goose distro, MCP policies, CREATE SOMETHING install catalog"
	ogImage="/og-image.svg"
	propertyName="agency"
/>

<main class="install-page">
	<section class="hero">
		<div class="hero-shell">
			<p class="hero-eyebrow">Goose Standard</p>
			<h1 class="hero-title">Package MCPs And Policies As One Distribution Layer</h1>
			<p class="hero-lede">
				CREATE SOMETHING now treats Goose as the canonical public packaging layer. Extensions package MCPs,
				policy packs package behavior, recipes package workflows, and the distro starter packages the whole
				stack into one Goose-native bundle.
			</p>

			<div class="hero-actions">
				<a href="#distro" class="hero-action hero-action--primary">Start with the distro</a>
				<a href="#extensions" class="hero-action hero-action--secondary">Browse extensions</a>
			</div>

			<div class="stat-grid">
				<article class="stat-card">
					<span class="stat-value">{DISTRIBUTION_CATALOG_ENTRIES.length}</span>
					<span class="stat-label">bundle artifacts</span>
				</article>
				<article class="stat-card">
					<span class="stat-value">{getArtifactsByKind('extension').length}</span>
					<span class="stat-label">extensions</span>
				</article>
				<article class="stat-card">
					<span class="stat-value">{getArtifactsByKind('policy_pack').length + getArtifactsByKind('recipe').length}</span>
					<span class="stat-label">policy + recipe artifacts</span>
				</article>
			</div>
		</div>
	</section>

	<section class="principles">
		<div class="section-shell">
			<div class="principles-grid">
				<article class="principle-card">
					<h2>1. Package the MCP as an extension</h2>
					<p>Extensions are the install unit. They replace the old habit of publishing a separate first-class config block for every host.</p>
				</article>
				<article class="principle-card">
					<h2>2. Package the behavior as a policy pack</h2>
					<p>Prompt templates, persistent instructions, and adversary rules move with the workflow instead of hiding inside chat state.</p>
				</article>
				<article class="principle-card">
					<h2>3. Package the workflow as a recipe</h2>
					<p>Recipes let you distribute an extension and its operating guidance together, not as disconnected docs and commands.</p>
				</article>
			</div>
		</div>
	</section>

	{#each sections as section}
		<section class="catalog-section" id={section.kind === 'extension' ? 'extensions' : section.kind}>
			<div class="section-shell">
				<div class="section-header">
					<p class="section-kicker">{section.label}</p>
					<h2 class="section-title">{section.label}</h2>
					<p class="section-copy">{section.description}</p>
				</div>

				<div class="artifact-list">
					{#each section.entries as entry}
						{@const artifactLink = getArtifactLink(entry)}
						{@const packageName = getArtifactField(entry, 'npmPackage')}
						{@const gooseActions = getGooseInstallActions(entry)}
						{@const gooseQuickstart = getGooseQuickstart(entry)}
						{@const relatedEntries = getRelatedEntries(entry)}
						{@const compatibilityHosts = getCompatibilityHosts(entry)}
						{@const compatibilityActions = getCompatibilityActions(entry)}
						<article class="artifact-card" id={`artifact-${entry.id}`}>
							<div class="artifact-top">
								<div class="artifact-copy">
									<p class="artifact-kicker">{formatKind(entry.kind)}</p>
									<h3 class="artifact-title">{entry.title}</h3>
									<p class="artifact-description">{entry.description}</p>
								</div>

								<div class="artifact-side">
									<div class="artifact-metric">
										<span class="artifact-metric-value">{gooseActions.length}</span>
										<span class="artifact-metric-label">Goose install actions</span>
									</div>
									{#if packageName}
										<code class="artifact-package">{packageName}</code>
									{/if}
									{#if artifactLink}
										<a href={artifactLink} class="artifact-link">Open product page</a>
									{/if}
								</div>
							</div>

							<div class="goose-grid">
								<section class="mode-card mode-card--goose mode-card--quickstart">
									<div class="mode-head">
										<div>
											<p class="mode-label">Goose quickstart</p>
											<p class="mode-meta">Ordered local setup</p>
										</div>
									</div>

									<ol class="quickstart-list">
										{#each gooseQuickstart as step}
											{@const actionKey = `${entry.id}:goose:quickstart:${step.id}`}
											<li class="quickstart-item">
												<div class="quickstart-copy">
													<p class="mode-label">{step.title}</p>
													<p class="mode-note">{step.instruction}</p>
												</div>

												<button type="button" class="mode-action" onclick={() => copyToClipboard(actionKey, step.payload)}>
													{copiedActionKey === actionKey
														? 'Copied'
														: step.kind === 'deeplink'
															? 'Copy deeplink'
															: step.kind === 'verify'
																? 'Copy verification step'
																: 'Copy step'}
												</button>

												<pre class="mode-payload"><code>{step.payload}</code></pre>
											</li>
										{/each}
									</ol>
								</section>

								{#each gooseActions as action, index}
									{@const payload = getInstallPayload(action)}
									{@const actionKey = `${entry.id}:goose:${index}`}
									<section class="mode-card mode-card--goose">
										<div class="mode-head">
											<div>
												<p class="mode-label">{action.label}</p>
												<p class="mode-meta">Goose standard</p>
											</div>

											{#if isLaunchMode(action)}
												<a href={payload} class="mode-action mode-action--launch">
													{getInstallActionLabel(action)}
												</a>
											{:else}
												<button type="button" class="mode-action" onclick={() => copyToClipboard(actionKey, payload)}>
													{copiedActionKey === actionKey ? 'Copied' : getInstallActionLabel(action)}
												</button>
											{/if}
										</div>

										<p class="mode-note">{getInstallModeNote(action)}</p>
										<pre class="mode-payload"><code>{payload}</code></pre>
									</section>
								{/each}
							</div>

							{#if relatedEntries.length > 0}
								<div class="related-shell">
									<p class="related-title">Related bundle pieces</p>
									<div class="related-grid">
										{#each relatedEntries as related}
											<a href={`#artifact-${related.id}`} class="related-chip">
												<span>{formatKind(related.kind)}</span>
												<strong>{related.title}</strong>
											</a>
										{/each}
									</div>
								</div>
							{/if}

							<details class="artifact-details">
								<summary>Verification and compatibility</summary>
								<p class="verification-summary">{entry.verification.summary}</p>
								<ol class="verification-list">
									{#each entry.verification.steps as step}
										<li>
											<strong>{step.label}.</strong>
											{getVerificationAction(step)}
											<span class="verification-expected">Expected: {step.expected}</span>
										</li>
									{/each}
								</ol>

								{#if compatibilityActions.length > 0}
									<div class="compatibility-shell">
										<p class="compatibility-title">Compatibility adapters</p>
										<p class="compatibility-copy">
											Available for {formatHostList(compatibilityHosts)}. These are secondary outputs, not the standard package.
										</p>

										<div class="compatibility-grid">
											{#each compatibilityActions as action, index}
												{@const payload = getInstallPayload(action)}
												{@const actionKey = `${entry.id}:compat:${index}`}
												<section class="mode-card">
													<div class="mode-head">
														<div>
															<p class="mode-label">{action.label}</p>
															<p class="mode-meta">{action.host}</p>
														</div>

														{#if isLaunchMode(action)}
															<a href={payload} class="mode-action">
																{getInstallActionLabel(action)}
															</a>
														{:else}
															<button type="button" class="mode-action" onclick={() => copyToClipboard(actionKey, payload)}>
																{copiedActionKey === actionKey ? 'Copied' : getInstallActionLabel(action)}
															</button>
														{/if}
													</div>

													<p class="mode-note">{getInstallModeNote(action)}</p>
													<pre class="mode-payload"><code>{payload}</code></pre>
												</section>
											{/each}
										</div>
									</div>
								{:else}
									<p class="goose-only-note">This artifact is Goose-only by design.</p>
								{/if}
							</details>
						</article>
					{/each}
				</div>
			</div>
		</section>
	{/each}
</main>

<style>
	.install-page {
		padding-bottom: 6rem;
	}

	.hero,
	.principles,
	.catalog-section {
		padding: 0 1.5rem;
	}

	.hero {
		padding-top: 4rem;
	}

	.hero-shell,
	.section-shell {
		max-width: 1200px;
		margin: 0 auto;
	}

	.hero-shell {
		padding: 3rem;
		border: 1px solid rgba(255, 255, 255, 0.1);
		background:
			radial-gradient(circle at top right, rgba(91, 127, 255, 0.24), transparent 28%),
			linear-gradient(180deg, rgba(13, 16, 31, 0.94) 0%, rgba(5, 6, 12, 0.98) 100%);
		box-shadow: 0 30px 80px rgba(0, 0, 0, 0.35);
	}

	.hero-eyebrow,
	.section-kicker,
	.artifact-kicker,
	.mode-meta,
	.related-title,
	.compatibility-title,
	.stat-label,
	.artifact-metric-label {
		font-family: var(--font-mono);
		font-size: 0.78rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: rgba(198, 208, 255, 0.72);
	}

	.hero-title,
	.section-title,
	.artifact-title {
		font-family: var(--font-display);
		letter-spacing: -0.03em;
		color: white;
	}

	.hero-title {
		font-size: clamp(2.8rem, 7vw, 5.2rem);
		line-height: 0.96;
		margin: 0.25rem 0 1rem;
		max-width: 12ch;
	}

	.hero-lede,
	.section-copy,
	.artifact-description,
	.verification-summary,
	.verification-list,
	.mode-note,
	.compatibility-copy,
	.goose-only-note {
		font-size: 1.02rem;
		line-height: 1.65;
		color: rgba(227, 231, 244, 0.86);
	}

	.hero-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.85rem;
		margin-top: 1.75rem;
	}

	.hero-action,
	.mode-action,
	.artifact-link,
	.related-chip {
		transition:
			transform 160ms ease,
			border-color 160ms ease,
			background-color 160ms ease,
			color 160ms ease;
	}

	.hero-action {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.85rem 1.2rem;
		border: 1px solid rgba(255, 255, 255, 0.14);
		text-decoration: none;
		font-weight: 600;
	}

	.hero-action--primary {
		background: white;
		color: #05070f;
	}

	.hero-action--secondary {
		background: rgba(255, 255, 255, 0.02);
		color: white;
	}

	.stat-grid,
	.principles-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 1rem;
	}

	.stat-grid {
		margin-top: 2.25rem;
	}

	.stat-card,
	.principle-card {
		padding: 1rem 1.1rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.03);
	}

	.stat-value,
	.artifact-metric-value {
		font-family: var(--font-display);
		font-size: 2rem;
		line-height: 1;
		color: white;
	}

	.principles {
		padding-top: 2rem;
	}

	.principle-card h2 {
		font-size: 1.05rem;
		color: white;
		margin: 0 0 0.5rem;
	}

	.principle-card p {
		margin: 0;
		color: rgba(227, 231, 244, 0.82);
		line-height: 1.6;
	}

	.catalog-section {
		padding-top: 2.5rem;
	}

	.section-header {
		max-width: 70ch;
		margin-bottom: 1.25rem;
	}

	.section-title {
		font-size: clamp(2rem, 4vw, 3rem);
		margin: 0.35rem 0 0.75rem;
	}

	.artifact-list {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.artifact-card {
		padding: 1.6rem;
		border: 1px solid rgba(255, 255, 255, 0.09);
		background:
			linear-gradient(180deg, rgba(17, 20, 34, 0.94) 0%, rgba(8, 10, 18, 0.98) 100%);
		box-shadow: 0 18px 42px rgba(0, 0, 0, 0.26);
	}

	.artifact-top {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 220px;
		gap: 1.25rem;
		align-items: start;
	}

	.artifact-title {
		font-size: 2rem;
		margin: 0;
	}

	.artifact-description {
		margin: 0.7rem 0 0;
		max-width: 64ch;
	}

	.artifact-side {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
		align-items: flex-start;
	}

	.artifact-metric {
		padding: 0.9rem 1rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.04);
		width: 100%;
	}

	.artifact-package {
		display: inline-flex;
		max-width: 100%;
		padding: 0.45rem 0.6rem;
		background: rgba(255, 255, 255, 0.05);
		color: rgba(237, 241, 255, 0.92);
		overflow-wrap: anywhere;
	}

	.artifact-link {
		color: rgba(198, 211, 255, 0.92);
		text-decoration: none;
		font-weight: 600;
	}

	.goose-grid,
	.compatibility-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1rem;
		margin-top: 1.35rem;
	}

	.mode-card {
		padding: 1rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.025);
	}

	.mode-card--goose {
		background: rgba(88, 117, 255, 0.08);
		border-color: rgba(145, 169, 255, 0.28);
	}

	.mode-card--quickstart {
		grid-column: 1 / -1;
	}

	.mode-head {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		align-items: flex-start;
		margin-bottom: 0.7rem;
	}

	.mode-label {
		font-size: 1rem;
		font-weight: 600;
		color: white;
		margin: 0;
	}

	.mode-note {
		margin: 0 0 0.75rem;
		font-size: 0.92rem;
	}

	.mode-action {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.7rem 0.9rem;
		border: 1px solid rgba(255, 255, 255, 0.12);
		background: rgba(255, 255, 255, 0.04);
		color: white;
		text-decoration: none;
		font-weight: 600;
		white-space: nowrap;
	}

	.mode-action--launch {
		background: rgba(255, 255, 255, 0.94);
		color: #06070f;
	}

	.mode-payload {
		margin: 0;
		padding: 0.9rem;
		background: rgba(4, 6, 12, 0.95);
		border: 1px solid rgba(255, 255, 255, 0.06);
		color: rgba(230, 236, 255, 0.88);
		font-family: var(--font-mono);
		font-size: 0.87rem;
		line-height: 1.55;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}

	.quickstart-list {
		list-style: decimal;
		margin: 0;
		padding-left: 1.25rem;
		display: grid;
		gap: 1rem;
	}

	.quickstart-item {
		display: grid;
		gap: 0.75rem;
	}

	.related-shell {
		margin-top: 1rem;
	}

	.related-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 0.7rem;
		margin-top: 0.5rem;
	}

	.related-chip {
		display: inline-flex;
		flex-direction: column;
		gap: 0.18rem;
		padding: 0.7rem 0.85rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.03);
		color: rgba(230, 236, 255, 0.9);
		text-decoration: none;
	}

	.related-chip strong {
		font-size: 0.95rem;
	}

	.artifact-details {
		margin-top: 1.2rem;
		padding-top: 1.1rem;
		border-top: 1px solid rgba(255, 255, 255, 0.08);
	}

	.artifact-details summary {
		cursor: pointer;
		font-weight: 600;
		color: white;
	}

	.verification-summary {
		margin: 0.9rem 0 0;
	}

	.verification-list {
		margin: 0.75rem 0 0;
		padding-left: 1.25rem;
	}

	.verification-list li + li {
		margin-top: 0.7rem;
	}

	.verification-expected {
		display: block;
		margin-top: 0.3rem;
		color: rgba(191, 206, 255, 0.82);
	}

	.compatibility-shell {
		margin-top: 1rem;
	}

	.goose-only-note {
		margin: 1rem 0 0;
	}

	@media (max-width: 980px) {
		.stat-grid,
		.principles-grid,
		.goose-grid,
		.compatibility-grid,
		.artifact-top {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 720px) {
		.hero,
		.principles,
		.catalog-section {
			padding-left: 1rem;
			padding-right: 1rem;
		}

		.hero-actions {
			flex-direction: column;
		}

		.hero-action,
		.mode-action {
			width: 100%;
		}

		.mode-head {
			flex-direction: column;
		}

		.artifact-card,
		.hero-shell {
			padding: 1.2rem;
		}
	}
</style>
