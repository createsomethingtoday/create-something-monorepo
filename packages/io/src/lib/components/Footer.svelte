<script lang="ts">
	let email = $state('');
	let website = $state(''); // Honeypot - hidden from users, filled by bots
	let isSubmitting = $state(false);
	let message = $state<{ type: 'success' | 'error'; text: string } | null>(null);

	async function handleSubmit(e: Event) {
		e.preventDefault();

		if (isSubmitting) return;

		isSubmitting = true;
		message = null;

		try {
			const response = await fetch('/api/newsletter', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ email, website })
			});

			const data = await response.json();

			if (data.success) {
				message = { type: 'success', text: data.message };
				email = ''; // Clear the input
			} else {
				message = { type: 'error', text: data.message };
			}
		} catch (error) {
			message = {
				type: 'error',
				text: 'Something went wrong. Please try again.'
			};
		} finally {
			isSubmitting = false;
		}
	}
</script>

<footer class="footer">
	<!-- Newsletter Section -->
	<section id="newsletter" class="py-20 px-6">
		<div class="max-w-4xl mx-auto">
			<div class="text-center">
				<h2 class="newsletter-heading">
					Stay updated with new experiments
				</h2>
				<p class="newsletter-description mb-8 max-w-2xl mx-auto">
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
					<div class="flex flex-col sm:flex-row gap-3">
						<input
							type="email"
							bind:value={email}
							placeholder="Enter your email address"
							class="email-input flex-1 px-6 py-4"
							required
							disabled={isSubmitting}
						/>
						<button
							type="submit"
							disabled={isSubmitting}
							class="submit-button group px-8 py-4 flex items-center justify-center gap-2"
						>
							<span>{isSubmitting ? 'Subscribing...' : 'Subscribe'}</span>
							{#if !isSubmitting}
								<svg class="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
									<path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
								</svg>
							{/if}
						</button>
					</div>

					<!-- Message Display -->
					{#if message}
						<div class="message-display animate-fade-in mt-4 p-4 {message.type === 'success' ? 'success' : 'error'}">
							{message.text}
						</div>
					{/if}
				</form>
			</div>
		</div>
	</section>

	<!-- Footer Links -->
	<div class="footer-links py-12 px-6">
		<div class="max-w-7xl mx-auto">
			<div class="grid grid-cols-1 md:grid-cols-4 gap-12">
				<!-- Brand Column -->
				<div class="md:col-span-2">
					<div class="brand-name mb-4">
						CREATE SOMETHING
					</div>
					<p class="brand-description mb-6 max-w-md">
						AI-native development research with tracked experiments. Every paper includes real metrics: time, costs, errors, and learnings.
					</p>
					<!-- Social Links -->
					<div class="flex items-center gap-4">
						<a
							href="https://github.com/createsomethingtoday"
							target="_blank"
							rel="noopener noreferrer"
							class="social-link w-10 h-10 flex items-center justify-center"
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
							class="social-link w-10 h-10 flex items-center justify-center"
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
					<h3 class="footer-section-title mb-4">Quick Links</h3>
					<ul class="space-y-3">
						<li>
							<a href="/" class="footer-nav-link">
								Home
							</a>
						</li>
						<li>
							<a href="/experiments" class="footer-nav-link">
								All Experiments
							</a>
						</li>
						<li>
							<a href="/methodology" class="footer-nav-link">
								Methodology
							</a>
						</li>
						<li>
							<a href="/categories" class="footer-nav-link">
								Categories
							</a>
						</li>
						<li>
							<a href="/about" class="footer-nav-link">
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
							<a href="https://createsomething.space" class="footer-nav-link">
								.space — Explore
							</a>
						</li>
						<li>
							<a href="https://createsomething.io" class="footer-nav-link">
								.io — Learn
							</a>
						</li>
						<li>
							<a href="https://createsomething.agency" class="footer-nav-link">
								.agency — Build
							</a>
						</li>
						<li>
							<a href="https://createsomething.ltd" class="footer-nav-link">
								.ltd — Canon
							</a>
						</li>
						<li>
							<a href="https://github.com/createsomethingtoday" target="_blank" rel="noopener noreferrer" class="footer-nav-link">
								GitHub — Source
							</a>
						</li>
					</ul>
				</div>
			</div>
		</div>
	</div>

	<!-- Copyright -->
	<div class="copyright py-6 px-6">
		<div class="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
			<p class="copyright-text text-center md:text-left">
				© {new Date().getFullYear()} Micah Johnson. All rights reserved.
			</p>
			<div class="flex items-center gap-6">
				<a href="/privacy" class="legal-link">
					Privacy Policy
				</a>
				<a href="/terms" class="legal-link">
					Terms of Service
				</a>
			</div>
		</div>
	</div>
</footer>

<style>
	.footer {
		background: var(--color-bg-pure);
		border-top: 1px solid var(--color-border-default);
	}

	.newsletter-heading {
		font-size: clamp(1.875rem, 4vw, 2.25rem);
		font-weight: bold;
		color: var(--color-fg-primary);
		margin-bottom: 1rem;
	}

	.newsletter-description {
		color: var(--color-fg-tertiary);
	}

	.email-input {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-full);
		color: var(--color-fg-primary);
		transition: border-color var(--duration-standard);
	}

	.email-input::placeholder {
		color: var(--color-fg-muted);
	}

	.email-input:focus {
		outline: none;
		border-color: rgba(255, 255, 255, 0.3);
	}

	.email-input:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.submit-button {
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		font-weight: 600;
		border-radius: var(--radius-full);
		transition: all var(--duration-standard);
	}

	.submit-button:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.9);
	}

	.submit-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.message-display {
		border-radius: var(--radius-lg);
		font-size: var(--text-body-sm);
	}

	.message-display.success {
		background: rgba(34, 197, 94, 0.1);
		color: rgb(74, 222, 128);
		border: 1px solid rgba(34, 197, 94, 0.2);
	}

	.message-display.error {
		background: rgba(239, 68, 68, 0.1);
		color: rgb(248, 113, 113);
		border: 1px solid rgba(239, 68, 68, 0.2);
	}

	.footer-links {
		border-top: 1px solid var(--color-border-default);
	}

	.brand-name {
		font-size: clamp(1.25rem, 2vw, 1.5rem);
		font-weight: bold;
		color: var(--color-fg-primary);
	}

	.brand-description {
		color: var(--color-fg-tertiary);
		font-size: var(--text-body-sm);
	}

	.social-link {
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-full);
		color: var(--color-fg-tertiary);
		transition: all var(--duration-standard);
	}

	.social-link:hover {
		background: var(--color-hover);
		color: var(--color-fg-primary);
	}

	.footer-section-title {
		color: var(--color-fg-primary);
		font-weight: 600;
	}

	.footer-nav-link {
		color: var(--color-fg-tertiary);
		font-size: var(--text-body-sm);
		transition: color var(--duration-standard);
	}

	.footer-nav-link:hover {
		color: var(--color-fg-primary);
	}

	.copyright {
		border-top: 1px solid var(--color-border-default);
	}

	.copyright-text {
		color: var(--color-fg-muted);
		font-size: var(--text-body-sm);
	}

	.legal-link {
		color: var(--color-fg-muted);
		font-size: var(--text-body-sm);
		transition: color var(--duration-standard);
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
</style>
