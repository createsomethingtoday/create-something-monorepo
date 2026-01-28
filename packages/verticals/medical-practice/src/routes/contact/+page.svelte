<script lang="ts">
	import { SEO } from '@create-something/canon';
	import { siteConfig } from '$lib/config/site';
</script>

<SEO
	title="Contact"
	description="Get in touch with our medical practice. Schedule an appointment today."
	propertyName="agency"
	breadcrumbs={[
		{ name: 'Home', url: '/' },
		{ name: 'Contact', url: '/contact' }
	]}
/>

<div class="max-w-[1200px] mx-auto px-6 py-24">
	<h1 class="text-5xl text-primary mb-8">{siteConfig.footer.contactHeadline}</h1>
	<p class="text-lg text-tufte-gray max-w-2xl mb-12">
		{siteConfig.footer.contactDescription}
	</p>
	
	<div class="grid grid-cols-1 md:grid-cols-2 gap-12">
		<form class="space-y-4">
			<input
				class="w-full bg-transparent border-0 border-b border-primary/20 py-3 text-sm focus:ring-0 focus:border-accent transition-all placeholder:text-primary/30"
				placeholder="Your email address"
				type="email"
			/>
			<textarea
				class="w-full bg-transparent border-0 border-b border-primary/20 py-3 text-sm focus:ring-0 focus:border-accent transition-all placeholder:text-primary/30"
				placeholder="Brief description of your needs"
				rows="5"
			></textarea>
			<button
				type="submit"
				class="text-xs font-bold uppercase tracking-widest text-accent flex items-center gap-2 mt-4 hover:gap-4 transition-all"
			>
				Submit Inquiry <span class="material-symbols-outlined text-sm">arrow_forward</span>
			</button>
		</form>
		
		<div class="text-[13px] text-tufte-gray">
			<h4 class="font-bold mb-4 uppercase text-[11px] tracking-widest text-primary/40">Location</h4>
			<p class="leading-relaxed mb-6">
				{siteConfig.address.street}<br/>
				{siteConfig.address.suite}, {siteConfig.address.city}, {siteConfig.address.state}<br/>
				{siteConfig.phone}
			</p>
			<h4 class="font-bold mb-4 uppercase text-[11px] tracking-widest text-primary/40">Hours</h4>
			<p class="leading-relaxed">
				{siteConfig.hours.weekday}<br/>
				{siteConfig.hours.saturday}<br/>
				<span class="text-accent italic">{siteConfig.hours.urgent}</span>
			</p>
		</div>
	</div>
</div>
