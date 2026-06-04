<script lang="ts">
	import type { PageData } from './$types';
	import { ArrowLeft, ExternalLink } from 'lucide-svelte';

	let { data }: { data: PageData } = $props();

	const size = 320;
	const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(
		data.formUrl
	)}&margin=0&format=svg`;
</script>

<svelte:head>
	<title>QR | J AND J HOME HEALTH</title>
</svelte:head>

<main class="admin-shell narrow">
	<header class="admin-header">
		<div>
			<p class="eyebrow">J and J Home Health</p>
			<h1>QR Code</h1>
		</div>
		<nav class="admin-actions" aria-label="QR navigation">
			<a href="/admin/contacts" title="Back to contacts">
				<ArrowLeft size={18} aria-hidden="true" />
				<span>Contacts</span>
			</a>
			<a href={data.formUrl} target="_blank" rel="noreferrer" title="Open public form">
				<ExternalLink size={18} aria-hidden="true" />
				<span>Form</span>
			</a>
		</nav>
	</header>

	<section class="qr-panel">
		<img src={qrUrl} width={size} height={size} alt="Scan to open the assistance request form" />
		<p>{data.formUrl}</p>
	</section>
</main>
