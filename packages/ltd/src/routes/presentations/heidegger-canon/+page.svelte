<script lang="ts">
	/**
	 * HEIDEGGER: CANON
	 *
	 * The foundational presentation for CREATE SOMETHING methodology.
	 * Teaches the Subtractive Triad (DRY → Rams → Heidegger).
	 *
	 * Structure follows the Hermeneutic Circle:
	 * 1. Part → Whole (What is this?)
	 * 2. Whole → Part (Why does this matter?)
	 * 3. The Circle Closes (How does it fit?)
	 * 4. Dwelling (What do you do now?)
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
		{ name: 'Heidegger Canon', url: 'https://createsomething.ltd/presentations/heidegger-canon' }
	]}
/>

<Presentation title="HEIDEGGER: CANON" subtitle="Install the CREATE SOMETHING Methodology" scriptUrl="/presentations/heidegger-canon/script">
	<!-- ═══════════════════════════════════════════════════════════════════
	     PART 1: Part → Whole (What is this?)
	     ═══════════════════════════════════════════════════════════════════ -->

	<!-- Slide 1: Title -->
	<Slide type="title">
		<span class="number">01</span>
		<h1>HEIDEGGER: CANON</h1>
		<p class="subtitle">Install the methodology.</p>
		<p class="subtitle">Apply the Subtractive Triad.</p>
		<p class="subtitle">Build systems that disappear.</p>
	</Slide>

	<!-- Slide 2: The Meta-Principle -->
	<Slide type="content">
		<span class="number">02</span>
		<h2>The Meta-Principle</h2>
		<p>
			Creation is the discipline of <span class="em">removing what obscures</span>.
		</p>
		<ul>
			<li>Not addition — subtraction</li>
			<li>Not accumulation — revelation</li>
			<li>Not decoration — truth</li>
		</ul>
		<p class="muted">
			The Subtractive Triad is one principle at three scales.
		</p>
	</Slide>

	<!-- Slide 3: The Subtractive Triad -->
	<Slide type="ascii">
		<span class="number">03</span>
		<pre>{`
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   THE SUBTRACTIVE TRIAD                                                 │
│   One principle, three scales                                           │
│                                                                         │
│   ┌────────────────┬────────────────┬────────────────┬────────────────┐ │
│   │ Level          │ Discipline     │ Question       │ Action         │ │
│   ├────────────────┼────────────────┼────────────────┼────────────────┤ │
│   │ Implementation │ DRY            │ Built before?  │ Unify          │ │
│   ├────────────────┼────────────────┼────────────────┼────────────────┤ │
│   │ Artifact       │ Rams           │ Earns place?   │ Remove         │ │
│   ├────────────────┼────────────────┼────────────────┼────────────────┤ │
│   │ System         │ Heidegger      │ Serves whole?  │ Reconnect      │ │
│   └────────────────┴────────────────┴────────────────┴────────────────┘ │
│                                                                         │
│   For any decision, ask the three questions in order.                   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
`}</pre>
		<p class="caption">DRY unifies. Rams removes. Heidegger reconnects.</p>
	</Slide>

	<!-- Slide 4: Quote - Rams -->
	<Slide type="quote">
		<span class="number">04</span>
		<blockquote>
			"Weniger, aber besser."
			<br /><br />
			Less, but better.
		</blockquote>
		<cite>— Dieter Rams</cite>
	</Slide>

	<!-- Slide 5: Quote - Heidegger -->
	<Slide type="quote">
		<span class="number">05</span>
		<blockquote>
			"The less we just stare at the hammer-Thing, and the more we
			seize hold of it and use it, the more primordial does our
			relationship to it become."
		</blockquote>
		<cite>— Martin Heidegger, Being and Time</cite>
	</Slide>

	<!-- ═══════════════════════════════════════════════════════════════════
	     PART 2: Whole → Part (Why does this matter?)
	     ═══════════════════════════════════════════════════════════════════ -->

	<!-- Slide 6: DRY - Implementation Level -->
	<Slide type="content">
		<span class="number">06</span>
		<h2>Level 1: DRY</h2>
		<p>
			"Have I built this before?" → <span class="em">Unify</span>
		</p>
		<p>The discipline of unifying.</p>
		<ul>
			<li>Auth logic in three services → One identity service</li>
			<li>Validation in five forms → One validation library</li>
			<li>Same API pattern everywhere → One SDK</li>
		</ul>
		<p class="muted">
			Duplication creates drift. Unification creates truth.
		</p>
	</Slide>

	<!-- Slide 7: DRY Code Example -->
	<Slide type="code">
		<span class="number">07</span>
		<h2>Before: Duplication</h2>
		<pre><code>{`// Service A
function validateEmail(email: string): boolean {
  return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email);
}

// Service B
function isEmailValid(e: string): boolean {
  return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(e);
}

// Service C
const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;`}</code></pre>
		<p class="annotation">Three implementations. Three maintenance points. Three divergence risks.</p>
	</Slide>

	<!-- Slide 8: Rams - Artifact Level -->
	<Slide type="content">
		<span class="number">08</span>
		<h2>Level 2: Rams</h2>
		<p>
			"Does this earn its existence?" → <span class="em">Remove</span>
		</p>
		<p>The discipline of removing.</p>
		<ul>
			<li>Not "Is this nice to have?"</li>
			<li>Not "Will someone use this?"</li>
			<li>Not "Can we build this?"</li>
		</ul>
		<p class="muted">
			Only: Does it serve the essential purpose? If not, remove it.
		</p>
	</Slide>

	<!-- Slide 9: Rams Applied -->
	<Slide type="split">
		<span class="number">09</span>
		<div class="left">
			<h2>Before</h2>
			<p class="muted">(15 settings)</p>
			<ul>
				<li>Enable notifications</li>
				<li>Enable email</li>
				<li>Enable push</li>
				<li>Enable SMS</li>
				<li>Notification sound</li>
				<li>Frequency</li>
				<li>Quiet hours start</li>
				<li>Quiet hours end</li>
				<li>Show badge</li>
				<li>Vibrate</li>
				<li>Theme</li>
				<li>Font size</li>
				<li>Reduce animations</li>
				<li>Language</li>
				<li>Timezone</li>
			</ul>
		</div>
		<div class="right">
			<h2>After</h2>
			<p class="muted">(3 settings)</p>
			<ul>
				<li>Notify me: [Email + Push]</li>
				<li>Quiet hours: [10 PM – 7 AM]</li>
				<li>Theme: [Auto]</li>
			</ul>
			<p class="muted spaced">
				Smart defaults. Advanced → hidden.
			</p>
		</div>
	</Slide>

	<!-- Slide 10: Heidegger - System Level -->
	<Slide type="content">
		<span class="number">10</span>
		<h2>Level 3: Heidegger</h2>
		<p>
			"Does this serve the whole?" → <span class="em">Reconnect</span>
		</p>
		<p>The discipline of reconnecting.</p>
		<ul>
			<li>Parts that don't compose → Duplication</li>
			<li>Features that don't integrate → Fragmentation</li>
			<li>Properties that don't connect → Silos</li>
		</ul>
		<p class="muted">
			The system wants to be whole. Our job is removing what disconnects it.
		</p>
	</Slide>

	<!-- Slide 11: Zuhandenheit vs Vorhandenheit -->
	<Slide type="ascii">
		<span class="number">11</span>
		<pre>{`
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   ZUHANDENHEIT                           VORHANDENHEIT                  │
│   (Ready-to-hand)                        (Present-at-hand)              │
│                                                                         │
│   Tools disappear into use               Tools demand attention         │
│   ─────────────────────────              ─────────────────────────      │
│                                                                         │
│   You think about:                       You think about:               │
│   → The problem you're solving           → OAuth tokens                 │
│   → The feature you're building          → API pagination               │
│   → The user you're serving              → Error handling               │
│   → The system you're creating           → Rate limits                  │
│                                                                         │
│   Not about:                             The tool has broken.           │
│   → The infrastructure                   It's become an object.         │
│   → The configuration                    This is failure.               │
│   → The deployment                                                      │
│                                                                         │
│   The tool should disappear.                                            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
`}</pre>
		<p class="caption">When infrastructure demands attention, it has failed.</p>
	</Slide>

	<!-- ═══════════════════════════════════════════════════════════════════
	     PART 3: The Circle Closes (How does it fit?)
	     ═══════════════════════════════════════════════════════════════════ -->

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
│                        .io (Research)                                   │
│                              │                                          │
│                          validates                                      │
│                              ↓                                          │
│                      .space (Practice)                                  │
│                              │                                          │
│                          applies to                                     │
│                              ↓                                          │
│                     .agency (Services)                                  │
│                              │                                          │
│                     tests and evolves                                   │
│                              ↓                                          │
│                         .ltd (Philosophy)                               │
│                                                                         │
│   Each property informs the next. The circle deepens understanding.    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
`}</pre>
		<p class="caption">Parts serve whole. Whole gives meaning to parts.</p>
	</Slide>

	<!-- Slide 13: Gestell Warning -->
	<Slide type="content">
		<span class="number">13</span>
		<h2>The Gestell Warning</h2>
		<p class="muted">
			"Automation that fills every gap is not efficiency but invasion."
		</p>
		<ul>
			<li>Technology that enables dwelling → Zuhandenheit</li>
			<li>Technology that demands attention → Vorhandenheit</li>
			<li>Technology that consumes → Gestell</li>
		</ul>
		<p>
			<span class="em">Gelassenheit</span>: Neither rejection nor submission.
			<br />
			Full engagement without capture.
		</p>
		<p class="muted">
			The craftsman uses the hammer; the hammer does not use him.
		</p>
	</Slide>

	<!-- Slide 14: Breakdown and Repair -->
	<Slide type="content">
		<span class="number">14</span>
		<h2>Breakdown and Repair</h2>
		<p>When tools fail, they become visible.</p>
		<ul>
			<li><span class="em">Fixing</span>: Mechanical correction</li>
			<li class="muted">Restart the service. Clear the cache. Rollback.</li>
		</ul>
		<ul>
			<li><span class="em">Repairing</span>: Restructuring understanding</li>
			<li class="muted">Document why it failed. Update the patterns. Make implicit explicit.</li>
		</ul>
		<p class="muted">
			Fixing restores function. Repairing prevents recurrence.
		</p>
	</Slide>

	<!-- Slide 15: The Triad Applied -->
	<Slide type="code">
		<span class="number">15</span>
		<h2>Applying the Triad</h2>
		<pre><code>{`// 1. DRY: Have I built this before?
import { validateEmail } from '@create-something/validation';

// 2. Rams: Does this earn its existence?
interface CreateUserOptions {
  email: string;      // Essential
  password: string;   // Essential
  // Removed: 12 optional params that can be set later
}

// 3. Heidegger: Does this serve the whole?
// → Uses identity service, not duplicating auth
// → Connects to notification service, not building its own
// → Follows patterns in CLAUDE.md`}</code></pre>
		<p class="annotation">One function. Three questions answered. The tool disappears.</p>
	</Slide>

	<!-- ═══════════════════════════════════════════════════════════════════
	     PART 4: Dwelling (What do you do now?)
	     ═══════════════════════════════════════════════════════════════════ -->

	<!-- Slide 16: Installation -->
	<Slide type="ascii">
		<span class="number">16</span>
		<pre>{`
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   INSTALLING THE METHODOLOGY                                            │
│   What you do now                                                       │
│                                                                         │
│   ┌──────────────────┬──────────────────────────────────────────────┐   │
│   │ CLAUDE.md        │ Philosophy baked into your AI partner        │   │
│   ├──────────────────┼──────────────────────────────────────────────┤   │
│   │ .claude/rules/   │ Patterns that prevent recurrence             │   │
│   ├──────────────────┼──────────────────────────────────────────────┤   │
│   │ Canon tokens     │ CSS values derived from principles           │   │
│   ├──────────────────┼──────────────────────────────────────────────┤   │
│   │ Beads            │ Task tracking that persists across sessions  │   │
│   ├──────────────────┼──────────────────────────────────────────────┤   │
│   │ Skills           │ /audit-canon, /deploy, /harness-spec         │   │
│   └──────────────────┴──────────────────────────────────────────────┘   │
│                                                                         │
│   The infrastructure disappears. Only the work remains.                 │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
`}</pre>
		<p class="caption">Tools installed. Methodology internalized.</p>
	</Slide>

	<!-- Slide 17: The Daily Practice -->
	<Slide type="content">
		<span class="number">17</span>
		<h2>The Daily Practice</h2>
		<p><span class="em">Before adding</span>, ask:</p>
		<ol>
			<li>DRY — "Have I built this before?" → Unify</li>
			<li>Rams — "Does this earn its existence?" → Remove</li>
			<li>Heidegger — "Does this serve the whole?" → Reconnect</li>
		</ol>
		<p><span class="em">After breakdown</span>, ask:</p>
		<ul>
			<li>Did I just fix, or did I repair?</li>
			<li>Is this pattern documented?</li>
			<li>Will the next person avoid this?</li>
		</ul>
		<p class="muted">
			The discipline becomes automatic. The tools recede. Only the work remains.
		</p>
	</Slide>

	<!-- Slide 18: Final -->
	<Slide type="title">
		<span class="number">18</span>
		<h1>HEIDEGGER: CANON</h1>
		<p class="subtitle">The tool should disappear.</p>
		<p class="tagline">
			<a href="/patterns" class="link">createsomething.ltd/patterns</a>
		</p>
	</Slide>
</Presentation>

<!-- Styles consolidated in Presentation.svelte (DRY) -->
