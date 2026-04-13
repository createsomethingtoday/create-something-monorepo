<script lang="ts">
	import { SEO } from '@create-something/canon';
	import ControlStackDiagram from '$lib/components/ControlStackDiagram.svelte';
	import BlockedStatePanel from '$lib/components/BlockedStatePanel.svelte';
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

	const policyPacks = getArtifactsByKind('policy_pack');
	const packageCount = policyPacks.length;
	const installActionCount = policyPacks.reduce(
		(total, entry) => total + getGooseInstallActions(entry).length,
		0
	);
	const verificationStepCount = policyPacks.reduce(
		(total, entry) => total + entry.verification.steps.length,
		0
	);
	const relatedBundleCount = policyPacks.reduce(
		(total, entry) => total + getRelatedEntries(entry).length,
		0
	);

	const controlLayers = [
		{
			title: 'Identity boundary',
			text: 'Auth0 establishes the person or tenant boundary. `.agency` does not treat a bearer token as a replacement for identity.'
		},
		{
			title: 'Live entitlement',
			text: 'Every request is checked against organization membership, service entitlement, contract standing, billing state, and policy acceptance.'
		},
		{
			title: 'Policy artifacts',
			text: 'Persistent instructions, prompt templates, and adversary rules are treated as installable package assets instead of being hidden inside one mutable prompt.'
		},
		{
			title: 'Operational control',
			text: 'Revocation, regeneration, anomaly review, telemetry, and audit trails remain part of the standing operating model.'
		}
	];

	const governanceNotes = [
		{
			title: 'Bearer token risk management',
			text: '`.agency` issues one managed bearer token per authenticated user for approved hosts and background agents. The token is portable, but authorization remains conditional at request time through live entitlement and policy checks.'
		},
		{
			title: 'Commercial and legal state',
			text: 'Access is not determined by token validity alone. `.agency` can deny execution when contract status, billing standing, or required policy acceptance is not current.'
		}
	];

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
	title="Security | CREATE SOMETHING .agency"
	description="How CREATE SOMETHING .agency turns policy packs, entitlement checks, blocked states, and audit-ready distribution artifacts into governed execution."
	keywords="security, Goose policy packs, MCP governance, persistent instructions, prompt templates, adversary rules, CREATE SOMETHING"
	ogImage="/og-image.svg"
	propertyName="agency"
/>

<main class="security-page">
	<section class="hero">
		<div class="section-shell hero-shell">
			<p class="hero-eyebrow">Governed Execution</p>
			<h1 class="hero-title">Security Is A Packaged Runtime Boundary</h1>
			<p class="hero-lede">
				Policy OS is what turns credentials into governable runtime behavior. A token can exist and
				access can still stop. Identity, entitlement, commercial state, and policy artifacts all
				participate in the final decision.
			</p>

			<div class="hero-actions">
				<a href="/install" class="hero-action hero-action--primary">Open install catalog</a>
				<a href="/recipes" class="hero-action hero-action--secondary">Review recipes</a>
				<a href="/observability" class="hero-action hero-action--secondary">Review observability</a>
			</div>

			<div class="stat-grid">
				<article class="stat-card">
					<span class="stat-value">{packageCount}</span>
					<span class="stat-label">policy packs</span>
				</article>
				<article class="stat-card">
					<span class="stat-value">{installActionCount}</span>
					<span class="stat-label">Goose security assets</span>
				</article>
				<article class="stat-card">
					<span class="stat-value">{verificationStepCount}</span>
					<span class="stat-label">verification checks</span>
				</article>
				<article class="stat-card">
					<span class="stat-value">{relatedBundleCount}</span>
					<span class="stat-label">bundle relationships</span>
				</article>
			</div>

			<p class="date-text">Last updated: April 13, 2026</p>
		</div>
	</section>

	<section class="section-shell">
		<div class="section-shell-inner">
			<ControlStackDiagram
				title="How `.agency` enforces governable automation"
				description="Each request passes through an explicit chain. That is why approval requirements, blocked states, and recovery paths stay legible instead of hiding inside prompt behavior."
			/>
		</div>
	</section>

	<section class="section-shell">
		<div class="section-shell-inner">
			<BlockedStatePanel />
		</div>
	</section>

	<section class="section-shell">
		<div class="section-shell-inner">
			<div class="section-header">
				<p class="section-kicker">Control Model</p>
				<h2 class="section-title">What The Access Decision Actually Contains</h2>
				<p class="section-copy">
					The diagram explains the path. These control layers explain why the path stays legible when
					the system is packaged into Goose extensions, recipes, and policy packs.
				</p>
			</div>

			<div class="control-grid">
				{#each controlLayers as layer}
					<article class="surface-card">
						<h3>{layer.title}</h3>
						<p>{layer.text}</p>
					</article>
				{/each}
			</div>
		</div>
	</section>

	<section class="section-shell">
		<div class="section-shell-inner">
			<div class="section-header">
				<p class="section-kicker">Policy Pack Catalog</p>
				<h2 class="section-title">Security Artifacts You Can Install And Audit</h2>
				<p class="section-copy">
					These policy packs are generated from the same shared distribution source that powers the
					install catalog, the recipe pages, and the Playbook MCP distribution tools.
				</p>
			</div>

			<div class="policy-list">
				{#each policyPacks as policy}
					{@const gooseActions = getGooseInstallActions(policy)}
					{@const relatedEntries = getRelatedEntries(policy)}
					<article class="policy-card" id={`policy-${policy.id}`}>
						<div class="policy-header">
							<div class="policy-copy">
								<p class="policy-kicker">{formatKind(policy.kind)}</p>
								<h3 class="policy-title">{policy.title}</h3>
								<p class="policy-description">{policy.description}</p>
							</div>
							<div class="policy-meta">
								<code class="policy-telemetry">{policy.telemetryKey}</code>
								<a href={`/install#artifact-${policy.id}`} class="policy-link">Open in install catalog</a>
							</div>
						</div>

						<div class="actions-grid">
							{#each gooseActions as action, index}
								{@const payload = getInstallPayload(action)}
								{@const actionKey = `${policy.id}:${index}`}
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

						<div class="policy-bottom-grid">
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
								<p class="verification-summary">{policy.verification.summary}</p>
								<ol class="verification-list">
									{#each policy.verification.steps as step}
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

	<section class="section-shell">
		<div class="section-shell-inner">
			<div class="section-header">
				<p class="section-kicker">Risk Handling</p>
				<h2 class="section-title">Bearer Tokens Stay Governed</h2>
			</div>

			<div class="governance-grid">
				{#each governanceNotes as note}
					<article class="surface-card">
						<h3>{note.title}</h3>
						<p>{note.text}</p>
					</article>
				{/each}

				<article class="surface-card governance-card">
					<h3>Security contact</h3>
					<p>
						For security inquiries, contact
						<a href="mailto:legal@createsomething.io">legal@createsomething.io</a>.
					</p>
				</article>
			</div>
		</div>
	</section>
</main>

<style>
	.security-page {
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
			radial-gradient(circle at top left, rgba(45, 212, 191, 0.18), transparent 30%),
			linear-gradient(180deg, rgba(17, 24, 39, 0.94) 0%, rgba(5, 8, 18, 0.98) 100%);
		box-shadow: 0 30px 80px rgba(0, 0, 0, 0.35);
	}

	.hero-eyebrow,
	.section-kicker,
	.policy-kicker,
	.stat-label,
	.action-label {
		font-family: var(--font-mono);
		font-size: 0.78rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: rgba(198, 208, 255, 0.72);
	}

	.hero-title,
	.section-title,
	.policy-title {
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
	.policy-description,
	.verification-summary,
	.surface-card p,
	.action-note {
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
	.action-button,
	.policy-link,
	.meta-chip {
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
		min-height: 44px;
		padding: 0.85rem 1.2rem;
		border-radius: 999px;
		border: 1px solid rgba(255, 255, 255, 0.16);
		text-decoration: none;
		font-weight: 600;
	}

	.hero-action:hover,
	.action-button:hover,
	.policy-link:hover,
	.meta-chip:hover {
		transform: translateY(-1px);
	}

	.hero-action--primary,
	.action-button--primary {
		background: white;
		color: #05070f;
	}

	.hero-action--secondary {
		color: white;
		background: rgba(255, 255, 255, 0.04);
	}

	.stat-grid,
	.control-grid,
	.governance-grid {
		display: grid;
		gap: 1rem;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
	}

	.stat-grid {
		margin-top: 2rem;
	}

	.stat-card,
	.surface-card,
	.action-card,
	.meta-card,
	.policy-card {
		border: 1px solid rgba(255, 255, 255, 0.1);
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.015)),
			rgba(0, 0, 0, 0.4);
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
	}

	.stat-card {
		padding: 1.2rem;
		border-radius: 20px;
	}

	.stat-value {
		display: block;
		font-family: var(--font-display);
		font-size: clamp(1.7rem, 4vw, 2.8rem);
		line-height: 1;
		color: white;
	}

	.date-text {
		margin-top: 1.5rem;
		color: rgba(198, 208, 255, 0.72);
		font-size: var(--text-body-sm);
	}

	.section-shell {
		margin-top: 2rem;
	}

	.section-header {
		max-width: 64rem;
		margin-bottom: 1.5rem;
	}

	.section-title {
		font-size: clamp(2rem, 5vw, 3.25rem);
		margin: 0.35rem 0 0.85rem;
	}

	.surface-card {
		padding: 1.5rem;
		border-radius: 24px;
	}

	.surface-card h3,
	.meta-card h4,
	.policy-title {
		margin: 0 0 0.85rem;
	}

	.policy-list {
		display: grid;
		gap: 1.5rem;
	}

	.policy-card {
		padding: 1.5rem;
		border-radius: 28px;
	}

	.policy-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1.25rem;
	}

	.policy-copy {
		max-width: 48rem;
	}

	.policy-meta {
		display: grid;
		gap: 0.8rem;
		justify-items: end;
	}

	.policy-telemetry {
		font-family: var(--font-mono);
		font-size: 0.82rem;
		color: rgba(226, 232, 255, 0.88);
		padding: 0.55rem 0.7rem;
		border-radius: 999px;
		background: rgba(148, 163, 184, 0.14);
	}

	.policy-link {
		color: white;
		text-decoration: none;
		font-weight: 600;
	}

	.actions-grid,
	.policy-bottom-grid {
		display: grid;
		gap: 1rem;
	}

	.actions-grid {
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
	}

	.policy-bottom-grid {
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		margin-top: 1rem;
	}

	.action-card,
	.meta-card {
		padding: 1.1rem;
		border-radius: 20px;
	}

	.action-note {
		margin: 0.45rem 0 0.9rem;
		font-size: var(--text-body-sm);
	}

	.action-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		min-height: 44px;
		padding: 0.8rem 1rem;
		border: 0;
		border-radius: 14px;
		cursor: pointer;
		font-weight: 700;
		text-decoration: none;
	}

	.action-payload {
		margin: 0.9rem 0 0;
		padding: 0.9rem;
		border-radius: 14px;
		background: rgba(15, 23, 42, 0.65);
		color: rgba(226, 232, 255, 0.92);
		font-size: 0.8rem;
		line-height: 1.6;
		overflow-x: auto;
		white-space: pre-wrap;
		word-break: break-word;
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
		padding: 0.7rem 0.85rem;
		border-radius: 16px;
		border: 1px solid rgba(255, 255, 255, 0.08);
		text-decoration: none;
		color: rgba(226, 232, 255, 0.88);
		background: rgba(255, 255, 255, 0.02);
	}

	.meta-chip span,
	.verification-expected {
		font-family: var(--font-mono);
		font-size: 0.74rem;
		color: rgba(198, 208, 255, 0.72);
	}

	.verification-list {
		margin: 1rem 0 0;
		padding-left: 1.15rem;
		color: rgba(226, 232, 255, 0.88);
	}

	.verification-list li {
		margin-bottom: 0.8rem;
		line-height: 1.65;
	}

	.verification-list li:last-child {
		margin-bottom: 0;
	}

	.verification-expected {
		display: block;
		margin-top: 0.35rem;
	}

	.governance-card a {
		color: white;
	}

	@media (max-width: 720px) {
		.hero-shell {
			padding: 2rem;
		}

		.policy-header {
			flex-direction: column;
		}

		.policy-meta {
			justify-items: start;
		}
	}
</style>
