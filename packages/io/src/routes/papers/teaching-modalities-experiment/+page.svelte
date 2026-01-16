<script lang="ts">
	/**
	 * Teaching Modalities Experiment
	 *
	 * Exploring three approaches to teaching CREATE SOMETHING:
	 * 1. Spritz - RSVP speed reading
	 * 2. Motion Studio - Vox-style motion graphics
	 * 3. Learn Platform - Interactive structured paths
	 */
</script>

<svelte:head>
	<title>Teaching Modalities Experiment | CREATE SOMETHING.io</title>
	<meta name="description" content="Exploring three modalities for teaching CREATE SOMETHING: Spritz speed reading, Vox-style motion graphics, and interactive learning paths." />
</svelte:head>

<div class="min-h-screen p-6 paper-container">
	<div class="max-w-4xl mx-auto space-y-12">
		<!-- Header -->
		<div class="pb-8 paper-header">
			<div class="font-mono mb-4 paper-id">PAPER-2026-002</div>
			<h1 class="mb-3 paper-title">Teaching Modalities</h1>
			<p class="max-w-3xl paper-subtitle">
				Finding the Right Medium for CREATE SOMETHING: Comparing Spritz, Motion Graphics, and Interactive Learning
			</p>
			<div class="flex gap-4 mt-4 paper-meta">
				<span>Research</span>
				<span>•</span>
				<span>12 min read</span>
				<span>•</span>
				<span>Intermediate</span>
			</div>
		</div>

		<!-- Abstract -->
		<section class="pl-6 space-y-4 abstract-section">
			<h2 class="section-heading">Abstract</h2>
			<p class="leading-relaxed body-text">
				How do you teach a philosophy? The CREATE SOMETHING ethos—rooted in the Subtractive Triad 
				of DRY, Dieter Rams, and Heidegger—requires more than documentation. We're exploring three 
				distinct modalities: <strong>Spritz</strong> for rapid text absorption, <strong>Motion Studio</strong> 
				for visual storytelling, and the <strong>Learn Platform</strong> for deep interactive practice. 
				This paper documents our experiment in finding which modality serves which purpose.
			</p>
		</section>

		<!-- Metrics -->
		<section class="grid grid-cols-2 md:grid-cols-4 gap-4">
			<div class="p-4 metric-card">
				<div class="metric-value">3</div>
				<div class="metric-label">Modalities</div>
			</div>
			<div class="p-4 metric-card">
				<div class="metric-value">✓</div>
				<div class="metric-label">All Operational</div>
			</div>
			<div class="p-4 metric-card">
				<div class="metric-value">8</div>
				<div class="metric-label">Learning Paths</div>
			</div>
			<div class="p-4 metric-card">
				<div class="metric-value">400+</div>
				<div class="metric-label">Spritz WPM</div>
			</div>
		</section>

		<!-- The Three Modalities -->
		<section class="space-y-8">
			<h2 class="section-heading">1. The Three Modalities</h2>
			
			<!-- Spritz -->
			<div class="p-6 bg-neutral-900 rounded-lg border border-neutral-800">
				<h3 class="text-xl font-semibold mb-4">1. Spritz: RSVP Speed Reading</h3>
				<p class="body-text mb-4">
					<a href="https://createsomething.io/experiments/spritz" class="text-blue-400 hover:underline">Spritz</a> 
					uses Rapid Serial Visual Presentation to display one word at a time. The Optimal Recognition 
					Point (ORP) is highlighted—the letter where your eye naturally focuses for fastest recognition.
				</p>
				<div class="grid grid-cols-2 gap-4 text-sm">
					<div>
						<strong class="text-neutral-400">Best For:</strong>
						<ul class="list-disc list-inside text-neutral-300 mt-1">
							<li>Video intro/transition screens</li>
							<li>Quick principle statements</li>
							<li>Single concepts, mantras</li>
						</ul>
					</div>
					<div>
						<strong class="text-neutral-400">Characteristics:</strong>
						<ul class="list-disc list-inside text-neutral-300 mt-1">
							<li>Eliminates eye movement</li>
							<li>200-400+ WPM with 90% comprehension</li>
							<li>Minimal interface, maximal focus</li>
						</ul>
					</div>
				</div>
				<blockquote class="mt-4 pl-4 border-l-2 border-neutral-600 text-neutral-400 italic">
					"Reading is not about eye speed. It's about recognition speed. Fix the eye, stream the words."
				</blockquote>
			</div>

			<!-- Motion Studio -->
			<div class="p-6 bg-neutral-900 rounded-lg border border-neutral-800">
				<h3 class="text-xl font-semibold mb-4">2. Motion Studio: Vox-Style Video</h3>
				<p class="body-text mb-4">
					Built on <a href="https://remotion.dev" class="text-blue-400 hover:underline">Remotion</a>, 
					Motion Studio creates programmatic video in the Vox explainer style. Kinetic typography, 
					animated data visualizations, and spring physics bring concepts to life.
				</p>
				<div class="grid grid-cols-2 gap-4 text-sm">
					<div>
						<strong class="text-neutral-400">Best For:</strong>
						<ul class="list-disc list-inside text-neutral-300 mt-1">
							<li>Complex concept explanations</li>
							<li>Data-driven narratives</li>
							<li>Walkthrough tutorials</li>
						</ul>
					</div>
					<div>
						<strong class="text-neutral-400">Characteristics:</strong>
						<ul class="list-disc list-inside text-neutral-300 mt-1">
							<li>Monochrome aesthetic (Canon-aligned)</li>
							<li>Stack Sans Notch typography</li>
							<li>Scene-based composition</li>
						</ul>
					</div>
				</div>
				<blockquote class="mt-4 pl-4 border-l-2 border-neutral-600 text-neutral-400 italic">
					"Every animation should feel like unveiling—like removing a cover to reveal what was always there."
				</blockquote>
			</div>

			<!-- Learn Platform -->
			<div class="p-6 bg-neutral-900 rounded-lg border border-neutral-800">
				<h3 class="text-xl font-semibold mb-4">3. Learn Platform: Interactive Paths</h3>
				<p class="body-text mb-4">
					<a href="https://learn.createsomething.space" class="text-blue-400 hover:underline">learn.createsomething.space</a> 
					offers structured learning paths with the Hermeneutic Spiral: read, practice, reflect, return.
					Eight paths from environment setup to advanced orchestration.
				</p>
				<div class="grid grid-cols-2 gap-4 text-sm">
					<div>
						<strong class="text-neutral-400">Best For:</strong>
						<ul class="list-disc list-inside text-neutral-300 mt-1">
							<li>Deep skill building</li>
							<li>Hands-on practice (Praxis)</li>
							<li>Long-term retention</li>
						</ul>
					</div>
					<div>
						<strong class="text-neutral-400">Characteristics:</strong>
						<ul class="list-disc list-inside text-neutral-300 mt-1">
							<li>Progress tracking</li>
							<li>Prerequisite dependencies</li>
							<li>Interactive exercises</li>
						</ul>
					</div>
				</div>
				<blockquote class="mt-4 pl-4 border-l-2 border-neutral-600 text-neutral-400 italic">
					"Learning is not linear. Each return to a concept deepens understanding."
				</blockquote>
			</div>
		</section>

		<!-- Hypothesis -->
		<section class="space-y-4">
			<h2 class="section-heading">2. Hypothesis</h2>
			<p class="body-text">
				Different modalities serve different cognitive needs along the awareness → understanding → mastery journey:
			</p>
			
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b border-neutral-700">
							<th class="text-left py-3 px-4">Stage</th>
							<th class="text-left py-3 px-4">Modality</th>
							<th class="text-left py-3 px-4">Why</th>
						</tr>
					</thead>
					<tbody class="text-neutral-300">
						<tr class="border-b border-neutral-800">
							<td class="py-3 px-4 font-medium">Awareness</td>
							<td class="py-3 px-4">Spritz</td>
							<td class="py-3 px-4">Fast absorption of core principles, memorable phrases</td>
						</tr>
						<tr class="border-b border-neutral-800">
							<td class="py-3 px-4 font-medium">Understanding</td>
							<td class="py-3 px-4">Motion Studio</td>
							<td class="py-3 px-4">Visual context, relationships, narrative structure</td>
						</tr>
						<tr class="border-b border-neutral-800">
							<td class="py-3 px-4 font-medium">Mastery</td>
							<td class="py-3 px-4">Learn Platform</td>
							<td class="py-3 px-4">Deep practice, hands-on application, retention</td>
						</tr>
					</tbody>
				</table>
			</div>
		</section>

		<!-- Research Questions -->
		<section class="space-y-4">
			<h2 class="section-heading">3. Research Questions</h2>
			<ol class="list-decimal list-inside space-y-3 body-text">
				<li>Which modality produces highest retention for <em>principles</em> vs <em>practices</em>?</li>
				<li>Can modalities be combined? (e.g., Spritz for video intros within Motion Studio)</li>
				<li>What's the optimal sequence through modalities for a new learner?</li>
				<li>How does engagement differ by content type (philosophy vs technical)?</li>
			</ol>
		</section>

		<!-- Methodology -->
		<section class="space-y-4">
			<h2 class="section-heading">4. Methodology</h2>
			<p class="body-text">
				This is an ongoing experiment. We're tracking:
			</p>
			<ul class="list-disc list-inside space-y-2 body-text">
				<li><strong>Completion rates</strong> across modalities</li>
				<li><strong>Time to concept application</strong> (how quickly learners use what they learned)</li>
				<li><strong>Return visits</strong> (which modality brings people back)</li>
				<li><strong>Cross-modality flow</strong> (do users who start with Spritz move to Learn?)</li>
			</ul>
		</section>

		<!-- Subtractive Alignment -->
		<section class="space-y-4">
			<h2 class="section-heading">5. Alignment with Subtractive Triad</h2>
			<div class="grid md:grid-cols-3 gap-4">
				<div class="p-4 bg-neutral-900 rounded-lg">
					<h4 class="font-semibold mb-2">DRY (Don't Repeat Yourself)</h4>
					<p class="text-sm text-neutral-400">
						Same content, three presentations. The philosophy is written once, 
						the modality adapts to context.
					</p>
				</div>
				<div class="p-4 bg-neutral-900 rounded-lg">
					<h4 class="font-semibold mb-2">Dieter Rams</h4>
					<p class="text-sm text-neutral-400">
						Each modality removes what isn't needed. Spritz removes eye movement. 
						Motion removes static walls of text. Learn removes repetitive explanation.
					</p>
				</div>
				<div class="p-4 bg-neutral-900 rounded-lg">
					<h4 class="font-semibold mb-2">Heidegger</h4>
					<p class="text-sm text-neutral-400">
						The tool recedes into transparent use. When learning flows, you don't 
						see the modality—you see understanding.
					</p>
				</div>
			</div>
		</section>

		<!-- Status -->
		<section class="space-y-4">
			<h2 class="section-heading">6. Current Status</h2>
			<div class="grid md:grid-cols-3 gap-4 text-center">
				<div class="p-4 bg-green-900/20 border border-green-800 rounded-lg">
					<div class="text-2xl mb-1">✓</div>
					<div class="font-semibold">Spritz</div>
					<div class="text-sm text-neutral-400">Live at /experiments/spritz</div>
				</div>
				<div class="p-4 bg-green-900/20 border border-green-800 rounded-lg">
					<div class="text-2xl mb-1">✓</div>
					<div class="font-semibold">Motion Studio</div>
					<div class="text-sm text-neutral-400">packages/motion-studio</div>
				</div>
				<div class="p-4 bg-green-900/20 border border-green-800 rounded-lg">
					<div class="text-2xl mb-1">✓</div>
					<div class="font-semibold">Learn Platform</div>
					<div class="text-sm text-neutral-400">learn.createsomething.space</div>
				</div>
			</div>
			<p class="text-center text-neutral-400 text-sm mt-4">
				All three modalities are operational. Measurement and optimization ongoing.
			</p>
		</section>

		<!-- Links -->
		<section class="space-y-4 pb-12">
			<h2 class="section-heading">7. Links</h2>
			<ul class="space-y-2">
				<li>
					<a href="https://createsomething.io/experiments/spritz" class="text-blue-400 hover:underline">
						Spritz Experiment →
					</a>
				</li>
				<li>
					<a href="https://learn.createsomething.space" class="text-blue-400 hover:underline">
						Learn Platform →
					</a>
				</li>
				<li>
					<span class="text-neutral-500">Motion Studio: packages/motion-studio (internal)</span>
				</li>
			</ul>
		</section>
	</div>
</div>
