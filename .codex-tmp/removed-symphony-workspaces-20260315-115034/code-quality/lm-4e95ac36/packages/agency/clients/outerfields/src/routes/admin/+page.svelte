<svelte:head>
	<title>Admin | OUTERFIELDS</title>
</svelte:head>

<section class="admin-redirect">
	<h1>Admin workspace moved</h1>
	<p>Continue to the consolidated videos workspace.</p>
	<a href="/admin/videos">Go to /admin/videos</a>
</section>

<style>
	.admin-redirect {
		min-height: 50vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		text-align: center;
		padding: 2rem 1rem;
	}

	h1 {
		margin: 0;
		font-size: 1.5rem;
	}

	p {
		margin: 0;
		color: var(--color-fg-muted);
	}

	a {
		color: var(--color-primary);
		font-weight: 600;
		text-decoration: none;
	}

	a:hover {
		text-decoration: underline;
	}
</style>
