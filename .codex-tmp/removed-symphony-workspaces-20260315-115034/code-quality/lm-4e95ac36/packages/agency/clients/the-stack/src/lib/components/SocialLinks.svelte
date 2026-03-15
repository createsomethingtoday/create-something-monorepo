<script lang="ts">
	/**
	 * Social Links Component
	 *
	 * Row of social media icons with hover effects.
	 */

	const socialLinks = [
		{ href: '#', icon: '/icons/x-icon.svg', label: 'X (Twitter)' },
		{ href: '#', icon: '/icons/yt-icon.svg', label: 'YouTube' },
		{ href: '#', icon: '/icons/fb-icon.svg', label: 'Facebook' },
		{ href: '#', icon: '/icons/ig-icon.svg', label: 'Instagram' }
	];
</script>

<ul class="social-links">
	{#each socialLinks as link}
		<li class="social-links_item">
			<a href={link.href} class="social-link" aria-label={link.label}>
				<img src={link.icon} alt="" class="icon-24" loading="lazy" />
				<div class="link-box"></div>
			</a>
		</li>
	{/each}
</ul>

<style>
	.social-links {
		display: flex;
		justify-content: flex-start;
		align-items: center;
		gap: 0.75rem;
	}

	.social-links_item {
		display: flex;
	}

	.social-link {
		display: flex;
		justify-content: center;
		align-items: center;
		position: relative;
		text-decoration: none;
		padding: 0.5rem;
		border-radius: 50%;
		transition: background-color 0.2s var(--ease-stack);
	}

	.social-link:hover {
		background-color: rgba(0, 0, 0, 0.05);
	}

	.link-box {
		position: absolute;
		inset: 0;
	}
</style>
