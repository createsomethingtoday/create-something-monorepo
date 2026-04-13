<script lang="ts">
	import { SEO } from '@create-something/canon';
	import {
		formatKind,
		getArtifactsByKind,
		getGooseInstallActions,
		getInstallActionLabel,
		getInstallModeNote,
		getInstallPayload,
		getRelatedEntries,
		isLaunchMode
	} from '$lib/distribution/catalog';

	const recipes = getArtifactsByKind('recipe');
	const recipeCount = recipes.length;
	const bundlePieceCount = recipes.reduce((total, entry) => total + getRelatedEntries(entry).length, 0);
	const verificationStepCount = recipes.reduce((total, entry) => total + entry.verification.steps.length, 0);

	let copiedActionKey = $state<string | null>(null);

	function getVerificationAction(step: { command?: string; prompt?: string }) {
		return 'command' in step ? step.command : step.prompt;
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

<SEO
	title="Recipes | CREATE SOMETHING .agency"
	description="Shareable Goose workflows that package CREATE SOMETHING extensions, policy packs, and verification guidance into repeatable operational recipes."
	keywords="Goose recipes, MCP workflow recipes, CREATE SOMETHING recipes, policy packs, grounded review, Loom coordination"
	ogImage="/og-image.svg"
	propertyName="agency"
/>

<main class="recipes-page">
	<section class="hero">
		<div class="section-shell hero-shell">
			<p class="hero-eyebrow">Goose Recipes</p>
			<h1 class="hero-title">Launch Workflows, Not Just Tools</h1>
			<p class="hero-lede">
				Recipes package the MCP, the policy behavior, and the first operating path together. They
				turn installation into something a team can actually repeat.
			</p>

			<div class="hero-actions">
				<a href="/install" class="hero-action hero-action--primary">Open install catalog</a>
				<a href="/security" class="hero-action hero-action--secondary">Review security posture</a>
			</div>

			<div class="stat-grid">
				<article class="stat-card">
					<span class="stat-value">{recipeCount}</span>
					<span class="stat-label">public recipes</span>
				</article>
				<article class="stat-card">
					<span class="stat-value">{bundlePieceCount}</span>
					<span class="stat-label">related bundle pieces</span>
				</article>
				<article class="stat-card">
					<span class="stat-value">{verificationStepCount}</span>
					<span class="stat-label">verification checks</span>
				</article>
			</div>
		</div>
	</section>

	<section class="section-shell">
		<div class="section-shell-inner intro-grid">
			<article class="intro-card">
				<h2>1. Start from a recipe</h2>
				<p>
					Each recipe gives Goose a named workflow boundary instead of asking the operator to stitch
					together extensions, prompts, and policy behavior by hand.
				</p>
			</article>
			<article class="intro-card">
				<h2>2. Bundle the right controls</h2>
				<p>
					The related extension and policy pack stay visible beside the recipe, so the workflow keeps
					its operational and safety context.
				</p>
			</article>
			<article class="intro-card">
				<h2>3. Verify before scaling</h2>
				<p>
					Every recipe declares its own verification path. That keeps “it launched” separate from “it
					worked as intended.”
				</p>
			</article>
		</div>
	</section>

	<section class="section-shell">
		<div class="section-shell-inner">
			<div class="section-header">
				<p class="section-kicker">Recipe Catalog</p>
				<h2 class="section-title">Current Workflows</h2>
				<p class="section-copy">
					These recipes are generated from the same distribution source that powers the install catalog
					and the Playbook MCP distribution tools.
				</p>
			</div>

			<div class="recipe-list">
				{#each recipes as recipe}
					{@const gooseActions = getGooseInstallActions(recipe)}
					{@const relatedEntries = getRelatedEntries(recipe)}
					<article class="recipe-card" id={`recipe-${recipe.id}`}>
						<div class="recipe-header">
							<div class="recipe-copy">
								<p class="recipe-kicker">{formatKind(recipe.kind)}</p>
								<h3 class="recipe-title">{recipe.title}</h3>
								<p class="recipe-description">{recipe.description}</p>
							</div>
							<a href={`/install#artifact-${recipe.id}`} class="recipe-link">Open in install catalog</a>
						</div>

						<div class="actions-grid">
							{#each gooseActions as action, index}
								{@const payload = getInstallPayload(action)}
								{@const actionKey = `${recipe.id}:${index}`}
								<section class="action-card">
									<p class="action-label">{action.label}</p>
									<p class="action-note">{getInstallModeNote(action)}</p>

									{#if isLaunchMode(action)}
										<a href={payload} class="action-button action-button--primary">
											{getInstallActionLabel(action)}
										</a>
									{:else}
										<button
											type="button"
											class="action-button action-button--primary"
											onclick={() => copyToClipboard(actionKey, payload)}
										>
											{copiedActionKey === actionKey ? 'Copied!' : getInstallActionLabel(action)}
										</button>
									{/if}

									<pre class="action-payload"><code>{payload}</code></pre>
								</section>
							{/each}
						</div>

						<div class="recipe-meta-grid">
							<section class="meta-card">
								<h4>Related Bundle Pieces</h4>
								<div class="meta-chip-grid">
									{#each relatedEntries as related}
										<a href={`/install#artifact-${related.id}`} class="meta-chip">
											<span>{formatKind(related.kind)}</span>
											<strong>{related.title}</strong>
										</a>
									{/each}
								</div>
							</section>

							<section class="meta-card">
								<h4>Verification</h4>
								<p class="verification-summary">{recipe.verification.summary}</p>
								<ol class="verification-list">
									{#each recipe.verification.steps as step}
										<li>
											<strong>{step.label}.</strong>
											{getVerificationAction(step)}
											<span class="verification-expected">Expected: {step.expected}</span>
										</li>
									{/each}
								</ol>
							</section>
						</div>
					</article>
				{/each}
			</div>
		</div>
	</section>
</main>

<style>
	.recipes-page {
		padding-bottom: 6rem;
	}

	.hero,
	.section-shell {
		padding: 0 1.5rem;
	}

	.hero {
		padding-top: 4rem;
	}

	.hero-shell,
	.section-shell-inner {
		max-width: 1200px;
		margin: 0 auto;
	}

	.hero-shell {
		padding: 3rem;
		border: 1px solid rgba(255, 255, 255, 0.1);
		background:
			radial-gradient(circle at top left, rgba(34, 197, 94, 0.2), transparent 28%),
			linear-gradient(180deg, rgba(15, 23, 42, 0.94) 0%, rgba(5, 8, 18, 0.98) 100%);
		box-shadow: 0 30px 80px rgba(0, 0, 0, 0.35);
	}

	.hero-eyebrow,
	.section-kicker,
	.recipe-kicker,
	.stat-label {
		font-family: var(--font-mono);
		font-size: 0.78rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: rgba(198, 208, 255, 0.72);
	}

	.hero-title,
	.section-title,
	.recipe-title {
		font-family: var(--font-display);
		letter-spacing: -0.03em;
		color: white;
	}

	.hero-title {
		font-size: clamp(2.6rem, 7vw, 4.8rem);
		line-height: 0.97;
		margin: 0.35rem 0 1rem;
		max-width: 10ch;
	}

	.hero-lede,
	.section-copy,
	.recipe-description,
	.verification-summary,
	.intro-card p {
		font-size: var(--text-body);
		line-height: 1.7;
		color: rgba(221, 228, 255, 0.82);
	}

	.hero-actions {
		display: flex;
		gap: 0.9rem;
		flex-wrap: wrap;
		margin-top: 1.5rem;
	}

	.hero-action,
	.recipe-link,
	.action-button,
	.meta-chip {
		text-decoration: none;
	}

	.hero-action {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.85rem 1.15rem;
		border-radius: 999px;
		font-weight: 600;
	}

	.hero-action--primary {
		background: rgba(255, 255, 255, 0.96);
		color: rgba(10, 16, 32, 0.96);
	}

	.hero-action--secondary {
		border: 1px solid rgba(255, 255, 255, 0.15);
		color: rgba(236, 240, 255, 0.92);
	}

	.stat-grid,
	.intro-grid,
	.actions-grid,
	.recipe-meta-grid {
		display: grid;
		gap: 1rem;
	}

	.stat-grid {
		grid-template-columns: repeat(3, minmax(0, 1fr));
		margin-top: 2rem;
	}

	.stat-card,
	.intro-card,
	.recipe-card,
	.action-card,
	.meta-card {
		border: 1px solid rgba(255, 255, 255, 0.08);
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.015)),
			rgba(0, 0, 0, 0.45);
		backdrop-filter: blur(10px);
	}

	.stat-card,
	.intro-card,
	.action-card,
	.meta-card {
		padding: 1.25rem;
	}

	.stat-value {
		display: block;
		font-size: clamp(2rem, 4vw, 2.8rem);
		font-weight: 700;
		color: white;
	}

	.intro-grid {
		grid-template-columns: repeat(3, minmax(0, 1fr));
		margin-top: 2rem;
	}

	.intro-card h2,
	.meta-card h4 {
		font-size: var(--text-h4);
		color: var(--color-fg-primary);
		margin: 0 0 0.75rem;
	}

	.section-header {
		max-width: 52rem;
		margin: 0 auto 2rem;
		text-align: center;
	}

	.recipe-list {
		display: grid;
		gap: 1.5rem;
	}

	.recipe-card {
		padding: 1.5rem;
		border-radius: 28px;
	}

	.recipe-header {
		display: flex;
		align-items: start;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1.25rem;
	}

	.recipe-link {
		color: rgba(214, 226, 255, 0.92);
		font-weight: 600;
		white-space: nowrap;
	}

	.actions-grid {
		grid-template-columns: repeat(2, minmax(0, 1fr));
		margin-bottom: 1rem;
	}

	.action-label {
		font-size: var(--text-body);
		font-weight: 600;
		color: var(--color-fg-primary);
		margin: 0 0 0.35rem;
	}

	.action-note {
		font-size: var(--text-caption);
		line-height: 1.5;
		color: var(--color-fg-muted);
		margin: 0 0 0.75rem;
	}

	.action-button {
		display: inline-flex;
		width: 100%;
		align-items: center;
		justify-content: center;
		padding: 0.85rem 1rem;
		border-radius: 16px;
		font-weight: 600;
		border: 1px solid transparent;
		cursor: pointer;
		margin-bottom: 0.75rem;
	}

	.action-button--primary {
		background: var(--color-fg-primary);
		color: var(--color-bg-base);
	}

	.action-payload {
		margin: 0;
		padding: 0.9rem;
		border-radius: 14px;
		background: rgba(255, 255, 255, 0.04);
		color: rgba(236, 240, 255, 0.92);
		font-size: 0.85rem;
		overflow-x: auto;
	}

	.recipe-meta-grid {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.meta-chip-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
	}

	.meta-chip {
		display: inline-flex;
		flex-direction: column;
		gap: 0.2rem;
		padding: 0.8rem 0.9rem;
		border-radius: 14px;
		background: rgba(255, 255, 255, 0.05);
		color: rgba(236, 240, 255, 0.92);
	}

	.meta-chip span {
		font-family: var(--font-mono);
		font-size: 0.74rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: rgba(198, 208, 255, 0.72);
	}

	.verification-list {
		margin: 0.75rem 0 0;
		padding-left: 1.2rem;
		color: rgba(221, 228, 255, 0.85);
	}

	.verification-list li + li {
		margin-top: 0.6rem;
	}

	.verification-expected {
		display: block;
		margin-top: 0.2rem;
		color: rgba(164, 177, 212, 0.9);
		font-size: 0.92rem;
	}

	@media (max-width: 900px) {
		.stat-grid,
		.intro-grid,
		.actions-grid,
		.recipe-meta-grid {
			grid-template-columns: 1fr;
		}

		.recipe-header {
			flex-direction: column;
		}
	}
</style>
