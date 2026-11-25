<script lang="ts">
	import '$lib/styles/canon.css';
	import TimelineEditor from '$lib/interactive/TimelineEditor.svelte';
	let reversed = $state(false);
	let frame = $state(12);
	let events = $state('No frame callback yet');
	const tracks = [{ id: 'paper', name: 'Paper position', type: 'position' as const, keyframes: [{ id: 'start', frame: 0, value: 0 }, { id: 'end', frame: 60, value: 1 }] }];
</script>
<svelte:head><title>Timeline owning palettes · Canon</title></svelte:head>
<main>
	<h1>Timeline owning palettes</h1>
	<p>Fictional paper motion. Focus an editor and use arrow keys, drag its ruler, or adjust zoom.</p>
	<button onclick={() => reversed = !reversed}>Reverse owning palettes</button>
	<p role="status">Frame {frame}. {events}</p>
	<section data-theme={reversed ? 'dark' : 'light'} aria-label="Outer work surface">
		<h2>Outer {reversed ? 'dark' : 'light'} work surface</h2>
		<TimelineEditor {tracks} totalFrames={60} currentFrame={frame} onFrameChange={(next) => { frame = next; events = `Frame callback: ${next}`; }} />
		<section data-theme={reversed ? 'light' : 'dark'} aria-label="Nested work surface">
			<h2>Nested {reversed ? 'light' : 'dark'} work surface</h2>
			<TimelineEditor {tracks} totalFrames={60} currentFrame={frame} onFrameChange={(next) => { frame = next; events = `Frame callback: ${next}`; }} />
		</section>
	</section>
</main>
<style>
	main { max-width: 64rem; margin: auto; padding: 1rem; }
	section { background: var(--color-performance-bg-pure); color: var(--color-performance-fg-primary); padding: 1rem; margin-top: 1rem; min-width: 0; }
	h1 { font-size: 1.7rem; } h2 { font-size: 1.1rem; margin-bottom: 1rem; }
	button { min-height: 44px; padding: .5rem 1rem; border: 1px solid var(--color-performance-line-strong); border-radius: var(--radius-performance-scale-sm); background: var(--color-performance-panel); color: var(--color-performance-ink); font: inherit; cursor: pointer; }
	button:focus-visible { outline: 2px solid var(--color-performance-focus); outline-offset: 3px; }

 main { overflow-wrap: anywhere; }

</style>
