/**
 * Vanilla JS Spritz Engine
 *
 * Framework-agnostic RSVP speed reading engine.
 * Use this for non-Svelte projects or custom implementations.
 *
 * @example
 * ```ts
 * import { SpritzEngine, calculateORP } from '@create-something/spritz/vanilla';
 *
 * const container = document.getElementById('spritz');
 *
 * const engine = new SpritzEngine({
 *   onWord: (word, orpIndex) => {
 *     container.innerHTML = renderWord(word, orpIndex);
 *   },
 *   wpm: 350
 * });
 *
 * engine.setText('Hello world, this is a speed reading demo.');
 * engine.play();
 * ```
 */

export {
	SpritzEngine,
	calculateORP,
	parseText,
	type SpritzOptions,
	type SpritzState
} from './spritz-engine.js';

/**
 * Create a simple HTML renderer for Spritz words.
 *
 * @param container - The DOM element to render into
 * @param options - Rendering options
 * @returns A render function compatible with SpritzEngine.onWord
 *
 * @example
 * ```ts
 * const render = createSpritzRenderer(document.getElementById('spritz'));
 * const engine = new SpritzEngine({ onWord: render });
 * ```
 */
export function createSpritzRenderer(
	container: HTMLElement,
	options: {
		/** CSS class for the ORP (highlighted) letter */
		orpClass?: string;
		/** CSS class for letters before ORP */
		beforeClass?: string;
		/** CSS class for letters after ORP */
		afterClass?: string;
	} = {}
): (word: string, orpIndex: number) => void {
	const { orpClass = 'spritz-orp', beforeClass = 'spritz-before', afterClass = 'spritz-after' } =
		options;

	return (word: string, orpIndex: number) => {
		const before = word.slice(0, orpIndex);
		const orp = word[orpIndex] || '';
		const after = word.slice(orpIndex + 1);

		container.innerHTML = `<span class="${beforeClass}">${before}</span><span class="${orpClass}">${orp}</span><span class="${afterClass}">${after}</span>`;
	};
}
