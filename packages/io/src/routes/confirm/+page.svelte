<script lang="ts">
  import '$lib/styles/newsletter-editorial.css';
  import '$lib/styles/newsletter-readers.css';
	import { SEO } from '@create-something/canon';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<SEO
	title="Confirm Subscription"
	description="Confirm your newsletter subscription to CREATE SOMETHING."
	propertyName="io"
	noindex={true}
/>

<div class="newsletter-editorial newsletter-state confirm-container">
  <a class="reader-wordmark" href="/newsletters">CREATE SOMETHING / Field notes</a>
	<div class="confirm-card">
		{#if data.success}
			<div class="icon success-icon">
				<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
					<polyline points="22 4 12 14.01 9 11.01"></polyline>
				</svg>
			</div>
			<h1 class="title">{data.alreadyConfirmed ? 'Already Confirmed' : 'Subscription Confirmed'}</h1>
			<p class="message">{data.message}</p>
			{#if data.email}
				<p class="email">{data.email}</p>
			{/if}
			<a href="/" class="cta">Explore CREATE SOMETHING</a>
		{:else}
			<div class="icon error-icon">
				<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<circle cx="12" cy="12" r="10"></circle>
					<line x1="15" y1="9" x2="9" y2="15"></line>
					<line x1="9" y1="9" x2="15" y2="15"></line>
				</svg>
			</div>
			<h1 class="title">Confirmation Failed</h1>
			<p class="message">{data.message}</p>
			<a href="/" class="cta secondary">Return Home</a>
		{/if}
	</div>
</div>
