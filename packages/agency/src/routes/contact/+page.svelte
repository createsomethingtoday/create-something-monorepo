<script lang="ts">
	import { fly } from 'svelte/transition';
	import { Footer } from '@create-something/components';
	import SEO from '$lib/components/SEO.svelte';

	const quickLinks = [
		{ label: 'Home', href: '/' },
		{ label: 'Services', href: '/services' },
		{ label: 'Work', href: '/work' },
		{ label: 'About', href: '/about' }
	];

	let submitting = false;
	let submitMessage = '';
	let submitSuccess = false;

	async function handleSubmit(event: Event) {
		event.preventDefault();
		submitting = true;
		submitMessage = '';

		const form = event.target as HTMLFormElement;
		const formData = new FormData(form);

		try {
			const response = await fetch('/api/contact', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					name: formData.get('name'),
					email: formData.get('email'),
					company: formData.get('company'),
					service: formData.get('service'),
					message: formData.get('message')
				})
			});

			const result = await response.json();

			if (response.ok && result.success) {
				submitSuccess = true;
				submitMessage = result.message || 'Message sent successfully!';
				form.reset();
			} else {
				submitSuccess = false;
				submitMessage = result.message || 'Failed to send message. Please try again.';
			}
		} catch (error) {
			submitSuccess = false;
			submitMessage = 'An error occurred. Please try again.';
		} finally {
			submitting = false;
		}
	}
</script>

<SEO
	title="Contact"
	description="Get in touch about agentic systems engineering, AI automation, or autonomous systems development. Inquire about our services or discuss your project needs."
	keywords="contact, agentic systems, AI automation, autonomous systems, consulting inquiry, web development, automation workflows"
	ogImage="/og-image.svg"
	propertyName="agency"
/>

<!-- Hero Section -->
	<section class="relative pt-32 pb-16 px-6">
		<div class="max-w-4xl mx-auto">
			<div class="space-y-6" in:fly={{ y: 20, duration: 600 }}>
				<h1 class="text-4xl md:text-6xl font-bold text-white">
					Let's Build Something
				</h1>

				<p class="text-lg text-white/70 leading-relaxed">
					Ready to bring AI automation to your business? Whether you're starting with web development or looking to build autonomous systems, let's discuss your project.
				</p>
			</div>
		</div>
	</section>

	<!-- Service Inquiry Section -->
	<section class="py-16 px-6">
		<div class="max-w-4xl mx-auto">
			<!-- Inquiry Form -->
			<div
				class="p-8 bg-white/[0.07] border border-white/10 rounded-lg mb-8"
				in:fly={{ y: 20, duration: 500 }}
			>
				<h2 class="text-2xl font-semibold text-white mb-6">Service Inquiry</h2>
				<p class="text-white/60 mb-8">
					Fill out the form below and we'll get back to you within 24 hours to discuss your project.
				</p>

				<form class="space-y-6" on:submit={handleSubmit}>
					<!-- Service Selection -->
					<div>
						<label for="service" class="block text-sm font-medium text-white mb-2">
							Which service are you interested in?
						</label>
						<select
							id="service"
							name="service"
							required
							class="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-white/40 transition-colors"
						>
							<option value="" disabled selected>Select a service</option>
							<option value="web-development">Web Development ($5,000+)</option>
							<option value="automation">AI Automation Systems ($15,000+)</option>
							<option value="agentic-systems">Agentic Systems Engineering ($35,000+)</option>
							<option value="partnership">Ongoing Systems Partnership ($5,000/mo+)</option>
							<option value="transformation">AI-Native Transformation ($50,000+)</option>
							<option value="advisory">Strategic Advisory ($10,000/mo+)</option>
							<option value="not-sure">Not sure yet - let's discuss</option>
						</select>
					</div>

					<!-- Name -->
					<div>
						<label for="name" class="block text-sm font-medium text-white mb-2">
							Your name
						</label>
						<input
							type="text"
							id="name"
							name="name"
							required
							class="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/40 transition-colors"
							placeholder="John Doe"
						/>
					</div>

					<!-- Email -->
					<div>
						<label for="email" class="block text-sm font-medium text-white mb-2">
							Email address
						</label>
						<input
							type="email"
							id="email"
							name="email"
							required
							class="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/40 transition-colors"
							placeholder="john@company.com"
						/>
					</div>

					<!-- Company -->
					<div>
						<label for="company" class="block text-sm font-medium text-white mb-2">
							Company (optional)
						</label>
						<input
							type="text"
							id="company"
							name="company"
							class="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/40 transition-colors"
							placeholder="Your Company"
						/>
					</div>

					<!-- Project Details -->
					<div>
						<label for="message" class="block text-sm font-medium text-white mb-2">
							Tell us about your project
						</label>
						<textarea
							id="message"
							name="message"
							required
							rows="6"
							class="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/40 transition-colors resize-none"
							placeholder="What are you looking to build? What problems are you trying to solve? Any timeline or budget constraints?"
						></textarea>
					</div>

					<!-- Submit Button -->
					<button
						type="submit"
						disabled={submitting}
						class="w-full px-8 py-4 bg-white text-black text-lg font-semibold rounded-full hover:bg-white/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{submitting ? 'Sending...' : 'Submit Inquiry'}
					</button>

					<!-- Submit Message -->
					{#if submitMessage}
						<div
							class="p-4 rounded-lg {submitSuccess
								? 'bg-green-500/10 border border-green-500/20 text-green-400'
								: 'bg-red-500/10 border border-red-500/20 text-red-400'}"
						>
							{submitMessage}
						</div>
					{/if}
				</form>
			</div>

			<!-- Direct Contact -->
			<div class="grid grid-cols-1 md:grid-cols-2 gap-8">
				<!-- Email -->
				<div
					class="p-8 bg-white/[0.07] border border-white/10 rounded-lg hover:border-white/30 transition-all"
					in:fly={{ y: 20, duration: 500, delay: 100 }}
				>
					<div class="mb-4">
						<svg
							class="w-8 h-8 text-white/80"
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
					<h3 class="text-xl font-semibold text-white mb-2">Prefer Email?</h3>
					<p class="text-white/60 mb-4">
						Reach out directly for quick questions or general inquiries.
					</p>
					<a
						href="mailto:micah@createsomething.agency"
						class="text-white/80 hover:text-white transition-colors inline-flex items-center gap-2"
					>
						micah@createsomething.agency
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
					class="p-8 bg-white/[0.07] border border-white/10 rounded-lg hover:border-white/30 transition-all"
					in:fly={{ y: 20, duration: 500, delay: 200 }}
				>
					<div class="mb-4">
						<svg
							class="w-8 h-8 text-white/80"
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
					<h3 class="text-xl font-semibold text-white mb-2">Connect</h3>
					<p class="text-white/60 mb-4">
						Follow our work and see case studies on LinkedIn.
					</p>
					<div class="flex gap-4">
						<a
							href="https://www.linkedin.com/in/micahryanjohnson/"
							target="_blank"
							rel="noopener noreferrer"
							class="text-white/80 hover:text-white transition-colors"
						>
							LinkedIn
						</a>
						<a
							href="https://github.com/createsomethingtoday"
							target="_blank"
							rel="noopener noreferrer"
							class="text-white/80 hover:text-white transition-colors"
						>
							GitHub
						</a>
					</div>
				</div>
			</div>
		</div>
	</section>

<Footer
	mode="agency"
	showNewsletter={false}
	aboutText="Professional AI-native development services backed by research from createsomething.io"
	quickLinks={quickLinks}
	showSocial={true}
/>
