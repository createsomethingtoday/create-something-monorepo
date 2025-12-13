<script lang="ts">
	/**
	 * ContactModal Component - Full contact form with category-specific fields
	 * Maverick X Design System
	 *
	 * Matches React implementation exactly:
	 * - Light theme (white background)
	 * - Rounded pill inputs (h-13, rounded-full)
	 * - Grid checkbox cards (rounded-xl)
	 * - Quick contact info section
	 * - Default category/product selection from product pages
	 */

	import Icon from './Icon.svelte';

	interface Props {
		isOpen: boolean;
		onClose: () => void;
		defaultCategoryId?: string;
		defaultProductId?: string;
		defaultApplicationId?: string;
	}

	let { isOpen, onClose, defaultCategoryId, defaultProductId, defaultApplicationId }: Props = $props();

	// Form state
	let name = $state('');
	let company = $state('');
	let email = $state('');
	let phone = $state('');
	let category = $state<{ id: string; title: string } | null>(null);
	let selectedProducts = $state<{ id: string; title: string }[]>([]);
	let selectedApplications = $state<{ id: string; title: string }[]>([]);
	let comment = $state('');

	let isSubmitting = $state(false);
	let submitStatus = $state<'idle' | 'success' | 'error'>('idle');
	let errors = $state<Record<string, string>>({});
	let isAnimating = $state(false);
	let categoryDropdownOpen = $state(false);

	// Categories
	const categories = [
		{ id: 'petrox', title: 'Oil & Gas' },
		{ id: 'lithx', title: 'Metals & Mining' },
		{ id: 'water', title: 'Water Treatment' },
		{ id: 'general', title: 'General Inquiry' }
	];

	// PetroX products
	const petroxProducts = [
		{ id: 'eor', title: 'EOR' },
		{ id: 'iron', title: 'Iron' },
		{ id: 'scale', title: 'Scale' },
		{ id: 'wax', title: 'Wax' },
		{ id: 'sludge', title: 'Sludge' },
		{ id: 'clear', title: 'Clear' },
		{ id: 'flow', title: 'Flow' },
		{ id: 'biocide', title: 'Biocide' },
		{ id: 'h2s', title: 'H₂S' },
		{ id: 'sweet', title: 'Sweet' },
		{ id: 'custom', title: 'Custom' }
	];

	// PetroX applications
	const petroxApplications = [
		{ id: 'eor', title: 'EOR' },
		{ id: 'iron', title: 'Iron' },
		{ id: 'scale', title: 'Scale' },
		{ id: 'wax', title: 'Wax' },
		{ id: 'sludge', title: 'Sludge' },
		{ id: 'clear', title: 'Clear' },
		{ id: 'flow', title: 'Flow' },
		{ id: 'biocide', title: 'Biocide' },
		{ id: 'h2s', title: 'H₂S' },
		{ id: 'sweet', title: 'Sweet' },
		{ id: 'custom', title: 'Custom' }
	];

	// LithX metals
	const lithxMetals = [
		{ id: 'copper', title: 'Copper' },
		{ id: 'pgms', title: 'PGMs' },
		{ id: 'gold', title: 'Gold' },
		{ id: 'rees', title: 'REEs' },
		{ id: 'other', title: 'Other' }
	];

	// LithX applications
	const lithxApplications = [
		{ id: 'heap', title: 'Heap Leaching' },
		{ id: 'isr', title: 'In-Situ Recovery' }
	];

	// Validation
	function validateEmail(email: string): boolean {
		return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
	}

	function validatePhone(phone: string): boolean {
		const digitsOnly = phone.replace(/\D/g, '');
		return digitsOnly.length >= 10;
	}

	function validateForm(): boolean {
		const newErrors: Record<string, string> = {};

		if (!name.trim()) {
			newErrors.name = 'Name is required';
		} else if (name.trim().length < 2) {
			newErrors.name = 'Name must be at least 2 characters';
		}

		if (!company.trim()) {
			newErrors.company = 'Company name is required';
		}

		if (!email.trim()) {
			newErrors.email = 'Email is required';
		} else if (!validateEmail(email)) {
			newErrors.email = 'Please enter a valid email address';
		}

		if (!phone.trim()) {
			newErrors.phone = 'Phone number is required';
		} else if (!validatePhone(phone)) {
			newErrors.phone = 'Please enter a valid phone number (at least 10 digits)';
		}

		if (!category) {
			newErrors.category = 'Please select an area of interest';
		}

		if (!comment.trim()) {
			newErrors.comment = 'Message is required';
		} else if (comment.length > 4000) {
			newErrors.comment = 'Message must not exceed 4,000 characters';
		} else if (comment.trim().length < 10) {
			newErrors.comment = 'Message must be at least 10 characters';
		}

		errors = newErrors;
		return Object.keys(newErrors).length === 0;
	}

	// Toggle item in array
	function toggleItem(items: { id: string; title: string }[], item: { id: string; title: string }): { id: string; title: string }[] {
		const isSelected = items.some(i => i.id === item.id);
		if (isSelected) {
			return items.filter(i => i.id !== item.id);
		}
		return [...items, item];
	}

	// Handle form submit
	async function handleSubmit(e: Event) {
		e.preventDefault();
		errors = {};
		submitStatus = 'idle';

		if (!validateForm()) {
			return;
		}

		isSubmitting = true;

		try {
			const response = await fetch('/api/contact', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: name.trim(),
					company: company.trim(),
					email: email.trim(),
					phone: phone.trim(),
					category: category?.title,
					products: selectedProducts.map(p => p.title),
					applications: selectedApplications.map(a => a.title),
					comment: comment.trim()
				})
			});

			if (!response.ok) {
				throw new Error('Failed to submit form');
			}

			submitStatus = 'success';
			setTimeout(() => {
				onClose();
			}, 1500);
		} catch (err) {
			submitStatus = 'error';
			errors = { submit: 'Failed to submit form. Please try again.' };
		} finally {
			isSubmitting = false;
		}
	}

	// Reset form
	function resetForm() {
		name = '';
		company = '';
		email = '';
		phone = '';
		category = null;
		selectedProducts = [];
		selectedApplications = [];
		comment = '';
		errors = {};
		submitStatus = 'idle';
	}

	// Handle ESC key and body scroll
	$effect(() => {
		if (isOpen) {
			isAnimating = true;
			document.body.style.overflow = 'hidden';

			// Set default category if provided
			if (defaultCategoryId && !category) {
				const defaultCategory = categories.find(c => c.id === defaultCategoryId);
				if (defaultCategory) {
					category = defaultCategory;
				}
			}

			// Set default product if provided
			if (defaultProductId && category && selectedProducts.length === 0) {
				let productList: { id: string; title: string }[] = [];
				if (category.id === 'petrox') {
					productList = petroxProducts;
				} else if (category.id === 'lithx') {
					productList = lithxMetals;
				}
				const defaultProduct = productList.find(p => p.id === defaultProductId);
				if (defaultProduct) {
					selectedProducts = [defaultProduct];
				}
			}

			// Set default application if provided
			if (defaultApplicationId && category && selectedApplications.length === 0) {
				let appList: { id: string; title: string }[] = [];
				if (category.id === 'petrox') {
					appList = petroxApplications;
				} else if (category.id === 'lithx') {
					appList = lithxApplications;
				}
				const defaultApp = appList.find(a => a.id === defaultApplicationId);
				if (defaultApp) {
					selectedApplications = [defaultApp];
				}
			}
		} else {
			document.body.style.overflow = '';
			resetForm();
		}
	});

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && isOpen) {
			onClose();
		}
	}

	function selectCategory(cat: { id: string; title: string }) {
		category = cat;
		categoryDropdownOpen = false;
		// Reset products/applications when category changes
		selectedProducts = [];
		selectedApplications = [];
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen || isAnimating}
	<!-- Overlay -->
	<div
		class="modal-overlay"
		class:is-open={isOpen}
	>
		<!-- Background -->
		<div
			class="modal-backdrop"
			aria-hidden="true"
			onclick={onClose}
			role="button"
			tabindex="-1"
		></div>

		<!-- Container -->
		<div class="modal-container">
			<!-- Modal Content -->
			<div
				class="modal-content"
				class:is-open={isOpen}
				role="dialog"
				aria-modal="true"
				aria-labelledby="contact-modal-title"
				onclick={(e) => e.stopPropagation()}
			>
				<!-- Close Button -->
				<button
					type="button"
					class="close-button"
					onclick={onClose}
					aria-label="Close modal"
				>
					<svg class="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
						<path d="M18.364 5.636a1 1 0 0 1 0 1.414L13.414 12l4.95 4.95a1 1 0 0 1-1.414 1.414L12 13.414l-4.95 4.95a1 1 0 0 1-1.414-1.414L10.586 12 5.636 7.05a1 1 0 0 1 1.414-1.414L12 10.586l4.95-4.95a1 1 0 0 1 1.414 0z"></path>
					</svg>
				</button>

				<!-- Single padding container -->
				<div class="modal-inner">
					<!-- Header -->
					<div class="modal-header">
						<h2 id="contact-modal-title" class="modal-title">Get in Touch</h2>
						<p class="modal-description">
							Ready to transform your industrial chemistry operations?
							Our technical team is here to help you optimize performance
							and drive results.
						</p>
					</div>

					<!-- Quick Contact Info -->
					<div class="contact-info-grid">
						<div>
							<div class="contact-label">General Inquiries</div>
							<a href="mailto:info@maverickx.com" class="contact-link">
								info@maverickx.com
							</a>
						</div>
						<div>
							<div class="contact-label">Technical Support</div>
							<a href="mailto:support@maverickx.com" class="contact-link">
								support@maverickx.com
							</a>
						</div>
						<div>
							<div class="contact-label">Sales & Partnerships</div>
							<a href="mailto:sales@maverickx.com" class="contact-link">
								sales@maverickx.com
							</a>
						</div>
					</div>

					<!-- Contact Form -->
					<form class="form-container" onsubmit={handleSubmit}>
						<!-- Success/Error Alert -->
						{#if submitStatus === 'success'}
							<div class="alert alert-success">
								✓ Message sent successfully! We'll get back to you soon.
							</div>
						{/if}
						{#if errors.submit}
							<div class="alert alert-error">
								{errors.submit}
							</div>
						{/if}

						<!-- Name & Company Row -->
						<div class="form-row">
							<div>
								<label for="contact-name" class="form-label">Full Name</label>
								<input
									type="text"
									id="contact-name"
									class="form-input"
									placeholder="Ex. John Smith"
									bind:value={name}
									required
								/>
								{#if errors.name}
									<p class="form-error">{errors.name}</p>
								{/if}
							</div>
							<div>
								<label for="contact-company" class="form-label">Company</label>
								<input
									type="text"
									id="contact-company"
									class="form-input"
									placeholder="Ex. Acme Industries"
									bind:value={company}
									required
								/>
								{#if errors.company}
									<p class="form-error">{errors.company}</p>
								{/if}
							</div>
						</div>

						<!-- Email & Phone Row -->
						<div class="form-row">
							<div>
								<label for="contact-email" class="form-label">Email Address</label>
								<input
									type="email"
									id="contact-email"
									class="form-input"
									placeholder="Ex. john.smith@company.com"
									bind:value={email}
									required
								/>
								{#if errors.email}
									<p class="form-error">{errors.email}</p>
								{/if}
							</div>
							<div>
								<label for="contact-phone" class="form-label">Phone Number</label>
								<input
									type="tel"
									id="contact-phone"
									class="form-input"
									placeholder="Ex. (808) 555-0111"
									bind:value={phone}
									required
								/>
								{#if errors.phone}
									<p class="form-error">{errors.phone}</p>
								{/if}
							</div>
						</div>

						<!-- Category Dropdown -->
						<div class="dropdown-wrapper">
							<div class="form-label">Area of Interest</div>
							<div class="relative">
								<button
									type="button"
									class="dropdown-trigger"
									class:has-value={category}
									onclick={() => categoryDropdownOpen = !categoryDropdownOpen}
								>
									<div class="truncate">{category ? category.title : 'Select solution area'}</div>
									<svg
										class="dropdown-arrow"
										class:is-open={categoryDropdownOpen}
										width="24"
										height="24"
										viewBox="0 0 24 24"
										aria-hidden="true"
									>
										<path d="M12.726 15.536a1 1 0 0 1-1.414 0L5.655 9.879a1 1 0 0 1-.305-.711 1 1 0 0 1 .293-.716 1 1 0 0 1 .716-.293 1 1 0 0 1 .711.305l4.95 4.95 4.95-4.95a1 1 0 0 1 1.402.012 1 1 0 0 1 .012 1.402l-5.657 5.657z"></path>
									</svg>
								</button>
								{#if categoryDropdownOpen}
									<div class="dropdown-menu">
										{#each categories as cat}
											<button
												type="button"
												class="dropdown-option"
												class:selected={category?.id === cat.id}
												onclick={() => selectCategory(cat)}
											>
												{cat.title}
											</button>
										{/each}
									</div>
								{/if}
							</div>
							{#if errors.category}
								<p class="form-error">{errors.category}</p>
							{/if}
						</div>

						<!-- PetroX Products (Multi-select checkboxes) -->
						{#if category?.id === 'petrox'}
							<div>
								<div class="form-label">Products of Interest (Optional)</div>
								<div class="checkbox-grid">
									{#each petroxProducts as product}
										{@const isSelected = selectedProducts.some(p => p.id === product.id)}
										<label
											class="checkbox-card"
											class:selected={isSelected}
										>
											<div
												class="checkbox-box"
												class:checked={isSelected}
											>
												{#if isSelected}
													<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
													</svg>
												{/if}
											</div>
											<span
												class="checkbox-label"
												class:checked={isSelected}
											>
												{product.title}
											</span>
											<input
												type="checkbox"
												class="sr-only"
												checked={isSelected}
												onchange={() => selectedProducts = toggleItem(selectedProducts, product)}
											/>
										</label>
									{/each}
								</div>
							</div>

							<div>
								<div class="form-label">Applications of Interest (Optional)</div>
								<div class="checkbox-grid">
									{#each petroxApplications as app}
										{@const isSelected = selectedApplications.some(a => a.id === app.id)}
										<label
											class="checkbox-card"
											class:selected={isSelected}
										>
											<div
												class="checkbox-box"
												class:checked={isSelected}
											>
												{#if isSelected}
													<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
													</svg>
												{/if}
											</div>
											<span
												class="checkbox-label"
												class:checked={isSelected}
											>
												{app.title}
											</span>
											<input
												type="checkbox"
												class="sr-only"
												checked={isSelected}
												onchange={() => selectedApplications = toggleItem(selectedApplications, app)}
											/>
										</label>
									{/each}
								</div>
							</div>
						{/if}

						<!-- LithX Metals (Multi-select checkboxes) -->
						{#if category?.id === 'lithx'}
							<div>
								<div class="form-label">Metals of Interest (Optional)</div>
								<div class="checkbox-grid">
									{#each lithxMetals as metal}
										{@const isSelected = selectedProducts.some(p => p.id === metal.id)}
										<label
											class="checkbox-card"
											class:selected={isSelected}
										>
											<div
												class="checkbox-box"
												class:checked={isSelected}
											>
												{#if isSelected}
													<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
													</svg>
												{/if}
											</div>
											<span
												class="checkbox-label"
												class:checked={isSelected}
											>
												{metal.title}
											</span>
											<input
												type="checkbox"
												class="sr-only"
												checked={isSelected}
												onchange={() => selectedProducts = toggleItem(selectedProducts, metal)}
											/>
										</label>
									{/each}
								</div>
							</div>

							<div>
								<div class="form-label">Applications of Interest (Optional)</div>
								<div class="checkbox-grid">
									{#each lithxApplications as app}
										{@const isSelected = selectedApplications.some(a => a.id === app.id)}
										<label
											class="checkbox-card"
											class:selected={isSelected}
										>
											<div
												class="checkbox-box"
												class:checked={isSelected}
											>
												{#if isSelected}
													<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
													</svg>
												{/if}
											</div>
											<span
												class="checkbox-label"
												class:checked={isSelected}
											>
												{app.title}
											</span>
											<input
												type="checkbox"
												class="sr-only"
												checked={isSelected}
												onchange={() => selectedApplications = toggleItem(selectedApplications, app)}
											/>
										</label>
									{/each}
								</div>
							</div>
						{/if}

						<!-- Message Textarea -->
						<div>
							<label for="contact-message" class="form-label">
								Message (max 4,000 characters{comment.length > 0 ? ` - ${comment.length}/4000` : ''})
							</label>
							<textarea
								id="contact-message"
								class="form-textarea"
								placeholder="Tell us about your project or inquiry..."
								bind:value={comment}
								required
							></textarea>
							{#if errors.comment}
								<p class="form-error">{errors.comment}</p>
							{/if}
						</div>

						<!-- Form Actions -->
						<div class="form-actions">
							<button
								type="button"
								class="cancel-button"
								onclick={onClose}
								disabled={isSubmitting}
							>
								Cancel
							</button>
							<!-- Submit button -->
							<button
								type="submit"
								class="submit-button group"
								disabled={isSubmitting || submitStatus === 'success'}
							>
								<span class="mr-auto">
									{isSubmitting ? 'Submitting...' : submitStatus === 'success' ? 'Sent!' : 'Submit'}
								</span>
								{#if !isSubmitting && submitStatus !== 'success'}
									<span class="submit-arrow">
										<svg
											class="w-5 h-5 arrow-icon"
											width="24"
											height="24"
											viewBox="0 0 24 24"
											aria-hidden="true"
										>
											<path d="M14.877 18.359l5.657-5.657a1 1 0 0 0 0-1.414l-5.657-5.657a1 1 0 0 0-1.402.012 1 1 0 0 0-.012 1.402l3.95 3.95H4.17a1 1 0 0 0-1 1 1 1 0 0 0 1 1h13.243l-3.95 3.95a1 1 0 0 0-.305.711 1 1 0 0 0 .293.716 1 1 0 0 0 .716.293 1 1 0 0 0 .711-.305z"></path>
										</svg>
									</span>
								{/if}
							</button>
						</div>
					</form>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	/* Modal Overlay */
	.modal-overlay {
		position: fixed;
		inset: 0;
		z-index: 50;
		opacity: 0;
		pointer-events: none;
		transition: opacity 500ms ease;
	}

	.modal-overlay.is-open {
		opacity: 1;
		pointer-events: auto;
	}

	/* Modal Backdrop */
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.95);
		backdrop-filter: blur(4px);
	}

	/* Modal Container */
	.modal-container {
		position: relative;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
	}

	/* Modal Content - React uses rounded-3xl but all border-radius = 0 in Tailwind config */
	.modal-content {
		position: relative;
		background: #ffffff;
		border-radius: 0;
		width: 100%;
		max-width: 48rem;
		max-height: 90vh;
		overflow-y: auto;
		opacity: 0;
		transform: scale(0.95);
		transition: all 500ms ease;
	}

	.modal-content.is-open {
		opacity: 1;
		transform: scale(1);
	}

	/* Close Button - React uses rounded-full but all border-radius = 0 */
	.close-button {
		position: absolute;
		top: 1.5rem;
		right: 1.5rem;
		z-index: 10;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.75rem;
		height: 2.75rem;
		border-radius: 0;
		background: rgba(173, 173, 173, 0.1);
		border: none;
		cursor: pointer;
		transition: all 200ms ease;
	}

	.close-button:hover {
		background: rgba(224, 224, 224, 0.5);
	}

	.close-button:active {
		transform: scale(0.95);
	}

	.close-button svg {
		fill: #585858;
	}

	/* Modal Inner Padding */
	.modal-inner {
		padding: 3rem;
	}

	@media (max-width: 1179px) {
		.modal-inner {
			padding: 2.5rem;
		}
	}

	@media (max-width: 767px) {
		.modal-inner {
			padding: 1.5rem;
		}
	}

	@media (max-width: 480px) {
		.modal-inner {
			padding: 1.25rem;
		}
	}

	/* Modal Header */
	.modal-header {
		margin-bottom: 2.5rem;
	}

	@media (max-width: 767px) {
		.modal-header {
			margin-bottom: 2rem;
		}
	}

	.modal-title {
		margin-bottom: 1rem;
		font-family: 'Inter Tight', 'Inter', system-ui, sans-serif;
		font-size: 1.875rem;
		line-height: 2.34rem;
		font-weight: 500;
		color: #212121;
	}

	@media (max-width: 767px) {
		.modal-title {
			margin-bottom: 0.75rem;
		}
	}

	/* Modal Description - React: text-g-100 */
	.modal-description {
		color: #8a8a8a; /* g-100 */
		max-width: 34rem;
	}

	@media (max-width: 767px) {
		.modal-description {
			font-size: 0.875rem; /* text-caption */
		}
	}

	/* Contact Info Grid - React: grid-cols-3 gap-6 mb-10 pb-10 border-b border-g-75/50 */
	.contact-info-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1.5rem;
		margin-bottom: 2.5rem;
		padding-bottom: 2.5rem;
		border-bottom: 1px solid rgba(173, 173, 173, 0.5); /* g-75/50 */
	}

	@media (max-width: 767px) {
		.contact-info-grid {
			grid-template-columns: 1fr;
			gap: 1rem;
			margin-bottom: 2rem;
			padding-bottom: 2rem;
		}
	}

	/* Contact Label - React: text-caption font-medium text-g-300 */
	.contact-label {
		margin-bottom: 0.25rem;
		font-size: 0.875rem; /* text-caption */
		font-weight: 500;
		color: #363636; /* g-300 */
	}

	/* Contact Link - React: text-caption text-g-100 hover:text-g-500 */
	.contact-link {
		font-size: 0.875rem; /* text-caption */
		color: #8a8a8a; /* g-100 */
		text-decoration: none;
		transition: all 200ms ease;
	}

	.contact-link:hover {
		color: #212121; /* g-500 */
	}

	.contact-link:active {
		transform: scale(0.95);
	}

	/* Form Container */
	.form-container {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	@media (max-width: 767px) {
		.form-container {
			gap: 1.25rem;
		}
	}

	/* Form Row */
	.form-row {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1.5rem;
	}

	@media (max-width: 767px) {
		.form-row {
			grid-template-columns: 1fr;
		}
	}

	/* Form Label - React: mb-3.5 block text-g-500 */
	.form-label {
		display: block;
		margin-bottom: 0.875rem; /* mb-3.5 = 0.875rem */
		color: #212121; /* g-500 */
	}

	/* Form Input - React: h-13 px-4 bg-white border-g-75 text-caption text-g-500 placeholder:text-g-75 focus:border-g-200 md:h-12 */
	.form-input {
		width: 100%;
		height: 3.25rem; /* h-13 = 3.25rem */
		padding: 0 1rem; /* px-4 */
		background: #ffffff;
		border: 1px solid #adadad; /* border-g-75 */
		border-radius: 0;
		font-family: inherit;
		font-size: 0.875rem; /* text-caption */
		font-weight: 400;
		color: #212121; /* text-g-500 */
		outline: none;
		transition: border-color 200ms ease;
	}

	.form-input::placeholder {
		color: #adadad; /* placeholder:text-g-75 */
	}

	.form-input:focus {
		border-color: #585858; /* focus:border-g-200 */
	}

	@media (max-width: 767px) {
		.form-input {
			height: 3rem; /* md:h-12 */
		}
	}

	/* Form Textarea - React: h-[14.875rem] p-4 border-g-75 text-caption text-g-500 placeholder:text-g-75 focus:border-g-200 */
	.form-textarea {
		width: 100%;
		height: 14.875rem;
		padding: 1rem; /* p-4 */
		background: #ffffff;
		border: 1px solid #adadad; /* border-g-75 */
		border-radius: 0;
		font-family: inherit;
		font-size: 0.875rem; /* text-caption */
		font-weight: 400;
		color: #212121; /* text-g-500 */
		resize: none;
		outline: none;
		transition: border-color 200ms ease;
	}

	.form-textarea::placeholder {
		color: #adadad; /* placeholder:text-g-75 */
	}

	.form-textarea:focus {
		border-color: #585858; /* focus:border-g-200 */
	}

	/* Form Error */
	.form-error {
		margin-top: 0.5rem;
		font-size: 0.875rem; /* text-caption */
		color: #cc4444;
	}

	/* Alert - React uses rounded-xl but all border-radius = 0 */
	.alert {
		padding: 1rem;
		border-radius: 0;
		font-size: 0.75rem;
	}

	.alert-success {
		background: #f0fdf4;
		border: 1px solid #86efac;
		color: #166534;
	}

	.alert-error {
		background: #fef2f2;
		border: 1px solid #fca5a5;
		color: #991b1b;
	}

	/* Dropdown */
	.dropdown-wrapper {
		position: relative;
		z-index: 20;
	}

	/* Dropdown Trigger - React: h-14 px-4 border-g-75 text-body !text-caption text-g-500 md:h-12 md:text-caption */
	.dropdown-trigger {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
		height: 3.5rem; /* h-14 */
		padding: 0 1rem; /* px-4 */
		background: #ffffff;
		border: 1px solid #adadad; /* border-g-75 */
		border-radius: 0;
		font-size: 0.875rem; /* !text-caption overrides text-body */
		font-weight: 400;
		color: #212121; /* text-g-500 - shows value when selected */
		cursor: pointer;
		outline: none;
		transition: border-color 200ms ease;
	}

	.dropdown-trigger.has-value {
		color: #212121; /* text-g-500 */
	}

	.dropdown-trigger:hover,
	.dropdown-trigger.is-open {
		border-color: #585858; /* ui-open:border-g-200 */
	}

	@media (max-width: 767px) {
		.dropdown-trigger {
			height: 3rem; /* md:h-12 */
			font-size: 0.875rem; /* md:text-caption */
		}
	}

	/* Dropdown Arrow - React: w-6 h-6 fill-[#09244B] ui-open:rotate-180 */
	.dropdown-arrow {
		width: 1.5rem; /* w-6 */
		height: 1.5rem; /* h-6 */
		flex-shrink: 0;
		margin-left: 0.5rem; /* ml-2 */
		fill: #09244B; /* fill-[#09244B] - dark navy */
		transition: transform 200ms ease;
	}

	.dropdown-arrow.is-open {
		transform: rotate(180deg);
	}

	.dropdown-menu {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		margin-top: 0.25rem;
		background: #ffffff;
		border: 1px solid #adadad;
		border-radius: 0;
		overflow: hidden;
		box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
		z-index: 30;
	}

	.dropdown-option {
		display: block;
		width: 100%;
		padding: 0.75rem 1rem;
		text-align: left;
		background: transparent;
		border: none;
		color: #585858;
		cursor: pointer;
		transition: all 200ms ease;
	}

	.dropdown-option:hover {
		background: rgba(0, 0, 0, 0.05);
	}

	.dropdown-option.selected {
		background: rgba(0, 0, 0, 0.05);
	}

	.dropdown-option:active {
		transform: scale(0.98);
	}

	/* Checkbox Grid - React: grid grid-cols-2 gap-3 md:grid-cols-1 */
	.checkbox-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.75rem; /* gap-3 */
	}

	@media (max-width: 767px) {
		.checkbox-grid {
			grid-template-columns: 1fr; /* md:grid-cols-1 */
		}
	}

	/* Checkbox Card - React: flex items-center gap-3 px-4 py-3 border border-g-75 bg-white hover:border-g-200 active:scale-[0.98] / selected: border-g-500 bg-g-50/50 */
	.checkbox-card {
		display: flex;
		align-items: center;
		gap: 0.75rem; /* gap-3 */
		padding: 0.75rem 1rem; /* py-3 px-4 */
		background: #ffffff;
		border: 1px solid #adadad; /* border-g-75 */
		border-radius: 0;
		cursor: pointer;
		transition: all 200ms ease;
	}

	.checkbox-card:hover {
		border-color: #585858; /* hover:border-g-200 */
	}

	.checkbox-card:active {
		transform: scale(0.98); /* active:scale-[0.98] */
	}

	.checkbox-card.selected {
		background: rgba(235, 235, 235, 0.5); /* bg-g-50/50 = #ebebeb at 50% */
		border-color: #212121; /* border-g-500 */
	}

	/* Checkbox Box - React: w-5 h-5 border-2 border-g-200 bg-white / checked: border-g-500 bg-g-500 */
	.checkbox-box {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.25rem; /* w-5 */
		height: 1.25rem; /* h-5 */
		flex-shrink: 0;
		background: #ffffff;
		border: 2px solid #585858; /* border-2 border-g-200 */
		border-radius: 0;
		transition: all 200ms ease;
	}

	.checkbox-box.checked {
		background: #212121; /* bg-g-500 */
		border-color: #212121; /* border-g-500 */
		color: #ffffff;
	}

	/* Checkbox Label - React: text-caption font-normal text-g-300 / checked: text-g-500 */
	.checkbox-label {
		font-size: 0.875rem; /* text-caption */
		line-height: 1.225rem;
		font-weight: 400; /* font-normal */
		color: #363636; /* text-g-300 */
		transition: color 200ms ease;
	}

	.checkbox-label.checked {
		color: #212121; /* text-g-500 */
	}

	/* Form Actions */
	.form-actions {
		display: flex;
		justify-content: flex-end;
		gap: 1rem;
		padding-top: 1rem;
	}

	/* Cancel Button - React: px-6 py-3 text-g-300 hover:text-g-500 */
	.cancel-button {
		padding: 0.75rem 1.5rem;
		background: transparent;
		border: none;
		color: #363636; /* g-300 */
		cursor: pointer;
		transition: all 200ms ease;
	}

	.cancel-button:hover {
		color: #212121; /* g-500 */
	}

	.cancel-button:active {
		transform: scale(0.95);
	}

	.cancel-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Submit Button - React: btn border-g-500 bg-g-500 text-w-50 hover:bg-white hover:text-g-500 hover:shadow-lg */
	.submit-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		height: 3rem;
		padding: 0 1.125rem 0 1.5rem; /* px-4.5 on left, less on right for arrow */
		background: #212121; /* g-500 */
		border: 2px solid #212121; /* border-g-500 */
		border-radius: 0;
		font-family: inherit;
		font-size: 1rem; /* text-body */
		font-weight: 500;
		color: #fdfdfd; /* w-50 */
		cursor: pointer;
		transition: all 200ms ease;
	}

	.submit-button:hover {
		background: #ffffff;
		color: #212121; /* g-500 */
		box-shadow: 0 10px 15px -3px rgba(0, 105, 255, 0.2); /* shadow-lg shadow-primary-500/20 */
	}

	.submit-button:active {
		transform: scale(0.95);
	}

	.submit-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.submit-button:focus-visible {
		outline: 2px solid #FF7A00;
		outline-offset: 2px;
	}

	/* Submit Arrow - React uses rounded-full but all border-radius = 0 */
	.submit-arrow {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		margin-left: 1.5rem;
		margin-right: -0.75rem;
		background: #ffffff;
		border-radius: 0;
		transition: all 500ms ease;
	}

	.submit-button:hover .submit-arrow {
		background: #212121;
		transform: scale(1.1);
	}

	.arrow-icon {
		fill: #212121;
		transition: all 500ms ease;
	}

	.submit-button:hover .arrow-icon {
		fill: #ffffff;
		transform: translateX(2px);
	}

	/* Screen reader only */
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

	/* Utility */
	.truncate {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.relative {
		position: relative;
	}
</style>
