<script lang="ts">
	interface NavLink {
		label: string;
		href: string;
	}

	interface Props {
		logo: string;
		logoSuffix?: string;
		logoHref?: string;
		links: NavLink[];
		currentPath?: string;
	}

	let {
		logo,
		logoSuffix,
		logoHref = '/',
		links,
		currentPath = $bindable('/')
	}: Props = $props();

	function isActive(link: NavLink): boolean {
		if (link.href === '/') {
			return currentPath === '/';
		}
		return currentPath.startsWith(link.href);
	}
</script>

<nav class="border-b border-white/10">
	<div class="max-w-7xl mx-auto px-6 py-6">
		<div class="flex items-center justify-between">
			<!-- Logo / Home -->
			<a href={logoHref} class="text-xl font-bold tracking-tight">
				{logo}
				{#if logoSuffix}
					<span class="font-normal opacity-60">{logoSuffix}</span>
				{/if}
			</a>

			<!-- Navigation Links -->
			<div class="flex items-center gap-8">
				{#each links as link}
					<a
						href={link.href}
						class="text-sm font-medium {isActive(link)
							? 'opacity-100'
							: 'opacity-60 hover:opacity-100'}"
					>
						{link.label}
					</a>
				{/each}
			</div>
		</div>
	</div>
</nav>
