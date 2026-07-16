<script lang="ts">
	import {
		Button,
		PerformanceContrastChapter,
		PerformanceConversionHandoff,
		PerformanceEvidenceIndex,
		PerformanceThesisConditions,
		SEO,
		type PerformanceCondition,
		type PerformanceEvidenceItem
	} from '@create-something/canon';
	import DelegationPracticeWorkbench from '$lib/components/DelegationPracticeWorkbench.svelte';
	import PublicAtlasStoryCanvas from '$lib/components/PublicAtlasStoryCanvas.svelte';

	const openingHandoff = {
		owner: 'Accountable operator',
		authority: 'Observe one workflow',
		proof: 'No evidence attached yet',
		state: 'draft' as const
	};

	const systemConditions: PerformanceCondition[] = [
		{
			label: 'Database',
			title: 'Is the operating truth available?',
			detail: 'Inspect the records, state, policy versions, and proof artifacts the workflow is allowed to use.',
			tone: 'signal'
		},
		{
			label: 'Automation',
			title: 'Did the execution path succeed?',
			detail: 'Trace the tools, stops, approvals, retries, and receipts without assigning judgment to motion alone.',
			tone: 'pressure'
		},
		{
			label: 'Judgment',
			title: 'Was the right policy applied?',
			detail: 'Name who owns the decision, what boundary governed it, and when the system must escalate or stop.',
			tone: 'growth'
		}
	];

	const evidenceRecords: PerformanceEvidenceItem[] = [
		{
			id: 'THESIS-01',
			kind: 'Operating claim',
			title: 'Signal → Decision → Proof',
			detail: 'The category method stays attached to workflow ownership, policy boundaries, and inspectable evidence.',
			state: 'verified',
			date: 'Current public method',
			href: '/methodology'
		},
		{
			id: 'MAP-01',
			kind: 'Workflow model',
			title: 'Marketplace review queue',
			detail: 'A read-only Map story shows the signal, automated preparation, human review, stop condition, and proof landing zone.',
			state: 'verified',
			date: 'Representative local map',
			href: '/map'
		},
		{
			id: 'CASE-01',
			kind: 'Prototype proof',
			title: 'Marketplace workflow compiler',
			detail: 'The proof route keeps representative fixtures, active-development status, and the absence of production writes visible.',
			state: 'review',
			date: 'Public limits intact',
			href: '/proof/marketplace-workflow'
		},
		{
			id: 'DEFENSE-01',
			kind: 'Flagship defense',
			title: 'Governed Agent Delivery',
			detail: 'The repo-owned case follows a Linear signal through bounded implementation to production proof. It remains a proposed defense until the full evidence packet is examined.',
			state: 'draft',
			date: 'Not yet publicly defended'
		}
	];
</script>

<SEO
	title="The Delegation Practice | CREATE SOMETHING"
	description="A working thesis and field school for accountable operators making delegated work trustworthy."
	keywords="AI workflow systems, accountable operators, delegated work, workflow governance, proof"
	propertyName="agency"
/>

<main class="delegation-practice-page">
	<PerformanceConversionHandoff
		eyebrow="The Delegation Practice"
		title="Make delegated work trustworthy."
		description="Map the work. Bound the authority. Test the system. Prove what happened. Earn the right to do more."
		handoff={openingHandoff}
		headingLevel="h1"
	>
		{#snippet actions()}
			<Button href="#practice-workbench">Map one workflow</Button>
			<Button href="#evidence" variant="secondary">Examine the evidence</Button>
		{/snippet}
	</PerformanceConversionHandoff>

	<PerformanceThesisConditions
		eyebrow="Delegated Work Control"
		title="Diagnose the system before changing the policy."
		description="The Three-Tier Framework keeps failures local: verify the Database, then the Automation, then the Judgment governing the next move."
		conditions={systemConditions}
		ariaLabel="Database Automation and Judgment diagnostic order"
	/>

	<PerformanceContrastChapter
		eyebrow="Field map"
		title="See where work may run, wait, or stop."
		description="This representative Marketplace review queue is a read-only teaching surface. It exposes a real operating shape without claiming production access or client proof."
		intervention={{
			label: 'Map / shared graph contract',
			title: 'The map is the first policy artifact.',
			detail: 'Each node names an owner and each edge exposes the handoff that must be governed, tested, and proved.'
		}}
		artifactPlacement="full-width"
	>
		{#snippet artifact()}
			<PublicAtlasStoryCanvas
				starterId="marketplace-review-queue"
				storyId="delegation-practice-marketplace-story"
			/>
		{/snippet}
	</PerformanceContrastChapter>

	<DelegationPracticeWorkbench />

	<div id="evidence">
		<PerformanceEvidenceIndex
			eyebrow="Source evidence"
			title="Claims stay attached to state and limits."
			description="Verified, review, and draft records are deliberately different. Open the owning surface before deciding what the system has earned."
			items={evidenceRecords}
			ariaLabel="Delegation Practice source evidence"
		/>
	</div>

	<PerformanceContrastChapter
		eyebrow="Flagship defense"
		title="Governed Agent Delivery: from Linear signal to production proof."
		description="This case follows work from a Linear issue to production. At every step, it must keep the owner, allowed actions, required checks, approval points, and rollback evidence visible."
		intervention={{
			label: 'Unresolved boundary',
			title: 'A proposed case is not a passed defense.',
			detail: 'Passing still requires artifact inspection, counterexample review, a rollback check, and an independent verdict with real consequences.'
		}}
		mode="paper-to-ink"
	/>

	<PerformanceConversionHandoff
		eyebrow="School + skeptical review"
		title="Finish with a Practice Receipt, not a certificate."
		description="Practice produces an inspectable workflow map, authority envelope, test plan, proof bundle, and review verdict. Skeptical review may support, revise, hold, or falsify the thesis; completion never grants portable authority."
		handoff={{
			owner: 'Accountable practitioner',
			authority: 'One named workflow only',
			proof: 'Artifact bundle + review verdict',
			state: 'review'
		}}
	>
		{#snippet actions()}
			<Button href="#practice-workbench">Rehearse the operator journey</Button>
			<Button href="/proof/marketplace-workflow" variant="secondary">Inspect a bounded proof route</Button>
		{/snippet}
	</PerformanceConversionHandoff>
</main>

<style>
	.delegation-practice-page {
		background: var(--color-performance-panel, #fff);
		color: var(--color-performance-ink, #090909);
	}
</style>
