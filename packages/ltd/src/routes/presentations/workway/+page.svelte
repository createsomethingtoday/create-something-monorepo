<script lang="ts">
	/**
	 * WORKWAY Presentation
	 *
	 * A philosophy-driven presentation following Heideggerian principles.
	 * The presentation itself demonstrates "less, but better."
	 *
	 * Structure follows the Hermeneutic Circle:
	 * 1. Part → Whole (What is this?)
	 * 2. Whole → Part (Why does this matter?)
	 * 3. The Circle Closes (How does it fit?)
	 * 4. Dwelling (What do you do now?)
	 */

	import Presentation from '$lib/components/Presentation.svelte';
	import Slide from '$lib/components/Slide.svelte';
	import { SEO } from '@create-something/components';

	let { data } = $props();
</script>

<SEO
	title={data.meta.title}
	description={data.meta.description}
	propertyName="ltd"
	breadcrumbs={[
		{ name: 'Home', url: 'https://createsomething.ltd' },
		{ name: 'Presentations', url: 'https://createsomething.ltd/presentations' },
		{ name: 'Workway', url: 'https://createsomething.ltd/presentations/workway' }
	]}
/>

<Presentation title="WORKWAY" subtitle="The Automation Layer">
	<!-- ═══════════════════════════════════════════════════════════════════
	     PART 1: Part → Whole (What is this?)
	     ═══════════════════════════════════════════════════════════════════ -->

	<!-- Slide 1: Title -->
	<Slide type="title">
		<span class="number">01</span>
		<h1>WORKWAY</h1>
		<p class="subtitle">The Automation Layer.</p>
		<p class="subtitle">Infrastructure that recedes.</p>
		<p class="subtitle">Outcomes while you sleep.</p>
	</Slide>

	<!-- Slide 2: The Problem -->
	<Slide type="content">
		<span class="number">02</span>
		<h2>The Problem</h2>
		<p>
			Existing tools move data from A → B.
			<span class="muted">That's not a workflow.</span>
		</p>
		<p>
			A workflow is a <span class="em">compound outcome</span>:
		</p>
		<ul>
			<li>Meeting ends → Notion page created</li>
			<li>→ Slack summary posted</li>
			<li>→ Email draft generated</li>
			<li>→ CRM updated</li>
		</ul>
		<p class="muted">
			Four services. One outcome. No one does this well.
		</p>
	</Slide>

	<!-- ═══════════════════════════════════════════════════════════════════
	     PART 2: Whole → Part (Why does this matter?)
	     ═══════════════════════════════════════════════════════════════════ -->

	<!-- Slide 3: Zuhandenheit -->
	<Slide type="quote">
		<span class="number">03</span>
		<blockquote>
			"When the tool is truly ready-to-hand, it withdraws from our attention.
			We don't think about the hammer—we think about the nail."
		</blockquote>
		<cite>— Martin Heidegger, Being and Time</cite>
	</Slide>

	<!-- Slide 4: Zuhandenheit Applied -->
	<Slide type="ascii">
		<span class="number">04</span>
		<pre>{`
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   ZUHANDENHEIT                                                          │
│   (Ready-to-hand)                                                       │
│                                                                         │
│   The ideal state:                                                      │
│   ─────────────────────────────────────────────────────────────────     │
│                                                                         │
│   You think about → "meetings that follow up on themselves"             │
│                  → "CRMs that update themselves"                        │
│                  → "emails that write themselves"                       │
│                                                                         │
│   Not about → OAuth tokens                                              │
│            → API pagination                                             │
│            → Error handling                                             │
│            → Rate limits                                                │
│                                                                         │
│   The tool should disappear.                                            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
`}</pre>
		<p class="caption">Tools recede. Outcomes remain.</p>
	</Slide>

	<!-- Slide 5: Vorhandenheit -->
	<Slide type="ascii">
		<span class="number">05</span>
		<pre>{`
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   VORHANDENHEIT                                                         │
│   (Present-at-hand)                                                     │
│                                                                         │
│   When tools break into visibility:                                     │
│   ─────────────────────────────────────────────────────────────────     │
│                                                                         │
│   ✗ "Error: OAuth token expired"                                        │
│   ✗ "Rate limit exceeded. Retry after 3600s"                            │
│   ✗ "Field 'user_id' is required"                                       │
│   ✗ "Connection timeout after 30000ms"                                  │
│                                                                         │
│   This is where DX fails.                                               │
│   The tool becomes visible when it should be invisible.                 │
│                                                                         │
│   WORKWAY's job: push Vorhandenheit to the edge.                        │
│   Handle it once, so developers never see it.                           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
`}</pre>
		<p class="caption">The SDK absorbs complexity so workflows remain clear.</p>
	</Slide>

	<!-- Slide 6: Intent-Based SDK -->
	<Slide type="content">
		<span class="number">06</span>
		<h2>Intent-Based SDK</h2>
		<p>
			You write what you <span class="em">mean</span>, not what you <span class="em">need to do</span>.
		</p>
		<ul>
			<li><code>ai.synthesize()</code> — not <code>AIModels.LLAMA_3.generate()</code></li>
			<li><code>integrations.gmail.send()</code> — not <code>OAuth.refresh().then(fetch(...))</code></li>
			<li><code>trigger: webhook()</code> — not <code>addEventListener('POST', ...)</code></li>
		</ul>
		<p class="muted">
			Minimal surface area. Predictable patterns. The SDK recedes.
		</p>
	</Slide>

	<!-- Slide 7: Code Example -->
	<Slide type="code">
		<span class="number">07</span>
		<h2>A Workflow</h2>
		<pre><code>{`export default defineWorkflow({
  name: 'Meeting Follow-Up',
  integrations: ['zoom', 'notion', 'slack', 'gmail'],
  trigger: webhook({ service: 'zoom', event: 'meeting.ended' }),

  async execute({ trigger, integrations, ai }) {
    // Get the transcript
    const transcript = await integrations.zoom.getTranscript(trigger.meetingId);

    // Synthesize (not "call AI model")
    const summary = await ai.synthesize(transcript, {
      format: 'action-items'
    });

    // Distribute
    await Promise.all([
      integrations.notion.createPage({ title: trigger.topic, content: summary }),
      integrations.slack.send({ channel: '#meetings', text: summary }),
      integrations.gmail.draft({ to: trigger.participants, body: summary })
    ]);

    return { success: true };
  }
});`}</code></pre>
		<p class="annotation">Intent-based. Four services. One outcome. The tool disappears.</p>
	</Slide>

	<!-- ═══════════════════════════════════════════════════════════════════
	     PART 3: The Circle Closes (How does it fit?)
	     ═══════════════════════════════════════════════════════════════════ -->

	<!-- Slide 8: Marketplace Philosophy -->
	<Slide type="content">
		<span class="number">08</span>
		<h2>Taste as Moat</h2>
		<p>
			The marketplace is not an accumulation.<br />
			It is a <span class="em">curation</span>.
		</p>
		<p>
			"Weniger, aber besser" — fewer workflows, but better ones.
		</p>
		<p class="muted">
			Quality surfaces. Noise prunes itself.
		</p>
	</Slide>

	<!-- Slide 9: Quality Signals -->
	<Slide type="ascii">
		<span class="number">09</span>
		<pre>{`
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   QUALITY SIGNALS → DEVELOPER SUPPORT                                   │
│   The platform catches problems before users do                         │
│                                                                         │
│   ┌─────────────────┬───────────────────────────────────────────────┐   │
│   │ Reliability     │ Success rate, error recovery, uptime          │   │
│   ├─────────────────┼───────────────────────────────────────────────┤   │
│   │ Engagement      │ Active installs, 30-day retention, re-purchase│   │
│   ├─────────────────┼───────────────────────────────────────────────┤   │
│   │ Code Quality    │ Zuhandenheit score, error handling, docs      │   │
│   ├─────────────────┼───────────────────────────────────────────────┤   │
│   │ Community       │ Ratings, reviews, forks                       │   │
│   └─────────────────┴───────────────────────────────────────────────┘   │
│                                                                         │
│   <70% success (30d) → Alert + support ticket: "Needs attention"        │
│   <50% success (7d)  → Moved to "Needs Work" (still accessible)         │
│   Zero installs (3w) → "Dormant" status (one-click reactivation)        │
│                                                                         │
│   Developers get support. Users get quality.                            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
`}</pre>
	</Slide>

	<!-- Slide 10: Economics -->
	<Slide type="split">
		<span class="number">10</span>
		<div class="left">
			<h2>Developer</h2>
			<p>Keep <span class="em">100%</span> of subscription fees you charge.</p>
			<p>Set your own price. Own your customer relationship.</p>
		</div>
		<div class="right">
			<h2>Platform</h2>
			<p><span class="em">5¢</span> per light execution.</p>
			<p><span class="em">25¢</span> per heavy execution.</p>
			<p class="muted">First 20 runs free per workflow.</p>
		</div>
	</Slide>

	<!-- Slide 11: Architecture -->
	<Slide type="ascii">
		<span class="number">11</span>
		<pre>{`
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   ARCHITECTURE                                                          │
│   Honest about what's open and what's proprietary                       │
│                                                                         │
│   ┌───────────────────────────────────────────────────────────────┐     │
│   │               PLATFORM (Proprietary - SaaS)                   │     │
│   │     Workflow Engine • Marketplace • Billing • Analytics       │     │
│   └───────────────────────────────────────────────────────────────┘     │
│                               ↑                                         │
│                           API calls                                     │
│                               ↑                                         │
│   ┌───────────────────────────────────────────────────────────────┐     │
│   │                SDK (Open Source - Apache 2.0)                 │     │
│   │       @workwayco/sdk • @workwayco/integrations                │     │
│   └───────────────────────────────────────────────────────────────┘     │
│                               ↑                                         │
│                            imports                                      │
│                               ↑                                         │
│   ┌───────────────────────────────────────────────────────────────┐     │
│   │                CLI (Open Source - Apache 2.0)                 │     │
│   │              workway init • test • build • publish            │     │
│   └───────────────────────────────────────────────────────────────┘     │
│                                                                         │
│   Developers can build locally without infrastructure.                  │
│   Platform handles execution and payments.                              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
`}</pre>
	</Slide>

	<!-- Slide 12: The Hermeneutic Circle -->
	<Slide type="ascii">
		<span class="number">12</span>
		<pre>{`
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   THE HERMENEUTIC CIRCLE                                                │
│                                                                         │
│                         .ltd (Philosophy)                               │
│                              │                                          │
│                     provides criteria for                               │
│                              ↓                                          │
│                       WORKWAY (Research)                                │
│                              │                                          │
│                          validates                                      │
│                              ↓                                          │
│                      Workflows (Practice)                               │
│                              │                                          │
│                          applies to                                     │
│                              ↓                                          │
│                      Clients (Services)                                 │
│                              │                                          │
│                     tests and evolves                                   │
│                              ↓                                          │
│                         .ltd (Philosophy)                               │
│                                                                         │
│   Each workflow published tests the philosophical foundations.          │
│   Marketplace feedback evolves the canon.                               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
`}</pre>
		<p class="caption">The circle closes when practice informs philosophy.</p>
	</Slide>

	<!-- ═══════════════════════════════════════════════════════════════════
	     PART 4: Dwelling (What do you do now?)
	     ═══════════════════════════════════════════════════════════════════ -->

	<!-- Slide 13: Agentic Design -->
	<Slide type="content">
		<span class="number">13</span>
		<h2>Agentic by Design</h2>
		<p>
			WORKWAY is optimized for <span class="em">AI code generation</span>.
		</p>
		<ul>
			<li>Minimal surface area — fewer methods to hallucinate</li>
			<li>Predictable patterns — consistency prevents errors</li>
			<li>Self-documenting types — Claude reads JSDoc</li>
			<li>Rich error messages — guide self-correction</li>
		</ul>
		<p class="muted">
			The goal: Claude writes workflows so naturally the SDK becomes invisible.
		</p>
	</Slide>

	<!-- Slide 14: Claude Code Integration -->
	<Slide type="ascii">
		<span class="number">14</span>
		<pre>{`
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   CLAUDE CODE INTEGRATION                                               │
│   The development environment as a force multiplier                     │
│                                                                         │
│   ┌─────────────────┬───────────────────────────────────────────────┐   │
│   │ CLAUDE.md       │ Ethos, patterns, philosophy baked into context│   │
│   ├─────────────────┼───────────────────────────────────────────────┤   │
│   │ Skills          │ "workway-debug", "workflow-review" on demand  │   │
│   ├─────────────────┼───────────────────────────────────────────────┤   │
│   │ MCP Servers     │ Direct Cloudflare access (KV, D1, R2, Workers)│   │
│   ├─────────────────┼───────────────────────────────────────────────┤   │
│   │ Slash Commands  │ /deploy, /audit-canon, /test-workflow         │   │
│   ├─────────────────┼───────────────────────────────────────────────┤   │
│   │ Hooks           │ Pre-commit validation, type checking          │   │
│   └─────────────────┴───────────────────────────────────────────────┘   │
│                                                                         │
│   Claude doesn't just write code. It understands the philosophy.        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
`}</pre>
		<p class="caption">The Subtractive Triad applied to development itself.</p>
	</Slide>

	<!-- Slide 15: Small Team Superpowers -->
	<Slide type="ascii">
		<span class="number">15</span>
		<pre>{`
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   SMALL TEAM SUPERPOWERS                                                │
│   Built by 1 engineer. Maintainable by 2-3.                             │
│                                                                         │
│   Claude Code + Cloudflare + TypeScript =                               │
│                                                                         │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │  • Full marketplace with quality curation                       │   │
│   │  • Multi-tenant workflow execution (Durable Objects)            │   │
│   │  • Global edge deployment (<50ms cold starts)                   │   │
│   │  • Built-in billing & revenue share (Stripe Connect)            │   │
│   │  • OAuth for 12+ integrations                                   │   │
│   │  • AI inference at the edge (Workers AI)                        │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│   Traditional stack: 8-12 engineers, 18 months                          │
│   This stack: 1 engineer, 1 year → launch Dec 5. 1-3 can scale it.      │
│                                                                         │
│   The constraint enables the outcome.                                   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
`}</pre>
		<p class="caption">Weniger, aber besser — applied to team size.</p>
	</Slide>

	<!-- Slide 16: Get Started -->
	<Slide type="code">
		<span class="number">16</span>
		<h2>Get Started</h2>
		<pre><code>{`# Install the CLI
npm install -g @workwayco/cli

# Create your first workflow
workway init my-workflow

# Test locally (no cloud dependencies)
workway test

# Publish to marketplace
workway publish`}</code></pre>
		<p class="annotation">Local-first. Test without external deps. Deploy without ops.</p>
	</Slide>

	<!-- Slide 17: Final -->
	<Slide type="title">
		<span class="number">17</span>
		<h1>WORKWAY</h1>
		<p class="subtitle">Automation Infrastructure.</p>
		<p class="subtitle">The tool should disappear.</p>
		<p class="tagline">
			<a href="https://workway.co" class="link">workway.co</a>
		</p>
	</Slide>
</Presentation>

<!-- Styles consolidated in Presentation.svelte (DRY) -->
