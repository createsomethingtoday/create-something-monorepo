<script lang="ts">
	/**
	 * AgencyFooter - WORKWAY-aligned footer for CREATE SOMETHING agency
	 * 
	 * Features the signature large brand text that bleeds off the bottom,
	 * matching WORKWAY's footer design language with proper glass effects.
	 */
	import { agencyCoreMessaging } from '$lib/data/marketingCopy';
</script>

<footer class="agency-footer">
	<!-- Grid background overlay -->
	<div class="footer-grid-bg"></div>
	
	<div class="footer-container shell-inner">
		<!-- Link Columns -->
		<div class="footer-columns">
			<!-- Work With Me Column -->
				<div class="footer-column">
					<h6 class="footer-heading">Start Here</h6>
					<ul class="footer-links">
						<li><a href="/services">How It Works</a></li>
						<li><a href="/stack">What You Keep</a></li>
						<li><a href="/products">Products</a></li>
						<li><a href="/field-reports">Field Reports</a></li>
						<li><a href={agencyCoreMessaging.startWithWorkflowHref}>Start Self-Map</a></li>
					</ul>
				</div>

			<!-- Learn Column -->
			<div class="footer-column">
				<h6 class="footer-heading">Framework</h6>
				<ul class="footer-links">
					<li><a href="/methodology">How It Works</a></li>
					<li><a href="https://createsomething.io" target="_blank" rel="noopener">Research</a></li>
					<li><a href="https://createsomething.space" target="_blank" rel="noopener">Tools</a></li>
				</ul>
			</div>

			<!-- About Column -->
			<div class="footer-column">
				<h6 class="footer-heading">Company</h6>
				<ul class="footer-links">
					<li><a href="/about">About Me</a></li>
					<li><a href="https://createsomething.ltd" target="_blank" rel="noopener">Philosophy</a></li>
					<li><a href="mailto:micah@createsomething.agency">Email</a></li>
				</ul>
			</div>

			<!-- Legal Column -->
			<div class="footer-column">
				<h6 class="footer-heading">Legal</h6>
				<ul class="footer-links">
					<li><a href="/terms">Terms</a></li>
					<li><a href="/privacy">Privacy</a></li>
				</ul>
			</div>
		</div>

		<!-- Bottom Bar -->
			<div class="footer-bottom">
			<p class="footer-copyright">
				© 2026 CREATE SOMETHING. Calm, transparent, reliable workflow systems.
			</p>
			<div class="footer-social">
				<a href="https://github.com/create-something" target="_blank" rel="noopener">GitHub</a>
			</div>
		</div>

		<!-- Large Brand Signature -->
		<div class="footer-signature">
			<div class="signature-text">CREATE SOMETHING</div>
		</div>
	</div>
</footer>

<style>
	/* ==========================================================================
	   Glass Design System Tokens (WORKWAY-aligned)
	   ========================================================================== */
	
	.agency-footer {
		position: relative;
		padding: 3rem 1.5rem 0;
		
		/* Glass effect - dark textured obsidian */
		backdrop-filter: blur(8px) saturate(110%);
		background-color: rgba(0, 0, 0, 0.65);
		
		/* Top border only - no left/right/bottom */
		border-top: 1px solid rgba(255, 255, 255, 0.06);
		
		/* Liquid glass shine effect */
		box-shadow: 
			inset 1px 1px 2px 0 rgba(255, 255, 255, 0.08),
			inset -1px -1px 1px 0 rgba(255, 255, 255, 0.04);
		
		/* Bouncy transition like WORKWAY */
		transition: all 400ms cubic-bezier(0.175, 0.885, 0.32, 2.2);
	}
	
	/* Grid background - infrastructure blueprint aesthetic */
	.footer-grid-bg {
		position: absolute;
		inset: 0;
		background-image: 
			linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
			linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
		background-size: 40px 40px;
		mask-image: linear-gradient(to bottom, black 0%, transparent 100%);
		-webkit-mask-image: linear-gradient(to bottom, black 0%, transparent 100%);
		pointer-events: none;
		opacity: 0.5;
	}

	.footer-container {
		position: relative;
		width: 100%;
	}

	.footer-columns {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-performance-md, 1rem);
		margin-bottom: 2rem;
	}

	@media (min-width: 768px) {
		.footer-columns {
			grid-template-columns: repeat(4, 1fr);
		}
	}

		.footer-heading {
		font-size: 0.75rem;
		font-weight: var(--font-performance-semibold, 600);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-performance-fg-primary, #ffffff);
		margin-bottom: 1rem;
		font-family: var(--font-performance-sans);
	}

	.footer-links {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.footer-links a {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.4);
		text-decoration: none;
		transition: opacity 150ms ease, color 150ms ease;
		font-family: var(--font-performance-sans);
	}

	.footer-links a:hover {
		color: var(--color-performance-fg-primary, #ffffff);
		opacity: 1;
	}

	.footer-bottom {
		padding-top: 2rem;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
	}

	@media (min-width: 640px) {
		.footer-bottom {
			flex-direction: row;
		}
	}

	.footer-copyright {
		font-size: 10px;
		color: rgba(255, 255, 255, 0.4);
		font-family: var(--font-performance-sans);
	}

	.footer-social {
		display: flex;
		gap: var(--space-performance-md, 1rem);
	}

	.footer-social a {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.4);
		text-decoration: none;
		transition: opacity 150ms ease, color 150ms ease;
		font-family: var(--font-performance-sans);
	}

	.footer-social a:hover {
		color: var(--color-performance-fg-primary, #ffffff);
		opacity: 1;
	}

	/* ==========================================================================
	   Large Brand Signature - bleeds off bottom
	   ========================================================================== */
	   
	.footer-signature {
		position: relative;
		width: 100%;
		overflow: hidden;
		margin-top: 0;
		height: 140px;
	}

	.signature-text {
		position: absolute;
		bottom: 0;
		left: 50%;
		transform: translate(-50%, 25%);
		font-size: clamp(48px, 8vw, 120px);
		font-weight: 900;
		letter-spacing: -0.025em;
		line-height: 1;
		font-family: var(--font-performance-display);
		
		/* Gradient text that fades to background */
		background: linear-gradient(
			to bottom, 
			rgba(255, 255, 255, 0.1) 0%, 
			rgba(17, 17, 17, 0.1) 100%
		);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		
		user-select: none;
		pointer-events: none;
		white-space: nowrap;
	}
	
	/* Responsive - smaller signature on mobile */
	@media (max-width: 768px) {
		.footer-signature {
			height: 100px;
		}
		
		.signature-text {
			font-size: clamp(32px, 7vw, 64px);
		}
	}
</style>
