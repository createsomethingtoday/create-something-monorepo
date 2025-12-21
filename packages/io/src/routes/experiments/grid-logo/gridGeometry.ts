/**
 * Grid Geometry Utilities
 *
 * Mathematical foundations for the grid logo experiment.
 * Uses the canonical isometric system from @create-something/components.
 */

import type { GridLine, Point, LogoPaths } from './types';
import { isometricBoxPath } from '@create-something/components/visual';

/** Grid dimensions */
export const GRID_SIZE = 12;
export const CELL_SIZE = 30;
export const CANVAS_SIZE = GRID_SIZE * CELL_SIZE;
export const CANVAS_PADDING = 20;

/**
 * Convert grid coordinates to isometric screen position
 */
export function gridToScreen(row: number, col: number): Point {
	const x = CANVAS_PADDING + col * CELL_SIZE;
	const y = CANVAS_PADDING + row * CELL_SIZE;
	return { x, y };
}

/**
 * Convert screen coordinates to grid cell
 */
export function screenToGrid(x: number, y: number): { row: number; col: number } | null {
	const col = Math.floor((x - CANVAS_PADDING) / CELL_SIZE);
	const row = Math.floor((y - CANVAS_PADDING) / CELL_SIZE);

	if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) {
		return null;
	}

	return { row, col };
}

/**
 * Generate unique cell key
 */
export function getCellKey(row: number, col: number): string {
	return `${row}-${col}`;
}

/**
 * Parse cell key back to coordinates
 */
export function parseCellKey(key: string): { row: number; col: number } {
	const [row, col] = key.split('-').map(Number);
	return { row, col };
}

/**
 * Get adjacent cell coordinates (4-connected)
 */
export function getAdjacentCells(row: number, col: number): Array<{ row: number; col: number }> {
	const adjacent: Array<{ row: number; col: number }> = [];
	const deltas = [
		[-1, 0],
		[1, 0],
		[0, -1],
		[0, 1]
	];

	for (const [dr, dc] of deltas) {
		const newRow = row + dr;
		const newCol = col + dc;
		if (newRow >= 0 && newRow < GRID_SIZE && newCol >= 0 && newCol < GRID_SIZE) {
			adjacent.push({ row: newRow, col: newCol });
		}
	}

	return adjacent;
}

/**
 * Generate grid lines for SVG rendering
 */
export function generateGridLines(): GridLine[] {
	const lines: GridLine[] = [];

	// Vertical lines
	for (let col = 0; col <= GRID_SIZE; col++) {
		const x = CANVAS_PADDING + col * CELL_SIZE;
		lines.push({
			x1: x,
			y1: CANVAS_PADDING,
			x2: x,
			y2: CANVAS_PADDING + GRID_SIZE * CELL_SIZE,
			type: 'vertical'
		});
	}

	// Horizontal lines (we use horizontal for simplicity, isometric effect comes from the logo paths)
	for (let row = 0; row <= GRID_SIZE; row++) {
		const y = CANVAS_PADDING + row * CELL_SIZE;
		lines.push({
			x1: CANVAS_PADDING,
			y1: y,
			x2: CANVAS_PADDING + GRID_SIZE * CELL_SIZE,
			y2: y,
			type: 'left'
		});
	}

	return lines;
}

/**
 * Get cells that form the isometric cube logo
 * Uses the canonical isometricBoxPath from @create-something/components
 */
export function getCubeLogoCells(): LogoPaths {
	const cellKeys: string[] = [];

	// Cube occupies center region - cells that form the isometric shape
	// The cube is centered at (6,6) with ~4 cell radius
	const cx = 6;
	const cy = 6;

	// Top diamond shape (rows 2-5, forming diamond)
	cellKeys.push(getCellKey(2, 6)); // apex
	cellKeys.push(getCellKey(3, 5), getCellKey(3, 6), getCellKey(3, 7));
	cellKeys.push(getCellKey(4, 4), getCellKey(4, 5), getCellKey(4, 6), getCellKey(4, 7), getCellKey(4, 8));
	cellKeys.push(getCellKey(5, 3), getCellKey(5, 4), getCellKey(5, 5), getCellKey(5, 6), getCellKey(5, 7), getCellKey(5, 8), getCellKey(5, 9));

	// Middle row (widest point)
	cellKeys.push(getCellKey(6, 3), getCellKey(6, 4), getCellKey(6, 5), getCellKey(6, 6), getCellKey(6, 7), getCellKey(6, 8), getCellKey(6, 9));

	// Bottom half - left and right faces
	cellKeys.push(getCellKey(7, 3), getCellKey(7, 4), getCellKey(7, 5), getCellKey(7, 6), getCellKey(7, 7), getCellKey(7, 8), getCellKey(7, 9));
	cellKeys.push(getCellKey(8, 3), getCellKey(8, 4), getCellKey(8, 5), getCellKey(8, 6), getCellKey(8, 7), getCellKey(8, 8), getCellKey(8, 9));
	cellKeys.push(getCellKey(9, 4), getCellKey(9, 5), getCellKey(9, 6), getCellKey(9, 7), getCellKey(9, 8));

	// Bottom point
	cellKeys.push(getCellKey(10, 6));

	const uniqueCells = [...new Set(cellKeys)];

	// Use canonical isometricBoxPath from components
	// Center the cube in the grid
	const centerX = CANVAS_PADDING + cx * CELL_SIZE + CELL_SIZE / 2;
	const centerY = CANVAS_PADDING + cy * CELL_SIZE;
	const cubeSize = CELL_SIZE * 3.5;

	const facePaths = isometricBoxPath(centerX, centerY, cubeSize, cubeSize, cubeSize);

	// Return three face paths as the logo
	const paths = [facePaths.top, facePaths.left, facePaths.right];

	return { paths, cells: uniqueCells };
}

/**
 * Get cells that form the CS lettermark
 * Morphic-inspired geometric construction with bold strokes
 */
export function getCSLettermarkCells(): LogoPaths {
	const cellKeys: string[] = [];

	// "C" letter - left side (cols 1-4, rows 2-10)
	// Two-cell wide vertical stroke for boldness
	for (let row = 2; row <= 10; row++) {
		cellKeys.push(getCellKey(row, 1));
		cellKeys.push(getCellKey(row, 2));
	}
	// Top horizontal arm (2 cells tall)
	for (let col = 1; col <= 4; col++) {
		cellKeys.push(getCellKey(2, col));
		cellKeys.push(getCellKey(3, col));
	}
	// Bottom horizontal arm (2 cells tall)
	for (let col = 1; col <= 4; col++) {
		cellKeys.push(getCellKey(9, col));
		cellKeys.push(getCellKey(10, col));
	}

	// "S" letter - right side (cols 7-11, rows 2-10)
	// Top horizontal (2 cells tall)
	for (let col = 7; col <= 11; col++) {
		cellKeys.push(getCellKey(2, col));
		cellKeys.push(getCellKey(3, col));
	}
	// Top-left vertical (2 cells wide)
	for (let row = 2; row <= 5; row++) {
		cellKeys.push(getCellKey(row, 7));
		cellKeys.push(getCellKey(row, 8));
	}
	// Middle horizontal (2 cells tall)
	for (let col = 7; col <= 11; col++) {
		cellKeys.push(getCellKey(5, col));
		cellKeys.push(getCellKey(6, col));
	}
	// Bottom-right vertical (2 cells wide)
	for (let row = 6; row <= 10; row++) {
		cellKeys.push(getCellKey(row, 10));
		cellKeys.push(getCellKey(row, 11));
	}
	// Bottom horizontal (2 cells tall)
	for (let col = 7; col <= 11; col++) {
		cellKeys.push(getCellKey(9, col));
		cellKeys.push(getCellKey(10, col));
	}

	const uniqueCells = [...new Set(cellKeys)];

	// Generate bold SVG paths for CS lettermark
	// Coordinates align with grid cells
	const cLeft = CANVAS_PADDING + 1 * CELL_SIZE;
	const cRight = CANVAS_PADDING + 4.5 * CELL_SIZE;
	const cTop = CANVAS_PADDING + 2 * CELL_SIZE;
	const cMidTop = CANVAS_PADDING + 4 * CELL_SIZE;
	const cMidBot = CANVAS_PADDING + 8 * CELL_SIZE;
	const cBottom = CANVAS_PADDING + 10 * CELL_SIZE + CELL_SIZE;

	const sLeft = CANVAS_PADDING + 7 * CELL_SIZE;
	const sRight = CANVAS_PADDING + 11 * CELL_SIZE + CELL_SIZE;
	const sTop = CANVAS_PADDING + 2 * CELL_SIZE;
	const sMidTop = CANVAS_PADDING + 5 * CELL_SIZE;
	const sMidBot = CANVAS_PADDING + 6 * CELL_SIZE + CELL_SIZE;
	const sBottom = CANVAS_PADDING + 10 * CELL_SIZE + CELL_SIZE;

	const paths = [
		// C - bold open bracket shape
		`M ${cRight} ${cTop} L ${cLeft} ${cTop} L ${cLeft} ${cBottom} L ${cRight} ${cBottom}`,
		// S - bold serpentine
		`M ${sRight} ${sTop} L ${sLeft} ${sTop} L ${sLeft} ${sMidTop} L ${sRight} ${sMidTop} L ${sRight} ${sBottom} L ${sLeft} ${sBottom}`
	];

	return { paths, cells: uniqueCells };
}

/**
 * Calculate reveal progress based on revealed cells vs logo cells
 */
export function calculateRevealProgress(
	revealedCells: Set<string>,
	logoCells: string[]
): number {
	if (logoCells.length === 0) return 0;

	let revealedLogoCount = 0;
	for (const cell of logoCells) {
		if (revealedCells.has(cell)) {
			revealedLogoCount++;
		}
	}

	return revealedLogoCount / logoCells.length;
}

/**
 * Check if logo should be visible (70% threshold)
 */
export function shouldShowLogo(progress: number): boolean {
	return progress >= 0.7;
}
