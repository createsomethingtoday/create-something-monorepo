/**
 * Grid Logo Experiment Types
 *
 * Type definitions for the interactive grid-based logo experiment.
 * The grid embodies Aletheia - logos emerge through unconcealment.
 */

/** Cell states in the revelation sequence */
export type CellState = 'hidden' | 'anticipating' | 'revealing' | 'revealed' | 'logo-path';

/** Which logo is being constructed */
export type LogoType = 'cube' | 'cs-lettermark';

/** Interaction modes for grid discovery */
export type InteractionMode = 'click' | 'drag' | 'timeline';

/** A single grid cell */
export interface GridCell {
	row: number;
	col: number;
	state: CellState;
	isLogoPart: boolean;
}

/** Overall grid state */
export interface GridState {
	cells: Map<string, GridCell>;
	revealProgress: number;
	logoVisible: boolean;
	interactionMode: InteractionMode;
	logoType: LogoType;
}

/** A line segment in the grid */
export interface GridLine {
	x1: number;
	y1: number;
	x2: number;
	y2: number;
	type: 'left' | 'right' | 'vertical';
}

/** Point in 2D space */
export interface Point {
	x: number;
	y: number;
}

/** SVG path data for logo faces/strokes */
export interface LogoPaths {
	paths: string[];
	cells: string[]; // Cell keys that form the logo
}
