<script lang="ts">
	import { fade, fly } from 'svelte/transition';

	let email = $state('');

	function handleSubmit(e: Event) {
		e.preventDefault();
		// TODO: Implement newsletter subscription
		console.log('Newsletter subscription:', email);
	}
</script>

<footer class="bg-black border-t border-white/10">
	<!-- Newsletter Section -->
	<section id="newsletter" class="py-20 px-6">
		<div class="max-w-4xl mx-auto">
			<div class="text-center">
				<h2 class="text-3xl md:text-4xl font-bold text-white mb-4">
					Stay updated with new experiments
				</h2>
				<p class="text-white/60 mb-8 max-w-2xl mx-auto">
					Get notified when new research is published. Real metrics, tracked experiments, honest learnings from building with AI.
				</p>

				<!-- Newsletter Form -->
				<form onsubmit={handleSubmit} class="max-w-lg mx-auto">
					<div class="flex flex-col sm:flex-row gap-3">
						<input
							type="email"
							bind:value={email}
							placeholder="Enter your email address"
							class="flex-1 px-6 py-4 bg-white/[0.07] border border-white/10 rounded-full text-white placeholder:text-white/40 focus:outline-none focus:border-white/30 transition-colors"
							required
						/>
						<button
							type="submit"
							class="group px-8 py-4 bg-white text-black font-semibold rounded-full hover:bg-white/90 transition-all flex items-center justify-center gap-2"
						>
							<span>Subscribe</span>
							<svg class="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
								<path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
							</svg>
						</button>
					</div>
				</form>
			</div>
		</div>
	</section>

	<!-- Footer Links -->
	<div class="border-t border-white/10 py-12 px-6">
		<div class="max-w-7xl mx-auto">
			<div class="grid grid-cols-1 md:grid-cols-4 gap-12">
				<!-- Brand Column -->
				<div class="md:col-span-2">
					<div class="text-2xl font-bold text-white mb-4">
						CREATE SOMETHING<span class="opacity-60">.space</span>
					</div>
					<p class="text-white/60 text-sm max-w-md mb-6">
						Community playground for AI-native development experiments. Share real metrics, tracked experiments, and honest learnings from building with AI.
					</p>
					<!-- Social Links -->
					<div class="flex items-center gap-4">
						<a
							href="https://github.com/createsomethingtoday"
							target="_blank"
							rel="noopener noreferrer"
							class="w-10 h-10 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-white/60 hover:bg-white/10 hover:text-white transition-all"
							aria-label="GitHub"
						>
							<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
								<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
							</svg>
						</a>
						<a
							href="https://www.linkedin.com/in/micahryanjohnson/"
							target="_blank"
							rel="noopener noreferrer"
							class="w-10 h-10 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-white/60 hover:bg-white/10 hover:text-white transition-all"
							aria-label="LinkedIn"
						>
							<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
								<path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
							</svg>
						</a>
					</div>
				</div>

				<!-- Quick Links -->
				<div>
					<h3 class="text-white font-semibold mb-4">Quick Links</h3>
					<ul class="space-y-3">
						<li>
							<a href="/" class="text-white/60 hover:text-white text-sm transition-colors">
								Home
							</a>
						</li>
						<li>
							<a href="/experiments" class="text-white/60 hover:text-white text-sm transition-colors">
								All Experiments
							</a>
						</li>
						<li>
							<a href="/methodology" class="text-white/60 hover:text-white text-sm transition-colors">
								Methodology
							</a>
						</li>
						<li>
							<a href="/categories" class="text-white/60 hover:text-white text-sm transition-colors">
								Categories
							</a>
						</li>
						<li>
							<a href="/about" class="text-white/60 hover:text-white text-sm transition-colors">
								About
							</a>
						</li>
					</ul>
				</div>

				<!-- Modes of Being -->
				<div>
					<h3 class="text-white font-semibold mb-4">Modes of Being</h3>
					<ul class="space-y-3">
						<li>
							<a href="https://createsomething.space" class="text-white/60 hover:text-white text-sm transition-colors">
								.space — Explore
							</a>
						</li>
						<li>
							<a href="https://createsomething.io" class="text-white/60 hover:text-white text-sm transition-colors">
								.io — Learn
							</a>
						</li>
						<li>
							<a href="https://createsomething.agency" class="text-white/60 hover:text-white text-sm transition-colors">
								.agency — Build
							</a>
						</li>
						<li>
							<a href="https://createsomething.ltd" class="text-white/60 hover:text-white text-sm transition-colors">
								.ltd — Canon
							</a>
						</li>
						<li>
							<a href="https://github.com/createsomethingtoday" target="_blank" rel="noopener noreferrer" class="text-white/60 hover:text-white text-sm transition-colors">
								GitHub — Source
							</a>
						</li>
					</ul>
				</div>
			</div>
		</div>
	</div>

	<!-- Copyright -->
	<div class="border-t border-white/10 py-6 px-6">
		<div class="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
			<p class="text-white/40 text-sm text-center md:text-left">
				© {new Date().getFullYear()} Micah Johnson. All rights reserved.
			</p>
			<div class="flex items-center gap-6">
				<a href="/privacy" class="text-white/40 hover:text-white/60 text-sm transition-colors">
					Privacy Policy
				</a>
				<a href="/terms" class="text-white/40 hover:text-white/60 text-sm transition-colors">
					Terms of Service
				</a>
			</div>
		</div>
	</div>
</footer>
