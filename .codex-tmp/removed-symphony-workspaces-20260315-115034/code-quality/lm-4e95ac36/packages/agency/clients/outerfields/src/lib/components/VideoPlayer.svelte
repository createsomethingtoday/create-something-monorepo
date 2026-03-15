<script lang="ts">
	/**
	 * VideoPlayer Component
	 * 
	 * Simple video player - all content freely accessible (PCN services model)
	 */

	interface Props {
		src: string;
		poster?: string;
	}

	let { src, poster }: Props = $props();

	let videoElement: HTMLVideoElement | null = $state(null);
</script>

<div class="video-player-container">
	<video
		bind:this={videoElement}
		{src}
		{poster}
		controls
		class="video-player"
	>
		<track kind="captions" />
	</video>
</div>

<style>
	.video-player-container {
		position: relative;
		width: 100%;
		background: var(--color-bg-pure);
		border-radius: var(--radius-lg);
		overflow: hidden;
	}

	.video-player {
		width: 100%;
		height: auto;
		display: block;
	}
</style>
