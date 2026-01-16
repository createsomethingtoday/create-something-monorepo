/**
 * Spritz Engine - Vanilla JS RSVP Speed Reading
 *
 * Core logic for displaying text one word at a time with
 * Optimal Recognition Point (ORP) highlighting.
 *
 * @example
 * ```ts
 * const engine = new SpritzEngine({
 *   onWord: (word, orpIndex) => renderWord(word, orpIndex),
 *   onComplete: () => console.log('Done!'),
 *   wpm: 300
 * });
 *
 * engine.setText('Your text here');
 * engine.play();
 * ```
 */

export interface SpritzOptions {
	/** Callback fired for each word with the word and ORP index */
	onWord: (word: string, orpIndex: number) => void;
	/** Callback fired when playback completes */
	onComplete?: () => void;
	/** Callback fired on state change (playing/paused) */
	onStateChange?: (state: 'playing' | 'paused' | 'stopped') => void;
	/** Callback fired when word index changes */
	onProgress?: (current: number, total: number) => void;
	/** Words per minute (default: 300) */
	wpm?: number;
	/** Pause multiplier for punctuation (default: 1.5 for commas, 2 for periods) */
	punctuationPause?: {
		comma: number;
		period: number;
		question: number;
		exclamation: number;
		colon: number;
		semicolon: number;
	};
}

export interface SpritzState {
	words: string[];
	currentIndex: number;
	isPlaying: boolean;
	wpm: number;
}

/**
 * Calculate the Optimal Recognition Point (ORP) for a word.
 *
 * The ORP is the letter position where the eye should fixate
 * for fastest recognition. Research suggests this is typically
 * slightly left of center, around 25-35% into the word.
 *
 * Rules:
 * - 1 char: index 0
 * - 2-5 chars: index 1
 * - 6-9 chars: index 2
 * - 10-13 chars: index 3
 * - 14+ chars: index 4
 */
export function calculateORP(word: string): number {
	// Strip punctuation for length calculation
	const cleanWord = word.replace(/[^\w]/g, '');
	const len = cleanWord.length;

	if (len <= 1) return 0;
	if (len <= 5) return 1;
	if (len <= 9) return 2;
	if (len <= 13) return 3;
	return 4;
}

/**
 * Parse text into words, preserving punctuation attached to words.
 */
export function parseText(text: string): string[] {
	return text
		.trim()
		.split(/\s+/)
		.filter((word) => word.length > 0);
}

/**
 * Get pause multiplier based on word's trailing punctuation.
 */
function getPauseMultiplier(
	word: string,
	config: SpritzOptions['punctuationPause']
): number {
	const defaults = {
		comma: 1.5,
		period: 2.0,
		question: 2.0,
		exclamation: 2.0,
		colon: 1.5,
		semicolon: 1.5
	};

	const punctConfig = { ...defaults, ...config };
	const lastChar = word.slice(-1);

	switch (lastChar) {
		case ',':
			return punctConfig.comma;
		case '.':
			return punctConfig.period;
		case '?':
			return punctConfig.question;
		case '!':
			return punctConfig.exclamation;
		case ':':
			return punctConfig.colon;
		case ';':
			return punctConfig.semicolon;
		default:
			return 1;
	}
}

export class SpritzEngine {
	private options: Required<
		Pick<SpritzOptions, 'onWord' | 'wpm' | 'punctuationPause'>
	> &
		SpritzOptions;
	private state: SpritzState;
	private timeoutId: ReturnType<typeof setTimeout> | null = null;

	constructor(options: SpritzOptions) {
		this.options = {
			wpm: 300,
			punctuationPause: {
				comma: 1.5,
				period: 2.0,
				question: 2.0,
				exclamation: 2.0,
				colon: 1.5,
				semicolon: 1.5
			},
			...options
		};

		this.state = {
			words: [],
			currentIndex: 0,
			isPlaying: false,
			wpm: this.options.wpm
		};
	}

	/**
	 * Set the text to be displayed.
	 */
	setText(text: string): void {
		this.stop();
		this.state.words = parseText(text);
		this.state.currentIndex = 0;

		// Display first word immediately
		if (this.state.words.length > 0) {
			this.displayCurrentWord();
		}
	}

	/**
	 * Set words per minute.
	 */
	setWPM(wpm: number): void {
		this.state.wpm = Math.max(50, Math.min(1000, wpm));
	}

	/**
	 * Get current WPM setting.
	 */
	getWPM(): number {
		return this.state.wpm;
	}

	/**
	 * Start or resume playback.
	 */
	play(): void {
		if (this.state.isPlaying) return;
		if (this.state.currentIndex >= this.state.words.length) {
			// Restart from beginning if at end
			this.state.currentIndex = 0;
		}

		this.state.isPlaying = true;
		this.options.onStateChange?.('playing');
		this.scheduleNextWord();
	}

	/**
	 * Pause playback.
	 */
	pause(): void {
		if (!this.state.isPlaying) return;

		this.state.isPlaying = false;
		if (this.timeoutId) {
			clearTimeout(this.timeoutId);
			this.timeoutId = null;
		}
		this.options.onStateChange?.('paused');
	}

	/**
	 * Toggle play/pause.
	 */
	toggle(): void {
		if (this.state.isPlaying) {
			this.pause();
		} else {
			this.play();
		}
	}

	/**
	 * Stop playback and reset to beginning.
	 */
	stop(): void {
		this.pause();
		this.state.currentIndex = 0;
		this.options.onStateChange?.('stopped');
	}

	/**
	 * Jump to a specific word index.
	 */
	seek(index: number): void {
		const wasPlaying = this.state.isPlaying;
		this.pause();

		this.state.currentIndex = Math.max(
			0,
			Math.min(index, this.state.words.length - 1)
		);
		this.displayCurrentWord();

		if (wasPlaying) {
			this.play();
		}
	}

	/**
	 * Skip forward by N words.
	 */
	skipForward(count: number = 1): void {
		this.seek(this.state.currentIndex + count);
	}

	/**
	 * Skip backward by N words.
	 */
	skipBackward(count: number = 1): void {
		this.seek(this.state.currentIndex - count);
	}

	/**
	 * Get current state.
	 */
	getState(): Readonly<SpritzState> {
		return { ...this.state };
	}

	/**
	 * Check if currently playing.
	 */
	isPlaying(): boolean {
		return this.state.isPlaying;
	}

	/**
	 * Destroy the engine and clean up.
	 */
	destroy(): void {
		this.stop();
	}

	private displayCurrentWord(): void {
		const word = this.state.words[this.state.currentIndex];
		if (word) {
			const orpIndex = calculateORP(word);
			this.options.onWord(word, orpIndex);
			this.options.onProgress?.(
				this.state.currentIndex,
				this.state.words.length
			);
		}
	}

	private scheduleNextWord(): void {
		if (!this.state.isPlaying) return;

		const currentWord = this.state.words[this.state.currentIndex];
		const baseDelay = 60000 / this.state.wpm; // ms per word
		const pauseMultiplier = getPauseMultiplier(
			currentWord,
			this.options.punctuationPause
		);
		const delay = baseDelay * pauseMultiplier;

		this.timeoutId = setTimeout(() => {
			this.state.currentIndex++;

			if (this.state.currentIndex >= this.state.words.length) {
				// Playback complete
				this.state.isPlaying = false;
				this.options.onStateChange?.('stopped');
				this.options.onComplete?.();
				return;
			}

			this.displayCurrentWord();
			this.scheduleNextWord();
		}, delay);
	}
}

export default SpritzEngine;
