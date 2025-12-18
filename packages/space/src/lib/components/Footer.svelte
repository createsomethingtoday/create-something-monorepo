<script lang="ts">
	let email = $state('');
	let website = $state(''); // Honeypot - hidden from users, filled by bots
	let status = $state<'idle' | 'loading' | 'success' | 'error'>('idle');
	let message = $state('');

	async function handleSubmit(e: Event) {
		e.preventDefault();
		status = 'loading';

		try {
			const response = await fetch('/api/newsletter', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, website })
			});

			const data = await response.json();

			if (data.success) {
				status = 'success';
				message = 'Welcome aboard. Check your inbox.';
				email = '';
			} else {
				status = 'error';
				message = data.message || 'Something went wrong. Try again.';
			}
		} catch (err) {
			status = 'error';
			message = 'Connection failed. Try again.';
		}
	}
</script>

<footer class="footer">
	<!-- Newsletter Section -->
	<section id="newsletter" class="py-20 px-6">
		<div class="max-w-4xl mx-auto">
			<div class="text-center">
				<h2 class="newsletter-title mb-4">
					Stay updated with new experiments
				</h2>
				<p class="newsletter-subtitle mb-8 max-w-2xl mx-auto">
					Get notified when new research is published. Real metrics, tracked experiments, honest learnings from building with AI.
				</p>

				<!-- Newsletter Form -->
				<form onsubmit={handleSubmit} class="max-w-lg mx-auto">
					<!-- Honeypot field - hidden from users, bots fill it -->
					<input
						type="text"
						bind:value={website}
						name="website"
						autocomplete="off"
						tabindex="-1"
						class="absolute -left-[9999px] opacity-0 pointer-events-none"
						aria-hidden="true"
					/>

					{#if status === 'success'}
						<p class="status-success animate-fade-in mb-4">{message}</p>
					{:else if status === 'error'}
						<p class="status-error animate-fade-in mb-4">{message}</p>
					{/if}

					<div class="flex flex-col sm:flex-row gap-3">
						<label for="space-newsletter-email" class="sr-only">Email address</label>
						<input
							id="space-newsletter-email"
							type="email"
							bind:value={email}
							placeholder="Enter your email address"
							class="newsletter-input flex-1 px-6 py-4"
							required
							disabled={status === 'loading' || status === 'success'}
						/>
						<button
							type="submit"
							class="newsletter-btn group px-8 py-4 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
							disabled={status === 'loading' || status === 'success'}
						>
							<span>{status === 'loading' ? 'Subscribing...' : 'Subscribe'}</span>
							{#if status !== 'loading'}
								<svg class="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
									<path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
								</svg>
							{/if}
						</button>
					</div>
				</form>
			</div>
		</div>
	</section>

	<!-- Footer Links -->
	<div class="footer-links-section py-12 px-6">
		<div class="max-w-7xl mx-auto">
			<div class="grid grid-cols-1 md:grid-cols-4 gap-12">
				<!-- Brand Column -->
				<div class="md:col-span-2">
					<div class="brand-title mb-4">
						CREATE SOMETHING<span class="brand-tld">.space</span>
					</div>
					<p class="brand-description mb-6">
						Community playground for AI-native development experiments. Share real metrics, tracked experiments, and honest learnings from building with AI.
					</p>
					<!-- Social Links -->
					<ul class="social-list flex items-center gap-4">
						<li>
							<a
								href="https://github.com/createsomethingtoday"
								target="_blank"
								rel="noopener noreferrer"
								class="social-btn"
								aria-label="GitHub"
							>
								<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
									<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
								</svg>
							</a>
						</li>
						<li>
							<a
								href="https://www.linkedin.com/in/micahryanjohnson/"
								target="_blank"
								rel="noopener noreferrer"
								class="social-btn"
								aria-label="LinkedIn"
							>
								<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
									<path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
								</svg>
							</a>
						</li>
					</ul>
				</div>

				<!-- Quick Links -->
				<div>
					<h3 class="footer-section-title mb-4">Quick Links</h3>
					<ul class="space-y-3">
						<li>
							<a href="/" class="footer-link">
								Home
							</a>
						</li>
						<li>
							<a href="/experiments" class="footer-link">
								All Experiments
							</a>
						</li>
						<li>
							<a href="/methodology" class="footer-link">
								Methodology
							</a>
						</li>
						<li>
							<a href="/categories" class="footer-link">
								Categories
							</a>
						</li>
						<li>
							<a href="/about" class="footer-link">
								About
							</a>
						</li>
					</ul>
				</div>

				<!-- Modes of Being -->
				<div>
					<h3 class="footer-section-title mb-4">Modes of Being</h3>
					<ul class="space-y-3">
						<li>
							<a href="https://createsomething.space" class="footer-link">
								.space — Explore
							</a>
						</li>
						<li>
							<a href="https://createsomething.io" class="footer-link">
								.io — Learn
							</a>
						</li>
						<li>
							<a href="https://createsomething.agency" class="footer-link">
								.agency — Build
							</a>
						</li>
						<li>
							<a href="https://createsomething.ltd" class="footer-link">
								.ltd — Canon
							</a>
						</li>
						<li>
							<a href="https://github.com/createsomethingtoday" target="_blank" rel="noopener noreferrer" class="footer-link">
								GitHub — Source
							</a>
						</li>
					</ul>
				</div>
			</div>
		</div>
	</div>

	<!-- Copyright -->
	<div class="copyright-section py-6 px-6">
		<div class="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
			<p class="copyright-text text-center md:text-left">
				© {new Date().getFullYear()} Micah Johnson. All rights reserved.
			</p>
			<ul class="legal-list flex items-center gap-6">
				<li>
					<a href="/privacy" class="legal-link">
						Privacy Policy
					</a>
				</li>
				<li>
					<a href="/terms" class="legal-link">
						Terms of Service
					</a>
				</li>
			</ul>
		</div>
	</div>
</footer>

<style>
	.footer {
		background: var(--color-bg-pure);
		border-top: 1px solid var(--color-border-default);
	}

	.newsletter-title {
		font-size: var(--text-h2);
		font-weight: bold;
		color: var(--color-fg-primary);
	}

	.newsletter-subtitle {
		color: var(--color-fg-tertiary);
	}

	.status-success {
		color: #10b981;
	}

	.status-error {
		color: #ef4444;
	}

	.newsletter-input {
		background: rgba(255, 255, 255, 0.07);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-full);
		color: var(--color-fg-primary);
		transition: border-color var(--duration-standard) var(--ease-standard);
	}

	.newsletter-input::placeholder {
		color: var(--color-fg-muted);
	}

	.newsletter-input:focus {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
		border-color: var(--color-border-strong);
	}

	.newsletter-btn {
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		font-weight: 600;
		border-radius: var(--radius-full);
		transition: all var(--duration-standard) var(--ease-standard);
	}

	.newsletter-btn:hover {
		background: var(--color-fg-secondary);
	}

	.newsletter-btn:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}

	.footer-links-section {
		border-top: 1px solid var(--color-border-default);
	}

	.brand-title {
		font-size: var(--text-h3);
		font-weight: bold;
		color: var(--color-fg-primary);
	}

	.brand-tld {
		opacity: 0.6;
	}

	.brand-description {
		color: var(--color-fg-tertiary);
		font-size: var(--text-body-sm);
		max-width: 28rem;
	}

	.social-list,
	.legal-list {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.social-btn {
		width: 2.5rem;
		height: 2.5rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--color-fg-tertiary);
		transition: all var(--duration-standard) var(--ease-standard);
	}

	.social-btn:hover {
		background: var(--color-hover);
		color: var(--color-fg-primary);
	}

	.footer-section-title {
		color: var(--color-fg-primary);
		font-weight: 600;
	}

	.footer-link {
		color: var(--color-fg-tertiary);
		font-size: var(--text-body-sm);
		transition: color var(--duration-standard) var(--ease-standard);
	}

	.footer-link:hover {
		color: var(--color-fg-primary);
	}

	.copyright-section {
		border-top: 1px solid var(--color-border-default);
	}

	.copyright-text {
		color: var(--color-fg-muted);
		font-size: var(--text-body-sm);
	}

	.legal-link {
		color: var(--color-fg-muted);
		font-size: var(--text-body-sm);
		transition: color var(--duration-standard) var(--ease-standard);
	}

	.legal-link:hover {
		color: var(--color-fg-tertiary);
	}

	.animate-fade-in {
		opacity: 0;
		animation: fade-in 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
	}

	@keyframes fade-in {
		to {
			opacity: 1;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.animate-fade-in {
			animation: none;
			opacity: 1;
		}
	}

	/* Screen reader only - visually hidden but accessible */
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}
</style>
