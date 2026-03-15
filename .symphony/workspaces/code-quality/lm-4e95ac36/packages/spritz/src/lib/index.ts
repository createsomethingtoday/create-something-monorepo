/**
 * @create-something/spritz
 *
 * RSVP Speed Reading Component with Optimal Recognition Point (ORP) Highlighting
 *
 * Use cases:
 * - Video intro/transition/outro text overlays
 * - Interactive documentation with inline readers
 * - Speed reading training and exercises
 * - Accessible text presentation for users who prefer sequential display
 *
 * @example Svelte Component
 * ```svelte
 * <script>
 *   import { Spritz } from '@create-something/spritz';
 * </script>
 *
 * <Spritz
 *   content="Welcome to the tutorial. Let's learn something new today."
 *   wpm={350}
 *   showControls
 * />
 * ```
 *
 * @example Multiple Messages (Video Segments)
 * ```svelte
 * <Spritz
 *   content={[
 *     { label: 'Intro', text: 'Welcome to our product demo.' },
 *     { label: 'Step 1', text: 'First, create a new project.' },
 *     { label: 'Conclusion', text: 'Thanks for watching!' }
 *   ]}
 *   loop
 * />
 * ```
 *
 * @example Vanilla JS (Framework-agnostic)
 * ```ts
 * import { SpritzEngine, createSpritzRenderer } from '@create-something/spritz/vanilla';
 *
 * const container = document.getElementById('spritz');
 * const render = createSpritzRenderer(container);
 *
 * const engine = new SpritzEngine({
 *   onWord: render,
 *   wpm: 300
 * });
 *
 * engine.setText('Your text here');
 * engine.play();
 * ```
 */

// Svelte Component
export { default as Spritz } from './Spritz.svelte';

// Types
export type {
	SpritzMessage,
	SpritzPlaybackState,
	SpritzProps
} from './types.js';

// Re-export vanilla utilities for convenience
export {
	SpritzEngine,
	calculateORP,
	parseText,
	createSpritzRenderer,
	type SpritzOptions,
	type SpritzState
} from './vanilla/index.js';
