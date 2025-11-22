<svelte:head>
	<title>CREATE SOMETHING.ltd — The Canon for "Less, But Better"</title>
	<meta
		name="description"
		content="The philosophical foundation for Create Something. Curated wisdom from masters who embody 'less, but better.'"
	/>
</svelte:head>

<!-- Hero -->
<section class="pt-24 pb-32 px-6">
	<div class="max-w-4xl mx-auto text-center">
		<p class="text-sm tracking-widest uppercase opacity-60 mb-6">Being-as-Standard</p>

		<h1 class="mb-8">
			The Canon for<br />"Less, But Better"
		</h1>

		<p class="text-xl md:text-2xl opacity-70 mb-12 max-w-2xl mx-auto leading-relaxed">
			The philosophical foundation for the Create Something ecosystem. Curated wisdom from masters
			who proved that simplicity is the ultimate sophistication.
		</p>

		<div class="flex flex-col sm:flex-row gap-4 justify-center">
			<a
				href="/masters"
				class="px-8 py-4 bg-white text-black font-medium hover:opacity-90 transition-opacity"
			>
				Explore Masters
			</a>
			<a
				href="/ethos"
				class="px-8 py-4 border border-white/10 hover:border-white transition-colors"
			>
				Read Our Ethos
			</a>
		</div>
	</div>
</section>

<!-- Manifesto -->
<section class="py-24 px-6 border-t border-white/10">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8 text-center">Weniger, aber besser</h2>

		<div class="space-y-6 text-lg opacity-80 leading-relaxed">
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

			<p class="pt-6 text-base opacity-60 italic">
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
				<a
					href="/masters/{master.slug}"
					class="block p-8 border border-white/10 hover:border-white transition-colors group"
				>
					<p class="text-xs uppercase tracking-widest opacity-40 mb-4">{master.discipline}</p>
					<h4 class="mb-2 group-hover:opacity-70 transition-opacity">{master.name}</h4>
					<p class="text-sm opacity-60">{master.tagline}</p>
				</a>
			{/each}
		</div>

		<div class="mt-12 text-center">
			<a href="/masters" class="text-sm font-medium opacity-60 hover:opacity-100">
				View All Masters →
			</a>
		</div>
	</div>
</section>

<!-- Ecosystem Integration -->
<section class="py-24 px-6 border-t border-white/10">
	<div class="max-w-5xl mx-auto">
		<h3 class="mb-12 text-center">How This Guides the Ecosystem</h3>

		<div class="grid grid-cols-1 md:grid-cols-3 gap-12">
			<div>
				<div class="mb-4">
					<span class="text-xs font-mono opacity-40">.io</span>
					<h4 class="text-lg font-semibold mt-1">Research</h4>
				</div>
				<p class="text-sm opacity-60 leading-relaxed">
					Papers are evaluated against canonical standards. Does this research meet Rams' principles?
					Does it embody "less, but better"?
				</p>
			</div>

			<div>
				<div class="mb-4">
					<span class="text-xs font-mono opacity-40">.space</span>
					<h4 class="text-lg font-semibold mt-1">Practice</h4>
				</div>
				<p class="text-sm opacity-60 leading-relaxed">
					Experiments are designed with canonical frameworks. Each exercise teaches a principle from
					the masters, not just technical skills.
				</p>
			</div>

			<div>
				<div class="mb-4">
					<span class="text-xs font-mono opacity-40">.agency</span>
					<h4 class="text-lg font-semibold mt-1">Services</h4>
				</div>
				<p class="text-sm opacity-60 leading-relaxed">
					Client work is held to these standards. We don't just build—we build according to
					principles that have stood the test of time.
				</p>
			</div>
		</div>
	</div>
</section>
