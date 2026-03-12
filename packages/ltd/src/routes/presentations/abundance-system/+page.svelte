<script lang="ts">
	import { Presentation } from '@create-something/canon/domains/ltd';
	import { Slide } from '@create-something/canon/domains/ltd';
	import { SEO } from '@create-something/canon';
	import SystemPillars from './SystemPillars.svelte';
	import TermMap from './TermMap.svelte';

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
			clientTerm: 'Coverage request / facility side',
			note: 'The side asking for help. In staffing, this is usually the facility or staffing team opening a need.'
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

	const budgetBenchmarks = [
		{
			eyebrow: 'Nurse supply',
			title: '$3k-$6k/mo lean, $6k-$12k/mo solid',
			body: 'Healthcare recruitment benchmarks point to lower-cost job-channel traffic, with completed applications often around $35 and harder-to-fill roles rising above that.'
		},
		{
			eyebrow: 'Facility demand',
			title: '$4k-$8k/mo lean, $8k-$15k/mo solid',
			body: 'Facility acquisition is costlier and less directly benchmarked. Treat it as B2B demand generation, with LinkedIn-style lead costs often landing in the $75-$200+ range.'
		}
	];

	const firstNinetyPlan = [
		{
			eyebrow: 'Budget',
			title: '$8k-$12k/mo minimum viable test',
			body: 'Use this range when the goal is to validate the funnel in one market without overclaiming signal.'
		},
		{
			eyebrow: 'Signal',
			title: '$12k-$20k/mo better read',
			body: 'This is the cleaner range for learning by specialty, geography, and buyer segment instead of guessing.'
		},
		{
			eyebrow: 'Split',
			title: '60-70% nurse side, 30-40% facility side',
			body: 'Candidate acquisition is faster to learn from, so it should get the bigger share of paid spend first.'
		}
	];

	const channelMix = [
		'Nurse supply: job channels, Google Search, Meta retargeting, and a small LinkedIn test for specialized roles.',
		'Facility demand: LinkedIn lead gen, search around staffing intent, and follow-up around proof and workflow speed.',
		'Operating rhythm: month one message testing, month two reallocation, month three scale the best specialty and geography combinations.'
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
	</Slide>

	<Slide type="content">
		<span class="number">04</span>
		<h2>Translating the Code</h2>
		<p>
			The repo uses generic marketplace terms.
			<span class="muted">Here is the same system in nurse staffing language.</span>
		</p>
		<TermMap items={termMap} />
	</Slide>

	<Slide type="content">
		<span class="number">05</span>
		<h2>No 20-Question Form First</h2>
		<p>
			The concierge flow starts with a normal message.
			<span class="em">The profile gets built in the background.</span>
		</p>
		<ul>
			<li>Carmen says she is an ICU nurse in Austin looking for a 13-week travel contract.</li>
			<li>The system pulls in specialty, shift preference, start window, and contract type.</li>
			<li>Then it asks only for what is still missing: radius, resume, and consent.</li>
		</ul>
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
		<h2>Matching Uses Simple Math, Not Magic</h2>
		<div class="formula">
			<span class="formula-label">Current score</span>
			<strong>Fit = Skills 40% + Budget 30% + Availability 30%</strong>
		</div>
		<ul>
			<li>In nurse staffing terms, that maps to specialty and credential fit.</li>
			<li>Then pay fit.</li>
			<li>Then shift or start-date availability fit.</li>
		</ul>
		<p class="muted">The code keeps this simple on purpose so every score can be explained and audited.</p>
	</Slide>

	<Slide type="content">
		<span class="number">08</span>
		<h2>When the System Must Stop</h2>
		<p>
			A good staffing system does not try to be brave.
			<span class="em">It knows when to escalate.</span>
		</p>
		<ul>
			<li>In the seeded demo, a nurse reports one license date and the portal returns another.</li>
			<li>The system does not write over the conflict.</li>
			<li>It packages the thread, records the reason, and hands it to a human reviewer.</li>
		</ul>
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
			<h2>Specialized for healthcare</h2>
			<ul class="compact-list">
				<li>facility-side coverage data</li>
				<li>nurse credential rules and verifications</li>
				<li>shift templates and pay-package logic</li>
				<li>downstream staffing-system writebacks</li>
				<li>healthcare-specific audit outputs</li>
			</ul>
		</div>
	</Slide>

	<Slide type="content">
		<span class="number">12</span>
		<h2>What Paid Acquisition Likely Costs</h2>
		<p>
			We now have enough market research to put directional budget ranges around the rollout.
		</p>
		<SystemPillars items={budgetBenchmarks} />
		<p class="muted">
			Research note: nurse-side benchmarks are stronger than facility-side benchmarks. Facility demand is
			best treated as a B2B healthcare estimate.
		</p>
		<p class="source-note">
			Directional ranges pulled from Recruiters Websites, Staffing Industry Analysts, PPC Chief,
			Benly, College Recruiter/Appcast, and WordStream/LocaliQ.
		</p>
	</Slide>

	<Slide type="content">
		<span class="number">13</span>
		<h2>Recommended First 90 Days</h2>
		<p>
			If the goal is to prove the funnel instead of just talking about it, the first budget band is already visible.
		</p>
		<SystemPillars items={firstNinetyPlan} />
		<ul>
			{#each channelMix as item}
				<li>{item}</li>
			{/each}
		</ul>
	</Slide>

	<Slide type="title">
		<span class="number">14</span>
		<h1>The Claim</h1>
		<p class="subtitle">Less form fatigue for nurses.</p>
		<p class="subtitle">Less manual re-entry for recruiters.</p>
		<p class="subtitle">Faster matching with visible safety rails.</p>
		<p class="tagline">A real adaptation path, with research-backed budget ranges.</p>
	</Slide>
</Presentation>

<style>
	.formula {
		width: 100%;
		padding: var(--space-lg);
		border-radius: var(--radius-md);
		border: 1px solid var(--color-border-subtle);
		background: var(--color-bg-surface);
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.formula-label {
		font-size: var(--text-caption);
		letter-spacing: var(--tracking-widest);
		text-transform: uppercase;
		color: var(--color-fg-muted);
	}

	.formula strong {
		font-size: var(--text-h3);
		color: var(--color-fg-primary);
	}

	.source-note {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		line-height: var(--leading-relaxed);
	}

	:global(.slide-split ul.compact-list) {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	:global(.slide-split ul.compact-list li) {
		position: relative;
		padding-left: var(--space-lg);
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
	}

	:global(.slide-split ul.compact-list li::before) {
		content: '—';
		position: absolute;
		left: 0;
		color: var(--color-fg-muted);
	}
</style>
