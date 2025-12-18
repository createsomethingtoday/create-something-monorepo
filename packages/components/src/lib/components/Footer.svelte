<script lang="ts">
	import { onMount } from 'svelte';

	interface QuickLink {
		label: string;
		href: string;
	}

	interface Props {
		mode?: 'ltd' | 'io' | 'space' | 'agency' | 'learn';
		aboutText?: string;
		showNewsletter?: boolean;
		newsletterTitle?: string;
		newsletterDescription?: string;
		quickLinks?: QuickLink[];
		showRamsQuote?: boolean;
		copyrightText?: string;
		showSocial?: boolean;
		turnstileSiteKey?: string;
	}

	let {
		mode = 'ltd',
		aboutText,
		showNewsletter = false,
		newsletterTitle = 'Stay updated with new experiments',
		newsletterDescription = 'Get notified when new research is published. Real metrics, tracked experiments, honest learnings.',
		quickLinks = [],
		showRamsQuote = false,
		copyrightText,
		showSocial = false,
		turnstileSiteKey = ''
	}: Props = $props();

	let email = $state('');
	let honeypot = $state(''); // Hidden field - bots fill this
	let isSubmitting = $state(false);
	let message = $state<{ type: 'success' | 'error'; text: string } | null>(null);
	let turnstileToken = $state('');
	let turnstileWidgetId: string | null = null;
	let turnstileContainer: HTMLDivElement;

	// Load Turnstile script and render widget
	onMount(() => {
		if (!showNewsletter || !turnstileSiteKey) return;

		// Check if script already loaded
		if (window.turnstile) {
			renderTurnstile();
			return;
		}

		// Load Turnstile script
		const script = document.createElement('script');
		script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad';
		script.async = true;
		script.defer = true;

		// Set up callback
		(window as any).onTurnstileLoad = () => {
			renderTurnstile();
		};

		document.head.appendChild(script);

		return () => {
			// Cleanup
			if (turnstileWidgetId && window.turnstile) {
				window.turnstile.remove(turnstileWidgetId);
			}
		};
	});

	function renderTurnstile() {
		if (!turnstileContainer || !window.turnstile || !turnstileSiteKey) return;

		turnstileWidgetId = window.turnstile.render(turnstileContainer, {
			sitekey: turnstileSiteKey,
			callback: (token: string) => {
				turnstileToken = token;
			},
			'expired-callback': () => {
				turnstileToken = '';
			},
			'error-callback': () => {
				turnstileToken = '';
			},
			theme: 'dark',
			size: 'flexible'
		});
	}

	async function handleNewsletterSubmit(e: Event) {
		e.preventDefault();

		if (isSubmitting) return;

		// Honeypot check - if filled, silently "succeed" but don't submit
		if (honeypot) {
			message = { type: 'success', text: 'Thanks for subscribing!' };
			email = '';
			return;
		}

		// Turnstile check
		if (turnstileSiteKey && !turnstileToken) {
			message = { type: 'error', text: 'Please complete the verification.' };
			return;
		}

		isSubmitting = true;
		message = null;

		try {
			const response = await fetch('/api/newsletter', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					email,
					turnstileToken: turnstileToken || undefined
				})
			});

			const data = await response.json();

			if (data.success) {
				message = { type: 'success', text: data.message };
				email = '';
				// Reset Turnstile for next submission
				if (window.turnstile && turnstileWidgetId) {
					window.turnstile.reset(turnstileWidgetId);
					turnstileToken = '';
				}
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

	const currentYear = new Date().getFullYear();
	const defaultCopyright = `© ${currentYear} Create Something. The canon for "less, but better."`;

	// Cross-property transition handler
	function handleCrossPropertyClick(e: MouseEvent, targetMode: 'ltd' | 'io' | 'space' | 'agency' | 'learn') {
		// Don't animate if staying on same property
		if (targetMode === mode) return;

		e.preventDefault();
		const href = (e.currentTarget as HTMLAnchorElement).href;

		// Store transition data for entry animation on target page
		if (typeof sessionStorage !== 'undefined') {
			sessionStorage.setItem('cs-transition-from', mode);
			sessionStorage.setItem('cs-transition-to', targetMode);
			sessionStorage.setItem('cs-transition-time', Date.now().toString());
		}

		// Trigger exit animation
		document.body.classList.add('transitioning-out');

		// Navigate after animation completes
		setTimeout(() => {
			window.location.href = href;
		}, 300);
	}

	// TypeScript declarations for Turnstile
	declare global {
		interface Window {
			turnstile?: {
				render: (container: HTMLElement, options: any) => string;
				reset: (widgetId: string) => void;
				remove: (widgetId: string) => void;
			};
		}
	}
</script>

<footer class="footer">
	<!-- Newsletter Section (Optional) -->
	{#if showNewsletter}
		<section id="newsletter" class="py-20 px-6">
			<div class="max-w-4xl mx-auto">
				<div class="text-center">
					<h2 class="newsletter-title mb-4">
						{newsletterTitle}
					</h2>
					<p class="newsletter-description mb-8 max-w-2xl mx-auto">
						{newsletterDescription}
					</p>

					<form onsubmit={handleNewsletterSubmit} class="max-w-lg mx-auto">
						<!-- Honeypot field - hidden from users, bots fill it -->
						<input
							type="text"
							bind:value={honeypot}
							name="website"
							autocomplete="off"
							tabindex="-1"
							class="honeypot"
						/>

						<div class="flex flex-col sm:flex-row gap-3">
							<input
								type="email"
								bind:value={email}
								placeholder="Enter your email address"
								class="newsletter-input flex-1 px-6 py-4"
								required
								disabled={isSubmitting}
							/>
							<button
								type="submit"
								disabled={isSubmitting}
								class="newsletter-button group px-8 py-4 flex items-center justify-center gap-2"
							>
								<span>{isSubmitting ? 'Subscribing...' : 'Subscribe'}</span>
								{#if !isSubmitting}
									<svg
										class="w-4 h-4 transition-transform group-hover:translate-x-1"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
										stroke-width="2"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											d="M13 7l5 5m0 0l-5 5m5-5H6"
										/>
									</svg>
								{/if}
							</button>
						</div>

						<!-- Turnstile widget container -->
						{#if turnstileSiteKey}
							<div bind:this={turnstileContainer} class="turnstile-container mt-4"></div>
						{/if}

						{#if message}
							<div class="mt-4 p-4 message-{message.type}">
								{message.text}
							</div>
						{/if}
					</form>
				</div>
			</div>
		</section>
	{/if}

	<!-- Footer Links -->
	<div class="footer-links py-12 px-6" class:with-newsletter={showNewsletter}>
		<div class="max-w-7xl mx-auto">
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
				<!-- About / Brand Column -->
				<div>
					{#if aboutText}
						<div class="brand-title mb-4">CREATE SOMETHING</div>
						<p class="brand-description max-w-md mb-6">
							{aboutText}
						</p>
					{:else}
						<h4 class="section-title mb-4">About</h4>
						<p class="section-description leading-relaxed">
							The philosophical foundation for the Create Something ecosystem. Curated wisdom from
							masters who embody "less, but better."
						</p>
					{/if}

					<!-- Social Links -->
					{#if showSocial}
						<ul class="social-list flex items-center gap-4">
							<li>
								<a
									href="https://github.com/createsomethingtoday"
									target="_blank"
									rel="noopener noreferrer"
									class="social-link w-10 h-10 flex items-center justify-center"
									aria-label="GitHub"
								>
									<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
										<path
											d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
										/>
									</svg>
								</a>
							</li>
							<li>
								<a
									href="https://www.linkedin.com/in/micahryanjohnson/"
									target="_blank"
									rel="noopener noreferrer"
									class="social-link w-10 h-10 flex items-center justify-center"
									aria-label="LinkedIn"
								>
									<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
										<path
											d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
										/>
									</svg>
								</a>
							</li>
						</ul>
					{/if}
				</div>

				<!-- Quick Links (Optional) -->
				{#if quickLinks.length > 0}
					<nav aria-label="Quick links">
						<h3 class="section-title mb-4">Quick Links</h3>
						<ul class="space-y-3">
							{#each quickLinks as link}
								<li>
									<a href={link.href} class="footer-link">
										{link.label}
									</a>
								</li>
							{/each}
						</ul>
					</nav>
				{/if}

				<!-- Modes of Being (REQUIRED) - With Hermeneutic Transitions -->
				<nav aria-label="CREATE SOMETHING properties">
					<h3 class="section-title mb-4">Modes of Being</h3>
					<ul class="space-y-3">
						<li>
							<a
								href="https://createsomething.space"
								class="footer-link block"
								class:active={mode === 'space'}
								onclick={(e) => handleCrossPropertyClick(e, 'space')}
							>
								.space <span class="link-label">— Explore</span>
							</a>
						</li>
						<li>
							<a
								href="https://learn.createsomething.space"
								class="footer-link block"
								class:active={mode === 'learn'}
								onclick={(e) => handleCrossPropertyClick(e, 'learn')}
							>
								.learn <span class="link-label">— Study</span>
							</a>
						</li>
						<li>
							<a
								href="https://createsomething.io"
								class="footer-link block"
								class:active={mode === 'io'}
								onclick={(e) => handleCrossPropertyClick(e, 'io')}
							>
								.io <span class="link-label">— Research</span>
							</a>
						</li>
						<li>
							<a
								href="https://createsomething.agency"
								class="footer-link block"
								class:active={mode === 'agency'}
								onclick={(e) => handleCrossPropertyClick(e, 'agency')}
							>
								.agency <span class="link-label">— Build</span>
							</a>
						</li>
						<li>
							<a
								href="https://createsomething.ltd"
								class="footer-link block"
								class:active={mode === 'ltd'}
								onclick={(e) => handleCrossPropertyClick(e, 'ltd')}
							>
								.ltd <span class="link-label">— Canon</span>
							</a>
						</li>
						<li>
							<a
								href="https://github.com/createsomethingtoday"
								target="_blank"
								rel="noopener"
								class="footer-link block"
							>
								GitHub <span class="link-label">— Source</span>
							</a>
						</li>
					</ul>
				</nav>
			</div>
		</div>
	</div>

	<!-- Copyright -->
	<div class="footer-copyright py-6 px-6">
		<div class="max-w-7xl mx-auto">
			<p class="copyright-text text-center">
				{copyrightText || defaultCopyright}
			</p>
		</div>
	</div>

	<!-- Standards (Optional) -->
	{#if showRamsQuote}
		<div class="footer-quote py-8 px-6">
			<div class="max-w-7xl mx-auto text-center">
				<p class="quote-text leading-relaxed">
					Less, but better. · Weniger, aber besser. · — Dieter Rams
				</p>
			</div>
		</div>
	{/if}
</footer>

<style>
	/* Footer Container */
	.footer {
		border-top: 1px solid var(--color-border-default);
		background: var(--color-bg-pure);
	}

	/* Newsletter Section */
	.newsletter-title {
		font-size: clamp(1.875rem, 3vw, 2.25rem);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
	}

	.newsletter-description {
		color: var(--color-fg-tertiary);
	}

	.newsletter-input {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-full);
		color: var(--color-fg-primary);
		transition: border-color var(--duration-micro) var(--ease-standard);
	}

	.newsletter-input::placeholder {
		color: var(--color-fg-muted);
	}

	.newsletter-input:focus {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
		border-color: var(--color-border-strong);
	}

	.newsletter-input:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.newsletter-button {
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		font-weight: var(--font-semibold);
		border-radius: var(--radius-full);
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.newsletter-button:hover {
		opacity: 0.9;
	}

	.newsletter-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.newsletter-button:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}

	/* Message States */
	.message-success {
		font-size: var(--text-body-sm);
		background: var(--color-success-muted);
		color: var(--color-success);
		border: 1px solid var(--color-success);
		border-radius: var(--radius-lg);
	}

	.message-error {
		font-size: var(--text-body-sm);
		background: var(--color-error-muted);
		color: var(--color-error);
		border: 1px solid var(--color-error);
		border-radius: var(--radius-lg);
	}

	/* Footer Links Section */
	.footer-links.with-newsletter {
		border-top: 1px solid var(--color-border-default);
	}

	/* Brand */
	.brand-title {
		font-size: 1.5rem;
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
	}

	.brand-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	/* Section Titles */
	.section-title {
		font-size: var(--text-body-sm);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
	}

	.section-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	/* Social Links */
	.social-list {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.social-link {
		background: var(--color-hover);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-full);
		color: var(--color-fg-tertiary);
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.social-link:hover {
		background: var(--color-active);
		color: var(--color-fg-primary);
	}

	/* Footer Links */
	.footer-link {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.footer-link:hover,
	.footer-link.active {
		color: var(--color-fg-primary);
	}

	.link-label {
		color: var(--color-fg-muted);
	}

	/* Copyright */
	.footer-copyright {
		border-top: 1px solid var(--color-border-default);
	}

	.copyright-text {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	/* Quote */
	.footer-quote {
		border-top: 1px solid var(--color-border-default);
	}

	.quote-text {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	/* Honeypot - hidden from users */
	.honeypot {
		position: absolute;
		left: -9999px;
		width: 1px;
		height: 1px;
		opacity: 0;
		pointer-events: none;
	}

	/* Turnstile container */
	.turnstile-container {
		display: flex;
		justify-content: center;
	}
</style>
