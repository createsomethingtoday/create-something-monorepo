<script lang="ts">
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
		{ name: 'Hub', url: 'https://createsomething.ltd/presentations/hub' }
	]}
/>

<Presentation title="HUB" subtitle="Control which tools Codex can see and what they are allowed to do." scriptUrl="/presentations/hub/script">
	<Slide type="title">
		<span class="number">01</span>
		<h1>HUB</h1>
		<p class="subtitle">Control which tools Codex can see and what they are allowed to do.</p>
		<p class="subtitle">Keep connector details behind one controlled layer.</p>
	</Slide>

	<Slide type="content">
		<span class="number">02</span>
		<h2>The Problem</h2>
		<p>
			Codex MCP settings are a <span class="em">flat list</span>.
			<span class="muted">That works until the surface gets broad, variable, or destructive.</span>
		</p>
		<ul>
			<li>Too many raw tools weakens model selection</li>
			<li>Provider-branded catalogs leak implementation details</li>
			<li>Shared controls become fragmented across servers</li>
		</ul>
		<p class="muted">The user should not have to reason about connector topology.</p>
	</Slide>

	<Slide type="ascii">
		<span class="number">03</span>
		<pre>{`
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   THE BASIC RELATIONSHIP                                                │
│                                                                         │
│   MCP User                                                              │
│      ↓ chooses task + acceptable posture                                │
│                                                                         │
│   Codex                                                                 │
│      ↓ lists tools, reasons, invokes                                    │
│                                                                         │
│   CREATE SOMETHING Hub                                                  │
│      ↓ filters visibility, authorizes execution, traces outcomes        │
│                                                                         │
│   Downstream MCP surfaces                                               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
`}</pre>
		<p class="caption">Three actors. One governed surface.</p>
	</Slide>

	<Slide type="content">
		<span class="number">04</span>
		<h2>Why the Hub Exists</h2>
		<p>
			The Hub turns a raw MCP inventory into a <span class="em">house surface</span>.
		</p>
		<ul>
			<li>CREATE SOMETHING owns naming, routing, and policy</li>
			<li>Commodity provider plumbing stays behind the surface</li>
			<li>The visible tool catalog stays bounded and intentional</li>
		</ul>
		<p class="muted">This is product structure, not just technical packaging.</p>
	</Slide>

	<Slide type="split">
		<span class="number">05</span>
		<div class="left">
			<h2>Discovery</h2>
			<p>Large or variable surfaces move behind brokered discovery.</p>
			<ul>
				<li>search</li>
				<li>describe</li>
				<li>execute</li>
			</ul>
		</div>
		<div class="right">
			<h2>Reason</h2>
			<p>
				The model performs better when it sees a smaller, more legible surface.
			</p>
			<p class="muted">Governed exposure reduces tool sprawl and routing noise.</p>
		</div>
	</Slide>

	<Slide type="content">
		<span class="number">06</span>
		<h2>Execution Governance</h2>
		<p>
			The Hub should decide <span class="em">whether</span>, <span class="em">how</span>, and
			<span class="em">under what limits</span> a call executes.
		</p>
		<ul>
			<li>Resolve actor context</li>
			<li>Classify route: read, write, destructive, control plane</li>
			<li>Evaluate authorization and access mode</li>
			<li>Enforce quotas, retries, and telemetry</li>
		</ul>
	</Slide>

	<Slide type="ascii">
		<span class="number">07</span>
		<pre>{`
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   PROTECTED EXECUTION PIPELINE                                          │
│                                                                         │
│   actor context                                                         │
│      → route classification                                             │
│      → authorization                                                    │
│      → quota / rate limit                                               │
│      → retry / backoff                                                  │
│      → downstream execution                                             │
│      → telemetry + trace                                                │
│                                                                         │
│   Fail closed when context or policy input is missing.                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
`}</pre>
		<p class="caption">Routing without governance is not enough.</p>
	</Slide>

	<Slide type="content">
		<span class="number">08</span>
		<h2>Tenant Policy Shapes Visibility</h2>
		<p>
			The visible tool surface is a <span class="em">policy result</span>.
		</p>
		<ul>
			<li>Allow or deny by server</li>
			<li>Allow or deny by tool prefix</li>
			<li>Gate aliases by tenant and OAuth approval state</li>
			<li>Prefer one provider, then fall back deterministically</li>
		</ul>
		<p class="muted">What Codex can see is not the raw registry.</p>
	</Slide>

	<Slide type="content">
		<span class="number">09</span>
		<h2>What the User Sees</h2>
		<p>
			The user should see <span class="em">one CREATE SOMETHING surface</span>.
		</p>
		<ul>
			<li>Access state and entitlement in plain language</li>
			<li>Explicit reason codes for blocked states</li>
			<li>Standard connect or reconnect paths</li>
			<li>No dependency on upstream vendor branding</li>
		</ul>
	</Slide>

	<Slide type="split">
		<span class="number">10</span>
		<div class="left">
			<h2>Codex gains</h2>
			<ul>
				<li>Cleaner tool inventory</li>
				<li>Better routing quality</li>
				<li>Lower destructive ambiguity</li>
				<li>Fewer provider-specific branches</li>
			</ul>
		</div>
		<div class="right">
			<h2>Operators gain</h2>
			<ul>
				<li>Registry and bundle control</li>
				<li>Tenant routing</li>
				<li>Discovery packs</li>
				<li>Trace lookup and policy status</li>
			</ul>
		</div>
	</Slide>

	<Slide type="content">
		<span class="number">11</span>
		<h2>Hub in the Three-Tier Model</h2>
		<p>
			The Hub lives in <span class="em">Automation</span>.
			<span class="muted">But it is shaped by Judgment at the boundaries.</span>
		</p>
		<ul>
			<li>Database: registry, state, routing, downstream systems</li>
			<li>Automation: Hub runtime, proxy tools, execution pipeline</li>
			<li>Judgment: exposure policy, route authz, user experience rules</li>
		</ul>
	</Slide>

	<Slide type="title">
		<span class="number">12</span>
		<h1>The Claim</h1>
		<p class="subtitle">Policy governs exposure.</p>
		<p class="subtitle">Hub governs execution.</p>
		<p class="subtitle">Codex gets a surface it can reason over.</p>
	</Slide>
</Presentation>
