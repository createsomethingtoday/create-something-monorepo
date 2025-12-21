/**
 * Subtractive Revelation Types
 *
 * "Creation is the discipline of removing what obscures."
 */

export type InteractionMode = 'wipe' | 'dissolve' | 'stillness';

export interface Particle {
	id: string;
	x: number;
	y: number;
	width: number;
	height: number;
	opacity: number;
	revealed: boolean;
	revealDelay: number;
}

export interface RevelationState {
	particles: Particle[];
	obscurationPercent: number;
	mode: InteractionMode;
	isFullyRevealed: boolean;
}
