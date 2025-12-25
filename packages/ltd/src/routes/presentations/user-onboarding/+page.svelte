<script lang="ts">
	/**
	 * User Onboarding Presentation
	 *
	 * A walkthrough for enabling WORKWAY workflows.
	 * Designed to pair with a screen recording demo.
	 *
	 * Voice: CREATE SOMETHING
	 * - Clarity over cleverness
	 * - Specificity over generality
	 * - Honesty over polish
	 */

	import Presentation from '$lib/components/Presentation.svelte';
	import Slide from '$lib/components/Slide.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>{data.meta.title}</title>
	<meta name="description" content={data.meta.description} />
</svelte:head>

<Presentation title="User Onboarding" subtitle="Enable a Workflow">
	<!-- ═══════════════════════════════════════════════════════════════════
	     PART 1: The Reality
	     ═══════════════════════════════════════════════════════════════════ -->

	<!-- Slide 1: Title -->
	<Slide type="title">
		<span class="number">01</span>
		<h1>WORKWAY</h1>
		<p class="subtitle">Your tools don't talk to each other.</p>
		<p class="subtitle">This fixes that.</p>
	</Slide>

	<!-- Slide 2: The Problem -->
	<Slide type="content">
		<span class="number">02</span>
		<h2>The Manual Work</h2>
		<p>
			Zoom meeting ends.
		</p>
		<ul>
			<li>Open Notion. Create page. Paste notes.</li>
			<li>Open Slack. Summarize meeting. Send to channel.</li>
			<li>Open email. Draft follow-up. Send.</li>
		</ul>
		<p>
			15 minutes. Every meeting. Every day.
		</p>
	</Slide>

	<!-- Slide 3: What Exists -->
	<Slide type="content">
		<span class="number">03</span>
		<h2>Existing Options</h2>
		<p>
			Zapier can do multi-step.
			<span class="muted">But you build it yourself.</span>
		</p>
		<p>
			Native integrations are limited:
		</p>
		<ul>
			<li>Gmail → Notion: Search only. No database entries.</li>
			<li>Slack → Notion: One-way. Notion to Slack only.</li>
			<li>Zoom → Notion: No integration exists.</li>
		</ul>
		<p class="muted">
			WORKWAY: Someone already built it. You enable.
		</p>
	</Slide>

	<!-- Slide 4: What WORKWAY Does -->
	<Slide type="content">
		<span class="number">04</span>
		<h2>Compound Workflows</h2>
		<p>
			One trigger — multiple outcomes.
		</p>
		<ul>
			<li>Meeting ends → Notion page created</li>
			<li>Same trigger → Slack summary posted</li>
			<li>Same trigger → Email draft ready</li>
			<li>Same trigger → CRM updated</li>
		</ul>
		<p>
			15 minutes of manual work → 0.
			<span class="muted">The tool recedes.</span>
		</p>
	</Slide>

	<!-- ═══════════════════════════════════════════════════════════════════
	     PART 2: The Marketplace
	     ═══════════════════════════════════════════════════════════════════ -->

	<!-- Slide 5: Browse -->
	<Slide type="content">
		<span class="number">05</span>
		<h2>The Marketplace</h2>
		<p>
			Developers build workflows. You enable them.
		</p>
		<ul>
			<li>Filter by outcome: "after meetings" or "after payments"</li>
			<li>See exactly what it does before enabling</li>
			<li>Pricing visible upfront. No surprises.</li>
		</ul>
		<p>
			<a href="https://workway.co/marketplace" class="link">workway.co/marketplace</a>
		</p>
	</Slide>

	<!-- Slide 6: A Real Example -->
	<Slide type="ascii">
		<span class="number">06</span>
		<pre>{`
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   EXAMPLE: Zoom → Notion + Slack                                        │
│                                                                         │
│   ┌───────────────────────────────────────────────────────────────┐     │
│   │                                                               │     │
│   │   Trigger:     Meeting ends                                   │     │
│   │                                                               │     │
│   │   Outcomes:    Notion page with transcript + action items     │     │
│   │                Slack summary to channel                       │     │
│   │                                                               │     │
│   │   Trial:       20 executions free                             │     │
│   │   After:       $0.25/meeting                                  │     │
│   │                                                               │     │
│   │   Setup:       5 minutes                                      │     │
│   │                                                               │     │
│   └───────────────────────────────────────────────────────────────┘     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
`}</pre>
	</Slide>

	<!-- ═══════════════════════════════════════════════════════════════════
	     PART 3: Enabling a Workflow
	     ═══════════════════════════════════════════════════════════════════ -->

	<!-- Slide 7: Click Enable -->
	<Slide type="content">
		<span class="number">07</span>
		<h2>Step 1: Enable</h2>
		<p>
			Find workflow. Click Enable.
		</p>
		<p>
			Before you commit, you see:
		</p>
		<ul>
			<li>Required connections (Zoom, Notion, Slack)</li>
			<li>Permissions requested</li>
			<li>Cost per execution</li>
		</ul>
	</Slide>

	<!-- Slide 8: Connect Your Tools -->
	<Slide type="content">
		<span class="number">08</span>
		<h2>Step 2: Connect</h2>
		<p>
			Standard OAuth. Click → Authorize → Done.
		</p>
		<ul>
			<li>Minimal permissions. Only what's needed.</li>
			<li>Credentials encrypted. Never shared with developers.</li>
			<li>Tokens refresh automatically.</li>
		</ul>
		<p class="muted">
			Revoke anytime from Settings.
		</p>
	</Slide>

	<!-- Slide 9: Configure -->
	<Slide type="ascii">
		<span class="number">09</span>
		<pre>{`
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   STEP 3: CONFIGURE                                                     │
│                                                                         │
│   Select your Notion database:                                          │
│                                                                         │
│   ┌───────────────────────────────────────────────────────────────┐     │
│   │  Meeting Notes        Excellent match                         │     │
│   │  Project Tracker      Good match                              │     │
│   │  Reading List         Missing required fields                 │     │
│   └───────────────────────────────────────────────────────────────┘     │
│                                                                         │
│   Schema analysis is automatic.                                         │
│   Missing fields are flagged with specific recommendations.             │
│                                                                         │
│   For Slack: Select channel.                                            │
│   For Email: Confirm sender.                                            │
│                                                                         │
│   Time: 2-3 minutes.                                                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
`}</pre>
	</Slide>

	<!-- Slide 10: Pricing -->
	<Slide type="content">
		<span class="number">10</span>
		<h2>Pricing Model</h2>
		<p>
			Transparent. Usage-based.
		</p>
		<ul>
			<li>Trial: 20 free executions per workflow</li>
			<li>Light workflows: $0.05/execution</li>
			<li>Heavy workflows: $0.25/execution</li>
		</ul>
		<p>
			Dashboard shows running costs.
			<span class="muted">No billing surprises.</span>
		</p>
	</Slide>

	<!-- ═══════════════════════════════════════════════════════════════════
	     PART 4: Active
	     ═══════════════════════════════════════════════════════════════════ -->

	<!-- Slide 11: Active -->
	<Slide type="content">
		<span class="number">11</span>
		<h2>It Works</h2>
		<p>
			Workflow is active. No further action.
		</p>
		<ul>
			<li>Meeting ends → Notion page appears</li>
			<li>Email arrives → Task created</li>
			<li>Payment received → Records sync</li>
		</ul>
		<p>
			You stop thinking about it.
			<span class="muted">That's the point.</span>
		</p>
	</Slide>

	<!-- Slide 12: Dashboard -->
	<Slide type="ascii">
		<span class="number">12</span>
		<pre>{`
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   YOUR WORKFLOWS                                                        │
│                                                                         │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │  Zoom → Notion + Slack           Active    23 runs     $5.75    │   │
│   │  Gmail → Todoist                 Active    47 runs     Free     │   │
│   │  Stripe → Notion                 Paused     8 runs     $0.40    │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│   Per workflow:                                                         │
│   • Execution history with timestamps                                   │
│   • Success/failure breakdown                                           │
│   • Cost accumulation                                                   │
│   • Pause/resume controls                                               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
`}</pre>
	</Slide>

	<!-- Slide 13: The Complete Flow -->
	<Slide type="ascii">
		<span class="number">13</span>
		<pre>{`
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   THE FLOW                                                              │
│                                                                         │
│   ┌──────────────────┐                                                  │
│   │  Browse          │  Find workflow by outcome                        │
│   └────────┬─────────┘                                                  │
│            ↓                                                            │
│   ┌──────────────────┐                                                  │
│   │  Enable          │  Review requirements + pricing                   │
│   └────────┬─────────┘                                                  │
│            ↓                                                            │
│   ┌──────────────────┐                                                  │
│   │  Connect         │  OAuth your tools                                │
│   └────────┬─────────┘                                                  │
│            ↓                                                            │
│   ┌──────────────────┐                                                  │
│   │  Configure       │  Select databases, channels                      │
│   └────────┬─────────┘                                                  │
│            ↓                                                            │
│   ┌──────────────────┐                                                  │
│   │  Active          │  Runs automatically                              │
│   └──────────────────┘                                                  │
│                                                                         │
│   Total: 5-10 minutes.                                                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
`}</pre>
	</Slide>

	<!-- Slide 14: What You Don't Do -->
	<Slide type="content">
		<span class="number">14</span>
		<h2>What You Don't Do</h2>
		<ul>
			<li>No coding.</li>
			<li>No drag-and-drop logic builders.</li>
			<li>No if/then configuration.</li>
			<li>No field mapping.</li>
			<li>No debugging when it breaks.</li>
		</ul>
		<p>
			Developers handle complexity.
			<span class="muted">You enable and use.</span>
		</p>
	</Slide>

	<!-- Slide 15: Final -->
	<Slide type="title">
		<span class="number">15</span>
		<h1>Begin</h1>
		<p class="subtitle">workway.co/marketplace</p>
		<p class="subtitle">Enable a workflow. Connect your tools.</p>
		<p class="tagline">
			<a href="https://workway.co/marketplace" class="link">Less, but better.</a>
		</p>
	</Slide>
</Presentation>

<!-- Styles consolidated in Presentation.svelte (DRY) -->
