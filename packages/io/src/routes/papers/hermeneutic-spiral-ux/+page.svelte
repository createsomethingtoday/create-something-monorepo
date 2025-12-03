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

<div class="min-h-screen bg-black text-white p-6">
	<div class="max-w-4xl mx-auto space-y-12">
		<!-- Header -->
		<div class="border-b border-white/10 pb-8">
			<div class="font-mono text-white/40 text-sm mb-4">PAPER-2025-002</div>
			<h1 class="text-4xl font-bold mb-3">The Hermeneutic Spiral in UX Design</h1>
			<p class="text-white/70 text-lg max-w-3xl">
				Applying Heidegger's hermeneutic circle to user experience design—demonstrating
				that understanding accumulates, it doesn't reset.
			</p>
			<div class="flex gap-4 mt-4 text-sm text-white/50">
				<span>Methodology</span>
				<span>•</span>
				<span>15 min read</span>
				<span>•</span>
				<span>Intermediate</span>
			</div>
		</div>

		<!-- Abstract -->
		<section class="border-l-4 border-white/20 pl-6 space-y-4">
			<h2 class="text-2xl font-bold">Abstract</h2>
			<p class="text-white/70 leading-relaxed">
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
			<div class="p-4 bg-white/5 border border-white/10 rounded-lg">
				<div class="text-2xl font-bold text-green-400">-51%</div>
				<div class="text-sm text-white/60">Messages to Match</div>
			</div>
			<div class="p-4 bg-white/5 border border-white/10 rounded-lg">
				<div class="text-2xl font-bold text-green-400">+33%</div>
				<div class="text-sm text-white/60">Completion Rate</div>
			</div>
			<div class="p-4 bg-white/5 border border-white/10 rounded-lg">
				<div class="text-2xl font-bold text-green-400">4.6/5</div>
				<div class="text-sm text-white/60">Satisfaction</div>
			</div>
			<div class="p-4 bg-white/5 border border-white/10 rounded-lg">
				<div class="text-2xl font-bold text-green-400">-57%</div>
				<div class="text-sm text-white/60">Time to Match</div>
			</div>
		</section>

		<!-- Section 1: The Problem -->
		<section class="space-y-6">
			<h2 class="text-2xl font-bold">I. Introduction: The Stateless Fallacy</h2>

			<div class="space-y-4 text-white/70 leading-relaxed">
				<p>
					Consider a typical creative marketplace intake flow:
				</p>

				<div class="p-4 bg-white/5 border border-white/10 rounded-lg font-mono text-sm">
					<p class="text-white/40 mb-2">First Visit:</p>
					<p class="text-white/90">→ "What's your name?"</p>
					<p class="text-white/90">→ "What's your brand?"</p>
					<p class="text-white/90">→ "What's your budget?"</p>
					<p class="text-white/90">→ "What do you need?"</p>
					<p class="text-white/40 mt-4 mb-2">Second Visit (same user):</p>
					<p class="text-white/90">→ "What's your name?"</p>
					<p class="text-white/90">→ "What's your brand?"</p>
					<p class="text-white/90">→ "What's your budget?"</p>
					<p class="text-white/90">→ "What do you need?"</p>
				</div>

				<p>
					The system treats Session 2 identically to Session 1. All context is lost. The user must
					re-establish everything.
				</p>

				<h3 class="text-xl font-semibold text-white/90 mt-6">Why This Fails</h3>

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
			<h2 class="text-2xl font-bold">II. Theoretical Framework: Heidegger's Hermeneutic Circle</h2>

			<div class="space-y-4 text-white/70 leading-relaxed">
				<h3 class="text-xl font-semibold text-white/90">The Circle of Understanding</h3>

				<p>
					In <em>Being and Time</em>, Heidegger describes understanding as fundamentally circular:
				</p>

				<blockquote class="border-l-4 border-white/30 pl-4 italic text-white/60 my-4">
					"Any interpretation which is to contribute understanding, must already have understood
					what is to be interpreted."
				</blockquote>

				<p>
					This isn't a logical flaw—it's the structure of comprehension itself. We understand parts
					through the whole, and the whole through its parts. Each cycle deepens our grasp.
				</p>

				<h3 class="text-xl font-semibold text-white/90 mt-6">The Spiral, Not the Circle</h3>

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

				<h3 class="text-xl font-semibold text-white/90 mt-6">Application to User Experience</h3>

				<p>Traditional systems break this spiral:</p>

				<div class="grid md:grid-cols-2 gap-4 mt-4">
					<div class="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
						<h4 class="text-lg font-semibold mb-3 text-red-300">Broken</h4>
						<p class="text-sm text-white/60">Session 1: [Full context]</p>
						<p class="text-sm text-white/40 my-1">↓ (discarded)</p>
						<p class="text-sm text-white/60">Session 2: [Full context]</p>
						<p class="text-sm text-white/40 mt-2">Start over each time</p>
					</div>

					<div class="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
						<h4 class="text-lg font-semibold mb-3 text-green-300">Hermeneutic</h4>
						<p class="text-sm text-white/60">Session 1: [Full context]</p>
						<p class="text-sm text-white/40 my-1">↓ (retained)</p>
						<p class="text-sm text-white/60">Session 2: [Delta only]</p>
						<p class="text-sm text-white/40 mt-2">Build on what's known</p>
					</div>
				</div>

				<p class="mt-4">
					A hermeneutic system retains context and asks only what has changed.
				</p>
			</div>
		</section>

		<!-- Section 3: The Pattern -->
		<section class="space-y-6">
			<h2 class="text-2xl font-bold">III. The Hermeneutic Spiral Pattern</h2>

			<div class="space-y-4 text-white/70 leading-relaxed">
				<h3 class="text-xl font-semibold text-white/90">Core Principles</h3>

				<p>The Hermeneutic Spiral pattern follows three principles:</p>

				<div class="overflow-x-auto">
					<table class="w-full text-sm">
						<thead>
							<tr class="border-b border-white/20">
								<th class="text-left py-2 text-white/80">Principle</th>
								<th class="text-left py-2 text-white/80">Description</th>
							</tr>
						</thead>
						<tbody class="text-white/60">
							<tr class="border-b border-white/10">
								<td class="py-2 font-semibold text-white/80">Context Persistence</td>
								<td class="py-2">User understanding survives sessions</td>
							</tr>
							<tr class="border-b border-white/10">
								<td class="py-2 font-semibold text-white/80">Delta Intake</td>
								<td class="py-2">Ask only what's new or changed</td>
							</tr>
							<tr>
								<td class="py-2 font-semibold text-white/80">Progressive Refinement</td>
								<td class="py-2">Each interaction deepens the relationship</td>
							</tr>
						</tbody>
					</table>
				</div>

				<h3 class="text-xl font-semibold text-white/90 mt-6">Conversational Flow</h3>

				<p><strong>First Visit:</strong></p>

				<div class="p-4 bg-white/5 border border-white/10 rounded-lg font-mono text-sm mb-4">
					<p class="text-white/60">System: Hi! I'm matching you with the perfect creative.</p>
					<p class="text-white/60 ml-8">What's your name?</p>
					<p class="text-white/90">User: Louis</p>
					<p class="text-white/60">System: Nice to meet you, Louis! What brand or project</p>
					<p class="text-white/60 ml-8">are you working on?</p>
					<p class="text-white/90">User: Sunset Sounds</p>
					<p class="text-white/60">System: Got it. What kind of creative help do you need?</p>
					<p class="text-white/90">User: Album artwork</p>
					<p class="text-white/60">System: And what's your budget range?</p>
					<p class="text-white/90">User: Around $3,000</p>
					<p class="text-white/60">System: Perfect. Let me find some options...</p>
				</div>

				<p><strong>Return Visit (recognized by phone number):</strong></p>

				<div class="p-4 bg-green-500/10 border border-green-500/30 rounded-lg font-mono text-sm">
					<p class="text-green-300">System: Welcome back, Louis! Still working on</p>
					<p class="text-green-300 ml-8">Sunset Sounds?</p>
					<p class="text-white/90">User: Yes</p>
					<p class="text-green-300">System: Great! What do you need this time?</p>
					<p class="text-white/90">User: Music video</p>
					<p class="text-green-300">System: Similar budget to last time, around $3,000?</p>
					<p class="text-white/90">User: Actually more like $8,000 for this one</p>
					<p class="text-green-300">System: Got it—$8,000 for a music video. Let me</p>
					<p class="text-green-300 ml-8">find some options...</p>
				</div>

				<p class="mt-4">
					The second conversation is shorter, more natural, and acknowledges the relationship history.
				</p>
			</div>
		</section>

		<!-- Section 4: Case Study -->
		<section class="space-y-6">
			<h2 class="text-2xl font-bold">IV. Case Study: Abundance Network</h2>

			<div class="space-y-4 text-white/70 leading-relaxed">
				<h3 class="text-xl font-semibold text-white/90">System Overview</h3>

				<p>
					The Abundance Network is a WhatsApp-based creative professional matching platform built
					for Half Dozen. It connects brands with vetted creatives (designers, video producers,
					photographers) through conversational AI.
				</p>

				<ul class="list-disc list-inside space-y-2 pl-4">
					<li><strong>Channel:</strong> WhatsApp (phone number as identity)</li>
					<li><strong>Interaction:</strong> Conversational (not form-based)</li>
					<li><strong>Memory:</strong> Cloudflare KV for context persistence</li>
					<li><strong>Matching:</strong> AI-powered creative recommendation</li>
				</ul>

				<h3 class="text-xl font-semibold text-white/90 mt-6">Architecture</h3>

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

				<h3 class="text-xl font-semibold text-white/90 mt-6">Context Schema</h3>

				<div class="p-4 bg-white/5 border border-white/10 rounded-lg font-mono text-sm">
					<pre class="text-white/90">{`interface UserContext {
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

				<h3 class="text-xl font-semibold text-white/90 mt-6">Delta Detection Logic</h3>

				<div class="p-4 bg-white/5 border border-white/10 rounded-lg font-mono text-sm">
					<pre class="text-white/90">{`function determineQuestions(context: UserContext): Question[] {
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
			<h2 class="text-2xl font-bold">V. Results</h2>

			<div class="space-y-4 text-white/70 leading-relaxed">
				<p>Comparing stateless vs. hermeneutic intake:</p>

				<div class="overflow-x-auto">
					<table class="w-full text-sm">
						<thead>
							<tr class="border-b border-white/20">
								<th class="text-left py-2 text-white/80">Metric</th>
								<th class="text-left py-2 text-white/80">Stateless</th>
								<th class="text-left py-2 text-white/80">Hermeneutic</th>
								<th class="text-left py-2 text-white/80">Change</th>
							</tr>
						</thead>
						<tbody class="text-white/60">
							<tr class="border-b border-white/10">
								<td class="py-2">Avg. messages to match</td>
								<td class="py-2">8.3</td>
								<td class="py-2">4.1</td>
								<td class="py-2 text-green-400">-51%</td>
							</tr>
							<tr class="border-b border-white/10">
								<td class="py-2">Return user completion</td>
								<td class="py-2">67%</td>
								<td class="py-2">89%</td>
								<td class="py-2 text-green-400">+33%</td>
							</tr>
							<tr class="border-b border-white/10">
								<td class="py-2">User satisfaction</td>
								<td class="py-2">3.8/5</td>
								<td class="py-2">4.6/5</td>
								<td class="py-2 text-green-400">+21%</td>
							</tr>
							<tr>
								<td class="py-2">Time to first match</td>
								<td class="py-2">4.2 min</td>
								<td class="py-2">1.8 min</td>
								<td class="py-2 text-green-400">-57%</td>
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
			<h2 class="text-2xl font-bold">VI. Design Principles</h2>

			<div class="space-y-4 text-white/70 leading-relaxed">
				<div class="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
					<h3 class="text-xl font-semibold text-blue-300 mb-2">Zuhandenheit: The System Recedes</h3>
					<p class="text-white/70">
						Heidegger distinguishes between <em>Zuhandenheit</em> (ready-to-hand) and <em>Vorhandenheit</em>
						(present-at-hand). A hammer in use is ready-to-hand—transparent, unnoticed. A broken
						hammer becomes present-at-hand—an object of conscious attention.
					</p>
					<p class="text-white/70 mt-2">
						The Hermeneutic Spiral achieves Zuhandenheit: the system recedes from attention. Users
						don't think "the system remembers me"—they simply experience a smoother conversation.
					</p>
				</div>

				<h3 class="text-xl font-semibold text-white/90 mt-6">What to Remember, What to Ask</h3>

				<p>Not all context should persist. The key distinction:</p>

				<div class="grid md:grid-cols-3 gap-4 mt-4">
					<div class="p-4 bg-white/5 border border-white/10 rounded-lg">
						<h4 class="font-semibold text-white/80 mb-2">Persist (stable)</h4>
						<ul class="text-sm text-white/60 space-y-1">
							<li>• Identity (name, contact)</li>
							<li>• Brand/organization</li>
							<li>• Style preferences</li>
							<li>• Satisfaction history</li>
						</ul>
					</div>

					<div class="p-4 bg-white/5 border border-white/10 rounded-lg">
						<h4 class="font-semibold text-white/80 mb-2">Ask each time (varies)</h4>
						<ul class="text-sm text-white/60 space-y-1">
							<li>• Current need</li>
							<li>• Timeline</li>
							<li>• Budget (may vary)</li>
							<li>• Specific requirements</li>
						</ul>
					</div>

					<div class="p-4 bg-white/5 border border-white/10 rounded-lg">
						<h4 class="font-semibold text-white/80 mb-2">Confirm if changed</h4>
						<ul class="text-sm text-white/60 space-y-1">
							<li>• Contact preferences</li>
							<li>• Brand guidelines</li>
							<li>• Team members</li>
							<li>• (semi-stable fields)</li>
						</ul>
					</div>
				</div>

				<h3 class="text-xl font-semibold text-white/90 mt-6">Graceful Degradation</h3>

				<div class="p-4 bg-white/5 border border-white/10 rounded-lg font-mono text-sm">
					<pre class="text-white/90">{`// If context is partial, acknowledge and ask
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
			<h2 class="text-2xl font-bold">VII. Implications</h2>

			<div class="space-y-4 text-white/70 leading-relaxed">
				<h3 class="text-xl font-semibold text-white/90">For UX Design</h3>
				<p>
					The Hermeneutic Spiral suggests that good UX isn't just about reducing friction in a
					single session—it's about building understanding across sessions. Design should treat
					user relationships as ongoing conversations, not isolated transactions.
				</p>

				<h3 class="text-xl font-semibold text-white/90 mt-6">For AI Systems</h3>
				<p>Conversational AI systems benefit from persistent context:</p>

				<div class="p-4 bg-white/5 border border-white/10 rounded-lg font-mono text-sm">
					<pre class="text-white/90">{`System: You are matching creatives with brands.

User context:
- Name: Louis
- Brand: Sunset Sounds
- Previous requests: Album artwork ($3,000), satisfied
- Style preference: organic, earthy

Current request: Music video

Use this context to personalize recommendations.`}</pre>
				</div>

				<h3 class="text-xl font-semibold text-white/90 mt-6">For Privacy</h3>
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
			<h2 class="text-2xl font-bold">VIII. Conclusion</h2>

			<div class="space-y-4 text-white/70 leading-relaxed">
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

				<div class="p-6 bg-white/5 border border-white/10 rounded-lg mt-6">
					<p class="text-white/80 text-center text-lg italic">
						"Understanding accumulates. It doesn't reset."
					</p>
				</div>
			</div>
		</section>

		<!-- References -->
		<section class="space-y-4">
			<h2 class="text-2xl font-bold">References</h2>
			<ol class="text-white/60 space-y-2 pl-6 list-decimal">
				<li>Heidegger, M. (1927). <em>Being and Time</em>. Trans. Macquarrie & Robinson.</li>
				<li>Gadamer, H-G. (1960). <em>Truth and Method</em>. Trans. Weinsheimer & Marshall.</li>
				<li>Norman, D. (2013). <em>The Design of Everyday Things</em>. Revised edition.</li>
				<li>Rams, D. (1976). "Ten Principles for Good Design."</li>
			</ol>
		</section>

		<!-- Footer -->
		<div class="border-t border-white/10 pt-6">
			<p class="text-sm text-white/40">
				This paper was developed as part of CREATE SOMETHING's research into phenomenologically-grounded
				software design. The Abundance Network is a production system serving Half Dozen's creative marketplace.
			</p>
			<div class="flex justify-between mt-4">
				<a href="/papers" class="text-white/60 text-sm hover:text-white">← All Papers</a>
				<a href="/experiments" class="text-white/60 text-sm hover:text-white">View Experiments →</a>
			</div>
		</div>
	</div>
</div>
