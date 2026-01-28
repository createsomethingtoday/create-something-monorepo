<script lang="ts">
	import { Footer } from '@create-something/canon';

	const quickLinks = [
		{ label: 'Home', href: '/' },
		{ label: 'Experiments', href: '/experiments' },
		{ label: 'Methodology', href: '/methodology' }
	];
</script>

<svelte:head>
	<title>Contact | CREATE SOMETHING</title>
	<meta name="description" content="Get in touch about AI-native development research, tracked experiments, or collaboration on building with Claude Code + Cloudflare. Questions about methodology or experiment results? Contact micah@createsomething.io" />
	<meta name="keywords" content="contact, AI-native development, Claude Code, experiment collaboration, development research, technical inquiry" />
	<!-- Open Graph -->
	<meta property="og:title" content="Contact | AI-Native Development Research" />
	<meta property="og:description" content="Questions about tracked experiments, methodology, or collaboration on AI-native development research." />
	<meta property="og:url" content="https://createsomething.io/contact" />
	<!-- Twitter -->
	<meta name="twitter:title" content="Contact CREATE SOMETHING" />
	<meta name="twitter:description" content="Get in touch with us" />
	<link rel="canonical" href="https://createsomething.io/contact" />
</svelte:head>

<!-- Hero Section -->
	<section class="relative pt-32 pb-16 px-6">
		<div class="max-w-4xl mx-auto">
			<div class="space-y-6 animate-reveal">
				<h1 class="hero-title">
					Get in Touch
				</h1>

				<p class="body-text leading-relaxed">
					Questions about our tracked experiments, methodology, or interested in collaborating on AI-native development research? Let's connect.
				</p>
			</div>
		</div>
	</section>

	<!-- Contact Options -->
	<section class="py-16 px-6">
		<div class="max-w-4xl mx-auto">
			<div class="grid grid-cols-1 md:grid-cols-2 gap-8">
				<!-- Email -->
				<div
					class="card p-8 transition-all animate-reveal"
					style="--delay: 1"
				>
					<div class="mb-4">
						<svg
							class="icon w-8 h-8"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
							/>
						</svg>
					</div>
					<h3 class="subsection-title mb-2">Email</h3>
					<p class="body-text mb-4">
						Questions about experiment methodology, development metrics, or research collaboration? Get in touch.
					</p>
					<a
						href="mailto:micah@createsomething.io"
						class="link inline-flex items-center gap-2"
					>
						micah@createsomething.io
						<svg
							class="w-4 h-4"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M14 5l7 7m0 0l-7 7m7-7H3"
							/>
						</svg>
					</a>
				</div>

				<!-- Social -->
				<div
					class="card p-8 transition-all animate-reveal"
					style="--delay: 2"
				>
					<div class="mb-4">
						<svg
							class="icon w-8 h-8"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"
							/>
						</svg>
					</div>
					<h3 class="subsection-title mb-2">Follow Updates</h3>
					<p class="body-text mb-4">
						Stay updated with new tracked experiments and AI-native development research.
					</p>
					<div class="flex gap-4">
						<a
							href="https://www.linkedin.com/in/micahryanjohnson/"
							target="_blank"
							rel="noopener noreferrer"
							class="link"
						>
							LinkedIn
						</a>
						<a
							href="https://github.com/createsomethingtoday"
							target="_blank"
							rel="noopener noreferrer"
							class="link"
						>
							GitHub
						</a>
					</div>
				</div>
			</div>
		</div>
	</section>

	<Footer
		mode="space"
		showNewsletter={false}
		aboutText="Community playground for AI-native development experiments. Fork experiments, break things, learn in public."
		quickLinks={quickLinks}
		showSocial={true}
	/>
<style>
  .hero-title {
    font-size: var(--text-h1);
    font-weight: 700;
    color: var(--color-fg-primary);
  }

  .body-text {
    color: var(--color-fg-tertiary);
  }

  .card {
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-lg);
  }

  .card:hover {
    border-color: var(--color-border-emphasis);
  }

  .icon {
    color: var(--color-fg-secondary);
  }

  .subsection-title {
    font-size: var(--text-h3);
    font-weight: 600;
    color: var(--color-fg-primary);
  }

  .link {
    color: var(--color-fg-secondary);
    transition: color var(--duration-micro) var(--ease-standard);
  }

  .link:hover {
    color: var(--color-fg-primary);
  }

  .animate-reveal {
    opacity: 0;
    transform: translateY(20px);
    animation: reveal 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    animation-delay: calc(var(--delay, 0) * 100ms);
  }

  @keyframes reveal {
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .animate-reveal {
      animation: none;
      opacity: 1;
      transform: none;
    }
  }
</style>

