<script lang="ts">
	import type { PageData } from './$types';
	import { PapersGrid, SEO } from '@create-something/canon';

	let { data }: { data: PageData } = $props();
	const { papers } = data;

	type SortOption = 'newest' | 'oldest' | 'featured';
	let sortBy: SortOption = $state('newest');

	const sortedPapers = $derived.by(() => {
		const sorted = [...papers];
		switch (sortBy) {
			case 'newest':
				return sorted.sort((a, b) => {
					const aDate = new Date(a.published_at || a.created_at || 0).getTime();
					const bDate = new Date(b.published_at || b.created_at || 0).getTime();
					return bDate - aDate;
				});
			case 'oldest':
				return sorted.sort((a, b) => {
					const aDate = new Date(a.published_at || a.created_at || 0).getTime();
					const bDate = new Date(b.published_at || b.created_at || 0).getTime();
					return aDate - bDate;
				});
			case 'featured':
				return sorted.sort((a, b) => {
					const aFeatured = a.featured ?? 0;
					const bFeatured = b.featured ?? 0;
					if (bFeatured !== aFeatured) return bFeatured - aFeatured;
					const aDate = new Date(a.published_at || a.created_at || 0).getTime();
					const bDate = new Date(b.published_at || b.created_at || 0).getTime();
					return bDate - aDate;
				});
			default:
				return sorted;
		}
	});
</script>

<SEO
	title="All Experiments ({papers.length})"
	description="Browse agency experiments and case studies. Real projects, real results."
	propertyName="agency"
	breadcrumbs={[
		{ name: 'Home', url: '/' },
		{ name: 'Experiments', url: '/experiments' }
	]}
/>

<div class="min-h-screen page-wrapper">
	<!-- Navigation -->
	<nav class="fixed top-0 left-0 right-0 z-50 nav-bar">
		<div class="max-w-7xl mx-auto px-6">
			<div class="flex items-center justify-between py-4">
				<a href="/" class="flex items-center">
					<div class="heading-2 font-bold hover:body-secondary transition-colors">
						CREATE SOMETHING AGENCY
					</div>
				</a>

				<div class="hidden md:flex items-center gap-8">
					<a href="/" class="body-secondary hover:transition-colors body-sm font-medium">
						Home
					</a>
					<a
						href="/experiments"
						class="body-secondary hover:transition-colors body-sm font-medium"
					>
						Experiments
					</a>
					<a
						href="/methodology"
						class="body-secondary hover:transition-colors body-sm font-medium"
					>
						Methodology
					</a>
					<a
						href="/about"
						class="body-secondary hover:transition-colors body-sm font-medium"
					>
						About
					</a>
					<a
						href="/contact"
						class="group relative px-6 py-2 transition-all nav-cta-button"
					>
						<span class="relative z-10">Contact</span>
					</a>
				</div>
			</div>
		</div>
	</nav>

	<!-- Hero Section -->
	<section class="relative pt-32 pb-12 px-6">
		<div class="max-w-7xl mx-auto">
			<div class="text-center space-y-4">
				<h1 class="hero-title font-bold">All Experiments</h1>
				<p class="body-lg body-tertiary">
					{papers.length} agency experiments — real projects, real results
				</p>
			</div>

			<!-- Sort Control -->
			<div class="flex justify-center mt-8">
				<div class="inline-flex items-center gap-1 p-1 sort-control">
					<button
						onclick={() => sortBy = 'newest'}
						class="px-4 py-2 font-medium transition-all sort-button {sortBy === 'newest' ? 'sort-button-active' : ''}"
					>
						Newest
					</button>
					<button
						onclick={() => sortBy = 'oldest'}
						class="px-4 py-2 font-medium transition-all sort-button {sortBy === 'oldest' ? 'sort-button-active' : ''}"
					>
						Oldest
					</button>
					<button
						onclick={() => sortBy = 'featured'}
						class="px-4 py-2 font-medium transition-all sort-button {sortBy === 'featured' ? 'sort-button-active' : ''}"
					>
						Featured
					</button>
				</div>
			</div>
		</div>
	</section>

	<!-- Experiments Grid -->
	<PapersGrid papers={sortedPapers} title="" subtitle="" />

	<!-- Footer -->
	<footer class="py-6 px-6 page-footer">
		<div class="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
			<p class="body-muted body-sm">
				© {new Date().getFullYear()} Micah Johnson. All rights reserved.
			</p>
			<div class="flex items-center gap-6">
				<a href="/privacy" class="body-muted hover:body-tertiary body-sm transition-colors">
					Privacy Policy
				</a>
				<a href="/terms" class="body-muted hover:body-tertiary body-sm transition-colors">
					Terms of Service
				</a>
			</div>
		</div>
	</footer>
</div>

<style>
	/* Page wrapper */
	.page-wrapper {
		background: var(--color-bg-pure);
	}

	/* Navigation bar */
	.nav-bar {
		background: var(--color-bg-pure);
		border-bottom: 1px solid var(--color-border-default);
	}

	/* Nav CTA button */
	.nav-cta-button {
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		font-size: var(--text-body-sm);
		font-weight: 600;
		border-radius: var(--radius-full);
	}

	.nav-cta-button:hover {
		opacity: 0.9;
	}

	/* Sort control container */
	.sort-control {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	/* Sort buttons */
	.sort-button {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		border-radius: var(--radius-md);
	}

	.sort-button:hover {
		background: var(--color-bg-subtle);
	}

	.sort-button-active {
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
	}

	.sort-button-active:hover {
		background: var(--color-fg-primary);
	}

	/* Page footer */
	.page-footer {
		background: var(--color-bg-pure);
		border-top: 1px solid var(--color-border-default);
	}
</style>
