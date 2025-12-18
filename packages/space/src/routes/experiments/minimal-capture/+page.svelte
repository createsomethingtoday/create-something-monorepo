<script lang="ts">
	/**
	 * Minimal Capture: The Canon's Reach
	 *
	 * An experiment in propagation—when tools built for others
	 * absorb the ethos without being asked.
	 *
	 * "Weniger, aber besser" is not a style. It's a way of seeing.
	 */

	const liveUrl = 'https://minimal-capture.pages.dev';
	const adminUrl = 'https://minimal-capture.pages.dev/admin';
</script>

<svelte:head>
	<title>Minimal Capture | CREATE SOMETHING SPACE</title>
	<meta
		name="description"
		content="An experiment in propagation: when tools built for others absorb the design canon."
	/>
</svelte:head>

<!-- ASCII Art Hero -->
<section class="relative pt-24 pb-8 px-6">
	<div class="max-w-4xl mx-auto">
		<div class="ascii-container overflow-hidden">
			<div class="aspect-[21/9] flex items-center justify-center p-8">
				<pre class="ascii-art leading-[1.3] font-mono select-none">{`
    +-------------------------------------------------+
    |   MINIMAL CAPTURE                               |
    |                                                 |
    |   [QR] ──► [Form] ──► [D1] ──► [Admin]          |
    |                                                 |
    |   Built for another,                            |
    |   absorbed the canon.                           |
    |                                                 |
    |   The ethos propagates                          |
    |   beyond the boundary.                          |
    +-------------------------------------------------+
`}</pre>
			</div>
		</div>
	</div>
</section>

<!-- Hero -->
<section class="relative pb-12 px-6">
	<div class="max-w-4xl mx-auto text-center space-y-4">
		<h1 class="hero-title">Minimal Capture</h1>
		<p class="hero-subtitle italic">The Canon's Reach</p>
		<p class="hero-description max-w-2xl mx-auto">
			An experiment in propagation: what happens when tools built for others—outside the
			practice—unconsciously absorb the design canon?
		</p>
	</div>
</section>

<!-- The Experiment -->
<section class="px-6 pb-12">
	<div class="max-w-4xl mx-auto space-y-12">
		<!-- Hypothesis -->
		<div class="content-card p-6 space-y-4">
			<div class="flex items-center justify-between">
				<h2 class="section-title">The Hypothesis</h2>
				<span class="label-text">HERMENEUTICS</span>
			</div>
			<p class="body-text leading-relaxed">
				If "weniger, aber besser" is truly internalized—not as aesthetic preference but as
				<em>way of seeing</em>—then it will propagate even to projects outside the creative practice.
				Tools built as gifts for others will still embody the canon.
			</p>
			<p class="caption-text">
				This tests whether the hermeneutic circle is self-sustaining: does understanding the whole
				(CREATE SOMETHING ethos) change how we approach every part (any project)?
			</p>
		</div>

		<!-- The Artifact -->
		<div class="content-card p-6 space-y-6">
			<div class="flex items-center justify-between">
				<h2 class="section-title">The Artifact</h2>
				<span class="label-text">ZUHANDENHEIT</span>
			</div>

			<div class="grid md:grid-cols-2 gap-6">
				<div class="space-y-3">
					<h3 class="body-text font-medium">What Was Built</h3>
					<p class="caption-text">
						A QR-based contact capture system. Scan → Fill → Store → Retrieve. Built for someone
						outside the practice who needed to collect contact information at events.
					</p>
					<div class="pt-2">
						<a
							href={liveUrl}
							target="_blank"
							rel="noopener noreferrer"
							class="cta-button inline-flex items-center gap-2 px-4 py-2"
						>
							View Live Form
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
								/>
							</svg>
						</a>
					</div>
				</div>

				<div class="space-y-3">
					<h3 class="body-text font-medium">The Flow</h3>
					<div class="code-text space-y-1">
						<p class="code-line-label">1. QR Code → Public Form</p>
						<p class="code-line-comment pl-4">Light theme, minimal fields</p>
						<p class="code-line-label">2. Form → D1 Database</p>
						<p class="code-line-comment pl-4">Name, email, phone (optional)</p>
						<p class="code-line-label">3. Admin → Dark Dashboard</p>
						<p class="code-line-comment pl-4">Search, copy, call, email, delete</p>
					</div>
				</div>
			</div>
		</div>

		<!-- Evidence of Propagation -->
		<div class="content-card p-6 space-y-6">
			<div class="flex items-center justify-between">
				<h2 class="section-title">Evidence of Propagation</h2>
				<span class="label-text">ALETHEIA</span>
			</div>

			<p class="caption-text">
				Without being asked, the project absorbed these CREATE SOMETHING principles:
			</p>

			<div class="grid md:grid-cols-2 gap-4">
				<div class="insight-card p-4 space-y-2">
					<h3 class="insight-title">Typography</h3>
					<p class="caption-text">
						Stack Sans Notch + JetBrains Mono. The same fonts from .ltd and .space appeared without
						explicit request.
					</p>
				</div>

				<div class="insight-card p-4 space-y-2">
					<h3 class="insight-title">Color System</h3>
					<p class="caption-text">
						Achromatic palette. Dark admin, light public. No decorative color—only functional
						states (success green, error red).
					</p>
				</div>

				<div class="insight-card p-4 space-y-2">
					<h3 class="insight-title">Spacing</h3>
					<p class="caption-text">
						Golden ratio tokens (1.618rem, 2.618rem). The same mathematical foundation as the canon.
					</p>
				</div>

				<div class="insight-card p-4 space-y-2">
					<h3 class="insight-title">Interaction</h3>
					<p class="caption-text">
						Tap to action (mailto:, tel:). No intermediate confirmation. Trust the user's intent.
					</p>
				</div>
			</div>

			<div class="border-card p-4">
				<p class="quote-text">
					"The tool recedes. The task emerges."
				</p>
				<p class="note-text mt-2">
					This is Zuhandenheit—ready-to-hand. The interface disappears into use. The same principle
					we apply to .io tools appeared here unbidden.
				</p>
			</div>
		</div>

		<!-- Hermeneutic Analysis -->
		<div class="content-card p-6 space-y-6">
			<div class="flex items-center justify-between">
				<h2 class="section-title">Hermeneutic Analysis</h2>
				<span class="label-text">INTERPRETATION</span>
			</div>

			<div class="analysis-text space-y-4">
				<p>
					<strong class="emphasis-text">Vorhabe (fore-having):</strong> We approached this as external—"my
					brother's need"—and placed it outside the monorepo. It was Vorhandenheit: present-at-hand,
					a tool for someone else.
				</p>
				<p>
					<strong class="emphasis-text">Vorsicht (fore-sight):</strong> But the project absorbed the
					canon without being asked. The fonts appeared. The spacing appeared. The achromatic palette
					appeared. The interaction patterns appeared.
				</p>
				<p>
					<strong class="emphasis-text">Vorgriff (fore-conception):</strong> The meaning shifted. This
					isn't "a contact form"—it's proof that the ethos propagates. The hermeneutic circle is
					self-sustaining.
				</p>
			</div>

			<div class="insight-box p-4">
				<p class="insight-box-title mb-2">The Insight</p>
				<p class="insight-box-text">
					The project's origin as <em>gift</em> (Heidegger's Gabe) is itself significant. We build tools
					through care for others (Sorge), and those tools return to inform our understanding. The canon
					doesn't stay within boundaries—it flows outward through every act of creation.
				</p>
			</div>
		</div>

		<!-- Technical Stack -->
		<div class="content-card p-6 space-y-4">
			<div class="flex items-center justify-between">
				<h2 class="section-title">Technical Stack</h2>
				<span class="label-text">SEIN</span>
			</div>

			<div class="grid md:grid-cols-3 gap-4 stack-grid">
				<div class="metric-card p-3">
					<div class="label-text">Framework</div>
					<div class="insight-title">SvelteKit + Svelte 5</div>
				</div>
				<div class="metric-card p-3">
					<div class="label-text">Deployment</div>
					<div class="insight-title">Cloudflare Pages</div>
				</div>
				<div class="metric-card p-3">
					<div class="label-text">Database</div>
					<div class="insight-title">Cloudflare D1</div>
				</div>
			</div>

			<div class="source-text">
				Source: <code class="source-code">FREELANCE/contact-capture</code> (outside monorepo, by design)
			</div>
		</div>

		<!-- Conclusion -->
		<div class="content-card p-6 space-y-4">
			<h2 class="section-title">Conclusion</h2>
			<p class="body-text leading-relaxed">
				The hypothesis is confirmed. "Weniger, aber besser" is not a style to be applied—it's a lens
				through which all projects are seen. The canon propagates because it has become the default
				mode of creation.
			</p>
			<p class="caption-text">
				This experiment suggests that the hermeneutic circle of CREATE SOMETHING extends beyond its
				formal boundaries. Every tool built with care carries the ethos forward.
			</p>
		</div>

		<!-- Links -->
		<div class="flex flex-wrap gap-4 justify-center">
			<a
				href={liveUrl}
				target="_blank"
				rel="noopener noreferrer"
				class="cta-button px-6 py-3"
			>
				Try the Form
			</a>
			<a
				href="/experiments"
				class="secondary-button px-6 py-3"
			>
				All Experiments
			</a>
		</div>
	</div>
</section>

<style>
  .ascii-container {
    background: var(--color-bg-pure);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-lg);
  }

  .ascii-art {
    color: var(--color-fg-secondary);
    font-size: clamp(0.7rem, 2vw, 1rem);
  }

  .hero-title {
    font-size: var(--text-h1);
    font-weight: 700;
    color: var(--color-fg-primary);
  }

  .hero-subtitle {
    font-size: var(--text-body-lg);
    color: var(--color-fg-secondary);
  }

  .hero-description {
    color: var(--color-fg-muted);
  }

  .content-card {
    background: var(--color-hover);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-xl);
  }

  .section-title {
    font-size: var(--text-h3);
    font-weight: 700;
    color: var(--color-fg-primary);
  }

  .label-text {
    font-size: var(--text-body-sm);
    color: var(--color-fg-muted);
  }

  .body-text {
    color: var(--color-fg-tertiary);
  }

  .caption-text {
    color: var(--color-fg-muted);
    font-size: var(--text-body-sm);
  }

  .emphasis-text {
    color: var(--color-fg-primary);
  }

  .insight-card {
    background: var(--color-bg-subtle);
    border-radius: var(--radius-md);
  }

  .insight-title {
    color: var(--color-fg-primary);
    font-weight: 500;
  }

  .insight-description {
    color: var(--color-fg-muted);
    font-size: var(--text-body-sm);
  }

  .cta-button {
    background: var(--color-fg-primary);
    color: var(--color-bg-pure);
    font-weight: 500;
    border-radius: var(--radius-md);
    transition: opacity var(--duration-micro) var(--ease-standard);
  }

  .cta-button:hover {
    opacity: 0.9;
  }

  .secondary-button {
    border: 1px solid var(--color-border-emphasis);
    color: var(--color-fg-primary);
    font-weight: 500;
    border-radius: var(--radius-md);
    transition: background var(--duration-micro) var(--ease-standard);
  }

  .secondary-button:hover {
    background: var(--color-active);
  }

  .metric-card {
    background: var(--color-bg-subtle);
    border-radius: var(--radius-md);
  }

  .code-text {
    font-family: monospace;
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
  }

  .code-line-label {
    color: var(--color-success);
  }

  .code-line-comment {
    color: var(--color-fg-muted);
  }

  .border-card {
    border: 1px solid var(--color-border-emphasis);
    border-radius: var(--radius-md);
  }

  .quote-text {
    color: var(--color-fg-tertiary);
    font-style: italic;
  }

  .note-text {
    color: var(--color-fg-muted);
    font-size: var(--text-caption);
  }

  .analysis-text {
    color: var(--color-fg-tertiary);
    font-size: var(--text-body-sm);
    line-height: 1.6;
  }

  .insight-box {
    background: var(--color-bg-subtle);
    border-radius: var(--radius-lg);
  }

  .insight-box-title {
    color: var(--color-fg-primary);
    font-weight: 500;
  }

  .insight-box-text {
    color: var(--color-fg-muted);
    font-size: var(--text-body-sm);
  }

  .stack-grid {
    font-size: var(--text-body-sm);
  }

  .source-text {
    color: var(--color-fg-muted);
    font-size: var(--text-caption);
  }

  .source-code {
    color: var(--color-fg-tertiary);
  }
</style>
