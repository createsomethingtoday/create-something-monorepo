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

<!-- Hero -->
<section class="relative pt-32 pb-12 px-6">
	<div class="max-w-4xl mx-auto text-center space-y-4">
		<h1 class="text-4xl md:text-5xl font-bold text-white">Minimal Capture</h1>
		<p class="text-lg text-white/60 italic">The Canon's Reach</p>
		<p class="text-white/40 max-w-2xl mx-auto">
			An experiment in propagation: what happens when tools built for others—outside the
			practice—unconsciously absorb the design canon?
		</p>
	</div>
</section>

<!-- The Experiment -->
<section class="px-6 pb-12">
	<div class="max-w-4xl mx-auto space-y-12">
		<!-- Hypothesis -->
		<div class="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
			<div class="flex items-center justify-between">
				<h2 class="text-xl font-bold text-white">The Hypothesis</h2>
				<span class="text-sm text-white/40">HERMENEUTICS</span>
			</div>
			<p class="text-white/70 leading-relaxed">
				If "weniger, aber besser" is truly internalized—not as aesthetic preference but as
				<em>way of seeing</em>—then it will propagate even to projects outside the creative practice.
				Tools built as gifts for others will still embody the canon.
			</p>
			<p class="text-white/50 text-sm">
				This tests whether the hermeneutic circle is self-sustaining: does understanding the whole
				(CREATE SOMETHING ethos) change how we approach every part (any project)?
			</p>
		</div>

		<!-- The Artifact -->
		<div class="bg-white/5 border border-white/10 rounded-xl p-6 space-y-6">
			<div class="flex items-center justify-between">
				<h2 class="text-xl font-bold text-white">The Artifact</h2>
				<span class="text-sm text-white/40">ZUHANDENHEIT</span>
			</div>

			<div class="grid md:grid-cols-2 gap-6">
				<div class="space-y-3">
					<h3 class="text-white/70 font-medium">What Was Built</h3>
					<p class="text-white/50 text-sm">
						A QR-based contact capture system. Scan → Fill → Store → Retrieve. Built for someone
						outside the practice who needed to collect contact information at events.
					</p>
					<div class="pt-2">
						<a
							href={liveUrl}
							target="_blank"
							rel="noopener noreferrer"
							class="inline-flex items-center gap-2 px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-white/90 transition-colors"
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
					<h3 class="text-white/70 font-medium">The Flow</h3>
					<div class="font-mono text-sm text-white/60 space-y-1">
						<p class="text-green-400">1. QR Code → Public Form</p>
						<p class="text-white/40 pl-4">Light theme, minimal fields</p>
						<p class="text-green-400">2. Form → D1 Database</p>
						<p class="text-white/40 pl-4">Name, email, phone (optional)</p>
						<p class="text-green-400">3. Admin → Dark Dashboard</p>
						<p class="text-white/40 pl-4">Search, copy, call, email, delete</p>
					</div>
				</div>
			</div>
		</div>

		<!-- Evidence of Propagation -->
		<div class="bg-white/5 border border-white/10 rounded-xl p-6 space-y-6">
			<div class="flex items-center justify-between">
				<h2 class="text-xl font-bold text-white">Evidence of Propagation</h2>
				<span class="text-sm text-white/40">ALETHEIA</span>
			</div>

			<p class="text-white/50 text-sm">
				Without being asked, the project absorbed these CREATE SOMETHING principles:
			</p>

			<div class="grid md:grid-cols-2 gap-4">
				<div class="p-4 bg-black/30 rounded-lg space-y-2">
					<h3 class="text-white font-medium">Typography</h3>
					<p class="text-white/50 text-sm">
						Stack Sans Notch + JetBrains Mono. The same fonts from .ltd and .space appeared without
						explicit request.
					</p>
				</div>

				<div class="p-4 bg-black/30 rounded-lg space-y-2">
					<h3 class="text-white font-medium">Color System</h3>
					<p class="text-white/50 text-sm">
						Achromatic palette. Dark admin, light public. No decorative color—only functional
						states (success green, error red).
					</p>
				</div>

				<div class="p-4 bg-black/30 rounded-lg space-y-2">
					<h3 class="text-white font-medium">Spacing</h3>
					<p class="text-white/50 text-sm">
						Golden ratio tokens (1.618rem, 2.618rem). The same mathematical foundation as the canon.
					</p>
				</div>

				<div class="p-4 bg-black/30 rounded-lg space-y-2">
					<h3 class="text-white font-medium">Interaction</h3>
					<p class="text-white/50 text-sm">
						Tap to action (mailto:, tel:). No intermediate confirmation. Trust the user's intent.
					</p>
				</div>
			</div>

			<div class="p-4 border border-white/20 rounded-lg">
				<p class="text-white/70 text-sm italic">
					"The tool recedes. The task emerges."
				</p>
				<p class="text-white/40 text-xs mt-2">
					This is Zuhandenheit—ready-to-hand. The interface disappears into use. The same principle
					we apply to .io tools appeared here unbidden.
				</p>
			</div>
		</div>

		<!-- Hermeneutic Analysis -->
		<div class="bg-white/5 border border-white/10 rounded-xl p-6 space-y-6">
			<div class="flex items-center justify-between">
				<h2 class="text-xl font-bold text-white">Hermeneutic Analysis</h2>
				<span class="text-sm text-white/40">INTERPRETATION</span>
			</div>

			<div class="space-y-4 text-white/70 text-sm leading-relaxed">
				<p>
					<strong class="text-white">Vorhabe (fore-having):</strong> We approached this as external—"my
					brother's need"—and placed it outside the monorepo. It was Vorhandenheit: present-at-hand,
					a tool for someone else.
				</p>
				<p>
					<strong class="text-white">Vorsicht (fore-sight):</strong> But the project absorbed the
					canon without being asked. The fonts appeared. The spacing appeared. The achromatic palette
					appeared. The interaction patterns appeared.
				</p>
				<p>
					<strong class="text-white">Vorgriff (fore-conception):</strong> The meaning shifted. This
					isn't "a contact form"—it's proof that the ethos propagates. The hermeneutic circle is
					self-sustaining.
				</p>
			</div>

			<div class="p-4 bg-black/30 rounded-lg">
				<p class="text-white font-medium mb-2">The Insight</p>
				<p class="text-white/60 text-sm">
					The project's origin as <em>gift</em> (Heidegger's Gabe) is itself significant. We build tools
					through care for others (Sorge), and those tools return to inform our understanding. The canon
					doesn't stay within boundaries—it flows outward through every act of creation.
				</p>
			</div>
		</div>

		<!-- Technical Stack -->
		<div class="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
			<div class="flex items-center justify-between">
				<h2 class="text-xl font-bold text-white">Technical Stack</h2>
				<span class="text-sm text-white/40">SEIN</span>
			</div>

			<div class="grid md:grid-cols-3 gap-4 text-sm">
				<div class="p-3 bg-black/30 rounded-lg">
					<div class="text-white/50">Framework</div>
					<div class="text-white font-medium">SvelteKit + Svelte 5</div>
				</div>
				<div class="p-3 bg-black/30 rounded-lg">
					<div class="text-white/50">Deployment</div>
					<div class="text-white font-medium">Cloudflare Pages</div>
				</div>
				<div class="p-3 bg-black/30 rounded-lg">
					<div class="text-white/50">Database</div>
					<div class="text-white font-medium">Cloudflare D1</div>
				</div>
			</div>

			<div class="text-white/40 text-xs">
				Source: <code class="text-white/60">FREELANCE/contact-capture</code> (outside monorepo, by design)
			</div>
		</div>

		<!-- Conclusion -->
		<div class="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
			<h2 class="text-xl font-bold text-white">Conclusion</h2>
			<p class="text-white/70 leading-relaxed">
				The hypothesis is confirmed. "Weniger, aber besser" is not a style to be applied—it's a lens
				through which all projects are seen. The canon propagates because it has become the default
				mode of creation.
			</p>
			<p class="text-white/50 text-sm">
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
				class="px-6 py-3 bg-white text-black font-medium rounded-lg hover:bg-white/90 transition-colors"
			>
				Try the Form
			</a>
			<a
				href="/experiments"
				class="px-6 py-3 border border-white/20 text-white font-medium rounded-lg hover:bg-white/10 transition-colors"
			>
				All Experiments
			</a>
		</div>
	</div>
</section>
