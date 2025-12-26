<script lang="ts">
	import { config } from '$lib/config/runtime';
	import SEOHead from '$lib/components/SEOHead.svelte';
</script>

<SEOHead title="Terms of Service" description="Terms and conditions governing the use of our services." />

<div class="legal-page">
	<div class="container">
		<h1>Terms of Service</h1>
		<p class="last-updated">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

		<section>
			<h2>Agreement to Terms</h2>
			<p>
				By accessing or using the services of {$config.name}, you agree to be bound by these Terms
				of Service and all applicable laws and regulations. If you do not agree with any of these
				terms, you are prohibited from using or accessing our services.
			</p>
		</section>

		<section>
			<h2>Services</h2>
			<p>
				We provide brand strategy, visual identity design, and digital experience services. The
				specific deliverables, timelines, and fees for each engagement will be outlined in a separate
				Statement of Work (SOW) or proposal document.
			</p>
		</section>

		<section>
			<h2>Project Engagements</h2>
			<h3>Proposals and Acceptance</h3>
			<p>
				All project engagements begin with a written proposal or SOW. Work will not commence until
				the client accepts the proposal in writing and pays any required deposit.
			</p>

			<h3>Payment Terms</h3>
			<p>
				Payment schedules are outlined in each project proposal. Standard terms require a 50% deposit
				to begin work, with the balance due upon project completion. Late payments may incur interest
				at 1.5% per month.
			</p>

			<h3>Revisions and Changes</h3>
			<p>
				Each project includes a specified number of revision rounds. Additional revisions or scope
				changes may incur additional fees, which will be communicated and approved before work
				proceeds.
			</p>
		</section>

		<section>
			<h2>Intellectual Property</h2>
			<h3>Client Materials</h3>
			<p>
				Clients retain all rights to materials they provide to us. By providing materials, clients
				represent they have the right to use and share such materials.
			</p>

			<h3>Deliverables</h3>
			<p>
				Upon full payment, clients receive all rights to final, approved deliverables as specified in
				the SOW. We retain the right to display work in our portfolio unless otherwise agreed in
				writing.
			</p>

			<h3>Third-Party Assets</h3>
			<p>
				Some projects may require licensed assets (fonts, stock images, etc.). Licensing fees and
				terms for third-party assets will be communicated separately.
			</p>
		</section>

		<section>
			<h2>Confidentiality</h2>
			<p>
				We maintain strict confidentiality regarding client business information, strategies, and
				unpublished materials. We will not disclose confidential information to third parties without
				client consent, except as required by law.
			</p>
		</section>

		<section>
			<h2>Limitation of Liability</h2>
			<p>
				Our liability for any claim arising from our services shall not exceed the fees paid for the
				specific project in question. We are not liable for indirect, incidental, or consequential
				damages.
			</p>
		</section>

		<section>
			<h2>Termination</h2>
			<p>
				Either party may terminate an engagement with 14 days written notice. Upon termination,
				clients will be invoiced for all work completed to date, and any prepaid fees for uncompleted
				work will be refunded.
			</p>
		</section>

		<section>
			<h2>Governing Law</h2>
			<p>
				These Terms shall be governed by and construed in accordance with the laws of {$config.address.state},
				without regard to its conflict of law provisions.
			</p>
		</section>

		<section>
			<h2>Contact Us</h2>
			<p>
				If you have questions about these Terms, please contact us at:
			</p>
			<p class="contact-info">
				<a href="mailto:{$config.email}">{$config.email}</a><br />
				{$config.phone}
			</p>
		</section>
	</div>
</div>

<style>
	.legal-page {
		background: var(--color-bg-pure);
		padding: var(--space-3xl) var(--gutter);
	}

	.container {
		max-width: var(--content-narrow);
		margin: 0 auto;
	}

	h1 {
		font-size: var(--text-display);
		font-weight: 700;
		letter-spacing: var(--tracking-tight);
		margin-bottom: var(--space-sm);
	}

	.last-updated {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		margin-bottom: var(--space-xl);
	}

	section {
		margin-bottom: var(--space-xl);
	}

	h2 {
		font-size: var(--text-h2);
		font-weight: 600;
		margin-bottom: var(--space-md);
	}

	h3 {
		font-size: var(--text-h3);
		font-weight: 500;
		margin-top: var(--space-md);
		margin-bottom: var(--space-sm);
	}

	p {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
		margin-bottom: var(--space-md);
	}

	a {
		color: var(--color-fg-primary);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	a:hover {
		color: var(--color-accent);
	}

	.contact-info {
		font-size: var(--text-body-lg);
	}
</style>
