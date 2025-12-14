<script lang="ts">
	import { SEO } from '@create-something/components';
</script>

<SEO
	title="The Canon for Less, But Better"
	description="The philosophical foundation for Create Something. Curated wisdom from masters who embody 'less, but better.' Dieter Rams, Mies van der Rohe, and more."
	keywords="design principles, less but better, Dieter Rams, minimalism, good design, design philosophy, systems thinking"
	ogImage="/og-image.svg"
	propertyName="ltd"
/>

<!-- Hero -->
<section class="pt-24 pb-32 px-6">
	<div class="max-w-4xl mx-auto text-center">
		<p class="eyebrow mb-6">Being-as-Standard</p>

		<h1 class="mb-8">
			The Canon for<br />"Less, But Better"
		</h1>

		<p class="hero-text mb-12 max-w-2xl mx-auto leading-relaxed">
			The philosophical foundation for the Create Something ecosystem. Curated wisdom from masters
			who proved that simplicity is the ultimate sophistication.
		</p>

		<div class="flex flex-col sm:flex-row gap-4 justify-center">
			<a href="/masters" class="btn-primary">
				Explore Masters
			</a>
			<a href="/ethos" class="btn-secondary">
				Read Our Ethos
			</a>
		</div>
	</div>
</section>

<!-- Manifesto -->
<section class="manifesto py-24 px-6">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8 text-center">Weniger, aber besser</h2>

		<div class="manifesto-body space-y-6 leading-relaxed">
			<p>
				<strong>Less, but better.</strong> This isn't minimalism for aesthetics. It's discipline for
				clarity. It's constraint for excellence.
			</p>

			<p>
				Every element must justify its existence. Every principle must withstand scrutiny.
				Decoration is dishonest. Complexity is lazy. Simplicity is the hardest work.
			</p>

			<p>
				This is the measuring stick for everything we build at Create Something. Not "What can we
				add?" but "What must remain?"
			</p>

			<p class="attribution pt-6">
				— The standards by which .io research is evaluated, .space experiments are designed, and
				.agency services are delivered.
			</p>
		</div>
	</div>
</section>

<!-- Featured Masters (Placeholder) -->
<section class="py-24 px-6">
	<div class="max-w-7xl mx-auto">
		<h3 class="mb-12 text-center">Featured Masters</h3>

		<div class="grid grid-cols-1 md:grid-cols-2 gap-8">
			{#each [ { name: 'Dieter Rams', discipline: 'Industrial Design', tagline: '10 Principles of Good Design', slug: 'dieter-rams' }, { name: 'Ludwig Mies van der Rohe', discipline: 'Architecture', tagline: 'Less is more', slug: 'mies-van-der-rohe' } ] as master}
				<a href="/masters/{master.slug}" class="master-card block p-8 group">
					<p class="discipline mb-4">{master.discipline}</p>
					<h4 class="mb-2 group-hover:opacity-70 transition-opacity">{master.name}</h4>
					<p class="tagline">{master.tagline}</p>
				</a>
			{/each}
		</div>

		<div class="mt-12 text-center">
			<a href="/masters" class="view-all">
				View All Masters →
			</a>
		</div>
	</div>
</section>

<!-- Ecosystem Integration -->
<section class="ecosystem py-24 px-6">
	<div class="max-w-5xl mx-auto">
		<h3 class="mb-12 text-center">How This Guides the Ecosystem</h3>

		<div class="grid grid-cols-1 md:grid-cols-3 gap-12">
			<div>
				<div class="mb-4">
					<span class="property-label">.io</span>
					<h4 class="property-title mt-1">Research</h4>
				</div>
				<p class="property-description leading-relaxed">
					Papers are evaluated against canonical standards. Does this research meet Rams' principles?
					Does it embody "less, but better"?
				</p>
			</div>

			<div>
				<div class="mb-4">
					<span class="property-label">.space</span>
					<h4 class="property-title mt-1">Practice</h4>
				</div>
				<p class="property-description leading-relaxed">
					Experiments are designed with canonical frameworks. Each exercise teaches a principle from
					the masters, not just technical skills.
				</p>
			</div>

			<div>
				<div class="mb-4">
					<span class="property-label">.agency</span>
					<h4 class="property-title mt-1">Services</h4>
				</div>
				<p class="property-description leading-relaxed">
					Client work is held to these standards. We don't just build—we build according to
					principles that have stood the test of time.
				</p>
			</div>
		</div>
	</div>
</section>

<style>
	.eyebrow {
		font-size: var(--text-body-sm);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-fg-tertiary);
	}

	.hero-text {
		font-size: clamp(1.25rem, 2vw, 1.5rem);
		color: var(--color-fg-secondary);
	}

	.btn-primary {
		padding: 1rem 2rem;
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		font-weight: var(--font-medium);
		transition: background var(--duration-standard) var(--ease-standard);
	}

	.btn-primary:hover {
		background: var(--color-fg-secondary);
	}

	.btn-secondary {
		padding: 1rem 2rem;
		border: 1px solid var(--color-border-default);
		transition: border-color var(--duration-standard) var(--ease-standard);
	}

	.btn-secondary:hover {
		border-color: var(--color-fg-primary);
	}

	.manifesto {
		border-top: 1px solid var(--color-border-default);
	}

	.manifesto-body {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
	}

	.attribution {
		font-size: var(--text-body);
		color: var(--color-fg-tertiary);
		font-style: italic;
	}

	.master-card {
		border: 1px solid var(--color-border-default);
		transition: border-color var(--duration-standard) var(--ease-standard);
	}

	.master-card:hover {
		border-color: var(--color-fg-primary);
	}

	.discipline {
		font-size: var(--text-caption);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-fg-muted);
	}

	.tagline {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	.view-all {
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		color: var(--color-fg-tertiary);
		transition: color var(--duration-standard) var(--ease-standard);
	}

	.view-all:hover {
		color: var(--color-fg-primary);
	}

	.ecosystem {
		border-top: 1px solid var(--color-border-default);
	}

	.property-label {
		font-size: var(--text-caption);
		font-family: monospace;
		color: var(--color-fg-muted);
	}

	.property-title {
		font-size: var(--text-body-lg);
		font-weight: var(--font-semibold);
	}

	.property-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}
</style>
