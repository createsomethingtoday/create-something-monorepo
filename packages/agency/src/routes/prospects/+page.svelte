<script lang="ts">
	import { SEO } from '@create-something/canon';
	import { ProspectWorkspaceSection, ReportShell, SummaryItem } from '$lib/components/access';
	import type { ProspectWorkspaceCandidate } from '$lib/types/prospect-workspace';

	let { data } = $props();

	const prospects = $derived(
		(Array.isArray(data.prospects) ? data.prospects : []) as ProspectWorkspaceCandidate[],
	);
	const loginHref = '/login?redirect=%2Fprospects';
	const signupHref = '/api/auth/signup?redirect=%2Fprospects';
	const claimableCount = $derived(
		prospects.filter((prospect) => prospect.prospect_claim.state === 'claimable' && prospect.prospect_claim.can_claim_now)
			.length,
	);
	const claimedCount = $derived(
		prospects.filter((prospect) => prospect.prospect_claim.state === 'claimed_by_you').length,
	);
	const reviewCount = $derived(
		prospects.filter(
			(prospect) =>
				prospect.prospect_claim.blocked_reason !== null && prospect.prospect_claim.state !== 'claimed_by_you',
		).length,
	);
	const graduationReadyCount = $derived(
		prospects.filter(
			(prospect) => prospect.prospect_claim.state === 'claimed_by_you' && prospect.graduation_readiness?.ready,
		).length,
	);
	const connectedToolkitCount = $derived(
		prospects.flatMap((prospect) => prospect.toolkit_accounts ?? []).filter((account) => account.connected).length,
	);
</script>

<SEO
	title="Prospect Portal | CREATE SOMETHING AGENCY"
	description="Claim preprovisioned prospect workspaces and connect approved toolkit accounts before graduation."
	propertyName="agency"
	noindex={true}
/>

{#if !data.user}
	<section class="portal-splash">
		<div class="portal-card">
			<p class="eyebrow">Prospect Portal</p>
			<h1>Claim your workspace and connect approved services.</h1>
			<p class="lede">
				If your workspace was preprovisioned for onboarding, sign in with the authorized email to claim it,
				review enabled toolkits, and complete provider connections before commercial graduation.
			</p>
			<div class="portal-actions">
				<a class="primary-action" href={loginHref}>Sign in</a>
				<a class="secondary-action" href={signupHref}>Create account</a>
			</div>
			<p class="footnote">
				Workspace claim and toolkit connection are governed. Customer credential issuance remains blocked until graduation.
			</p>
		</div>
	</section>
{:else}
	<ReportShell
		eyebrow="Prospect Portal"
		title="Prospect Workspaces"
		lede="Claim preprovisioned workspaces, connect approved services, and keep the onboarding path governed until commercial graduation."
		sideLabel="Signed in as"
		sideValue={data.user.email}
		sideMeta={data.error ? `Status: ${data.error}` : `${prospects.length} workspace${prospects.length === 1 ? '' : 's'}`}
	>
			<svelte:fragment slot="summary">
				<SummaryItem label="Claimable" value={String(claimableCount)} note="Ready to bind now" />
				<SummaryItem label="Claimed" value={String(claimedCount)} note="Already bound to this Clerk account" />
			<SummaryItem label="Review" value={String(reviewCount)} note="Blocked or unavailable workspaces" />
			<SummaryItem label="Grad Ready" value={String(graduationReadyCount)} note="Ready for operator promotion" />
			<SummaryItem label="Connected Toolkits" value={String(connectedToolkitCount)} note="Active provider connections" />
		</svelte:fragment>

		{#if data.error}
			<p class="feedback error">{data.error}</p>
		{/if}

			<ProspectWorkspaceSection prospects={prospects} emptyMessage="No prospect workspaces are currently assigned to this Clerk account." />
	</ReportShell>
{/if}

<style>
	.portal-splash {
		min-height: calc(100vh - 72px);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem 1rem 3rem;
	}

	.portal-card {
		width: 100%;
		max-width: 44rem;
		padding: 2rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.02);
	}

	.eyebrow {
		margin: 0 0 0.6rem;
		font-size: 0.72rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--color-fg-muted);
	}

	h1 {
		margin: 0 0 0.7rem;
		font-size: clamp(2.15rem, 5vw, 3.2rem);
		line-height: 0.96;
		letter-spacing: -0.04em;
	}

	.lede,
	.footnote {
		color: var(--color-fg-muted);
		line-height: 1.72;
	}

	.lede {
		margin: 0;
		max-width: 36rem;
	}

	.portal-actions {
		display: flex;
		gap: 0.8rem;
		flex-wrap: wrap;
		margin: 1.2rem 0 0;
	}

	.primary-action,
	.secondary-action {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 2.8rem;
		padding: 0.7rem 1rem;
		font-size: 0.82rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		text-decoration: none;
	}

	.primary-action {
		background: rgba(255, 255, 255, 0.92);
		color: #111;
	}

	.secondary-action {
		border: 1px solid rgba(255, 255, 255, 0.18);
		color: var(--color-fg-primary);
	}

	.footnote {
		margin: 1rem 0 0;
		font-size: 0.88rem;
	}

	.feedback {
		margin: 0 0 0.9rem;
		font-size: 0.84rem;
		line-height: 1.6;
	}

	.feedback.error {
		color: #ff8a80;
	}
</style>
