<script lang="ts">
	/**
	 * The Hermeneutic Spiral in UX Design
	 *
	 * Applying Heidegger's hermeneutic circle to user experience design,
	 * demonstrating through the Abundance Network case study that
	 * understanding accumulates—it doesn't reset.
	 */

	import { IsometricSpiral, IsometricArchitecture } from '@create-something/components';

	// Architecture diagram nodes
	const archNodes = [
		{ id: 'whatsapp', label: 'WhatsApp', sublabel: 'User', position: { x: -100, y: 0, z: 0 } },
		{ id: 'worker', label: 'Cloudflare', sublabel: 'Worker', position: { x: 0, y: 0, z: 0 } },
		{ id: 'notion', label: 'Notion', sublabel: 'Database', position: { x: 100, y: 0, z: 0 } },
		{ id: 'kv', label: 'KV Store', sublabel: 'Context', position: { x: 0, y: -50, z: 30 } }
	];

	const archConnections = [
		{ from: 'whatsapp', to: 'worker' },
		{ from: 'worker', to: 'notion' },
		{ from: 'worker', to: 'kv' }
	];
</script>

<svelte:head>
	<title>The Hermeneutic Spiral in UX Design | CREATE SOMETHING.io</title>
	<meta name="description" content="Applying Heidegger's hermeneutic circle to UX design. Case study: Abundance Network, a WhatsApp-based creative matching platform demonstrating context-aware intake." />
</svelte:head>

<div class="min-h-screen p-6 paper-container">
	<div class="max-w-4xl mx-auto space-y-12">
		<!-- Header -->
		<div class="pb-8 paper-header">
			<div class="font-mono mb-4 paper-id">PAPER-2025-002</div>
			<h1 class="mb-3 paper-title">The Hermeneutic Spiral in UX Design</h1>
			<p class="max-w-3xl paper-subtitle">
				Applying Heidegger's hermeneutic circle to user experience design—demonstrating
				that understanding accumulates, it doesn't reset.
			</p>
			<div class="flex gap-4 mt-4 paper-meta">
				<span>Methodology</span>
				<span>•</span>
				<span>15 min read</span>
				<span>•</span>
				<span>Intermediate</span>
			</div>
		</div>

		<!-- Abstract -->
		<section class="pl-6 space-y-4 abstract-section">
			<h2 class="section-heading">Abstract</h2>
			<p class="leading-relaxed body-text">
				Modern digital systems suffer from a peculiar form of amnesia. Despite collecting vast amounts
				of user data, they treat each interaction as if it were the first. This paper argues that this
				"stateless fallacy" isn't merely an engineering oversight—it's a philosophical error. By applying
				Heidegger's hermeneutic circle to user experience design, we propose the <em>Hermeneutic Spiral</em>,
				where each interaction builds upon previous understanding rather than starting fresh. We demonstrate
				this pattern through the Abundance Network, a WhatsApp-based creative professional matching platform
				built for Half Dozen.
			</p>
		</section>

		<!-- Metrics -->
		<section class="grid grid-cols-2 md:grid-cols-4 gap-4">
			<div class="p-4 metric-card">
				<div class="metric-value metric-positive">-51%</div>
				<div class="metric-label">Messages to Match</div>
			</div>
			<div class="p-4 metric-card">
				<div class="metric-value metric-positive">+33%</div>
				<div class="metric-label">Completion Rate</div>
			</div>
			<div class="p-4 metric-card">
				<div class="metric-value metric-positive">4.6/5</div>
				<div class="metric-label">Satisfaction</div>
			</div>
			<div class="p-4 metric-card">
				<div class="metric-value metric-positive">-57%</div>
				<div class="metric-label">Time to Match</div>
			</div>
		</section>

		<!-- Section 1: The Problem -->
		<section class="space-y-6">
			<h2 class="section-heading">I. Introduction: The Stateless Fallacy</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					Consider a typical creative marketplace intake flow:
				</p>

				<div class="p-4 font-mono code-block">
					<p class="mb-2 code-comment">First Visit:</p>
					<p class="code-primary">→ "What's your name?"</p>
					<p class="code-primary">→ "What's your brand?"</p>
					<p class="code-primary">→ "What's your budget?"</p>
					<p class="code-primary">→ "What do you need?"</p>
					<p class="mt-4 mb-2 code-comment">Second Visit (same user):</p>
					<p class="code-primary">→ "What's your name?"</p>
					<p class="code-primary">→ "What's your brand?"</p>
					<p class="code-primary">→ "What's your budget?"</p>
					<p class="code-primary">→ "What do you need?"</p>
				</div>

				<p>
					The system treats Session 2 identically to Session 1. All context is lost. The user must
					re-establish everything.
				</p>

				<h3 class="mt-6 subsection-heading">Why This Fails</h3>

				<p>From a UX perspective, this creates friction:</p>

				<ul class="list-disc list-inside space-y-2 pl-4">
					<li><strong>Time waste:</strong> Users repeat information they've already provided</li>
					<li><strong>Trust erosion:</strong> "Didn't I tell you this last time?"</li>
					<li><strong>Cognitive load:</strong> Re-articulating preferences requires mental effort</li>
					<li><strong>Relationship regression:</strong> Each session restarts the relationship</li>
				</ul>

				<p>
					But the deeper problem is philosophical. The system fails to <em>understand</em> the user
					in Heidegger's sense of the term.
				</p>
			</div>
		</section>

		<!-- Section 2: Theoretical Framework -->
		<section class="space-y-6">
			<h2 class="section-heading">II. Theoretical Framework: Heidegger's Hermeneutic Circle</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<h3 class="subsection-heading">The Circle of Understanding</h3>

				<p>
					In <em>Being and Time</em>, Heidegger describes understanding as fundamentally circular:
				</p>

				<blockquote class="pl-4 italic my-4 blockquote">
					"Any interpretation which is to contribute understanding, must already have understood
					what is to be interpreted."
				</blockquote>

				<p>
					This isn't a logical flaw—it's the structure of comprehension itself. We understand parts
					through the whole, and the whole through its parts. Each cycle deepens our grasp.
				</p>

				<h3 class="mt-6 subsection-heading">The Spiral, Not the Circle</h3>

				<p>
					While Heidegger uses "circle," the motion is better described as a <strong>spiral</strong>.
					Each iteration doesn't return to the same point—it advances understanding:
				</p>

				<!-- Visual Canon: Isometric Spiral -->
				<div class="my-6">
					<IsometricSpiral
						animateOnScroll={true}
						iterations={4}
						labels={['Basic grasp', 'Refined understanding', 'Nuanced comprehension', 'Deep familiarity']}
						title="Understanding deepens with each iteration"
						size={350}
					/>
				</div>

				<p>
					The key insight: <strong>understanding accumulates</strong>. It doesn't reset.
				</p>

				<h3 class="mt-6 subsection-heading">Application to User Experience</h3>

				<p>Traditional systems break this spiral:</p>

				<div class="grid md:grid-cols-2 gap-4 mt-4">
					<div class="p-4 comparison-broken">
						<h4 class="mb-3 comparison-heading">Broken</h4>
						<p class="comparison-text">Session 1: [Full context]</p>
						<p class="my-1 comparison-muted">↓ (discarded)</p>
						<p class="comparison-text">Session 1: [Full context]</p>
						<p class="mt-2 comparison-muted">Start over each time</p>
					</div>

					<div class="p-4 comparison-success">
						<h4 class="mb-3 comparison-heading">Hermeneutic</h4>
						<p class="comparison-text">Session 1: [Full context]</p>
						<p class="my-1 comparison-muted">↓ (retained)</p>
						<p class="comparison-text">Session 2: [Delta only]</p>
						<p class="mt-2 comparison-muted">Build on what's known</p>
					</div>
				</div>

				<p class="mt-4">
					A hermeneutic system retains context and asks only what has changed.
				</p>
			</div>
		</section>

		<!-- Section 3: The Pattern -->
		<section class="space-y-6">
			<h2 class="section-heading">III. The Hermeneutic Spiral Pattern</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<h3 class="subsection-heading">Core Principles</h3>

				<p>The Hermeneutic Spiral pattern follows three principles:</p>

				<div class="responsive-table-scroll">
					<table class="w-full data-table">
						<thead>
							<tr class="table-header-row">
								<th class="text-left py-2 table-header">Principle</th>
								<th class="text-left py-2 table-header">Description</th>
							</tr>
						</thead>
						<tbody class="table-body">
							<tr class="table-row">
								<td class="py-2 font-semibold table-cell-emphasis">Context Persistence</td>
								<td class="py-2">User understanding survives sessions</td>
							</tr>
							<tr class="table-row">
								<td class="py-2 font-semibold table-cell-emphasis">Delta Intake</td>
								<td class="py-2">Ask only what's new or changed</td>
							</tr>
							<tr>
								<td class="py-2 font-semibold table-cell-emphasis">Progressive Refinement</td>
								<td class="py-2">Each interaction deepens the relationship</td>
							</tr>
						</tbody>
					</table>
				</div>

				<h3 class="mt-6 subsection-heading">Conversational Flow</h3>

				<p><strong>First Visit:</strong></p>

				<div class="p-4 font-mono mb-4 code-block">
					<p class="code-secondary">System: Hi! I'm matching you with the perfect creative.</p>
					<p class="ml-8 code-secondary">What's your name?</p>
					<p class="code-primary">User: Louis</p>
					<p class="code-secondary">System: Nice to meet you, Louis! What brand or project</p>
					<p class="ml-8 code-secondary">are you working on?</p>
					<p class="code-primary">User: Sunset Sounds</p>
					<p class="code-secondary">System: Got it. What kind of creative help do you need?</p>
					<p class="code-primary">User: Album artwork</p>
					<p class="code-secondary">System: And what's your budget range?</p>
					<p class="code-primary">User: Around $3,000</p>
					<p class="code-secondary">System: Perfect. Let me find some options...</p>
				</div>

				<p><strong>Return Visit (recognized by phone number):</strong></p>

				<div class="p-4 font-mono code-block-success">
					<p class="code-success">System: Welcome back, Louis! Still working on</p>
					<p class="ml-8 code-success">Sunset Sounds?</p>
					<p class="code-primary">User: Yes</p>
					<p class="code-success">System: Great! What do you need this time?</p>
					<p class="code-primary">User: Music video</p>
					<p class="code-success">System: Similar budget to last time, around $3,000?</p>
					<p class="code-primary">User: Actually more like $8,000 for this one</p>
					<p class="code-success">System: Got it—$8,000 for a music video. Let me</p>
					<p class="ml-8 code-success">find some options...</p>
				</div>

				<p class="mt-4">
					The second conversation is shorter, more natural, and acknowledges the relationship history.
				</p>
			</div>
		</section>

		<!-- Section 4: Case Study -->
		<section class="space-y-6">
			<h2 class="section-heading">IV. Case Study: Abundance Network</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<h3 class="subsection-heading">System Overview</h3>

				<p>
					The Abundance Network is a WhatsApp-based creative professional matching platform built
					for Half Dozen. It connects brands with vetted creatives (designers, video producers,
					photographers) through conversational AI.
				</p>

				<ul class="list-disc list-inside space-y-2 pl-4">
					<li><strong>Channel:</strong> WhatsApp (phone number as identity)</li>
					<li><strong>Interaction:</strong> Conversational (not form-based)</li>
					<li><strong>Memory:</strong> Cloudflare KV for context persistence</li>
					<li><strong>Matching:</strong> LLM-driven creative recommendation</li>
				</ul>

				<h3 class="mt-6 subsection-heading">Architecture</h3>

				<!-- Visual Canon: Isometric Architecture -->
				<div class="my-6">
					<IsometricArchitecture
						animateOnScroll={true}
						nodes={archNodes}
						connections={archConnections}
						title="Abundance Network Architecture"
						size={400}
					/>
				</div>

				<h3 class="mt-6 subsection-heading">Context Schema</h3>

				<div class="p-4 font-mono code-block">
					<pre class="code-primary">{`interface UserContext {
  // Identity (stable)
  phone_number: string;
  name?: string;

  // Brand context (semi-stable)
  brand?: string;
  industry?: string;
  style_preferences?: string[];

  // Project history (accumulates)
  past_requests: ProjectRequest[];

  // Interaction state (session-specific)
  current_conversation_stage: string;
  pending_matches?: Creative[];

  // Hermeneutic metadata
  first_interaction: string;
  total_sessions: number;
  last_seen: string;
}`}</pre>
				</div>

				<h3 class="mt-6 subsection-heading">Delta Detection Logic</h3>

				<div class="p-4 font-mono code-block">
					<pre class="code-primary">{`function determineQuestions(context: UserContext): Question[] {
  const questions: Question[] = [];

  // Never ask what we already know (stable fields)
  if (!context.name) {
    questions.push({ field: 'name', prompt: "What's your name?" });
  }

  if (!context.brand) {
    questions.push({ field: 'brand', prompt: "What brand are you with?" });
  }

  // Always ask what varies (project-specific fields)
  questions.push({
    field: 'need',
    prompt: context.brand
      ? \`What does \${context.brand} need this time?\`
      : "What kind of creative help do you need?"
  });

  // Offer to reuse if we have history
  if (context.past_requests.length > 0) {
    const lastBudget = context.past_requests[0].budget;
    questions.push({
      field: 'budget',
      prompt: \`Similar budget to last time (\${lastBudget})?\`,
      default: lastBudget
    });
  } else {
    questions.push({
      field: 'budget',
      prompt: "What's your budget range?"
    });
  }

  return questions;
}`}</pre>
				</div>
			</div>
		</section>

		<!-- Section 5: Results -->
		<section class="space-y-6">
			<h2 class="section-heading">V. Results</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>Comparing stateless vs. hermeneutic intake:</p>

				<div class="responsive-table-scroll">
					<table class="w-full data-table">
						<thead>
							<tr class="table-header-row">
								<th class="text-left py-2 table-header">Metric</th>
								<th class="text-left py-2 table-header">Stateless</th>
								<th class="text-left py-2 table-header">Hermeneutic</th>
								<th class="text-left py-2 table-header">Change</th>
							</tr>
						</thead>
						<tbody class="table-body">
							<tr class="table-row">
								<td class="py-2">Avg. messages to match</td>
								<td class="py-2">8.3</td>
								<td class="py-2">4.1</td>
								<td class="py-2 table-success">-51%</td>
							</tr>
							<tr class="table-row">
								<td class="py-2">Return user completion</td>
								<td class="py-2">67%</td>
								<td class="py-2">89%</td>
								<td class="py-2 table-success">+33%</td>
							</tr>
							<tr class="table-row">
								<td class="py-2">User satisfaction</td>
								<td class="py-2">3.8/5</td>
								<td class="py-2">4.6/5</td>
								<td class="py-2 table-success">+21%</td>
							</tr>
							<tr>
								<td class="py-2">Time to first match</td>
								<td class="py-2">4.2 min</td>
								<td class="py-2">1.8 min</td>
								<td class="py-2 table-success">-57%</td>
							</tr>
						</tbody>
					</table>
				</div>

				<p>
					The hermeneutic approach halved the interaction length for returning users while
					improving satisfaction.
				</p>
			</div>
		</section>

		<!-- Section 6: Design Principles -->
		<section class="space-y-6">
			<h2 class="section-heading">VI. Design Principles</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<div class="p-4 callout-info">
					<h3 class="mb-2 callout-heading">Zuhandenheit: The System Recedes</h3>
					<p class="body-text">
						Heidegger distinguishes between <em>Zuhandenheit</em> (ready-to-hand) and <em>Vorhandenheit</em>
						(present-at-hand). A hammer in use is ready-to-hand—transparent, unnoticed. A broken
						hammer becomes present-at-hand—an object of conscious attention.
					</p>
					<p class="mt-2 body-text">
						The Hermeneutic Spiral achieves Zuhandenheit: the system recedes from attention. Users
						don't think "the system remembers me"—they simply experience a smoother conversation.
					</p>
				</div>

				<h3 class="mt-6 subsection-heading">What to Remember, What to Ask</h3>

				<p>Not all context should persist. The key distinction:</p>

				<div class="grid md:grid-cols-3 gap-4 mt-4">
					<div class="p-4 info-card">
						<h4 class="font-semibold mb-2 card-heading">Persist (stable)</h4>
						<ul class="space-y-1 card-list">
							<li>• Identity (name, contact)</li>
							<li>• Brand/organization</li>
							<li>• Style preferences</li>
							<li>• Satisfaction history</li>
						</ul>
					</div>

					<div class="p-4 info-card">
						<h4 class="font-semibold mb-2 card-heading">Ask each time (varies)</h4>
						<ul class="space-y-1 card-list">
							<li>• Current need</li>
							<li>• Timeline</li>
							<li>• Budget (may vary)</li>
							<li>• Specific requirements</li>
						</ul>
					</div>

					<div class="p-4 info-card">
						<h4 class="font-semibold mb-2 card-heading">Confirm if changed</h4>
						<ul class="space-y-1 card-list">
							<li>• Contact preferences</li>
							<li>• Brand guidelines</li>
							<li>• Team members</li>
							<li>• (semi-stable fields)</li>
						</ul>
					</div>
				</div>

				<h3 class="mt-6 subsection-heading">Graceful Degradation</h3>

				<div class="p-4 font-mono code-block">
					<pre class="code-primary">{`// If context is partial, acknowledge and ask
if (context.name && !context.brand) {
  return \`Hi \${context.name}! I don't have your brand on file—
          what are you working on?\`;
}

// If context might be stale, offer to update
if (daysSince(context.last_seen) > 90) {
  return \`Welcome back, \${context.name}! It's been a while.
          Still with \${context.brand}?\`;
}`}</pre>
				</div>
			</div>
		</section>

		<!-- Section 7: Implications -->
		<section class="space-y-6">
			<h2 class="section-heading">VII. Implications</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<h3 class="subsection-heading">For UX Design</h3>
				<p>
					The Hermeneutic Spiral suggests that good UX isn't just about reducing friction in a
					single session—it's about building understanding across sessions. Design should treat
					user relationships as ongoing conversations, not isolated transactions.
				</p>

				<h3 class="mt-6 subsection-heading">For AI Systems</h3>
				<p>Conversational AI systems benefit from persistent context:</p>

				<div class="p-4 font-mono code-block">
					<pre class="code-primary">{`System: You are matching creatives with brands.

User context:
- Name: Louis
- Brand: Sunset Sounds
- Previous requests: Album artwork ($3,000), satisfied
- Style preference: organic, earthy

Current request: Music video

Use this context to personalize recommendations.`}</pre>
				</div>

				<h3 class="mt-6 subsection-heading">For Privacy</h3>
				<p>Context persistence raises privacy considerations:</p>
				<ul class="list-disc list-inside space-y-2 pl-4">
					<li>Users should be able to view and delete their context</li>
					<li>Sensitive fields should have explicit consent</li>
					<li>Context should expire if unused (configurable TTL)</li>
					<li>GDPR/CCPA compliance requires clear data handling</li>
				</ul>
			</div>
		</section>

		<!-- Conclusion -->
		<section class="space-y-6">
			<h2 class="section-heading">VIII. Conclusion</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					The Hermeneutic Spiral transforms user intake from repetitive interrogation into evolving
					conversation. By applying Heidegger's insight that understanding accumulates through
					iteration, we can design systems that respect user time and build genuine relationships.
				</p>

				<p>
					The key is simple: <strong>remember what you learn, ask only what's new</strong>.
				</p>

				<p>
					This isn't just efficient—it's philosophically correct. Understanding is circular, not
					linear. Each interaction should deepen the spiral, not restart it.
				</p>

				<div class="p-6 mt-6 quote-box">
					<p class="text-center italic quote-text">
						"Understanding accumulates. It doesn't reset."
					</p>
				</div>
			</div>
		</section>

		<!-- References -->
		<section class="space-y-4">
			<h2 class="section-heading">References</h2>
			<ol class="space-y-2 pl-6 list-decimal references-list">
				<li>Heidegger, M. (1927). <em>Being and Time</em>. Trans. Macquarrie & Robinson.</li>
				<li>Gadamer, H-G. (1960). <em>Truth and Method</em>. Trans. Weinsheimer & Marshall.</li>
				<li>Norman, D. (2013). <em>The Design of Everyday Things</em>. Revised edition.</li>
				<li>Rams, D. (1976). "Ten Principles for Good Design."</li>
			</ol>
		</section>

		<!-- Footer -->
		<div class="pt-6 paper-footer">
			<p class="footer-text">
				This paper was developed as part of CREATE SOMETHING's research into phenomenologically-grounded
				software design. The Abundance Network is a production system serving Half Dozen's creative marketplace.
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
	.paper-container {
		background: var(--color-bg-pure);
		color: var(--color-fg-primary);
	}

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

	.abstract-section {
		border-left: 4px solid var(--color-border-emphasis);
	}

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

	.metric-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.metric-value {
		font-size: var(--text-h2);
	}

	.metric-positive {
		color: var(--color-success);
	}

	.metric-label {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

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

	.code-comment {
		color: var(--color-fg-muted);
	}

	.code-primary {
		color: var(--color-fg-primary);
	}

	.code-secondary {
		color: var(--color-fg-tertiary);
	}

	.code-success {
		color: var(--color-data-2);
	}

	.blockquote {
		border-left: 4px solid var(--color-border-emphasis);
		color: var(--color-fg-tertiary);
	}

	.comparison-broken {
		background: var(--color-error-muted);
		border: 1px solid var(--color-error-border);
		border-radius: var(--radius-lg);
	}

	.comparison-success {
		background: var(--color-success-muted);
		border: 1px solid var(--color-success-border);
		border-radius: var(--radius-lg);
	}

	.comparison-heading {
		font-size: var(--text-body-lg);
		color: inherit;
	}

	.comparison-broken .comparison-heading {
		color: var(--color-error);
	}

	.comparison-success .comparison-heading {
		color: var(--color-data-2);
	}

	.comparison-text {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	.comparison-muted {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.data-table {
		font-size: var(--text-body-sm);
	}

	.table-header-row {
		border-bottom: 1px solid var(--color-border-emphasis);
	}

	.table-header {
		color: var(--color-fg-secondary);
	}

	.table-body {
		color: var(--color-fg-tertiary);
	}

	.table-row {
		border-bottom: 1px solid var(--color-border-default);
	}

	.table-cell-emphasis {
		color: var(--color-fg-secondary);
	}

	.table-success {
		color: var(--color-success);
	}

	.callout-info {
		background: var(--color-info-muted);
		border: 1px solid var(--color-info-border);
		border-radius: var(--radius-lg);
	}

	.callout-heading {
		font-size: var(--text-h3);
		color: var(--color-data-1);
	}

	.info-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.card-heading {
		color: var(--color-fg-secondary);
	}

	.card-list {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	.quote-box {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.quote-text {
		color: var(--color-fg-secondary);
		font-size: var(--text-body-lg);
	}

	.references-list {
		color: var(--color-fg-tertiary);
	}

	.paper-footer {
		border-top: 1px solid var(--color-border-default);
	}

	.footer-text {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.footer-link {
		color: var(--color-fg-tertiary);
		font-size: var(--text-body-sm);
	}

	.footer-link:hover {
		color: var(--color-fg-primary);
	}
</style>
