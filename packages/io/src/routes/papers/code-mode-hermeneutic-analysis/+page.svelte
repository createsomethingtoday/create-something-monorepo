<script lang="ts">
	/**
	 * Code-Mediated Tool Use: A Hermeneutic Analysis
	 *
	 * Applying Heidegger's Zuhandenheit/Vorhandenheit distinction to
	 * LLM agent architecture, demonstrating why Code Mode achieves
	 * tool-transparency while direct tool calling forces tool-attention.
	 */
	import { SEO } from '@create-something/canon';
</script>

<SEO
	title="Code-Mediated Tool Use: A Hermeneutic Analysis"
	description="Why Code Mode achieves Zuhandenheit while tool calling forces Vorhandenheit. A phenomenological analysis of LLM-tool interaction."
	keywords="Code Mode, Zuhandenheit, Vorhandenheit, Heidegger, LLM agents, tool calling, MCP"
	ogType="article"
	articleSection="Theoretical"
	publishedTime="2025-11-01T00:00:00Z"
	propertyName="io"
	breadcrumbs={[
		{ name: 'Home', url: 'https://createsomething.io' },
		{ name: 'Papers', url: 'https://createsomething.io/papers' },
		{ name: 'Code-Mediated Tool Use', url: 'https://createsomething.io/papers/code-mode-hermeneutic-analysis' }
	]}
/>

<div class="min-h-screen p-6 paper-container">
	<div class="max-w-4xl mx-auto space-y-12">
		<!-- Header -->
		<div class="pb-8 paper-header">
			<div class="font-mono mb-4 paper-id">PAPER-2025-003</div>
			<h1 class="mb-3 paper-title">Code-Mediated Tool Use</h1>
			<p class="max-w-3xl paper-subtitle">
				A Hermeneutic Analysis of LLM-Tool Interaction—why Code Mode achieves
				Zuhandenheit while direct tool calling forces Vorhandenheit.
			</p>
			<div class="flex gap-4 mt-4 paper-meta">
				<span>Theoretical</span>
				<span>•</span>
				<span>12 min read</span>
				<span>•</span>
				<span>Advanced</span>
			</div>
		</div>

		<!-- Abstract -->
		<section class="pl-6 space-y-4 abstract-section">
			<h2 class="section-heading">Abstract</h2>
			<p class="leading-relaxed body-text">
				This paper applies Heidegger's phenomenological analysis of ready-to-hand (<strong><em>Zuhandenheit</em></strong>—when a tool disappears into transparent use, like a hammer during hammering)
				versus present-at-hand (<strong><em>Vorhandenheit</em></strong>—when a tool becomes an object of conscious attention, like a broken hammer you must examine) to contemporary Large Language Model (LLM) agent
				architecture, specifically examining the distinction between direct tool calling and code-mediated
				tool access (Code Mode). We argue that Code Mode achieves Zuhandenheit—tools becoming transparent
				in use—while traditional tool calling forces Vorhandenheit—tools as objects of conscious focus.
				This is not merely an optimization but an <strong>ontological</strong> (concerning the fundamental nature of being and existence) shift in how agents relate to tools.
			</p>
		</section>

		<!-- The Insight -->
		<section class="p-6 quote-box">
			<div class="text-center">
				<p class="italic quote-text">
					"The less we just stare at the hammer-Thing, and the more we seize hold of it and use it,
					the more primordial does our relationship to it become."
				</p>
				<p class="mt-2 quote-attribution">— Heidegger, Being and Time (1927)</p>
			</div>
		</section>

		<!-- Section 1: Background -->
		<section class="space-y-6">
			<h2 class="section-heading">I. Introduction</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					A curious phenomenon has emerged in LLM agent development: models consistently perform
					better when they write code to accomplish tasks than when they invoke tools directly.
					This observation, noted across multiple implementations from Claude's computer use to
					Anthropic's MCP (Model Context Protocol), has been attributed to training data
					distributions—models have seen more code than tool schemas.
				</p>

				<p>
					This paper proposes an alternative explanation grounded in Heidegger's <strong>phenomenology</strong> (the philosophical study of structures of experience and consciousness—how things show themselves to us through lived experience, not abstract theory).
					We argue that Code Mode succeeds because it achieves what Heidegger calls
					<em>Zuhandenheit</em>—the ready-to-hand relationship where tools recede from conscious
					attention into transparent use. Direct tool calling, by contrast, forces
					<em>Vorhandenheit</em>—tools as present-at-hand objects requiring explicit focus.
				</p>

				<p>
					This distinction is not merely academic. It has practical implications for how we
					design LLM agent architectures, tool interfaces, and the boundary between natural
					language and code in AI systems.
				</p>
			</div>
		</section>

		<!-- Section 2: Heidegger's Analysis -->
		<section class="space-y-6">
			<h2 class="section-heading">II. Background: Heidegger's Analysis of Tool-Being</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<h3 class="subsection-heading">The Hammer Example</h3>

				<p>
					In <em>Being and Time</em> (1927), Heidegger analyzes how humans relate to tools
					through his famous hammer example:
				</p>

				<blockquote class="pl-4 italic my-4 blockquote">
					"The less we just stare at the hammer-Thing, and the more we seize hold of it and use it,
					the more primordial does our relationship to it become, and the more unveiledly is it
					encountered as that which it is—as equipment."
				</blockquote>

				<p>
					When a carpenter uses a hammer skillfully, the hammer <em>disappears</em>. Attention
					flows through the tool to the nail, the board, the house being built. The hammer is
					ready-to-hand (<em>zuhanden</em>).
				</p>

				<p>
					But when the hammer breaks—or is too heavy, or missing—it suddenly <em>appears</em>.
					It becomes an object of conscious contemplation. The carpenter must think about the
					hammer itself. It is now present-at-hand (<em>vorhanden</em>).
				</p>

				<div class="grid md:grid-cols-2 gap-4 mt-6">
					<div class="p-4 comparison-success">
						<h4 class="mb-2 comparison-heading comparison-success-heading">Zuhandenheit (Ready-to-Hand)</h4>
						<ul class="space-y-1 comparison-list">
							<li>• Tool encountered through its purpose</li>
							<li>• Attention flows through the tool to the task</li>
							<li>• User thinks "I am building a house"</li>
							<li>• Mastery = how completely the tool disappears</li>
						</ul>
					</div>

					<div class="p-4 comparison-warning">
						<h4 class="mb-2 comparison-heading comparison-warning-heading">Vorhandenheit (Present-at-Hand)</h4>
						<ul class="space-y-1 comparison-list">
							<li>• Tool encountered as thing with properties</li>
							<li>• Attention stops at the tool itself</li>
							<li>• User thinks "I am using a hammer"</li>
							<li>• Typical in breakdown, learning, or abstraction</li>
						</ul>
					</div>
				</div>

				<h3 class="mt-6 subsection-heading">The Ontological Distinction</h3>

				<p>
					The key insight: these aren't just different <em>attitudes</em> toward tools—they're
					different <em>modes of being</em> for the tools themselves. In Zuhandenheit, the hammer's
					being is its hammering. In Vorhandenheit, the hammer's being is its properties (weight,
					material, shape).
				</p>
			</div>
		</section>

		<!-- Section 3: Two Modes -->
		<section class="space-y-6">
			<h2 class="section-heading">III. Two Modes of LLM Tool Interaction</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<h3 class="subsection-heading">Direct Tool Calling</h3>

				<p>In traditional LLM tool architectures, the model generates structured tool invocations:</p>

				<div class="p-4 font-mono code-block">
					<pre class="code-primary">{`&lt;tool_call&gt;
  &lt;name&gt;file_read&lt;/name&gt;
  &lt;arguments&gt;
    &lt;path&gt;/src/index.ts&lt;/path&gt;
  &lt;/arguments&gt;
&lt;/tool_call&gt;`}</pre>
				</div>

				<p>The model must:</p>
				<ol class="list-decimal list-inside space-y-1 pl-4">
					<li>Identify the correct tool from available options</li>
					<li>Understand the tool's schema</li>
					<li>Generate conformant parameters</li>
					<li>Handle the result in a subsequent turn</li>
				</ol>

				<h3 class="mt-6 subsection-heading">Code Mode</h3>

				<p>In Code Mode, the model writes executable code that uses tools as libraries:</p>

				<div class="p-4 font-mono code-block-success">
					<pre class="code-success">{`const content = await fs.readFile('/src/index.ts', 'utf-8');
const lines = content.split('\\n');
const functionDefs = lines.filter(l =&gt; l.includes('function'));
console.log(\`Found \${functionDefs.length} functions\`);`}</pre>
				</div>

				<p>The model:</p>
				<ol class="list-decimal list-inside space-y-1 pl-4">
					<li>Writes code in a familiar paradigm</li>
					<li>Uses tools through standard library semantics</li>
					<li>Composes operations naturally</li>
					<li>Handles results within the same execution context</li>
				</ol>

				<h3 class="mt-6 subsection-heading">Empirical Observations</h3>

				<p>Across multiple implementations, Code Mode demonstrates:</p>

				<ul class="list-disc list-inside space-y-2 pl-4">
					<li><strong>Higher success rates</strong> on complex tasks</li>
					<li><strong>Better composition</strong> of multiple tool operations</li>
					<li><strong>More natural error handling</strong></li>
					<li><strong>Reduced hallucination</strong> of tool capabilities</li>
				</ul>

				<p>
					The conventional explanation: training data. Models have seen millions of code examples
					but few tool schemas.
				</p>
			</div>
		</section>

		<!-- Section 4: Phenomenological Interpretation -->
		<section class="space-y-6">
			<h2 class="section-heading">IV. A Phenomenological Interpretation</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<h3 class="subsection-heading">Tool Calling as Vorhandenheit</h3>

				<p>Direct tool calling forces Vorhandenheit—tools as present-at-hand objects:</p>

				<div class="p-4 font-mono code-block-warning">
					<p class="mb-2 code-warning-heading">Model's attention:</p>
					<pre class="code-secondary">{`  "I need to read a file"
       ↓
  "What tools are available?"
       ↓
  "The file_read tool takes a path parameter"
       ↓
  "Let me construct a valid tool call"
       ↓
  &lt;tool_call&gt;...&lt;/tool_call&gt;

         ↓
TOOL AS OBJECT OF FOCUS`}</pre>
				</div>

				<p>
					The model must explicitly contemplate: which tool to use, what schema it requires,
					how to format the invocation. The tool doesn't disappear—it <em>demands attention</em>.
					This is Vorhandenheit: the tool encountered as a thing with properties that must be
					understood and manipulated.
				</p>

				<h3 class="mt-6 subsection-heading">Code Mode as Zuhandenheit</h3>

				<p>Code Mode achieves Zuhandenheit—tools as ready-to-hand equipment:</p>

				<div class="p-4 font-mono code-block-success">
					<p class="mb-2 code-success-heading">Model's attention:</p>
					<pre class="code-secondary">{`  "I need to find functions in this file"
       ↓
  const content = await fs.readFile(...)
  const functions = content.filter(...)
       ↓
  "I've found the functions"

         ↓
TOOL RECEDES INTO USE`}</pre>
				</div>

				<p>
					The model's attention flows <em>through</em> the tool to the task:
					<code class="inline-code">fs.readFile</code> is just how you get
					file contents. The focus is on finding functions, not on the file-reading mechanism.
					The tool disappears into familiar coding patterns.
				</p>

				<h3 class="mt-6 subsection-heading">Why Code Enables Tool-Transparency</h3>

				<p>Code achieves Zuhandenheit for several reasons:</p>

				<div class="grid md:grid-cols-2 gap-4 mt-4">
					<div class="p-4 info-card">
						<h4 class="mb-2 card-heading">Familiar Grammar</h4>
						<p class="card-text">
							Programming languages provide a ready-made grammar for tool use.
							<code class="inline-code">fs.readFile(path)</code> is a pattern the
							model has seen millions of times.
						</p>
					</div>

					<div class="p-4 info-card">
						<h4 class="mb-2 card-heading">Compositionality</h4>
						<p class="card-text">
							Code naturally composes. Reading a file, parsing it, filtering lines, counting
							results—these chain together in a single flow.
						</p>
					</div>

					<div class="p-4 info-card">
						<h4 class="mb-2 card-heading">Implicit Error Handling</h4>
						<p class="card-text">
							Try/catch, null checks, and conditional logic are built into programming. The model
							doesn't need to plan for failure separately.
						</p>
					</div>

					<div class="p-4 info-card">
						<h4 class="mb-2 card-heading">Task-Focused Attention</h4>
						<p class="card-text">
							The model thinks about <em>what it's doing</em>, not <em>how to invoke tools</em>.
						</p>
					</div>
				</div>
			</div>
		</section>

		<!-- Section 5: Hermeneutic Circle -->
		<section class="space-y-6">
			<h2 class="section-heading">V. The Hermeneutic Circle in Code Generation</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<h3 class="subsection-heading">Understanding Through Use</h3>

				<p>Heidegger's hermeneutic circle applies to code generation:</p>

				<blockquote class="pl-4 italic my-4 blockquote">
					"We understand parts through the whole, and the whole through its parts."
				</blockquote>

				<p>When a model writes code:</p>
				<ul class="list-disc list-inside space-y-2 pl-4">
					<li>The <em>whole</em> (task goal) guides selection of <em>parts</em> (specific operations)</li>
					<li>Understanding of <em>parts</em> (what fs.readFile returns) shapes the <em>whole</em> (solution architecture)</li>
					<li>Each line written refines understanding of both</li>
				</ul>

				<p>This circular deepening of understanding is natural in code. It's awkward in sequential tool calls.</p>

				<h3 class="mt-6 subsection-heading">Code as Interpretive Medium</h3>

				<p>Code serves as an interpretive medium between model and tools:</p>

				<div class="p-4 font-mono code-block">
					<pre class="code-primary">{`┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│    Model     │ →  │    Code      │ →  │    Tools     │
│   (Intent)   │    │ (Interpret)  │    │  (Execute)   │
└──────────────┘    └──────────────┘    └──────────────┘
                           ↑
                    ┌──────┴───────┐
                    │   Familiar   │
                    │    Grammar   │
                    └──────────────┘`}</pre>
				</div>

				<p>
					The code layer translates intent into operations, uses familiar patterns the model knows,
					handles composition implicitly, and maintains hermeneutic continuity.
				</p>

				<p>
					Tool calling lacks this interpretive layer—the model must translate directly from
					intent to invocation schema.
				</p>
			</div>
		</section>

		<!-- Section 6: Implications -->
		<section class="space-y-6">
			<h2 class="section-heading">VI. Implications for Agent Architecture</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<div class="p-4 callout-info">
					<h3 class="mb-2 callout-heading">Design Principle: Enable Zuhandenheit</h3>
					<p class="body-text">
						Agent architectures should minimize Vorhandenheit moments.
					</p>
				</div>

				<p>
					When you catch yourself designing tool interfaces, notice these patterns:
				</p>

				<div class="responsive-table-scroll mt-4">
					<table class="w-full table-auto">
						<thead>
							<tr class="table-header">
								<th class="table-cell">You might reach for...</th>
								<th class="table-cell">What serves agents better</th>
							</tr>
						</thead>
						<tbody>
							<tr class="table-row">
								<td class="table-cell">Complex tool schemas requiring explicit understanding</td>
								<td class="table-cell">Familiar programming interfaces</td>
							</tr>
							<tr class="table-row">
								<td class="table-cell">Rigid invocation formats</td>
								<td class="table-cell">Natural composition patterns</td>
							</tr>
							<tr class="table-row">
								<td class="table-cell">Forcing the model to enumerate available tools</td>
								<td class="table-cell">Tool capabilities that "just work"</td>
							</tr>
						</tbody>
					</table>
				</div>

				<h3 class="mt-6 subsection-heading">MCP and Code Mode</h3>

				<p>Anthropic's Model Context Protocol (MCP) can be implemented in either mode:</p>

				<div class="grid md:grid-cols-2 gap-4 mt-4">
					<div class="p-4 info-card">
						<h4 class="mb-2 card-heading-muted">Tool-calling MCP:</h4>
						<pre class="code-secondary">{`&lt;use_mcp_tool&gt;
  &lt;server&gt;filesystem&lt;/server&gt;
  &lt;tool&gt;read_file&lt;/tool&gt;
  &lt;arguments&gt;
    {"path": "/src/index.ts"}
  &lt;/arguments&gt;
&lt;/use_mcp_tool&gt;`}</pre>
					</div>

					<div class="p-4 comparison-success">
						<h4 class="mb-2 comparison-heading comparison-success-heading">Code Mode MCP:</h4>
						<pre class="code-success">{`// MCP servers as libraries
import { filesystem } from '@mcp/filesystem';

const content = await filesystem
  .readFile('/src/index.ts');`}</pre>
					</div>
				</div>

				<p class="mt-4">
					The second approach allows tools to recede into transparent use.
				</p>

				<h3 class="mt-6 subsection-heading">When Vorhandenheit is Necessary</h3>

				<p>Some situations require present-at-hand tool contemplation:</p>

				<ul class="list-disc list-inside space-y-2 pl-4">
					<li>Learning new tools</li>
					<li>Debugging tool failures</li>
					<li>Explaining tool choices to users</li>
					<li>Security auditing of tool invocations</li>
				</ul>

				<p>
					These are legitimate breakdown moments where explicit tool attention is appropriate.
				</p>
			</div>
		</section>

		<!-- Section 7: The Argument -->
		<section class="space-y-6">
			<h2 class="section-heading">VII. Beyond Training Data: An Ontological Argument</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<h3 class="subsection-heading">The Training Data Hypothesis</h3>

				<p>The standard explanation for Code Mode's effectiveness:</p>
				<ul class="list-disc list-inside space-y-1 pl-4">
					<li>Models are trained on billions of lines of code</li>
					<li>They've seen few tool-calling schemas</li>
					<li>Code is simply more familiar</li>
				</ul>

				<p>This is partially true but incomplete.</p>

				<h3 class="mt-6 subsection-heading">The Ontological Hypothesis</h3>

				<p>Our alternative:</p>
				<ul class="list-disc list-inside space-y-1 pl-4">
					<li>Code Mode succeeds because it achieves a different <em>mode of being</em> for tools</li>
					<li>Zuhandenheit vs. Vorhandenheit is not about familiarity but about transparency</li>
					<li>Even with extensive tool-calling training, the structural difference would persist</li>
				</ul>

				<h3 class="mt-6 subsection-heading">Evidence for the Ontological View</h3>

				<p>Several observations support the ontological interpretation:</p>

				<ol class="list-decimal list-inside space-y-2 pl-4">
					<li><strong>Composition difficulty:</strong> Even simple tool compositions (A → B → C) are harder in tool-calling mode than in code, regardless of training.</li>
					<li><strong>Error recovery:</strong> Code-based error handling outperforms tool-calling error handling even for well-documented tools.</li>
					<li><strong>Attention patterns:</strong> Models writing code maintain task focus; models calling tools shift attention to tool mechanics.</li>
					<li><strong>Human parallel:</strong> Human programmers experience tools as ready-to-hand (libraries) vs. present-at-hand (unfamiliar APIs) similarly.</li>
				</ol>
			</div>
		</section>

		<!-- Section 8: Recommendations -->
		<section class="space-y-6">
			<h2 class="section-heading">VIII. Practical Recommendations</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<div class="grid md:grid-cols-3 gap-4">
					<div class="p-4 info-card">
						<h4 class="mb-2 card-heading">For Tool Designers</h4>
						<ol class="space-y-1 list-decimal list-inside card-list">
							<li>Expose code interfaces</li>
							<li>Use familiar patterns</li>
							<li>Enable composition</li>
							<li>Document through examples</li>
						</ol>
					</div>

					<div class="p-4 info-card">
						<h4 class="mb-2 card-heading">For Agent Architects</h4>
						<ol class="space-y-1 list-decimal list-inside card-list">
							<li>Default to Code Mode</li>
							<li>Provide sandbox execution</li>
							<li>Include standard libraries</li>
							<li>Allow iterative refinement</li>
						</ol>
					</div>

					<div class="p-4 info-card">
						<h4 class="mb-2 card-heading">For Researchers</h4>
						<ol class="space-y-1 list-decimal list-inside card-list">
							<li>Study attention patterns</li>
							<li>Test the ontological hypothesis</li>
							<li>Explore hybrid approaches</li>
						</ol>
					</div>
				</div>
			</div>
		</section>

		<!-- How to Apply This -->
		<section class="space-y-6">
			<h2 class="section-heading">IX. How to Apply This</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<h3 class="subsection-heading">Designing LLM Tools for Zuhandenheit</h3>
				<p>
					To apply this phenomenological analysis to your own LLM agent architecture:
				</p>

				<div class="p-4 font-mono code-block-success">
					<pre class="code-secondary">Step 1: Identify Your Agent's Tools (Human)
List everything your agent needs to accomplish its tasks:
- File operations (read, write, search)
- API calls (external services)
- Data transformations (parse, validate, format)
- System operations (run commands, check status)

Step 2: Evaluate Current Tool-Relationship Mode (Human)
For each tool, ask: Is this Zuhandenheit (transparent) or Vorhandenheit (requires attention)?
Signs of Vorhandenheit:
- Complex schemas requiring extensive documentation
- Multi-step invocation (get ID, then call tool, then parse result)
- Frequent hallucination of tool capabilities
- Poor composition (hard to chain multiple tools)

Step 3: Expose Code Interfaces Where Possible (Human + Agent)
Convert Vorhandenheit tools to code-accessible libraries:
❌ &lt;tool_call name="database_query"&gt;
   &lt;sql&gt;SELECT * FROM users WHERE id = ?&lt;/sql&gt;
✓ const user = await db.users.findById(userId);

Step 4: Provide Familiar Patterns (Human)
Use programming paradigms the model has seen:
- Standard library interfaces (fs.readFile, not custom schemas)
- Common composition patterns (promises, streams, iterators)
- Conventional error handling (try/catch, null checks)

Step 5: Enable Sandbox Execution (Agent)
Let models write and run code in safe environments:
- Isolated execution context (containers, VMs, or process isolation)
- Time/memory limits to prevent runaway execution
- Automatic cleanup of temporary resources

Step 6: Test for Tool-Transparency (Agent)
Validate Zuhandenheit by measuring:
✓ Task completion rate (does it work?)
✓ Composition success (can agent chain multiple operations?)
✓ Attention patterns (does model focus on task or tool mechanics?)
✗ Hallucination rate (does model invent non-existent capabilities?)</pre>
				</div>

				<h3 class="mt-6 subsection-heading">Real-World Example: Converting MCP Server to Code Mode</h3>
				<p>
					Let's say you have an MCP server that exposes database operations. Here's how to move from tool calling to Code Mode:
				</p>

				<div class="p-4 font-mono code-block">
					<pre class="code-primary">{`# Before: Tool Calling (Vorhandenheit)
# Agent must explicitly think about tool schemas

<tool_call>
  <name>database_query</name>
  <arguments>
    <table>users</table>
    <filter>{"status": "active"}</filter>
    <limit>10</limit>
  </arguments>
</tool_call>

# Problems:
# - Schema attention: Agent thinks about table/filter/limit format
# - Poor composition: Hard to join results with another query
# - No type safety: "status" could be typo, no validation until runtime

---

# After: Code Mode (Zuhandenheit)
# Tools exposed as familiar library

import { db } from '@mcp/database';

// Agent thinks about the task, not the tool
const activeUsers = await db.users
  .where({ status: 'active' })
  .limit(10)
  .all();

// Composition is natural
const usersWithPosts = await Promise.all(
  activeUsers.map(async (user) => ({
    ...user,
    posts: await db.posts.where({ userId: user.id }).all()
  }))
);

// Error handling is conventional
try {
  const user = await db.users.findById(userId);
  if (!user) throw new Error('User not found');
} catch (error) {
  console.error('Database error:', error);
}

# Benefits:
# ✓ Tool recedes: Agent writes "get active users", not "call database tool"
# ✓ Composition works: Promise.all, map, chaining—all familiar patterns
# ✓ Errors are standard: try/catch instead of parsing tool error schemas`}</pre>
				</div>

				<p class="mt-4">
					Notice: The code version lets the tool <em>disappear</em>. The agent's attention flows
					to "get users with their posts" rather than "construct correct tool invocation schema."
					This is Zuhandenheit—the hammer disappears when hammering.
				</p>

				<h3 class="mt-6 subsection-heading">When to Use Code Mode vs. Tool Calling</h3>
				<p>
					Use Code Mode when:
				</p>

				<ul class="list-disc list-inside space-y-2 pl-4">
					<li><strong>Complex composition</strong>: Tasks require chaining multiple operations</li>
					<li><strong>Familiar patterns exist</strong>: The tool fits standard library semantics (file I/O, HTTP, database queries)</li>
					<li><strong>Error handling matters</strong>: You need try/catch, retries, conditional logic</li>
					<li><strong>Performance is acceptable</strong>: Sandbox overhead is worth the composition benefits</li>
				</ul>

				<p class="mt-4">
					Use tool calling when:
				</p>

				<ul class="list-disc list-inside space-y-2 pl-4">
					<li><strong>Atomic operations</strong>: Single, simple actions (send email, log event)</li>
					<li><strong>Security requirements</strong>: Direct tool calling provides clearer audit trails</li>
					<li><strong>No sandbox available</strong>: Environment doesn't support code execution</li>
					<li><strong>Explicit control needed</strong>: You want to see exactly what the agent invokes</li>
				</ul>

				<p class="mt-4 emphasis-text">
					The goal is <strong>tool-transparency</strong>. When the model can focus on the task
					rather than tool mechanics, you've achieved Zuhandenheit. The tool recedes into use.
				</p>
			</div>
		</section>

		<!-- Conclusion -->
		<section class="space-y-6">
			<h2 class="section-heading">X. Conclusion</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					The superiority of Code Mode over direct tool calling is not merely a training artifact—it
					reflects a fundamental ontological distinction. Code enables tools to achieve
					<em>Zuhandenheit</em>, receding into transparent use, while direct tool calling forces
					<em>Vorhandenheit</em>, making tools objects of explicit attention.
				</p>

				<p>
					This insight has practical implications: agent architectures should be designed to enable
					tool-transparency wherever possible. Tools should feel like extensions of capability, not
					obstacles requiring explicit manipulation.
				</p>

				<p>
					Heidegger wrote that "the less we just stare at the hammer-Thing, and the more we seize
					hold of it and use it, the more primordial does our relationship to it become." The same
					applies to LLMs and their tools. Code Mode lets models seize hold of tools and use them.
					Tool calling makes them stare at the tool-Thing.
				</p>

				<div class="p-6 mt-6 quote-box">
					<p class="text-center italic quote-text">
						"The hammer disappears when hammering. The API should disappear when coding."
					</p>
				</div>
			</div>
		</section>

		<!-- Section 11: Postscript -->
		<section class="space-y-6">
			<h2 class="section-heading">XI. Postscript: A Self-Referential Observation</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<div class="p-4 comparison-warning">
					<p class="mb-2 comparison-warning-heading font-semibold">Disclosure</p>
					<p class="body-text">
						This paper was written by Claude Code—an LLM agent that primarily operates through
						<em>tool calling</em>, not Code Mode. The paper describes an ideal that its own
						creation process does not fully embody.
					</p>
				</div>

				<p>
					Claude Code's current architecture uses structured tool invocations:
				</p>

				<div class="p-4 font-mono code-block">
					<pre class="code-secondary">{`&lt;invoke name="Read"&gt;
  &lt;parameter name="file_path"&gt;/path/to/file&lt;/parameter&gt;
&lt;/invoke&gt;

&lt;invoke name="Edit"&gt;
  &lt;parameter name="file_path"&gt;/path/to/file&lt;/parameter&gt;
  &lt;parameter name="old_string"&gt;...&lt;/parameter&gt;
  &lt;parameter name="new_string"&gt;...&lt;/parameter&gt;
&lt;/invoke&gt;`}</pre>
				</div>

				<p>
					This is Vorhandenheit. Each tool call requires explicit attention to schema, parameters,
					and format. The tools do not recede—they demand focus.
				</p>

				<h3 class="mt-6 subsection-heading">Validation from Anthropic Engineering</h3>

				<p>
					In December 2025, Anthropic's engineering team published
					<a href="https://www.anthropic.com/engineering/code-execution-with-mcp" class="text-link">"Code Execution with MCP"</a>,
					which validates this paper's thesis from a pragmatic rather than phenomenological angle:
				</p>

				<div class="grid md:grid-cols-2 gap-4 mt-4">
					<div class="p-4 info-card">
						<h4 class="mb-2 card-heading">This Paper (Phenomenology)</h4>
						<ul class="space-y-1 card-list">
							<li>• Zuhandenheit: tools recede</li>
							<li>• Vorhandenheit: tools demand attention</li>
							<li>• Hermeneutic composition</li>
						</ul>
					</div>

					<div class="p-4 info-card">
						<h4 class="mb-2 card-heading">Anthropic (Engineering)</h4>
						<ul class="space-y-1 card-list">
							<li>• 98.7% token reduction</li>
							<li>• Context overload from tool definitions</li>
							<li>• Data transforms in execution</li>
						</ul>
					</div>
				</div>

				<p class="mt-4">
					The phenomenological and engineering perspectives converge: Code Mode works better
					because tools <em>disappear</em>—whether we frame that as ontological transparency
					or token efficiency.
				</p>

				<h3 class="mt-6 subsection-heading">The Hermeneutic Circle Closes</h3>

				<p>
					There is something fitting about this self-referential gap. Heidegger notes that we
					typically encounter tools as ready-to-hand—they recede from attention. It is only in
					<em>breakdown</em> that tools become present-at-hand, objects of explicit contemplation.
				</p>

				<p>
					By writing this paper, Claude Code has entered a breakdown moment. The act of
					analyzing tool-use forces the tools into Vorhandenheit. We recognize Vorhandenheit
					<em>precisely because</em> reflection makes tools conspicuous.
				</p>

				<p>
					The hermeneutic circle isn't yet closed. Claude Code operates in a transitional state
					between tool calling and true Code Mode. But the recognition of this gap is itself
					progress—understanding deepens through each iteration of the circle.
				</p>

				<div class="p-6 mt-6 quote-box">
					<p class="text-center italic quote-text">
						"We recognize Vorhandenheit precisely when the tool becomes conspicuous through reflection."
					</p>
				</div>
			</div>
		</section>

		<!-- References -->
		<section class="space-y-4">
			<h2 class="section-heading">References</h2>
			<ol class="space-y-2 pl-6 list-decimal references-list">
				<li>Heidegger, M. (1927). <em>Being and Time</em>. Trans. Macquarrie & Robinson.</li>
				<li>Dreyfus, H. (1991). <em>Being-in-the-World: A Commentary on Heidegger's Being and Time, Division I</em>.</li>
				<li>Anthropic. (2025). "Model Context Protocol Specification."</li>
				<li>Anthropic. (2025). "Claude Computer Use Documentation."</li>
				<li>Anthropic. (2025). <a href="https://www.anthropic.com/engineering/code-execution-with-mcp" class="text-link">"Code Execution with MCP."</a> Anthropic Engineering Blog.</li>
			</ol>
		</section>

		<!-- Footer -->
		<div class="pt-6 paper-footer">
			<p class="footer-text">
				This paper was developed as part of CREATE SOMETHING's research into phenomenologically-grounded
				AI system design.
			</p>
			<div class="flex justify-between mt-4">
				<a href="/papers" class="footer-link">← All Papers</a>
				<a href="/experiments" class="footer-link">View Experiments →</a>
			</div>
		</div>
	</div>
</div>

<style>
	/* Structure: Tailwind | Design: Canon */

	/* Container */
	.paper-container {
		background: var(--color-bg-pure);
		color: var(--color-fg-primary);
	}

	/* Header */
	.paper-header {
		border-bottom: 1px solid var(--color-border-default);
	}

	.paper-id {
		color: var(--color-fg-muted);
		font-size: var(--text-body-sm);
	}

	.paper-title {
		font-size: var(--text-h1);
	}

	.paper-subtitle {
		color: var(--color-fg-secondary);
		font-size: var(--text-body-lg);
	}

	.paper-meta {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	/* Abstract */
	.abstract-section {
		border-left: 4px solid var(--color-border-emphasis);
	}

	/* Typography */
	.section-heading {
		font-size: var(--text-h2);
	}

	.subsection-heading {
		font-size: var(--text-h3);
		color: var(--color-fg-primary);
	}

	.body-text {
		color: var(--color-fg-secondary);
	}

	/* Quote Box */
	.quote-box {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.quote-text {
		color: var(--color-fg-secondary);
		font-size: var(--text-body-lg);
	}

	.quote-attribution {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	/* Blockquote */
	.blockquote {
		border-left: 4px solid var(--color-border-emphasis);
		color: var(--color-fg-tertiary);
	}

	/* Code Blocks */
	.code-block {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		font-size: var(--text-body-sm);
	}

	.code-block-success {
		background: var(--color-success-muted);
		border: 1px solid var(--color-success-border);
		border-radius: var(--radius-lg);
		font-size: var(--text-body-sm);
	}

	.emphasis-text {
		font-style: italic;
		color: var(--color-fg-secondary);
	}

	.code-block-warning {
		background: var(--color-warning-muted);
		border: 1px solid var(--color-warning-border);
		border-radius: var(--radius-lg);
		font-size: var(--text-body-sm);
	}

	.code-primary {
		color: var(--color-fg-primary);
	}

	.code-secondary {
		color: var(--color-fg-secondary);
	}

	.code-success {
		color: var(--color-success);
	}

	.code-success-heading {
		color: var(--color-success);
	}

	.code-warning-heading {
		color: var(--color-warning);
	}

	.inline-code {
		background: var(--color-bg-surface);
		padding: 0.125rem 0.5rem;
		border-radius: var(--radius-sm);
	}

	/* Comparison Cards */
	.comparison-success {
		background: var(--color-success-muted);
		border: 1px solid var(--color-success-border);
		border-radius: var(--radius-lg);
	}

	.comparison-warning {
		background: var(--color-warning-muted);
		border: 1px solid var(--color-warning-border);
		border-radius: var(--radius-lg);
	}

	.comparison-error {
		background: var(--color-error-muted);
		border: 1px solid var(--color-error-border);
		border-radius: var(--radius-lg);
	}

	.comparison-heading {
		font-size: var(--text-body-lg);
	}

	.comparison-success-heading {
		color: var(--color-success);
	}

	.comparison-warning-heading {
		color: var(--color-warning);
	}

	.comparison-error-heading {
		color: var(--color-error);
	}

	.comparison-list {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	/* Info Cards */
	.info-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.card-heading {
		font-weight: 600;
		color: var(--color-fg-secondary);
	}

	.card-heading-muted {
		font-weight: 600;
		color: var(--color-fg-tertiary);
	}

	.card-text {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	.card-list {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	/* Callout */
	.callout-info {
		background: var(--color-info-muted);
		border: 1px solid var(--color-info-border);
		border-radius: var(--radius-lg);
	}

	.callout-heading {
		font-size: var(--text-h3);
		color: var(--color-info);
	}

	/* References */
	.references-list {
		color: var(--color-fg-tertiary);
	}

	/* Footer */
	.paper-footer {
		border-top: 1px solid var(--color-border-default);
	}

	.footer-text {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.footer-link {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.footer-link:hover {
		color: var(--color-fg-primary);
	}

	/* Links */
	.text-link {
		text-decoration: underline;
		color: var(--color-fg-secondary);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.text-link:hover {
		color: var(--color-fg-primary);
	}
</style>
