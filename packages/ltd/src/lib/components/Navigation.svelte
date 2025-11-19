<script lang="ts">
	let { currentPath = $bindable('/') } = $props();
</script>

<nav class="border-b border-white/10">
	<div class="max-w-7xl mx-auto px-6 py-6">
		<div class="flex items-center justify-between">
			<!-- Logo / Home -->
			<a href="/" class="text-xl font-bold tracking-tight">
				CREATE SOMETHING
				<span class="font-normal opacity-60">.ltd</span>
			</a>

			<!-- Navigation Links -->
			<div class="flex items-center gap-8">
				<a
					href="/masters"
					class="text-sm font-medium {currentPath.startsWith('/masters')
						? 'opacity-100'
						: 'opacity-60 hover:opacity-100'}"
				>
					Masters
				</a>
				<a
					href="/principles"
					class="text-sm font-medium {currentPath.startsWith('/principles')
						? 'opacity-100'
						: 'opacity-60 hover:opacity-100'}"
				>
					Principles
				</a>
				<a
					href="/ethos"
					class="text-sm font-medium {currentPath === '/ethos'
						? 'opacity-100'
						: 'opacity-60 hover:opacity-100'}"
				>
					Ethos
				</a>
			</div>
		</div>
	</div>
</nav>
