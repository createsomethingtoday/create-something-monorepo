<script lang="ts">
	import { SEO } from '@create-something/components';
	import { siteConfig } from '$lib/config/site';
</script>

<SEO
	title="Our Faculty"
	description="Meet our board-certified specialists and medical team."
	propertyName="agency"
	breadcrumbs={[
		{ name: 'Home', url: '/' },
		{ name: 'Team', url: '/team' }
	]}
/>

<div class="max-w-[1200px] mx-auto px-6 py-24">
	<h1 class="text-5xl text-primary mb-4">Our Faculty</h1>
	<p class="text-sm text-tufte-gray max-w-2xl mb-12">
		Board-certified specialists focused on longitudinal care. Availability is updated in real-time.
	</p>
	
	<div class="data-grid text-[13px]">
		{#each siteConfig.physicians as physician}
			<div>
				<div class="flex items-start justify-between mb-4">
					<img
						alt={physician.name}
						class="w-12 h-12 rounded-sm grayscale object-cover"
						src={physician.image}
					/>
					<span
						class="px-2 py-0.5 text-[10px] font-bold uppercase {physician.availability === 'Today' || physician.availability === 'Tomorrow'
							? 'bg-emerald-50 text-emerald-700'
							: 'bg-gray-100 text-gray-500'}"
					>
						{physician.availability}
					</span>
				</div>
				<h3 class="font-bold text-[15px] mb-1">
					{physician.name}, {physician.credentials}
				</h3>
				<p class="text-tufte-gray mb-3 italic font-serif">
					{physician.specialty} • {physician.affiliation}
				</p>
				<div class="space-y-1 text-[11px] text-tufte-gray/80">
					<div class="flex justify-between border-b border-primary/5 pb-1">
						<span>Clinical Focus</span>
						<span class="font-medium">{physician.focus}</span>
					</div>
					<div class="flex justify-between border-b border-primary/5 pb-1">
						<span>Experience</span>
						<span class="font-medium">{physician.experience} Years</span>
					</div>
					<div class="flex justify-between">
						<span>Consultation Fee</span>
						<span class="font-medium">${physician.fee}</span>
					</div>
				</div>
			</div>
		{/each}
	</div>
</div>
