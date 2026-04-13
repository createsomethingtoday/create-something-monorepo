<script lang="ts">
	import { SEO } from '@create-something/canon';
	import {
		DISTRIBUTION_CATALOG_ENTRIES,
		DISTRIBUTION_KIND_LABELS,
		formatKind,
		getRelatedEntries
	} from '$lib/distribution/catalog';

	const artifacts = DISTRIBUTION_CATALOG_ENTRIES;
	const publicArtifacts = artifacts.filter((entry) => entry.visibility === 'public');
	const verificationStepCount = artifacts.reduce(
		(total, entry) => total + entry.verification.steps.length,
		0
	);
	const promptStepCount = artifacts.reduce(
		(total, entry) =>
			total +
			entry.verification.steps.filter((step) => 'prompt' in step && typeof step.prompt === 'string')
				.length,
		0
	);
	const commandStepCount = verificationStepCount - promptStepCount;
	const byKind = Object.entries(
		artifacts.reduce<Record<string, number>>((acc, entry) => {
			acc[entry.kind] = (acc[entry.kind] ?? 0) + 1;
			return acc;
		}, {})
	);
	const telemetryCoverage = artifacts.filter((entry) => entry.telemetryKey.length > 0).length;
	const relatedBundleCount = artifacts.reduce((total, entry) => total + getRelatedEntries(entry).length, 0);

	function getVerificationMode(step: { command?: string; prompt?: string }) {
		return 'command' in step ? 'Command' : 'Prompt';
	}

	function getVerificationAction(step: { command?: string; prompt?: string }) {
		return 'command' in step ? step.command : step.prompt;
	}
</script>

<SEO
	title="Observability | CREATE SOMETHING .agency"
	description="Telemetry keys, verification coverage, and bundle-level operator visibility for CREATE SOMETHING Goose-standard distribution artifacts."
	keywords="observability, telemetry, verification, MCP distribution, Goose packaging, CREATE SOMETHING"
	ogImage="/og-image.svg"
	propertyName="agency"
/>

<main class="observability-page">
	<section class="hero">
		<div class="section-shell hero-shell">
			<p class="hero-eyebrow">Operator Visibility</p>
			<h1 class="hero-title">Observability Starts At The Artifact Boundary</h1>
			<p class="hero-lede">
				The install surface only matters if operators can tell what was launched, what was verified,
				and what bundle relationship each action belonged to. The catalog is the first observability
				surface.
			</p>

			<div class="stat-grid">
				<article class="stat-card">
					<span class="stat-value">{telemetryCoverage}</span>
					<span class="stat-label">telemetry keys</span>
				</article>
				<article class="stat-card">
					<span class="stat-value">{verificationStepCount}</span>
					<span class="stat-label">verification steps</span>
				</article>
				<article class="stat-card">
					<span class="stat-value">{relatedBundleCount}</span>
					<span class="stat-label">bundle relationships</span>
				</article>
			</div>
		</div>
	</section>

	<section class="section-shell">
		<div class="section-shell-inner summary-grid">
			<article class="summary-card">
				<h2>Catalog coverage</h2>
				<p>
					{publicArtifacts.length} public artifacts currently expose telemetry keys and verification
					paths from the same shared distribution source.
				</p>
			</article>
			<article class="summary-card">
				<h2>Verification mix</h2>
				<p>
					{commandStepCount} command-backed checks and {promptStepCount} prompt-backed checks make the
					verification surface explicit instead of hiding it in support docs.
				</p>
			</article>
			<article class="summary-card">
				<h2>Kind coverage</h2>
				<p>
					Extensions, policy packs, recipes, and distro starters all carry telemetry keys, so rollout
					and adoption can be measured at the same package boundary.
				</p>
			</article>
		</div>
	</section>

	<section class="section-shell">
		<div class="section-shell-inner">
			<div class="section-header">
				<p class="section-kicker">Distribution By Kind</p>
				<h2 class="section-title">Instrumented Package Classes</h2>
			</div>

			<div class="kind-grid">
				{#each byKind as [kind, count]}
					<article class="kind-card">
						<p class="kind-label">{DISTRIBUTION_KIND_LABELS[kind as keyof typeof DISTRIBUTION_KIND_LABELS]}</p>
						<p class="kind-value">{count}</p>
					</article>
				{/each}
			</div>
		</div>
	</section>

	<section class="section-shell">
		<div class="section-shell-inner">
			<div class="section-header">
				<p class="section-kicker">Telemetry Ledger</p>
				<h2 class="section-title">Artifact-Level Keys</h2>
				<p class="section-copy">
					These are the identifiers the distribution plane can use to track install, launch,
					verification, and adoption behavior without flattening everything into one generic counter.
				</p>
			</div>

			<div class="ledger-list">
				{#each artifacts as entry}
					<article class="ledger-card">
						<div class="ledger-header">
							<div>
								<p class="ledger-kicker">{formatKind(entry.kind)}</p>
								<h3 class="ledger-title">{entry.title}</h3>
							</div>
							<code class="ledger-key">{entry.telemetryKey}</code>
						</div>

						<p class="ledger-summary">{entry.verification.summary}</p>

						<div class="ledger-meta">
							<span>{entry.verification.steps.length} verification steps</span>
							<span>{getRelatedEntries(entry).length} related bundle pieces</span>
						</div>

						<ol class="verification-list">
							{#each entry.verification.steps as step}
								<li>
									<strong>{step.label}.</strong>
									<span class="step-mode">{getVerificationMode(step)}</span>
									{getVerificationAction(step)}
								</li>
							{/each}
						</ol>
					</article>
				{/each}
			</div>
		</div>
	</section>

	<section class="section-shell">
		<div class="section-shell-inner">
			<div class="section-header">
				<p class="section-kicker">Operator Questions</p>
				<h2 class="section-title">What This Surface Should Answer</h2>
			</div>
			<div class="question-grid">
				<article class="question-card">
					<h3>What was installed?</h3>
					<p>Track extension, recipe, policy-pack, and distro adoption by artifact key, not just by host.</p>
				</article>
				<article class="question-card">
					<h3>What was launched?</h3>
					<p>Separate bundle launch events from install-copy events so recipe usage is visible.</p>
				</article>
				<article class="question-card">
					<h3>What was verified?</h3>
					<p>Keep verification success attached to the artifact and workflow it belongs to.</p>
				</article>
				<article class="question-card">
					<h3>What is ignored?</h3>
					<p>See which public artifacts stay untouched so packaging work follows actual operator behavior.</p>
				</article>
			</div>
		</div>
	</section>
</main>

<style>
	.observability-page {
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
			radial-gradient(circle at top right, rgba(56, 189, 248, 0.2), transparent 28%),
			linear-gradient(180deg, rgba(13, 18, 33, 0.94) 0%, rgba(5, 7, 15, 0.98) 100%);
		box-shadow: 0 30px 80px rgba(0, 0, 0, 0.35);
	}

	.hero-eyebrow,
	.section-kicker,
	.ledger-kicker,
	.stat-label,
	.kind-label,
	.step-mode {
		font-family: var(--font-mono);
		font-size: 0.78rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: rgba(198, 208, 255, 0.72);
	}

	.hero-title,
	.section-title,
	.ledger-title {
		font-family: var(--font-display);
		letter-spacing: -0.03em;
		color: white;
	}

	.hero-title {
		font-size: clamp(2.6rem, 7vw, 4.8rem);
		line-height: 0.97;
		margin: 0.35rem 0 1rem;
		max-width: 12ch;
	}

	.hero-lede,
	.section-copy,
	.summary-card p,
	.ledger-summary,
	.question-card p {
		font-size: var(--text-body);
		line-height: 1.7;
		color: rgba(221, 228, 255, 0.82);
	}

	.stat-grid,
	.summary-grid,
	.kind-grid,
	.question-grid {
		display: grid;
		gap: 1rem;
	}

	.stat-grid {
		grid-template-columns: repeat(3, minmax(0, 1fr));
		margin-top: 2rem;
	}

	.stat-card,
	.summary-card,
	.kind-card,
	.ledger-card,
	.question-card {
		border: 1px solid rgba(255, 255, 255, 0.08);
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.015)),
			rgba(0, 0, 0, 0.45);
		backdrop-filter: blur(10px);
		border-radius: 24px;
	}

	.stat-card,
	.summary-card,
	.kind-card,
	.question-card {
		padding: 1.25rem;
	}

	.stat-value,
	.kind-value {
		display: block;
		font-size: clamp(2rem, 4vw, 2.8rem);
		font-weight: 700;
		color: white;
	}

	.summary-grid,
	.question-grid {
		grid-template-columns: repeat(3, minmax(0, 1fr));
		margin-top: 2rem;
	}

	.summary-card h2,
	.question-card h3 {
		font-size: var(--text-h4);
		color: var(--color-fg-primary);
		margin: 0 0 0.75rem;
	}

	.section-header {
		max-width: 54rem;
		margin: 0 auto 2rem;
		text-align: center;
	}

	.kind-grid {
		grid-template-columns: repeat(4, minmax(0, 1fr));
	}

	.ledger-list {
		display: grid;
		gap: 1rem;
	}

	.ledger-card {
		padding: 1.4rem;
	}

	.ledger-header {
		display: flex;
		align-items: start;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 0.85rem;
	}

	.ledger-key {
		display: inline-flex;
		padding: 0.45rem 0.65rem;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.06);
		color: rgba(236, 240, 255, 0.92);
		font-size: 0.82rem;
	}

	.ledger-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		margin-top: 0.8rem;
		font-size: 0.95rem;
		color: rgba(180, 194, 228, 0.88);
	}

	.verification-list {
		margin: 1rem 0 0;
		padding-left: 1.2rem;
		color: rgba(221, 228, 255, 0.85);
	}

	.verification-list li + li {
		margin-top: 0.6rem;
	}

	.step-mode {
		display: inline-flex;
		margin: 0 0.5rem;
	}

	@media (max-width: 900px) {
		.stat-grid,
		.summary-grid,
		.kind-grid,
		.question-grid {
			grid-template-columns: 1fr;
		}

		.ledger-header {
			flex-direction: column;
		}
	}
</style>
