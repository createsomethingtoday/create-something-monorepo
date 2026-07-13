<script lang="ts">
	import { Presentation, Slide, SystemPillars, TermMap } from '@create-something/canon/domains/ltd';
	import { SEO } from '@create-something/canon';
	import BudgetAllocationVisual from './BudgetAllocationVisual.svelte';
	import IntakeExperience from './IntakeExperience.svelte';
	import MatchingShortlistVisual from './MatchingShortlistVisual.svelte';
	import PolicyEscalationVisual from './PolicyEscalationVisual.svelte';
	import RolloutTimelineVisual from './RolloutTimelineVisual.svelte';

	let { data } = $props();

	const systemPillars = [
		{
			eyebrow: 'Conversation',
			title: 'Build the profile while people talk',
			body: 'The system captures useful facts from the conversation, then asks only for the missing pieces.'
		},
		{
			eyebrow: 'Matching',
			title: 'Rank likely fits',
			body: 'Abundance scores possible matches and returns a shortlist instead of leaving the team to sort every option manually.'
		},
		{
			eyebrow: 'Control',
			title: 'Stop unsafe actions',
			body: 'Consent, credentials, blocked tools, and human-review paths stay visible before the system writes anything important.'
		}
	];

	const termMap = [
		{
			codeTerm: 'Seeker',
			clientTerm: 'Open role / existing demand',
			note: 'The side asking for help. For this client, that demand already exists. The opportunity is filling it faster with better nurse intake and matching.'
		},
		{
			codeTerm: 'Talent',
			clientTerm: 'Nurse / clinician side',
			note: 'The side that can fill the work. The concierge intake pattern can be used here to build the nurse profile conversationally.'
		},
		{
			codeTerm: 'Match',
			clientTerm: 'Recommended placement',
			note: 'A scored pairing between a request and a nurse, with the reasons kept visible.'
		},
		{
			codeTerm: 'Intake',
			clientTerm: 'Running profile history',
			note: 'What the system learned last time, what changed this time, and what still needs confirmation.'
		}
	];

	const controlPillars = [
		{
			eyebrow: 'Identity',
			title: 'Know who is acting',
			body: 'The control layer separates the person, the account, and the runtime credentials so access can be managed deliberately.'
		},
		{
			eyebrow: 'Entitlement',
			title: 'Check whether the action is allowed',
			body: 'Live checks consider policy acceptance, contract standing, billing state, and service entitlement before execution.'
		},
		{
			eyebrow: 'Authorization',
			title: 'Hide or block risky routes',
			body: 'Read-only users do not see write paths, and destructive actions require review instead of silent execution.'
		}
	];

</script>

<SEO
	title={data.meta.title}
	description={data.meta.description}
	propertyName="ltd"
	breadcrumbs={[
		{ name: 'Home', url: 'https://createsomething.ltd' },
		{ name: 'Presentations', url: 'https://createsomething.ltd/presentations' },
		{ name: 'Abundance System', url: 'https://createsomething.ltd/presentations/abundance-system' }
	]}
/>

<Presentation
	title="ABUNDANCE"
	subtitle="The nurse staffing system, explained simply."
	scriptUrl="/presentations/abundance-system/script"
>
	<Slide type="title">
		<span class="number">01</span>
		<h1>ABUNDANCE</h1>
		<p class="subtitle">The nurse staffing system, explained simply.</p>
		<p class="tagline">Conversation. Matching. Safety rails.</p>
	</Slide>

	<Slide type="content">
		<span class="number">02</span>
		<h2>The Staffing Problem</h2>
		<p>
			Today, too much staffing work is still <span class="em">phone calls, texts, retyping, and guesswork</span>.
		</p>
		<ul>
			<li>A nurse repeats the same facts across multiple steps.</li>
			<li>A recruiter copies those facts into a system.</li>
			<li>Operations checks documents and portal data later.</li>
			<li>The final match often depends on manual cleanup.</li>
		</ul>
		<p class="muted">That is slow. In healthcare, slow and unclear is a real risk.</p>
	</Slide>

	<Slide type="content">
		<span class="number">03</span>
		<h2>What Abundance Actually Does</h2>
		<p>
			Abundance is not one feature. It is <span class="em">three coordinated jobs</span>.
		</p>
		<SystemPillars items={systemPillars} />
		<p class="muted">For this client, the practical scope is nurse acquisition and matching. Demand is already there.</p>
	</Slide>

	<Slide type="content">
		<span class="number">04</span>
		<h2>Translating the Code</h2>
		<p>
			The repo uses generic marketplace terms.
			<span class="muted">Here is the same system in nurse staffing language, with this engagement focused on the nurse side.</span>
		</p>
		<TermMap items={termMap} />
	</Slide>

	<Slide type="content">
		<span class="number">05</span>
		<h2>What Intake Feels Like</h2>
		<p>
			The concierge flow starts with a normal message.
			<span class="em">The profile is built while the conversation is happening.</span>
		</p>
		<IntakeExperience />
		<p class="muted">Useful first. Structured second. That is the product move.</p>
	</Slide>

	<Slide type="content">
		<span class="number">06</span>
		<h2>What the System Keeps</h2>
		<p>
			Abundance keeps the facts it needs to keep the workflow moving.
		</p>
		<ul>
			<li>Stable identity, currently anchored to phone-first intake</li>
			<li>Profile facts, with confirmed versus inferred status</li>
			<li>Availability and preference updates over time</li>
			<li>Past intakes, so returning users do not start from zero</li>
			<li>Match history, status, and feedback</li>
		</ul>
		<p class="muted">The goal is memory with discipline, not data hoarding.</p>
	</Slide>

	<Slide type="content">
		<span class="number">07</span>
		<h2>How Matching Stays Legible</h2>
		<p>
			The current engine is simple enough to explain.
			<span class="em">Every shortlist comes with visible reasons.</span>
		</p>
		<MatchingShortlistVisual />
		<p class="muted">The code keeps this simple on purpose so every score can be explained and audited.</p>
	</Slide>

	<Slide type="content">
		<span class="number">08</span>
		<h2>What Happens On Conflict</h2>
		<p>
			A good staffing system does not try to be brave.
			<span class="em">It knows when to escalate.</span>
		</p>
		<PolicyEscalationVisual />
		<p class="muted">Fast where safe. Human where necessary.</p>
	</Slide>

	<Slide type="split">
		<span class="number">09</span>
		<div class="left">
			<h2>AI can</h2>
			<ul class="compact-list">
				<li>build a draft profile</li>
				<li>prefill approved widgets</li>
				<li>shortlist likely fits</li>
				<li>surface missing documents</li>
			</ul>
		</div>
		<div class="right">
			<h2>AI cannot</h2>
			<ul class="compact-list">
				<li>treat inferred data as confirmed truth</li>
				<li>ignore conflicting evidence</li>
				<li>use sensitive fields without explicit confirmation</li>
				<li>take destructive or regulated actions without review</li>
			</ul>
		</div>
	</Slide>

	<Slide type="content">
		<span class="number">10</span>
		<h2>Why `.agency` Exists</h2>
		<p>
			The chat experience is the simple front door.
			<span class="muted">`.agency` is the control layer behind it.</span>
		</p>
		<SystemPillars items={controlPillars} />
		<p class="muted">That is how the product stays simple without becoming reckless.</p>
	</Slide>

	<Slide type="split">
		<span class="number">11</span>
		<div class="left">
			<h2>Already real in code</h2>
			<ul class="compact-list">
				<li>profile creation and updates</li>
				<li>matching API and status tracking</li>
				<li>WhatsApp-ready intake webhook</li>
				<li>intake history for returning users</li>
				<li>human handoff and blocked-state patterns</li>
			</ul>
		</div>
		<div class="right">
			<h2>Specialized for nurse acquisition</h2>
			<ul class="compact-list">
				<li>nurse credential rules and verifications</li>
				<li>specialty, shift, and pay-package fit</li>
				<li>resume, consent, and document collection</li>
				<li>recruiter handoff for exceptions and follow-up</li>
				<li>healthcare-specific audit outputs</li>
			</ul>
		</div>
	</Slide>

	<Slide type="content">
		<span class="number">12</span>
		<h2>What Nurse Acquisition Likely Costs</h2>
		<p>
			The client already has demand. This budget is about attracting and qualifying more nurses.
		</p>
		<BudgetAllocationVisual />
		<p class="muted">
			Research note: these ranges are candidate-side only. That is the funnel we are helping optimize.
		</p>
		<p class="source-note">
			Directional ranges pulled from Recruiters Websites, Staffing Industry Analysts, PPC Chief,
			Benly, and College Recruiter/Appcast.
		</p>
	</Slide>

	<Slide type="content">
		<span class="number">13</span>
		<h2>Recommended First 90 Days</h2>
		<p>
			The first 90 days are about improving nurse-side intake quality, recruiter handoff speed, and application flow.
		</p>
		<RolloutTimelineVisual />
	</Slide>

	<Slide type="title">
		<span class="number">14</span>
		<h1>The Claim</h1>
		<p class="subtitle">Less form fatigue for nurses.</p>
		<p class="subtitle">Less manual re-entry for recruiters.</p>
		<p class="subtitle">Faster matching with visible safety rails.</p>
		<p class="tagline">A real nurse-acquisition path, with research-backed budget ranges.</p>
	</Slide>
</Presentation>

<style>
	.source-note {
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-muted);
		line-height: var(--leading-performance-relaxed);
	}

	:global(.slide-split ul.compact-list) {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-performance-sm);
	}

	:global(.slide-split ul.compact-list li) {
		position: relative;
		padding-left: var(--space-performance-lg);
		font-size: var(--text-performance-body-lg);
		color: var(--color-performance-fg-secondary);
		line-height: var(--leading-performance-relaxed);
	}

	:global(.slide-split ul.compact-list li::before) {
		content: '—';
		position: absolute;
		left: 0;
		color: var(--color-performance-fg-muted);
	}
</style>
