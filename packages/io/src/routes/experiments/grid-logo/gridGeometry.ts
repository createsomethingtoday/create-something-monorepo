/**
 * Grid Geometry Utilities
 *
 * Mathematical foundations for the grid logo experiment.
 * Uses 30° isometric angles consistent with the CREATE SOMETHING visual canon.
 */

import type { GridLine, Point, LogoPaths } from './types';

/** Grid dimensions */
export const GRID_SIZE = 12;
export const CELL_SIZE = 30;
export const CANVAS_SIZE = GRID_SIZE * CELL_SIZE;
export const CANVAS_PADDING = 20;

/** Isometric angle constants (30°) */
export const ISO_ANGLE = 30;
export const ISO_COS = Math.cos((ISO_ANGLE * Math.PI) / 180);
export const ISO_SIN = Math.sin((ISO_ANGLE * Math.PI) / 180);

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
 * The cube sits in the center of the grid (roughly 4x4 area)
 */
export function getCubeLogoCells(): LogoPaths {
	// Cube vertices in grid space (center of 12x12 grid)
	const cx = 6;
	const cy = 6;
	const size = 3;

	// Define cells that form the cube outline and internal structure
	const cellKeys: string[] = [];

	// Top face cells (diamond shape)
	for (let i = -size; i <= size; i++) {
		cellKeys.push(getCellKey(cy - size, cx + i)); // top row
		cellKeys.push(getCellKey(cy + size, cx + i)); // bottom row
	}
	for (let i = -size + 1; i < size; i++) {
		cellKeys.push(getCellKey(cy + i, cx - size)); // left column
		cellKeys.push(getCellKey(cy + i, cx + size)); // right column
	}

	// Center cells
	cellKeys.push(getCellKey(cy, cx));
	cellKeys.push(getCellKey(cy - 1, cx));
	cellKeys.push(getCellKey(cy + 1, cx));
	cellKeys.push(getCellKey(cy, cx - 1));
	cellKeys.push(getCellKey(cy, cx + 1));

	// Remove duplicates
	const uniqueCells = [...new Set(cellKeys)];

	// Generate SVG paths for the cube (simplified isometric box)
	const centerX = CANVAS_PADDING + cx * CELL_SIZE;
	const centerY = CANVAS_PADDING + cy * CELL_SIZE;
	const s = size * CELL_SIZE;

	// Isometric cube paths
	const topY = centerY - s * 0.6;
	const midY = centerY;
	const botY = centerY + s * 0.6;
	const leftX = centerX - s * 0.9;
	const rightX = centerX + s * 0.9;

	const paths = [
		// Top face (rhombus)
		`M ${centerX} ${topY - s * 0.3} L ${rightX} ${topY + s * 0.15} L ${centerX} ${midY - s * 0.15} L ${leftX} ${topY + s * 0.15} Z`,
		// Left face
		`M ${leftX} ${topY + s * 0.15} L ${centerX} ${midY - s * 0.15} L ${centerX} ${botY + s * 0.15} L ${leftX} ${midY + s * 0.3} Z`,
		// Right face
		`M ${rightX} ${topY + s * 0.15} L ${centerX} ${midY - s * 0.15} L ${centerX} ${botY + s * 0.15} L ${rightX} ${midY + s * 0.3} Z`
	];

	return { paths, cells: uniqueCells };
}

/**
 * Get cells that form the CS lettermark
 * Morphic-inspired geometric construction
 */
export function getCSLettermarkCells(): LogoPaths {
	const cellKeys: string[] = [];

	// "C" letter - left side of grid (cols 2-5, rows 3-9)
	// Vertical stroke
	for (let row = 3; row <= 9; row++) {
		cellKeys.push(getCellKey(row, 2));
	}
	// Top horizontal
	for (let col = 2; col <= 4; col++) {
		cellKeys.push(getCellKey(3, col));
	}
	// Bottom horizontal
	for (let col = 2; col <= 4; col++) {
		cellKeys.push(getCellKey(9, col));
	}

	// "S" letter - right side of grid (cols 7-10, rows 3-9)
	// Top horizontal
	for (let col = 7; col <= 10; col++) {
		cellKeys.push(getCellKey(3, col));
	}
	// Top-left vertical
	cellKeys.push(getCellKey(4, 7));
	cellKeys.push(getCellKey(5, 7));
	// Middle horizontal
	for (let col = 7; col <= 10; col++) {
		cellKeys.push(getCellKey(6, col));
	}
	// Bottom-right vertical
	cellKeys.push(getCellKey(7, 10));
	cellKeys.push(getCellKey(8, 10));
	// Bottom horizontal
	for (let col = 7; col <= 10; col++) {
		cellKeys.push(getCellKey(9, col));
	}

	const uniqueCells = [...new Set(cellKeys)];

	// Generate SVG paths for CS lettermark
	const strokeWidth = CELL_SIZE * 0.8;

	// C path
	const cLeft = CANVAS_PADDING + 2 * CELL_SIZE + CELL_SIZE / 2;
	const cRight = CANVAS_PADDING + 4.5 * CELL_SIZE;
	const cTop = CANVAS_PADDING + 3 * CELL_SIZE + CELL_SIZE / 2;
	const cBottom = CANVAS_PADDING + 9 * CELL_SIZE + CELL_SIZE / 2;

	// S path
	const sLeft = CANVAS_PADDING + 7 * CELL_SIZE + CELL_SIZE / 2;
	const sRight = CANVAS_PADDING + 10 * CELL_SIZE + CELL_SIZE / 2;
	const sTop = CANVAS_PADDING + 3 * CELL_SIZE + CELL_SIZE / 2;
	const sMid = CANVAS_PADDING + 6 * CELL_SIZE + CELL_SIZE / 2;
	const sBottom = CANVAS_PADDING + 9 * CELL_SIZE + CELL_SIZE / 2;

	const paths = [
		// C - open rectangle (stroke-based)
		`M ${cRight} ${cTop} L ${cLeft} ${cTop} L ${cLeft} ${cBottom} L ${cRight} ${cBottom}`,
		// S - serpentine (stroke-based)
		`M ${sRight} ${sTop} L ${sLeft} ${sTop} L ${sLeft} ${sMid} L ${sRight} ${sMid} L ${sRight} ${sBottom} L ${sLeft} ${sBottom}`
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
