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
			<div class="p-6 modality-card">
				<h3 class="modality-title">1. Spritz: RSVP Speed Reading</h3>
				<p class="body-text mb-4">
					<a href="https://createsomething.io/experiments/spritz" class="body-link">Spritz</a> 
					uses Rapid Serial Visual Presentation to display one word at a time. The Optimal Recognition 
					Point (ORP) is highlighted—the letter where your eye naturally focuses for fastest recognition.
				</p>
				<div class="grid grid-cols-2 gap-4 modality-details">
					<div>
						<strong class="modality-label">Best For:</strong>
						<ul class="modality-list">
							<li>Video intro/transition screens</li>
							<li>Quick principle statements</li>
							<li>Single concepts, mantras</li>
						</ul>
					</div>
					<div>
						<strong class="modality-label">Characteristics:</strong>
						<ul class="modality-list">
							<li>Eliminates eye movement</li>
							<li>200-400+ WPM with 90% comprehension</li>
							<li>Minimal interface, maximal focus</li>
						</ul>
					</div>
				</div>
				<blockquote class="quote-block">
					"Reading is not about eye speed. It's about recognition speed. Fix the eye, stream the words."
				</blockquote>
			</div>

			<!-- Motion Studio -->
			<div class="p-6 modality-card">
				<h3 class="modality-title">2. Motion Studio: Vox-Style Video</h3>
				<p class="body-text mb-4">
					Built on <a href="https://remotion.dev" class="body-link">Remotion</a>, 
					Motion Studio creates programmatic video in the Vox explainer style. Kinetic typography, 
					animated data visualizations, and spring physics bring concepts to life.
				</p>
				<div class="grid grid-cols-2 gap-4 modality-details">
					<div>
						<strong class="modality-label">Best For:</strong>
						<ul class="modality-list">
							<li>Complex concept explanations</li>
							<li>Data-driven narratives</li>
							<li>Walkthrough tutorials</li>
						</ul>
					</div>
					<div>
						<strong class="modality-label">Characteristics:</strong>
						<ul class="modality-list">
							<li>Monochrome aesthetic (Canon-aligned)</li>
							<li>Stack Sans Notch typography</li>
							<li>Scene-based composition</li>
						</ul>
					</div>
				</div>
				<blockquote class="quote-block">
					"Every animation should feel like unveiling—like removing a cover to reveal what was always there."
				</blockquote>
			</div>

			<!-- Learn Platform -->
			<div class="p-6 modality-card">
				<h3 class="modality-title">3. Learn Platform: Interactive Paths</h3>
				<p class="body-text mb-4">
					<a href="https://learn.createsomething.space" class="body-link">learn.createsomething.space</a> 
					offers structured learning paths with the Hermeneutic Spiral: read, practice, reflect, return.
					Eight paths from environment setup to advanced orchestration.
				</p>
				<div class="grid grid-cols-2 gap-4 modality-details">
					<div>
						<strong class="modality-label">Best For:</strong>
						<ul class="modality-list">
							<li>Deep skill building</li>
							<li>Hands-on practice (Praxis)</li>
							<li>Long-term retention</li>
						</ul>
					</div>
					<div>
						<strong class="modality-label">Characteristics:</strong>
						<ul class="modality-list">
							<li>Progress tracking</li>
							<li>Prerequisite dependencies</li>
							<li>Interactive exercises</li>
						</ul>
					</div>
				</div>
				<blockquote class="quote-block">
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
				<table class="hypothesis-table">
					<thead>
						<tr>
							<th>Stage</th>
							<th>Modality</th>
							<th>Why</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td><strong>Awareness</strong></td>
							<td>Spritz</td>
							<td>Fast absorption of core principles, memorable phrases</td>
						</tr>
						<tr>
							<td><strong>Understanding</strong></td>
							<td>Motion Studio</td>
							<td>Visual context, relationships, narrative structure</td>
						</tr>
						<tr>
							<td><strong>Mastery</strong></td>
							<td>Learn Platform</td>
							<td>Deep practice, hands-on application, retention</td>
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
				<div class="p-4 triad-card">
					<h4 class="triad-title">DRY (Don't Repeat Yourself)</h4>
					<p class="triad-text">
						Same content, three presentations. The philosophy is written once, 
						the modality adapts to context.
					</p>
				</div>
				<div class="p-4 triad-card">
					<h4 class="triad-title">Dieter Rams</h4>
					<p class="triad-text">
						Each modality removes what isn't needed. Spritz removes eye movement. 
						Motion removes static walls of text. Learn removes repetitive explanation.
					</p>
				</div>
				<div class="p-4 triad-card">
					<h4 class="triad-title">Heidegger</h4>
					<p class="triad-text">
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
				<div class="p-4 status-card status-complete">
					<div class="status-icon">✓</div>
					<div class="status-title">Spritz</div>
					<div class="status-subtitle">Live at /experiments/spritz</div>
				</div>
				<div class="p-4 status-card status-complete">
					<div class="status-icon">✓</div>
					<div class="status-title">Motion Studio</div>
					<div class="status-subtitle">packages/motion-studio</div>
				</div>
				<div class="p-4 status-card status-complete">
					<div class="status-icon">✓</div>
					<div class="status-title">Learn Platform</div>
					<div class="status-subtitle">learn.createsomething.space</div>
				</div>
			</div>
			<p class="status-note">
				All three modalities are operational. Measurement and optimization ongoing.
			</p>
		</section>

		<!-- Links -->
		<section class="space-y-4 pb-12">
			<h2 class="section-heading">7. Links</h2>
			<ul class="space-y-2">
				<li>
					<a href="https://createsomething.io/experiments/spritz" class="body-link">
						Spritz Experiment →
					</a>
				</li>
				<li>
					<a href="https://learn.createsomething.space" class="body-link">
						Learn Platform →
					</a>
				</li>
				<li>
					<span class="link-muted">Motion Studio: packages/motion-studio (internal)</span>
				</li>
			</ul>
		</section>
	</div>
</div>

<style>
	/* Modality Cards */
	.modality-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-subtle);
		border-radius: var(--radius-lg);
	}
	
	.modality-title {
		font-size: var(--text-h4);
		font-weight: var(--font-semibold);
		margin-bottom: 1rem;
	}
	
	.modality-details {
		font-size: var(--text-body-sm);
	}
	
	.modality-label {
		color: var(--color-fg-muted);
	}
	
	.modality-list {
		list-style: disc;
		list-style-position: inside;
		color: var(--color-fg-secondary);
		margin-top: 0.25rem;
	}
	
	.quote-block {
		margin-top: 1rem;
		padding-left: 1rem;
		border-left: 2px solid var(--color-border-subtle);
		color: var(--color-fg-muted);
		font-style: italic;
	}
	
	/* Triad Cards */
	.triad-card {
		background: var(--color-bg-surface);
		border-radius: var(--radius-lg);
	}
	
	.triad-title {
		font-weight: var(--font-semibold);
		margin-bottom: 0.5rem;
	}
	
	.triad-text {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}
	
	/* Status Cards */
	.status-card {
		border-radius: var(--radius-lg);
	}
	
	.status-complete {
		background: rgba(34, 197, 94, 0.1);
		border: 1px solid rgba(34, 197, 94, 0.3);
	}
	
	.status-icon {
		font-size: var(--text-h3);
		margin-bottom: 0.25rem;
	}
	
	.status-title {
		font-weight: var(--font-semibold);
	}
	
	.status-subtitle {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}
	
	.status-note {
		text-align: center;
		color: var(--color-fg-muted);
		font-size: var(--text-body-sm);
		margin-top: 1rem;
	}
	
	/* Links */
	.link-muted {
		color: var(--color-fg-muted);
	}
	
	/* Hypothesis Table */
	.hypothesis-table {
		width: 100%;
		font-size: var(--text-body-sm);
	}
	
	.hypothesis-table th,
	.hypothesis-table td {
		text-align: left;
		padding: 0.75rem 1rem;
	}
	
	.hypothesis-table thead tr {
		border-bottom: 1px solid var(--color-border-subtle);
	}
	
	.hypothesis-table tbody tr {
		border-bottom: 1px solid var(--color-border-muted);
	}
	
	.hypothesis-table tbody {
		color: var(--color-fg-secondary);
	}
</style>
