<script lang="ts">
	/**
	 * Developer Onboarding Presentation
	 *
	 * A walkthrough for joining WORKWAY as a Developer.
	 * Designed to pair with a terminal split-screen demo.
	 *
	 * Structure:
	 * 1. What you're joining
	 * 2. The waitlist
	 * 3. Your profile
	 * 4. The CLI
	 * 5. Private Workflows & BYOO
	 * 6. Revenue & Fork Attribution
	 * 7. What's next
	 *
	 * Updated: December 2025
	 * - Added Private Workflows with BYOO support
	 * - Added visibility modes (public/unlisted/private)
	 * - Added Fork & Earn attribution model
	 * - Updated integration count (16 active)
	 * - Clarified revenue model
	 */

	import { Presentation } from '@create-something/canon/domains/ltd';
	import { Slide } from '@create-something/canon/domains/ltd';
	import { SEO } from '@create-something/canon';

	let { data } = $props();
</script>

<SEO
	title={data.meta.title}
	description={data.meta.description}
	propertyName="ltd"
	breadcrumbs={[
		{ name: 'Home', url: 'https://createsomething.ltd' },
		{ name: 'Presentations', url: 'https://createsomething.ltd/presentations' },
		{ name: 'Developer Onboarding', url: 'https://createsomething.ltd/presentations/developer-onboarding' }
	]}
/>

<Presentation title="Developer Onboarding" subtitle="Build & Earn on WORKWAY" scriptUrl="/presentations/developer-onboarding/script">
	<!-- ═══════════════════════════════════════════════════════════════════
	     PART 1: What You're Joining
	     ═══════════════════════════════════════════════════════════════════ -->

	<!-- Slide 1: Title -->
	<Slide type="title">
		<span class="number">01</span>
		<h1>Developer</h1>
		<p class="subtitle">The onboarding process.</p>
		<p class="subtitle">5 minutes. 3 commands.</p>
	</Slide>

	<!-- Slide 2: What You Build -->
	<Slide type="content">
		<span class="number">02</span>
		<h2>Compound Workflows</h2>
		<p>
			You build <span class="em">compound workflows</span> — systems where multiple services
			coordinate to produce outcomes users couldn't achieve alone.
		</p>
		<ul>
			<li>Meeting ends → 4 services update</li>
			<li>Payment received → CRM + Notion + Slack</li>
			<li>Form submitted → AI synthesis + distribution</li>
		</ul>
		<p class="muted">
			Not point-to-point integrations. Orchestrated outcomes.
		</p>
	</Slide>

	<!-- Slide 3: The Opportunity -->
	<Slide type="content">
		<span class="number">03</span>
		<h2>The Opportunity</h2>
		<p>
			WORKWAY fills gaps that major platforms ignore.
		</p>
		<ul>
			<li>Gmail → Notion: AI Connector is search-only</li>
			<li>Slack → Notion: One-way integration only</li>
			<li>Zoom → Notion: No official integration exists</li>
			<li>CRM syncing: Wide open territory</li>
		</ul>
		<p class="muted">
			You keep 100% of upfront fees. Platform handles usage billing.
			16 integrations. 36 workflow templates.
		</p>
	</Slide>

	<!-- ═══════════════════════════════════════════════════════════════════
	     PART 2: The Waitlist
	     ═══════════════════════════════════════════════════════════════════ -->

	<!-- Slide 4: Controlled Rollout -->
	<Slide type="content">
		<span class="number">04</span>
		<h2>Controlled Rollout</h2>
		<p>
			We invite developers in batches of 10.
			<span class="muted">Deliberate. Not artificial scarcity.</span>
		</p>
		<p>
			Each batch receives direct support. We learn from each cohort.
			The platform improves before the next batch.
		</p>
		<p>
			Quality over quantity. Weniger, aber besser.
		</p>
	</Slide>

	<!-- Slide 5: Join the Waitlist (Web) -->
	<Slide type="ascii">
		<span class="number">05</span>
		<pre>{`
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   OPTION A: Web Signup                                                  │
│                                                                         │
│   1. Visit workway.co/waitlist                                   │
│                                                                         │
│   2. Enter:                                                             │
│      • Name                                                             │
│      • Email                                                            │
│                                                                         │
│   3. Receive confirmation email                                         │
│                                                                         │
│   4. Wait for invitation (batches of 10)                                │
│                                                                         │
│   Simple. Minimal friction.                                             │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
`}</pre>
		<p class="caption">The web flow. Two fields. One minute.</p>
	</Slide>

	<!-- ═══════════════════════════════════════════════════════════════════
	     PART 3: The CLI Flow
	     ═══════════════════════════════════════════════════════════════════ -->

	<!-- Slide 6: CLI Advantage -->
	<Slide type="content">
		<span class="number">06</span>
		<h2>CLI Flow</h2>
		<p>
			The CLI captures more about you.
			<span class="muted">Your profile becomes your professional presence.</span>
		</p>
		<ul>
			<li>Technical background</li>
			<li>Integrations you work with</li>
			<li>Workflows you want to build</li>
			<li>GitHub, portfolio links</li>
		</ul>
		<p>
			This data helps us match you with client work.
			WORKWAY isn't just a marketplace — it's a system for finding projects.
		</p>
	</Slide>

	<!-- Slide 7: Install CLI -->
	<Slide type="code">
		<span class="number">07</span>
		<h2>Step 1: Install</h2>
		<pre><code>{`npm install -g @workwayco/cli`}</code></pre>
		<p class="annotation">Requires Node.js 18+. One global package.</p>
	</Slide>

	<!-- Slide 8: Init Profile -->
	<Slide type="code">
		<span class="number">08</span>
		<h2>Step 2: Create Profile</h2>
		<pre><code>{`workway developer init`}</code></pre>
		<p class="annotation">Interactive prompts. Saves to ~/.workway/developer-profile.json</p>
	</Slide>

	<!-- Slide 9: Profile Sections -->
	<Slide type="ascii">
		<span class="number">09</span>
		<pre>{`
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   PROFILE STRUCTURE                                                     │
│                                                                         │
│   ┌─────────────────┬───────────────────────────────────────────────┐   │
│   │ Identity        │ Name, email, company (optional)               │   │
│   ├─────────────────┼───────────────────────────────────────────────┤   │
│   │ Background      │ What you build, GitHub, portfolio             │   │
│   ├─────────────────┼───────────────────────────────────────────────┤   │
│   │ Workflow Focus  │ Integrations, workflow ideas                  │   │
│   ├─────────────────┼───────────────────────────────────────────────┤   │
│   │ Why WORKWAY     │ Your motivation (helps us understand you)     │   │
│   └─────────────────┴───────────────────────────────────────────────┘   │
│                                                                         │
│   All fields except email are editable later.                           │
│   The profile lives locally until you submit.                           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
`}</pre>
	</Slide>

	<!-- Slide 10: Submit to Waitlist -->
	<Slide type="code">
		<span class="number">10</span>
		<h2>Step 3: Join Waitlist</h2>
		<pre><code>{`workway developer submit`}</code></pre>
		<p class="annotation">No login required. Submits to public waitlist endpoint.</p>
	</Slide>

	<!-- Slide 11: Check Status -->
	<Slide type="code">
		<span class="number">11</span>
		<h2>Step 4: Check Status</h2>
		<pre><code>{`workway developer status`}</code></pre>
		<p class="annotation">Shows your position. Updates when you're invited.</p>
	</Slide>

	<!-- ═══════════════════════════════════════════════════════════════════
	     PART 4: After Invitation
	     ═══════════════════════════════════════════════════════════════════ -->

	<!-- Slide 12: The Invitation -->
	<Slide type="content">
		<span class="number">12</span>
		<h2>When You're Invited</h2>
		<p>
			You'll receive an email with a registration link.
		</p>
		<ul>
			<li>Create your account credentials</li>
			<li>Invitation code auto-fills from the link</li>
			<li>Account activates immediately</li>
		</ul>
		<p class="muted">
			Then: workway login
		</p>
	</Slide>

	<!-- Slide 13: Full Access -->
	<Slide type="ascii">
		<span class="number">13</span>
		<pre>{`
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   AFTER REGISTRATION                                                    │
│                                                                         │
│   You now have access to:                                               │
│                                                                         │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │  • workway workflow init      Create workflows                  │   │
│   │  • workway workflow dev       Local development server          │   │
│   │  • workway workflow test      Run with mock/live integrations   │   │
│   │  • workway workflow publish   Ship to marketplace               │   │
│   │  • workway oauth connect      Link production credentials       │   │
│   │  • workway developer stripe   Set up revenue collection         │   │
│   │  • workway developer oauth    Bring Your Own OAuth (BYOO)       │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│   Build locally. Test locally. Publish globally.                        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
`}</pre>
	</Slide>

	<!-- ═══════════════════════════════════════════════════════════════════
	     PART 5: While You Wait
	     ═══════════════════════════════════════════════════════════════════ -->

	<!-- Slide 14: While You Wait -->
	<Slide type="content">
		<span class="number">14</span>
		<h2>While You Wait</h2>
		<p>
			The SDK and CLI are open source. You can build now.
		</p>
		<ul>
			<li>npm install @workwayco/sdk</li>
			<li>workway workflow init</li>
			<li>Local testing with mocks</li>
		</ul>
		<p>
			<span class="em">Contributions accelerate invitations.</span>
			Good PRs demonstrate capability better than any application.
		</p>
	</Slide>

	<!-- ═══════════════════════════════════════════════════════════════════
	     PART 6: Private Workflows & BYOO
	     ═══════════════════════════════════════════════════════════════════ -->

	<!-- Slide 15: Private Workflows -->
	<Slide type="content">
		<span class="number">15</span>
		<h2>Private Workflows</h2>
		<p>
			Not everything belongs in the marketplace.
			<span class="muted">Some tools are for your team only.</span>
		</p>
		<ul>
			<li><code>public</code> — Visible in marketplace. Anyone can install.</li>
			<li><code>unlisted</code> — Hidden. Direct link works. Beta testing.</li>
			<li><code>private</code> — Hidden. Requires access grant.</li>
		</ul>
		<p>
			Internal team tools. Premium offerings sold direct. No competition.
		</p>
	</Slide>

	<!-- Slide 16: Access Grants -->
	<Slide type="ascii">
		<span class="number">16</span>
		<pre>{`
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   ACCESS GRANTS                                                         │
│                                                                         │
│   Three ways to share private workflows:                                │
│                                                                         │
│   ┌─────────────────┬───────────────────────────────────────────────┐   │
│   │ User            │ Grant to specific user IDs                    │   │
│   ├─────────────────┼───────────────────────────────────────────────┤   │
│   │ Email Domain    │ @acme.com → everyone at Acme has access       │   │
│   ├─────────────────┼───────────────────────────────────────────────┤   │
│   │ Access Code     │ PREMIUM2024 — redeemable, limits optional     │   │
│   └─────────────────┴───────────────────────────────────────────────┘   │
│                                                                         │
│   Access codes can expire. Install limits can cap usage.                │
│   Sell workflows directly. Keep 100% of the sale.                       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
`}</pre>
	</Slide>

	<!-- Slide 17: BYOO -->
	<Slide type="content">
		<span class="number">17</span>
		<h2>Bring Your Own OAuth</h2>
		<p>
			Use your company's OAuth apps instead of WORKWAY's.
			<span class="muted">Your credentials. Your rate limits. Your compliance.</span>
		</p>
		<ul>
			<li>Development velocity — test custom scopes without platform verification</li>
			<li>Enterprise compliance — corporate OAuth apps satisfy security requirements</li>
			<li>Rate limit isolation — your app has separate API quotas</li>
		</ul>
		<p class="muted">
			Credentials encrypted with AES-256-GCM. Key rotation supported.
			Revoke anytime — users fall back to system credentials automatically.
		</p>
	</Slide>

	<!-- Slide 18: BYOO CLI -->
	<Slide type="code">
		<span class="number">18</span>
		<h2>BYOO Commands</h2>
		<pre><code>{`workway developer oauth list       # Show configured apps
workway developer oauth add        # Add OAuth credentials
workway developer oauth test       # Verify credentials work
workway developer oauth promote    # Request production status`}</code></pre>
		<p class="annotation">23 providers supported. Status lifecycle: development → testing → production.</p>
	</Slide>

	<!-- ═══════════════════════════════════════════════════════════════════
	     PART 7: Revenue & Fork Attribution
	     ═══════════════════════════════════════════════════════════════════ -->

	<!-- Slide 19: Fork & Earn -->
	<Slide type="content">
		<span class="number">19</span>
		<h2>Fork & Earn</h2>
		<p>
			Build on existing workflows. Or earn when others build on yours.
		</p>
		<ul>
			<li>Fork existing workflows with <code>workway workflow fork</code></li>
			<li>Original creators earn attribution automatically</li>
			<li>No permission needed — attribution is built in</li>
		</ul>
		<p>
			<span class="em">Good workflows compound.</span>
			Build once. Earn as your ecosystem grows.
		</p>
	</Slide>

	<!-- Slide 20: Revenue Split -->
	<Slide type="ascii">
		<span class="number">20</span>
		<pre>{`
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   FORK REVENUE SPLIT                                                    │
│                                                                         │
│   When a forked workflow earns revenue:                                 │
│                                                                         │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                                                                 │   │
│   │   Fork Creator        ████████████████████████████████  68%     │   │
│   │                                                                 │   │
│   │   Original Creator    ██████  12%                               │   │
│   │                                                                 │   │
│   │   Platform            ██████████  20%                           │   │
│   │                                                                 │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│   Attribution is automatic and transparent.                             │
│   Track fork earnings in your developer dashboard.                      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
`}</pre>
	</Slide>

	<!-- Slide 21: The Full Flow -->
	<Slide type="ascii">
		<span class="number">21</span>
		<pre>{`
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   THE COMPLETE JOURNEY                                                  │
│                                                                         │
│   ┌──────────────────┐                                                  │
│   │   Install CLI    │  npm install -g @workwayco/cli                   │
│   └────────┬─────────┘                                                  │
│            ↓                                                            │
│   ┌──────────────────┐                                                  │
│   │  Create Profile  │  workway developer init                          │
│   └────────┬─────────┘                                                  │
│            ↓                                                            │
│   ┌──────────────────┐                                                  │
│   │  Join Waitlist   │  workway developer submit                        │
│   └────────┬─────────┘                                                  │
│            ↓                                                            │
│   ┌──────────────────┐                                                  │
│   │  Wait + Build    │  workway workflow init (local dev)               │
│   └────────┬─────────┘                                                  │
│            ↓                                                            │
│   ┌──────────────────┐                                                  │
│   │  Get Invited     │  Email with registration link                    │
│   └────────┬─────────┘                                                  │
│            ↓                                                            │
│   ┌──────────────────┐                                                  │
│   │  Login + Publish │  workway login → workway workflow publish        │
│   └──────────────────┘                                                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
`}</pre>
		<p class="caption">From zero to published. The tool disappears.</p>
	</Slide>

	<!-- Slide 22: Final -->
	<Slide type="title">
		<span class="number">22</span>
		<h1>Begin</h1>
		<p class="subtitle">npm install -g @workwayco/cli</p>
		<p class="subtitle">workway developer init</p>
		<p class="tagline">
			<a href="https://workway.co/developers" class="link">workway.co/developers</a>
		</p>
	</Slide>
</Presentation>

<!-- Styles consolidated in Presentation.svelte (DRY) -->
