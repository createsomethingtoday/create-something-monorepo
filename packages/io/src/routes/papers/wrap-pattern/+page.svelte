<script lang="ts">
	/**
	 * The Wrap Pattern Paper
	 *
	 * Research paper formalizing the Wrap Pattern for commodity MCP integrations:
	 * using third-party vendors as invisible plumbing while preserving the
	 * client-facing MCP surface, the Intelligence Layer margin, and Three-Tier alignment.
	 *
	 * The paper generalizes from production evaluation of commodity integration vendors,
	 * presenting a classification heuristic, the swappability invariant, and red lines
	 * for when wrapping erodes the creation moat.
	 */
	import { SEO } from '@create-something/canon';
</script>

<SEO
	title="The Wrap Pattern: Commodity Integration as Invisible Infrastructure"
	description="A structural pattern for integrating commodity MCP vendors as invisible infrastructure while preserving the client-facing surface, the Intelligence Layer margin, and Three-Tier alignment."
	keywords="MCP, Wrap Pattern, commodity integration, creation moat, Three-Tier Framework, invisible infrastructure, agent architecture"
	ogType="article"
	articleSection="Research"
	publishedTime="2026-02-19T00:00:00Z"
	propertyName="io"
	breadcrumbs={[
		{ name: 'Home', url: 'https://createsomething.io' },
		{ name: 'Papers', url: 'https://createsomething.io/papers' },
		{ name: 'The Wrap Pattern', url: 'https://createsomething.io/papers/wrap-pattern' }
	]}
/>

<div class="min-h-screen p-6 paper-container">
	<div class="max-w-4xl mx-auto space-y-12">
		<!-- Header -->
		<div class="pb-8 paper-header">
			<div class="font-mono mb-4 paper-id">PAPER-2026-008</div>
			<h1 class="mb-3 paper-title">The Wrap Pattern: Commodity Integration as Invisible Infrastructure</h1>
			<p class="max-w-3xl paper-subtitle">
				MCP consumption is commoditized. The strategic response is not to avoid commodity platforms
				but to wrap them &mdash; preserving the client-facing MCP surface, the Intelligence Layer margin,
				and the Three-Tier alignment, while delegating CRUD plumbing to swappable vendors.
			</p>
			<div class="flex gap-4 mt-4 paper-meta">
				<span>Research</span>
				<span>&bull;</span>
				<span>15 min read</span>
				<span>&bull;</span>
				<span>Intermediate</span>
			</div>
		</div>

		<!-- Abstract -->
		<section class="abstract-section space-y-4">
			<h2 class="section-heading">Abstract</h2>
			<p class="body-text leading-relaxed">
				As the Model Context Protocol ecosystem matures, a clear spectrum emerges between
				<strong>commodity integrations</strong> (standard CRUD operations against well-known APIs)
				and <strong>creation integrations</strong> (deep domain logic, custom orchestration, proprietary
				intelligence). This paper formalizes the <strong>Wrap Pattern</strong> &mdash; an architectural
				approach for delegating commodity integrations to third-party vendors while maintaining full
				control of the client-facing MCP surface. We present a classification heuristic for deciding
				when to build, wrap, or sync; demonstrate Three-Tier alignment of wrapped tools; define the
				<strong>swappability invariant</strong> that prevents vendor lock-in; and establish red lines
				for when wrapping erodes the creation moat. The contribution is both strategic (a decision
				framework for MCP server builders) and architectural (a reference implementation pattern for
				invisible vendor integration).
			</p>
		</section>

		<!-- The Commodity Spectrum -->
		<section class="space-y-6">
			<h2 class="section-heading">1. The Commodity&ndash;Creation Spectrum</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					Not all MCP integrations are created equal. The value of building an MCP server
					correlates inversely with how standardized the underlying operations are.
				</p>

				<p>
					At one end of the spectrum: <strong>commodity integrations</strong>. Connecting Slack
					to send a message. Listing HubSpot contacts. Creating a Jira ticket. These are CRUD
					operations against well-documented APIs with established OAuth flows. The operations
					are identical regardless of who builds the MCP server.
				</p>

				<p>
					At the other end: <strong>creation integrations</strong>. Syncing a QuickBooks general
					ledger to Notion with reconciliation logic. Building a scheduling system with conflict
					detection and template-based backfill. Implementing a construction project management
					layer with RFI drafting and compliance checks. These require domain expertise, custom
					orchestration, and the Intelligence Layer that produces outcomes.
				</p>

				<p>
					The strategic question is not <em>whether</em> to build MCP servers &mdash; it is
					<em>which ones</em> deserve your creation energy.
				</p>
			</div>

			<div class="overflow-x-auto">
				<table class="w-full metric-table">
					<thead>
						<tr>
							<th>Characteristic</th>
							<th>Commodity</th>
							<th>Creation</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td>Operations</td>
							<td>Standard CRUD</td>
							<td>Domain-specific logic</td>
						</tr>
						<tr>
							<td>API surface</td>
							<td>Well-documented, stable</td>
							<td>Custom, evolving</td>
						</tr>
						<tr>
							<td>OAuth</td>
							<td>Standard provider flows</td>
							<td>Custom auth with policy</td>
						</tr>
						<tr>
							<td>Differentiation</td>
							<td>Zero &mdash; identical across builders</td>
							<td>High &mdash; domain expertise required</td>
						</tr>
						<tr>
							<td>Intelligence Layer</td>
							<td>Optional (nice-to-have)</td>
							<td>Essential (the margin)</td>
						</tr>
						<tr>
							<td>Build time</td>
							<td>Days (repetitive)</td>
							<td>Weeks (creative)</td>
						</tr>
					</tbody>
				</table>
			</div>
		</section>

		<!-- The Wrap Pattern -->
		<section class="space-y-6">
			<h2 class="section-heading">2. The Wrap Pattern</h2>

			<div class="space-y-6 leading-relaxed body-text">
				<h3 class="subsection-heading">2.1 Definition</h3>

				<p>
					The Wrap Pattern is an architectural approach where a first-party MCP server delegates
					commodity operations to a third-party vendor&rsquo;s SDK internally, while presenting a
					unified, branded surface to the client. The vendor is <strong>invisible
					infrastructure</strong> &mdash; plumbing that the client never sees, never interacts with,
					and never depends on.
				</p>

				<p>
					The pattern follows the same principle as the Automotive Framework&rsquo;s chassis: the
					structural frame that holds everything together is invisible when driving. MCP is the
					chassis; the commodity vendor is a replaceable part bolted to it.
				</p>

				<h3 class="subsection-heading">2.2 Architecture</h3>

				<p>
					The wrapped architecture has three layers:
				</p>

				<ol class="list-decimal pl-6 space-y-2">
					<li>
						<strong>Client-Facing MCP Server</strong> &mdash; Your server, your name, your
						<code>mcp-core</code> framework. This is what the client connects to. It registers
						tools, resources, and prompts using your naming conventions and schema definitions.
					</li>
					<li>
						<strong>Bridge Layer</strong> &mdash; A thin adapter that translates between your
						MCP tool definitions and the vendor&rsquo;s SDK. It handles tool registration (fetching
						vendor schemas, converting to your format), auth delegation (mapping your account model
						to the vendor&rsquo;s), and execution (routing tool calls through the vendor&rsquo;s API).
					</li>
					<li>
						<strong>Vendor SDK</strong> &mdash; The commodity provider&rsquo;s client library,
						used as an internal dependency. It handles the actual API calls, token management,
						and rate limiting against the upstream service.
					</li>
				</ol>

				<h3 class="subsection-heading">2.3 The Key Invariant</h3>

				<p>
					<strong>The client never knows the vendor exists.</strong> This is not a cosmetic requirement
					&mdash; it is a structural invariant that preserves the creation moat. If the client
					interacts with the vendor directly, you have introduced a dependency that bypasses your
					value layer.
				</p>

				<p>
					Your MCP server is always the server framework. The vendor is always swappable. The
					Intelligence Layer (Skills, Agents, domain logic) sits on top of both wrapped and custom
					tools identically.
				</p>
			</div>
		</section>

		<!-- Classification Heuristic -->
		<section class="space-y-6">
			<h2 class="section-heading">3. Classification Heuristic</h2>

			<div class="space-y-6 leading-relaxed body-text">
				<p>
					When a new integration request arrives, apply these four questions in order:
				</p>

				<ol class="list-decimal pl-6 space-y-4">
					<li>
						<strong>Does it need domain-specific logic beyond CRUD?</strong>
						If yes &rarr; <strong>Build Custom</strong>. Domain logic is the moat.
						QuickBooks reconciliation, scheduling conflict detection, construction compliance
						&mdash; these require understanding the domain, not just calling an API.
					</li>
					<li>
						<strong>Does it need Three-Tier alignment (Resources + Prompts)?</strong>
						If yes &rarr; <strong>Build Custom</strong>. Commodity vendors typically provide
						tools only. If your integration needs Resources (state exposure) or Prompts
						(judgment templates), you need full MCP server control.
					</li>
					<li>
						<strong>Does it need two-way data synchronization?</strong>
						If yes &rarr; <strong>Use a sync platform</strong>. Bidirectional sync between
						two systems (e.g., Notion &harr; HubSpot contacts) is a specialized problem.
						Sync platforms solve it; commodity tool vendors do not.
					</li>
					<li>
						<strong>Is it standard CRUD with managed OAuth?</strong>
						If yes &rarr; <strong>Wrap</strong>. This is where the wrap pattern applies.
						The integration is commodity plumbing that does not deserve creation energy.
					</li>
				</ol>

				<div class="overflow-x-auto">
					<table class="w-full metric-table">
						<thead>
							<tr>
								<th>Integration Request</th>
								<th>Classification</th>
								<th>Rationale</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td>QuickBooks GL &rarr; Notion sync</td>
								<td><strong>Custom</strong></td>
								<td>GL mapping, reconciliation logic</td>
							</tr>
							<tr>
								<td>HubSpot lead notifications</td>
								<td><strong>Wrap</strong></td>
								<td>CRUD reads, no domain logic</td>
							</tr>
							<tr>
								<td>Scheduling with conflict detection</td>
								<td><strong>Custom</strong></td>
								<td>Complex orchestration, backfill</td>
							</tr>
							<tr>
								<td>Slack daily standup summaries</td>
								<td><strong>Wrap + Intelligence</strong></td>
								<td>CRUD read via wrap, summarization via Skills</td>
							</tr>
							<tr>
								<td>Salesforce pipeline reporting</td>
								<td><strong>Hybrid</strong></td>
								<td>Wrap for CRUD, custom for reporting logic</td>
							</tr>
							<tr>
								<td>Notion &harr; HubSpot contact sync</td>
								<td><strong>Sync Platform</strong></td>
								<td>Bidirectional data sync</td>
							</tr>
							<tr>
								<td>Procore MCP for construction</td>
								<td><strong>Custom</strong></td>
								<td>Deep vertical, the creation moat</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</section>

		<!-- Three-Tier Alignment -->
		<section class="space-y-6">
			<h2 class="section-heading">4. Three-Tier Alignment</h2>

			<div class="space-y-6 leading-relaxed body-text">
				<p>
					The Three-Tier Framework (Database, Automation, Judgment) applies to wrapped integrations
					as cleanly as to custom ones. The wrap pattern does not bypass the framework &mdash;
					it maps the vendor&rsquo;s capabilities into it.
				</p>

				<h3 class="subsection-heading">4.1 Tier Mapping</h3>

				<div class="overflow-x-auto">
					<table class="w-full metric-table">
						<thead>
							<tr>
								<th>Tier</th>
								<th>MCP Primitive</th>
								<th>Wrapped Implementation</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td><strong>Database</strong></td>
								<td>Resources</td>
								<td>Connected account state, token delegation, vendor account mapping</td>
							</tr>
							<tr>
								<td><strong>Automation</strong></td>
								<td>Tools</td>
								<td>Tool factory (fetches vendor schemas, registers as MCP tools), execution bridge</td>
							</tr>
							<tr>
								<td><strong>Judgment</strong></td>
								<td>Prompts</td>
								<td>Auth provider (policy resolution), account-scoped enforcement</td>
							</tr>
						</tbody>
					</table>
				</div>

				<h3 class="subsection-heading">4.2 The Bridge Components</h3>

				<p>
					A well-designed bridge package provides three components that map to the three tiers:
				</p>

				<ul class="list-disc pl-6 space-y-2">
					<li>
						<strong>Tool Factory</strong> (Automation) &mdash; Fetches tool definitions from the
						vendor, converts JSON Schema to your validation format, registers them as standard
						MCP tools with handlers that route execution through the vendor&rsquo;s API.
					</li>
					<li>
						<strong>Auth Bridge</strong> (Judgment) &mdash; Implements your MCP server&rsquo;s
						auth provider interface, delegating OAuth flows to the vendor&rsquo;s managed auth.
						Policy enforcement (which accounts can access which tools) remains yours.
					</li>
					<li>
						<strong>Client Wrapper</strong> (Database) &mdash; A thin, edge-compatible wrapper
						over the vendor&rsquo;s client SDK. Handles instantiation, health checks, and
						connection state. Must work in Cloudflare Workers (no Node.js builtins).
					</li>
				</ul>

				<h3 class="subsection-heading">4.3 Custom + Wrapped = Unified Surface</h3>

				<p>
					The power of the pattern emerges when you combine wrapped commodity tools with custom
					deep-domain tools on the same MCP server:
				</p>

				<ul class="list-disc pl-6 space-y-2">
					<li>Wrapped tools handle the long tail of standard integrations</li>
					<li>Custom tools handle the core domain logic</li>
					<li>The Intelligence Layer (Skills, Agents) operates identically across both</li>
					<li>The client sees one unified MCP server with consistent naming and schemas</li>
				</ul>

				<p>
					This is the subtractive move: wrapping removes the build burden for commodity integrations
					so creation energy focuses on the moat.
				</p>
			</div>
		</section>

		<!-- The Swappability Invariant -->
		<section class="space-y-6">
			<h2 class="section-heading">5. The Swappability Invariant</h2>

			<div class="space-y-6 leading-relaxed body-text">
				<p>
					The wrap pattern is only safe if the vendor is always replaceable. This is the
					<strong>swappability invariant</strong>: at any point, you must be able to swap the
					underlying vendor without changing the client-facing MCP surface.
				</p>

				<h3 class="subsection-heading">5.1 Structural Guarantees</h3>

				<ul class="list-disc pl-6 space-y-2">
					<li>
						<strong>No vendor types in public API</strong> &mdash; Your bridge package exports
						your types, not the vendor&rsquo;s. If the vendor renames a field, only the bridge
						adapter changes.
					</li>
					<li>
						<strong>MIT license or equivalent</strong> &mdash; If the vendor dies or pivots,
						you can fork the SDK and maintain the adapter yourself. Proprietary SDKs violate
						the invariant.
					</li>
					<li>
						<strong>Contained blast radius</strong> &mdash; The vendor dependency lives in exactly
						one package (the bridge). No other package in your monorepo imports the vendor directly.
					</li>
					<li>
						<strong>Edge compatibility</strong> &mdash; The vendor SDK must work in your deployment
						target (e.g., Cloudflare Workers). If it requires Node.js builtins, it fails the
						compatibility gate and the wrap pattern does not apply.
					</li>
				</ul>

				<h3 class="subsection-heading">5.2 Evaluation Protocol</h3>

				<p>
					Before wrapping any vendor, run a structured evaluation:
				</p>

				<div class="overflow-x-auto">
					<table class="w-full metric-table">
						<thead>
							<tr>
								<th>Criterion</th>
								<th>Weight</th>
								<th>Threshold</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td>Edge runtime compatibility</td>
								<td>Hard gate</td>
								<td>Must work in target runtime</td>
							</tr>
							<tr>
								<td>Tool definition quality</td>
								<td>High</td>
								<td>80%+ schemas with typed parameters</td>
							</tr>
							<tr>
								<td>Latency overhead</td>
								<td>Medium</td>
								<td>&lt;2s health, &lt;5s discovery</td>
							</tr>
							<tr>
								<td>Auth flow coverage</td>
								<td>Medium</td>
								<td>OAuth for 3+ target apps minimum</td>
							</tr>
							<tr>
								<td>SDK license</td>
								<td>Hard gate</td>
								<td>MIT or equivalent (forkable)</td>
							</tr>
							<tr>
								<td>Cost at evaluation scale</td>
								<td>Low</td>
								<td>Free tier covers evaluation</td>
							</tr>
						</tbody>
					</table>
				</div>

				<p>
					The edge compatibility gate is non-negotiable. Everything else is negotiable within
					thresholds. If evaluation fails, the integration stays custom.
				</p>
			</div>
		</section>

		<!-- Red Lines -->
		<section class="space-y-6">
			<h2 class="section-heading">6. Red Lines: When Wrapping Erodes the Moat</h2>

			<div class="space-y-6 leading-relaxed body-text">
				<p>
					The wrap pattern has clear boundaries. Cross them, and the vendor stops being
					invisible infrastructure and becomes a visible dependency &mdash; eroding the
					creation moat.
				</p>

				<h3 class="subsection-heading">6.1 Do / Do Not</h3>

				<div class="overflow-x-auto">
					<table class="w-full metric-table">
						<thead>
							<tr>
								<th>Do</th>
								<th>Do Not</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td>Use vendor as invisible plumbing</td>
								<td>List vendor as a partner on your site</td>
							</tr>
							<tr>
								<td>Wrap their tools in your MCPs</td>
								<td>Expose vendor directly to clients</td>
							</tr>
							<tr>
								<td>Fork their MIT code if needed</td>
								<td>Depend on vendor uptime for client SLAs</td>
							</tr>
							<tr>
								<td>Learn from their integration patterns</td>
								<td>Copy their market positioning</td>
							</tr>
							<tr>
								<td>Use for commodity CRUD integrations</td>
								<td>Use for deep domain MCPs (the moat)</td>
							</tr>
						</tbody>
					</table>
				</div>

				<h3 class="subsection-heading">6.2 The Moat Test</h3>

				<p>
					For every integration, ask: <em>&ldquo;If a competitor used this same vendor, would they
					produce the same outcome?&rdquo;</em>
				</p>

				<ul class="list-disc pl-6 space-y-2">
					<li>
						If <strong>yes</strong> &rarr; This is commodity. Wrapping is appropriate. Your
						differentiation comes from the Intelligence Layer on top, not the CRUD underneath.
					</li>
					<li>
						If <strong>no</strong> &rarr; This is creation. Build it custom. The domain logic,
						the orchestration, the policy enforcement &mdash; these are the moat. Wrapping
						would hide your value.
					</li>
				</ul>

				<h3 class="subsection-heading">6.3 Criticality Boundary</h3>

				<p>
					Never wrap integrations that are <strong>critical path</strong> for your client&rsquo;s
					SLA. If the vendor has downtime and your client&rsquo;s workflow stops, you have a vendor
					dependency, not invisible infrastructure.
				</p>

				<p>
					Critical integrations stay custom. Wrapped integrations are always nice-to-haves &mdash;
					the long tail of standard connectivity that makes your MCP server more useful but is
					not the reason the client chose you.
				</p>
			</div>
		</section>

		<!-- Economics -->
		<section class="space-y-6">
			<h2 class="section-heading">7. Economics of the Wrap Pattern</h2>

			<div class="space-y-6 leading-relaxed body-text">
				<h3 class="subsection-heading">7.1 Build vs. Wrap Cost</h3>

				<p>
					The economic argument for wrapping is straightforward:
				</p>

				<div class="overflow-x-auto">
					<table class="w-full metric-table">
						<thead>
							<tr>
								<th>Approach</th>
								<th>Build Time</th>
								<th>Ongoing COGS</th>
								<th>When to Use</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td>Custom MCP</td>
								<td>1&ndash;4 weeks</td>
								<td>Dev time only</td>
								<td>Deep domain logic, the moat</td>
							</tr>
							<tr>
								<td>Wrapped MCP</td>
								<td>2&ndash;4 hours</td>
								<td>~$30/mo vendor cost</td>
								<td>Standard CRUD, long-tail integrations</td>
							</tr>
							<tr>
								<td>Sync Platform</td>
								<td>1&ndash;2 days</td>
								<td>~$50&ndash;500/mo</td>
								<td>Bidirectional data sync</td>
							</tr>
						</tbody>
					</table>
				</div>

				<h3 class="subsection-heading">7.2 The Margin Structure</h3>

				<p>
					Wrapping inverts the cost structure for commodity integrations:
				</p>

				<ul class="list-disc pl-6 space-y-2">
					<li>
						<strong>Without wrapping:</strong> Each commodity integration costs days of
						engineering time (OAuth implementation, API mapping, error handling, rate limiting).
						This is undifferentiated work that competes with creation work for attention.
					</li>
					<li>
						<strong>With wrapping:</strong> Each commodity integration costs hours of bridge
						configuration plus ~$30/mo vendor cost. Creation energy redirects entirely to
						the Intelligence Layer &mdash; the monetizable layer.
					</li>
				</ul>

				<p>
					The margin is in the Intelligence Layer, not the CRUD layer. Wrapping
					eliminates the CRUD tax so you can focus on where the margin lives.
				</p>
			</div>
		</section>

		<!-- Implementation -->
		<section class="space-y-6">
			<h2 class="section-heading">8. Implementation Pattern</h2>

			<div class="space-y-6 leading-relaxed body-text">
				<h3 class="subsection-heading">8.1 Bridge Package Structure</h3>

				<p>
					The bridge lives in a single package with clear boundaries:
				</p>

				<ul class="list-disc pl-6 space-y-2">
					<li><code>src/client.ts</code> &mdash; Thin wrapper over vendor SDK (edge-compatible)</li>
					<li><code>src/tool-factory.ts</code> &mdash; Fetches vendor tools, registers as MCP tools</li>
					<li><code>src/auth-bridge.ts</code> &mdash; Auth provider implementation + token delegation</li>
					<li><code>src/types.ts</code> &mdash; Your types only (no vendor type re-exports)</li>
					<li><code>eval/</code> &mdash; Evaluation scripts (compatibility, latency, quality, auth)</li>
				</ul>

				<h3 class="subsection-heading">8.2 Registration Flow</h3>

				<p>
					At server startup, the Tool Factory:
				</p>

				<ol class="list-decimal pl-6 space-y-2">
					<li>Fetches available tool definitions from the vendor for specified apps</li>
					<li>Converts vendor JSON schemas to your validation format (e.g., Zod)</li>
					<li>Registers each tool on your MCP server with a handler that routes execution
						through the vendor&rsquo;s API</li>
					<li>Applies naming conventions and description standards to match your surface</li>
				</ol>

				<p>
					Custom tools are registered directly on the same server, using the same
					<code>server.tool()</code> API. The client cannot distinguish wrapped from custom.
				</p>

				<h3 class="subsection-heading">8.3 Edge Deployment</h3>

				<p>
					The wrap pattern must work at the edge. The bridge package must:
				</p>

				<ul class="list-disc pl-6 space-y-2">
					<li>Use <code>fetch</code> exclusively (no <code>http</code>/<code>https</code> modules)</li>
					<li>Avoid Node.js builtins (<code>fs</code>, <code>path</code>, <code>crypto</code> beyond Web Crypto)</li>
					<li>Accept a custom <code>fetch</code> option for testing and instrumentation</li>
					<li>Handle vendor rate limits gracefully (retry with backoff)</li>
				</ul>
			</div>
		</section>

		<!-- Discussion -->
		<section class="space-y-6">
			<h2 class="section-heading">9. Discussion</h2>

			<div class="space-y-6 leading-relaxed body-text">
				<h3 class="subsection-heading">9.1 The Subtractive Move</h3>

				<p>
					The wrap pattern is fundamentally a subtractive move in the sense of the Subtractive Triad:
				</p>

				<ul class="list-disc pl-6 space-y-2">
					<li>
						<strong>DRY (Implementation)</strong> &mdash; Eliminates the duplication of building
						the same OAuth flows, CRUD operations, and error handling that every MCP server
						builder implements for commodity APIs.
					</li>
					<li>
						<strong>Rams (Artifact)</strong> &mdash; The wrapped tool earns its existence
						by providing connectivity without demanding creation energy. &ldquo;Weniger, aber
						besser&rdquo; &mdash; fewer custom integrations, but the ones you build are better.
					</li>
					<li>
						<strong>Heidegger (System)</strong> &mdash; The wrap pattern serves the whole
						by keeping the vendor invisible. It prevents the disconnection that occurs when
						external dependencies become visible to clients, creating coupling that constrains
						the system&rsquo;s evolution.
					</li>
				</ul>

				<h3 class="subsection-heading">9.2 Zuhandenheit of Wrapped Tools</h3>

				<p>
					When the wrap pattern works correctly, wrapped tools recede into transparent use &mdash;
					Heidegger&rsquo;s <em>Zuhandenheit</em> (ready-to-hand). The agent calls
					<code>hubspot_list_contacts</code> without knowing or caring whether that tool is
					implemented via custom code or a vendor bridge. The tool disappears in use.
				</p>

				<p>
					When the pattern breaks &mdash; vendor downtime, schema mismatches, auth failures &mdash;
					the tool becomes <em>Vorhandenheit</em> (present-at-hand). It stands out as an object
					of concern rather than receding into function. The swappability invariant minimizes
					this risk: if one vendor breaks, swap in another without touching the client surface.
				</p>

				<h3 class="subsection-heading">9.3 Gestell Warning</h3>

				<p>
					The temptation is to wrap <em>everything</em>. This is Gestell &mdash; the technological
					enframing that reduces all integrations to standing reserve, resources to be optimized.
					The wrap pattern is not a universal solution. It is a targeted tool for commodity work,
					applied with judgment about what deserves creation energy and what does not.
				</p>

				<p>
					The question is not &ldquo;Can we wrap this?&rdquo; but &ldquo;Should we wrap this?&rdquo;
					The classification heuristic (Section 3) provides the framework for that judgment.
				</p>

				<h3 class="subsection-heading">9.4 Limitations</h3>

				<ul class="list-disc pl-6 space-y-2">
					<li>
						<strong>Vendor dependency</strong> &mdash; Even with the swappability invariant,
						switching vendors has a cost. The bridge adapter must be rewritten, and vendor-specific
						quirks may leak through.
					</li>
					<li>
						<strong>Tool quality ceiling</strong> &mdash; Wrapped tools inherit the vendor&rsquo;s
						schema quality. If the vendor&rsquo;s tool descriptions are poor, LLM function calling
						reliability suffers.
					</li>
					<li>
						<strong>Latency overhead</strong> &mdash; Wrapping adds a network hop. For
						latency-sensitive operations, this may be unacceptable.
					</li>
					<li>
						<strong>Three-Tier gap</strong> &mdash; Most commodity vendors only provide Tools
						(Automation tier). Resources and Prompts must still be implemented custom if needed.
					</li>
				</ul>
			</div>
		</section>

		<!-- Conclusion -->
		<section class="space-y-6">
			<h2 class="section-heading">10. Conclusion</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					MCP consumption is commoditized. MCP creation is not. The wrap pattern formalizes
					the strategic response to this asymmetry: delegate commodity integrations to invisible
					vendors, focus creation energy on deep domain logic and the Intelligence Layer.
				</p>

				<p>
					The pattern is simple in structure (bridge package, tool factory, auth adapter) but
					disciplined in application (classification heuristic, swappability invariant, red lines).
					Applied correctly, it eliminates the CRUD tax on engineering time while preserving
					the creation moat.
				</p>

				<p>
					The contribution is both strategic and architectural. Strategically, it provides a decision
					framework for when to build, wrap, or sync. Architecturally, it provides a reference
					pattern for invisible vendor integration that maintains Three-Tier alignment and
					edge deployment compatibility.
				</p>

				<p>
					<strong>Key Takeaway:</strong> The wrap pattern is a subtractive move. It removes
					the build burden for commodity integrations &mdash; not to do less, but to focus on
					the work that matters. The vendor disappears. The creation moat deepens.
				</p>
			</div>
		</section>

		<!-- How to Apply This -->
		<section class="space-y-6">
			<h2 class="section-heading">How to Apply This</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					<strong>If you are building MCP servers for clients:</strong>
				</p>

				<ol class="list-decimal pl-6 space-y-2">
					<li>Classify each integration request using the four-question heuristic (Section 3)</li>
					<li>For commodity integrations, evaluate potential vendors against the swappability criteria (Section 5)</li>
					<li>Build the bridge package as a single, contained dependency</li>
					<li>Register wrapped and custom tools on the same MCP server</li>
					<li>Focus Intelligence Layer development on custom tools &mdash; that is where the margin lives</li>
				</ol>

				<p>
					<strong>If you are evaluating commodity vendors:</strong>
				</p>

				<ol class="list-decimal pl-6 space-y-2">
					<li>Gate on edge compatibility first &mdash; everything else is secondary</li>
					<li>Test tool schema quality (80%+ typed parameters)</li>
					<li>Verify OAuth flows for your target apps</li>
					<li>Benchmark latency overhead</li>
					<li>Confirm MIT or equivalent licensing</li>
				</ol>

				<p>
					<strong>If you are deciding your integration strategy:</strong>
				</p>

				<ol class="list-decimal pl-6 space-y-2">
					<li>Map your integrations on the commodity&ndash;creation spectrum</li>
					<li>Build custom where differentiation matters</li>
					<li>Wrap commodity where speed matters</li>
					<li>Never wrap critical-path integrations</li>
					<li>Apply the moat test: if a competitor could produce the same outcome using the same vendor, it is commodity</li>
				</ol>
			</div>
		</section>

		<!-- Related Research -->
		<section class="space-y-4">
			<h2 class="section-heading">Related Research</h2>

			<div class="space-y-2 body-text">
				<p>
					<a href="/papers/three-tier-framework" class="text-blue-400 hover:underline">The Three-Tier Framework</a>
					&mdash; Database, Automation, Judgment as structural model for agent systems
				</p>
				<p>
					<a href="/papers/haiku-optimization" class="text-blue-400 hover:underline">Haiku Optimization</a>
					&mdash; Intelligent model routing for AI-native development
				</p>
				<p>
					<a href="/papers/ethos-transfer-agentic-engineering" class="text-blue-400 hover:underline">Ethos Transfer in Agentic Engineering</a>
					&mdash; How agents learn project values through documentation
				</p>
			</div>
		</section>
	</div>
</div>

<style>
	.paper-container {
		background: var(--color-performance-bg-pure);
		color: var(--color-performance-fg-primary);
	}


	.paper-id {
		color: var(--color-performance-fg-muted);
		font-size: var(--text-performance-body-sm);
		text-transform: uppercase;
		letter-spacing: 0.1em;
	}

	.paper-title {
		font-size: var(--text-performance-h1);
		font-weight: 700;
		line-height: 1.2;
	}

	.paper-subtitle {
		font-size: var(--text-performance-body-lg);
		color: var(--color-performance-fg-secondary);
		line-height: 1.6;
	}

	.paper-meta {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-muted);
	}

	.abstract-section {
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-lg);
		padding: var(--space-performance-lg);
	}

	.section-heading {
		font-size: var(--text-performance-h2);
		font-weight: 700;
		margin-bottom: var(--space-performance-md);
	}

	.subsection-heading {
		font-size: var(--text-performance-h3);
		font-weight: 600;
		margin: var(--space-performance-lg) 0 var(--space-performance-md) 0;
		color: var(--color-performance-fg-secondary);
	}

	.body-text {
		font-size: var(--text-performance-body);
		color: var(--color-performance-fg-tertiary);
		line-height: 1.7;
	}

	.body-text code {
		font-family: 'Stack Sans', monospace;
		background: var(--color-performance-bg-subtle);
		padding: 0.125rem 0.375rem;
		border-radius: var(--radius-performance-scale-sm);
		font-size: 0.9em;
	}

	.body-text a {
		color: var(--color-performance-data-1);
		transition: color var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.body-text a:hover {
		color: var(--color-performance-fg-primary);
	}

	.metric-table {
		border-collapse: collapse;
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-lg);
		overflow: hidden;
	}

	.metric-table th {
		background: var(--color-performance-bg-subtle);
		padding: var(--space-performance-md);
		text-align: left;
		font-size: var(--text-performance-body-sm);
		font-weight: 600;
		color: var(--color-performance-fg-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		border-bottom: 1px solid var(--color-performance-border-emphasis);
	}

	.metric-table td {
		padding: var(--space-performance-md);
		color: var(--color-performance-fg-tertiary);
	}

	.metric-table tr:last-child td {
		border-bottom: none;
	}

	:global(.metric-table code) {
		font-family: 'Stack Sans', monospace;
		background: var(--color-performance-bg-subtle);
		padding: 0.125rem 0.375rem;
		border-radius: var(--radius-performance-scale-sm);
		font-size: 0.9em;
	}
</style>
