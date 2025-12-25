<script lang="ts">
	/**
	 * CLOUDFLARE: EDGE
	 *
	 * Part 4 of the Developer Onboarding Series.
	 * Global infrastructure that disappears.
	 *
	 * Structure follows the Hermeneutic Circle:
	 * 1. Part → Whole (Why Edge Computing?)
	 * 2. Whole → Part (The Services: D1, KV, R2, Workers, Pages)
	 * 3. The Circle Closes (Platform Access Patterns)
	 * 4. Zuhandenheit (The infrastructure disappears)
	 */

	import Presentation from '$lib/components/Presentation.svelte';
	import Slide from '$lib/components/Slide.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>{data.meta.title}</title>
	<meta name="description" content={data.meta.description} />
</svelte:head>

<Presentation title="CLOUDFLARE: EDGE" subtitle="Global infrastructure that disappears.">
	<!-- ═══════════════════════════════════════════════════════════════════
	     PART 1: Part → Whole (Why Edge Computing?)
	     ═══════════════════════════════════════════════════════════════════ -->

	<!-- Slide 1: Title -->
	<Slide type="title">
		<span class="number">01</span>
		<h1>CLOUDFLARE: EDGE</h1>
		<p class="subtitle">Infrastructure that disappears.</p>
		<p class="subtitle">&lt;50ms cold starts. Global by default.</p>
	</Slide>

	<!-- Slide 2: Why Edge? -->
	<Slide type="content">
		<span class="number">02</span>
		<h2>Why Edge Computing?</h2>
		<p>
			Traditional servers run in <span class="em">one place</span>.
			Edge functions run <span class="em">everywhere</span>.
		</p>
		<ul>
			<li>&lt;50ms cold starts (no Lambda lag)</li>
			<li>300+ global locations</li>
			<li>No regional configuration</li>
			<li>Data colocated with compute</li>
		</ul>
		<p class="muted">
			The infrastructure recedes. Only the response remains.
		</p>
	</Slide>

	<!-- Slide 3: Quote - Heidegger -->
	<Slide type="quote">
		<span class="number">03</span>
		<blockquote>
			"The tool is genuinely itself only when it withdraws into equipmentality."
		</blockquote>
		<cite>— Martin Heidegger, Being and Time</cite>
	</Slide>

	<!-- Slide 4: Architecture Overview -->
	<Slide type="ascii">
		<span class="number">04</span>
		<pre>{`
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   CREATE SOMETHING INFRASTRUCTURE                                       │
│   Per-package isolation, global deployment                              │
│                                                                         │
│   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌───────────┐   │
│   │   .space    │   │    .io      │   │   .agency   │   │   .ltd    │   │
│   │  Practice   │   │  Research   │   │  Services   │   │Philosophy │   │
│   └──────┬──────┘   └──────┬──────┘   └──────┬──────┘   └─────┬─────┘   │
│          │                 │                 │                │         │
│          ▼                 ▼                 ▼                ▼         │
│   ┌──────────────────────────────────────────────────────────────────┐  │
│   │                    Cloudflare Edge Network                       │  │
│   │   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │  │
│   │   │  Pages   │  │ Workers  │  │    D1    │  │    KV    │        │  │
│   │   │  (SSR)   │  │(Compute) │  │ (SQLite) │  │ (Cache)  │        │  │
│   │   └──────────┘  └──────────┘  └──────────┘  └──────────┘        │  │
│   │   ┌──────────┐                                                   │  │
│   │   │    R2    │                                                   │  │
│   │   │ (Storage)│                                                   │  │
│   │   └──────────┘                                                   │  │
│   └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
`}</pre>
		<p class="caption">Each package has its own D1, KV, and R2 bindings.</p>
	</Slide>

	<!-- ═══════════════════════════════════════════════════════════════════
	     PART 2: Whole → Part (The Services)
	     ═══════════════════════════════════════════════════════════════════ -->

	<!-- Slide 5: D1 Database -->
	<Slide type="content">
		<span class="number">05</span>
		<h2>D1: Edge SQLite</h2>
		<p>
			Full SQL at the edge. Not a key-value store—a <span class="em">real database</span>.
		</p>
		<ul>
			<li>SQLite semantics, globally replicated</li>
			<li>ACID transactions</li>
			<li>Read replicas at every edge location</li>
			<li>Millisecond queries worldwide</li>
		</ul>
		<p class="muted">
			The database disappears. Only the data remains.
		</p>
	</Slide>

	<!-- Slide 6: D1 Code -->
	<Slide type="code">
		<span class="number">06</span>
		<h2>D1 Queries</h2>
		<pre><code>{`// Simple query with parameter binding
const result = await db.prepare(
  'SELECT * FROM users WHERE id = ?'
).bind(userId).first();

// Multiple results
const { results } = await db.prepare(
  'SELECT * FROM posts ORDER BY created_at DESC'
).all();

// Batch operations (atomic)
const batch = await db.batch([
  db.prepare('INSERT INTO logs VALUES (?)').bind('start'),
  db.prepare('UPDATE status SET running = 1'),
]);`}</code></pre>
		<p class="annotation">Prepared statements. Parameter binding. Familiar SQL.</p>
	</Slide>

	<!-- Slide 7: KV Store -->
	<Slide type="content">
		<span class="number">07</span>
		<h2>KV: Key-Value Cache</h2>
		<p>
			Globally distributed key-value storage. <span class="em">Eventually consistent</span>.
		</p>
		<ul>
			<li>Sub-millisecond reads at the edge</li>
			<li>Automatic replication worldwide</li>
			<li>TTL-based expiration</li>
			<li>Metadata per key</li>
		</ul>
		<p class="muted">
			Use for: sessions, cached API responses, feature flags.
		</p>
	</Slide>

	<!-- Slide 8: KV Code -->
	<Slide type="code">
		<span class="number">08</span>
		<h2>KV Operations</h2>
		<pre><code>{`// Get with metadata
const { value, metadata } = await kv.getWithMetadata(
  key, { type: 'json' }
);

// Put with expiration
await kv.put(key, JSON.stringify(data), {
  expirationTtl: 3600, // 1 hour
  metadata: { created: Date.now() }
});

// List with prefix (pagination)
const { keys } = await kv.list({ prefix: 'user:' });`}</code></pre>
		<p class="annotation">Simple API. Automatic replication. Global reads.</p>
	</Slide>

	<!-- Slide 9: R2 Storage -->
	<Slide type="content">
		<span class="number">09</span>
		<h2>R2: Object Storage</h2>
		<p>
			S3-compatible object storage. <span class="em">Zero egress fees</span>.
		</p>
		<ul>
			<li>Store files, images, assets</li>
			<li>S3 API compatible</li>
			<li>No bandwidth charges for reads</li>
			<li>Integrate with Workers for processing</li>
		</ul>
		<p class="muted">
			Use for: user uploads, static assets, backups.
		</p>
	</Slide>

	<!-- Slide 10: Workers -->
	<Slide type="content">
		<span class="number">10</span>
		<h2>Workers: Edge Compute</h2>
		<p>
			JavaScript/TypeScript functions at every edge location.
		</p>
		<ul>
			<li>&lt;50ms cold starts (not seconds)</li>
			<li>V8 isolates, not containers</li>
			<li>Standard Web APIs (fetch, crypto, etc.)</li>
			<li>Can access D1, KV, R2 directly</li>
		</ul>
		<p class="muted">
			Workers are the compute layer. Everything else is storage.
		</p>
	</Slide>

	<!-- Slide 11: Pages -->
	<Slide type="content">
		<span class="number">11</span>
		<h2>Pages: Full-Stack Deployment</h2>
		<p>
			SvelteKit on Pages = <span class="em">SSR at the edge</span>.
		</p>
		<ul>
			<li>Automatic builds from Git</li>
			<li>Preview deployments per branch</li>
			<li>SSR via integrated Workers</li>
			<li>Static assets cached globally</li>
		</ul>
		<p class="muted">
			Push to Git. Deployment happens. Infrastructure disappears.
		</p>
	</Slide>

	<!-- ═══════════════════════════════════════════════════════════════════
	     PART 3: The Circle Closes (Platform Access Patterns)
	     ═══════════════════════════════════════════════════════════════════ -->

	<!-- Slide 12: Project Names -->
	<Slide type="ascii">
		<span class="number">12</span>
		<pre>{`
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   PROJECT NAMES                                                         │
│   Historical inconsistency — look up, don't guess                       │
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

	<!-- Slide 13: Type Generation -->
	<Slide type="code">
		<span class="number">13</span>
		<h2>Type Generation</h2>
		<pre><code>{`# Generate types before development
pnpm --filter=space exec wrangler types

# Creates worker-configuration.d.ts:
interface Env {
  DB: D1Database;
  KV: KVNamespace;
  BUCKET: R2Bucket;
  // ... other bindings from wrangler.toml
}

# Run after changing bindings
# Types enable autocomplete and type safety`}</code></pre>
		<p class="annotation">Types are generated, not written. Bindings become typed.</p>
	</Slide>

	<!-- Slide 14: Platform Access -->
	<Slide type="code">
		<span class="number">14</span>
		<h2>Platform Access Pattern</h2>
		<pre><code>{`// +page.server.ts or +server.ts
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform }) => {
  // Access bindings via platform.env
  const db = platform?.env.DB;
  const kv = platform?.env.KV;
  const bucket = platform?.env.BUCKET;

  // Use them
  const user = await db.prepare(
    'SELECT * FROM users WHERE id = ?'
  ).bind(1).first();

  return { user };
};`}</code></pre>
		<p class="annotation">platform.env holds all bindings. Access anywhere server-side.</p>
	</Slide>

	<!-- Slide 15: API Routes -->
	<Slide type="code">
		<span class="number">15</span>
		<h2>API Routes</h2>
		<pre><code>{`// src/routes/api/users/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ platform }) => {
  const db = platform?.env.DB;
  const { results } = await db.prepare(
    'SELECT id, name FROM users'
  ).all();

  return json({ users: results });
};

export const POST: RequestHandler = async ({ request, platform }) => {
  const { name } = await request.json();
  // Insert user...
  return json({ success: true });
};`}</code></pre>
		<p class="annotation">Standard SvelteKit patterns. Edge execution.</p>
	</Slide>

	<!-- Slide 16: SDK Pattern -->
	<Slide type="code">
		<span class="number">16</span>
		<h2>SDK for Composed Operations</h2>
		<pre><code>{`// For complex operations, use the SDK
import { cf } from '@create-something/cloudflare-sdk';

// Composed KV operations
const namespaces = await cf.kv.listNamespaces();
const value = await cf.kv.get('namespace-id', 'key');

// D1 queries across databases
const users = await cf.d1.query('my-db', 'SELECT * FROM users');

// Pages deployment
const url = await cf.pages.deploy('project', './dist');`}</code></pre>
		<p class="annotation">SDK for multi-step operations. Direct bindings for simple queries.</p>
	</Slide>

	<!-- ═══════════════════════════════════════════════════════════════════
	     PART 4: Zuhandenheit (The infrastructure disappears)
	     ═══════════════════════════════════════════════════════════════════ -->

	<!-- Slide 17: Zuhandenheit Applied -->
	<Slide type="content">
		<span class="number">17</span>
		<h2>Zuhandenheit Applied</h2>
		<p>
			When edge infrastructure works, <span class="em">you don't think about it</span>.
		</p>
		<ul>
			<li>No region selection — it's everywhere</li>
			<li>No cold start delays — it's instant</li>
			<li>No scaling configuration — it's automatic</li>
			<li>No egress bills — it's free</li>
		</ul>
		<p class="muted">
			You think about the user experience. The infrastructure serves silently.
		</p>
	</Slide>

	<!-- Slide 18: Final -->
	<Slide type="title">
		<span class="number">18</span>
		<h1>The Edge Disappears</h1>
		<p class="subtitle">You don't think about latency.</p>
		<p class="subtitle">You think about users.</p>
		<p class="tagline">
			<a href="/presentations" class="link">createsomething.ltd/presentations</a>
		</p>
	</Slide>
</Presentation>

<!-- Styles consolidated in Presentation.svelte (DRY) -->
