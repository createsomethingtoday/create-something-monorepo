<script lang="ts">
	/**
	 * DEPLOYMENT: DWELLING
	 *
	 * The final presentation in the Developer Onboarding Series.
	 * Shipping to production and ongoing dwelling.
	 *
	 * Structure follows the Hermeneutic Circle:
	 * 1. Part → Whole (What is dwelling?)
	 * 2. Whole → Part (The deployment flow)
	 * 3. The Circle Closes (Verification and close protocol)
	 * 4. Dwelling (Ongoing practice)
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
		{ name: 'Deployment Dwelling', url: 'https://createsomething.ltd/presentations/deployment-dwelling' }
	]}
/>

<Presentation title="DEPLOYMENT: DWELLING" subtitle="Ship. Verify. Dwell." scriptUrl="/presentations/deployment-dwelling/script">
	<!-- ═══════════════════════════════════════════════════════════════════
	     PART 1: Part → Whole (What is dwelling?)
	     ═══════════════════════════════════════════════════════════════════ -->

	<!-- Slide 1: Title -->
	<Slide type="title">
		<span class="number">01</span>
		<h1>DEPLOYMENT: DWELLING</h1>
		<p class="subtitle">The final step is not deployment.</p>
		<p class="subtitle">It is beginning to dwell.</p>
	</Slide>

	<!-- Slide 2: The Concept of Dwelling -->
	<Slide type="content">
		<span class="number">02</span>
		<h2>What is Dwelling?</h2>
		<p>
			Dwelling is <span class="em">being at home</span> in the system you've built.
		</p>
		<ul>
			<li>Not visiting — inhabiting</li>
			<li>Not using — belonging</li>
			<li>Not deploying — caring for</li>
		</ul>
		<p class="muted">
			Deployment is a moment. Dwelling is ongoing practice.
		</p>
	</Slide>

	<!-- Slide 3: Quote - Heidegger -->
	<Slide type="quote">
		<span class="number">03</span>
		<blockquote>
			"Building and thinking are, each in its own way, inescapable for dwelling."
		</blockquote>
		<cite>— Martin Heidegger, "Building Dwelling Thinking"</cite>
	</Slide>

	<!-- ═══════════════════════════════════════════════════════════════════
	     PART 2: Whole → Part (The deployment flow)
	     ═══════════════════════════════════════════════════════════════════ -->

	<!-- Slide 4: The Deployment Flow -->
	<Slide type="ascii">
		<span class="number">04</span>
		<pre>{`
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   THE DEPLOYMENT FLOW                                                   │
│   From code to dwelling                                                 │
│                                                                         │
│   ┌──────────────────┐                                                  │
│   │      BUILD       │  pnpm --filter=<pkg> build                       │
│   └────────┬─────────┘                                                  │
│            ↓                                                            │
│   ┌──────────────────┐                                                  │
│   │     DEPLOY       │  wrangler pages deploy                           │
│   └────────┬─────────┘                                                  │
│            ↓                                                            │
│   ┌──────────────────┐                                                  │
│   │    MIGRATE       │  wrangler d1 migrations apply                    │
│   └────────┬─────────┘                                                  │
│            ↓                                                            │
│   ┌──────────────────┐                                                  │
│   │     VERIFY       │  Tail logs, check production                     │
│   └────────┬─────────┘                                                  │
│            ↓                                                            │
│   ┌──────────────────┐                                                  │
│   │      DWELL       │  The tool disappears                             │
│   └──────────────────┘                                                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
`}</pre>
		<p class="caption">Five steps. Then ongoing care.</p>
	</Slide>

	<!-- Slide 5: Build Commands -->
	<Slide type="code">
		<span class="number">05</span>
		<h2>Step 1: Build</h2>
		<pre><code>{`# Build a specific package
pnpm --filter=space build

# Build with type checking first
pnpm --filter=space exec tsc --noEmit && pnpm --filter=space build

# Generate Cloudflare types before build
pnpm --filter=space exec wrangler types`}</code></pre>
		<p class="annotation">Types first. Then build. Order matters.</p>
	</Slide>

	<!-- Slide 6: Deploy Commands -->
	<Slide type="code">
		<span class="number">06</span>
		<h2>Step 2: Deploy</h2>
		<pre><code>{`# Deploy to Cloudflare Pages
# CRITICAL: Use exact project names

# .space, .io, .agency use 'create-something-*'
wrangler pages deploy .svelte-kit/cloudflare \\
  --project-name=create-something-space

# .ltd, .lms use 'createsomething-*' (no hyphen!)
wrangler pages deploy .svelte-kit/cloudflare \\
  --project-name=createsomething-ltd`}</code></pre>
		<p class="annotation">Project names are historical. Look them up. Don't guess.</p>
	</Slide>

	<!-- Slide 7: Project Names Reference -->
	<Slide type="ascii">
		<span class="number">07</span>
		<pre>{`
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   PROJECT NAMES                                                         │
│   Exact matches required                                                │
│                                                                         │
│   ┌────────────────┬───────────────────────────┬───────────────────┐    │
│   │ Package        │ Cloudflare Project        │ Pattern           │    │
│   ├────────────────┼───────────────────────────┼───────────────────┤    │
│   │ space          │ create-something-space    │ create-something- │    │
│   │ io             │ create-something-io       │ create-something- │    │
│   │ agency         │ create-something-agency   │ create-something- │    │
│   ├────────────────┼───────────────────────────┼───────────────────┤    │
│   │ ltd            │ createsomething-ltd       │ createsomething-  │    │
│   │ lms            │ createsomething-lms       │ createsomething-  │    │
│   └────────────────┴───────────────────────────┴───────────────────┘    │
│                                                                         │
│   Reference: .claude/rules/PROJECT_NAME_REFERENCE.md                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
`}</pre>
		<p class="caption">Wrong name = new project. Production breaks.</p>
	</Slide>

	<!-- Slide 8: Migrations -->
	<Slide type="code">
		<span class="number">08</span>
		<h2>Step 3: Migrate</h2>
		<pre><code>{`# Apply D1 migrations (if database changed)
wrangler d1 migrations apply DB_NAME

# Example for space package
wrangler d1 migrations apply space-db

# Always run after deploying schema changes
# Migrations are idempotent — safe to re-run`}</code></pre>
		<p class="annotation">Schema changes require explicit migration.</p>
	</Slide>

	<!-- ═══════════════════════════════════════════════════════════════════
	     PART 3: The Circle Closes (Verification and close protocol)
	     ═══════════════════════════════════════════════════════════════════ -->

	<!-- Slide 9: Verification -->
	<Slide type="code">
		<span class="number">09</span>
		<h2>Step 4: Verify</h2>
		<pre><code>{`# Tail production logs (interactive — use WezTerm)
wrangler pages deployment tail --project-name=create-something-space

# Check deployment status
wrangler pages deployment list --project-name=create-something-space

# Visit production URL
open https://createsomething.space`}</code></pre>
		<p class="annotation">Deploy is not done until verified. Trust, but verify.</p>
	</Slide>

	<!-- Slide 10: Session Close Protocol -->
	<Slide type="ascii">
		<span class="number">10</span>
		<pre>{`
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   SESSION CLOSE PROTOCOL                                                │
│   Before saying "done"                                                  │
│                                                                         │
│   ┌──────┬──────────────────────────────────────────────────────────┐   │
│   │  1   │  git status                 # Check what changed         │   │
│   ├──────┼──────────────────────────────────────────────────────────┤   │
│   │  2   │  git add <files>            # Stage code changes         │   │
│   ├──────┼──────────────────────────────────────────────────────────┤   │
│   │  3   │  bd sync --from-main        # Pull beads updates         │   │
│   ├──────┼──────────────────────────────────────────────────────────┤   │
│   │  4   │  git commit -m "..."        # Commit code changes        │   │
│   └──────┴──────────────────────────────────────────────────────────┘   │
│                                                                         │
│   Ephemeral branches: merge to main locally, don't push.                │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
`}</pre>
		<p class="caption">Every session ends deliberately. Never just close the terminal.</p>
	</Slide>

	<!-- Slide 11: The Beads Sync -->
	<Slide type="content">
		<span class="number">11</span>
		<h2>Syncing State</h2>
		<p>
			Work persists in two places: <span class="em">git</span> and <span class="em">Beads</span>.
		</p>
		<ul>
			<li>Code → Git (your changes)</li>
			<li>Issues → Beads (your progress)</li>
			<li>Both must sync before session ends</li>
		</ul>
		<p class="muted">
			<code>bd sync --from-main</code> pulls issue updates.
			<code>git commit</code> pushes code changes.
		</p>
	</Slide>

	<!-- ═══════════════════════════════════════════════════════════════════
	     PART 4: Dwelling (Ongoing practice)
	     ═══════════════════════════════════════════════════════════════════ -->

	<!-- Slide 12: Ongoing Practice -->
	<Slide type="content">
		<span class="number">12</span>
		<h2>Step 5: Dwell</h2>
		<p>
			After deployment, the <span class="em">ongoing practice</span> begins.
		</p>
		<ul>
			<li>Monitor logs when something feels wrong</li>
			<li>Document breakdowns as they occur</li>
			<li>Repair patterns, not just symptoms</li>
			<li>Update rules when understanding deepens</li>
		</ul>
		<p class="muted">
			The system isn't finished. You now inhabit it.
		</p>
	</Slide>

	<!-- Slide 13: The Hermeneutic Spiral -->
	<Slide type="ascii">
		<span class="number">13</span>
		<pre>{`
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   THE HERMENEUTIC SPIRAL                                                │
│   Understanding deepens with each pass                                  │
│                                                                         │
│                           Session 1                                     │
│                              ↓                                          │
│                        HEIDEGGER: CANON                                 │
│                       Philosophy installed                              │
│                              ↓                                          │
│                        CLAUDE CODE: PARTNER                             │
│                       Environment configured                            │
│                              ↓                                          │
│                        BEADS: CONTINUITY                                │
│                       Memory established                                │
│                              ↓                                          │
│                        CLOUDFLARE: EDGE                                 │
│                       Infrastructure understood                         │
│                              ↓                                          │
│                        CANON: DESIGN                                    │
│                       Aesthetics internalized                           │
│                              ↓                                          │
│                        DEPLOYMENT: DWELLING                             │
│                       Practice begins                                   │
│                              ↓                                          │
│                          Session N+1                                    │
│                       (Deeper understanding)                            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
`}</pre>
		<p class="caption">Each session deepens. The spiral continues.</p>
	</Slide>

	<!-- Slide 14: You Are Ready -->
	<Slide type="title">
		<span class="number">14</span>
		<h1>You Are Ready</h1>
		<p class="subtitle">The infrastructure disappears.</p>
		<p class="subtitle">Only the work remains.</p>
		<p class="tagline">
			<a href="/presentations" class="link">createsomething.ltd/presentations</a>
		</p>
	</Slide>
</Presentation>

<!-- Styles consolidated in Presentation.svelte (DRY) -->
