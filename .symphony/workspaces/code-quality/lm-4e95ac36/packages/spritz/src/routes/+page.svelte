<script lang="ts">
	import { Spritz } from '$lib/index.js';

	const singleMessage = `Welcome to the Spritz speed reading demo. This component displays text one word at a time, highlighting the Optimal Recognition Point in each word. Research shows this method can help you read faster while maintaining comprehension. Try adjusting the speed using the controls below.`;

	const multipleMessages = [
		{
			label: 'Introduction',
			text: 'Welcome to this walkthrough video. Today we will learn about speed reading technology.'
		},
		{
			label: 'How It Works',
			text: 'RSVP displays words one at a time. The red letter is the Optimal Recognition Point. Your eyes stay fixed while words stream past.'
		},
		{
			label: 'Benefits',
			text: 'Users typically double their reading speed from 200 to 400 words per minute while improving comprehension to 90 percent.'
		},
		{
			label: 'Conclusion',
			text: 'Thanks for watching. Try the interactive demo below to experience it yourself.'
		}
	];
</script>

<svelte:head>
	<title>Spritz Demo</title>
</svelte:head>

<div class="demo">
	<header class="demo-header">
		<h1>@create-something/spritz</h1>
		<p>RSVP Speed Reading with Optimal Recognition Point Highlighting</p>
	</header>

	<main class="demo-content">
		<section class="demo-section">
			<h2>Single Message</h2>
			<p class="demo-description">
				Basic usage with a single text string. Use keyboard shortcuts: Space to play/pause, arrows
				to skip or adjust speed.
			</p>
			<Spritz content={singleMessage} wpm={300} />
		</section>

		<section class="demo-section">
			<h2>Multiple Messages (Video Segments)</h2>
			<p class="demo-description">
				Use an array of messages with labels for video intro/transition/outro segments. Enable
				<code>loop</code> to cycle through all messages.
			</p>
			<Spritz content={multipleMessages} wpm={350} loop />
		</section>

		<section class="demo-section">
			<h2>Large Display (Video Recording)</h2>
			<p class="demo-description">
				Use <code>spritz--lg</code> class for larger presentations. Hide controls for clean screen capture.
			</p>
			<div class="video-container">
				<Spritz
					content="This is a large display mode perfect for video recording and presentations."
					wpm={250}
					showControls={false}
					showProgress={false}
					showWpmControl={false}
					class="spritz--lg"
				/>
			</div>
		</section>

		<section class="demo-section">
			<h2>Compact Display</h2>
			<p class="demo-description">
				Use <code>spritz--sm</code> class for inline documentation or compact layouts.
			</p>
			<Spritz
				content="A compact display for inline documentation."
				wpm={400}
				showWpmControl={false}
				class="spritz--sm"
			/>
		</section>
	</main>
</div>

<style>
	.demo {
		min-height: 100vh;
		padding: var(--space-xl);
		background: var(--color-bg-pure);
		color: var(--color-fg-primary);
	}

	.demo-header {
		text-align: center;
		margin-bottom: var(--space-2xl);
	}

	.demo-header h1 {
		font-size: var(--text-display);
		font-weight: var(--font-light);
		margin-bottom: var(--space-sm);
	}

	.demo-header p {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
	}

	.demo-content {
		max-width: 800px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: var(--space-2xl);
	}

	.demo-section h2 {
		font-size: var(--text-h2);
		font-weight: var(--font-semibold);
		margin-bottom: var(--space-sm);
	}

	.demo-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		margin-bottom: var(--space-md);
	}

	.demo-description code {
		font-family: var(--font-mono);
		background: var(--color-bg-subtle);
		padding: 0.125em 0.375em;
		border-radius: var(--radius-sm);
	}

	.video-container {
		background: var(--color-bg-pure);
		border-radius: var(--radius-lg);
		padding: var(--space-xl);
		border: 1px solid var(--color-border-default);
	}

	:global(.spritz--lg) {
		padding: var(--space-xl);
	}

	:global(.spritz--lg .spritz-word) {
		font-size: var(--text-display);
	}

	:global(.spritz--lg .spritz-redicle) {
		min-height: 6rem;
		padding: var(--space-xl) var(--space-2xl);
	}

	:global(.spritz--sm) {
		padding: var(--space-md);
	}

	:global(.spritz--sm .spritz-word) {
		font-size: var(--text-h3);
	}

	:global(.spritz--sm .spritz-redicle) {
		min-height: 2.5rem;
		padding: var(--space-sm) var(--space-md);
	}
</style>
