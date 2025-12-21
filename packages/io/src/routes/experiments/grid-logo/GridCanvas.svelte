<script lang="ts">
	import { untrack } from 'svelte';
	import type { CellState, InteractionMode, LogoType } from './types';
	import {
		GRID_SIZE,
		CELL_SIZE,
		CANVAS_SIZE,
		CANVAS_PADDING,
		generateGridLines,
		getCellKey,
		getAdjacentCells,
		screenToGrid,
		getCubeLogoCells,
		getCSLettermarkCells,
		calculateRevealProgress,
		shouldShowLogo
	} from './gridGeometry';

	interface Props {
		logoType: LogoType;
		interactionMode: InteractionMode;
		timelineProgress?: number;
		onProgressChange?: (progress: number) => void;
	}

	let { logoType, interactionMode, timelineProgress = 0, onProgressChange }: Props = $props();

	// Initialize cell states map
	function createInitialCellStates(): Map<string, CellState> {
		const states = new Map<string, CellState>();
		for (let row = 0; row < GRID_SIZE; row++) {
			for (let col = 0; col < GRID_SIZE; col++) {
				states.set(getCellKey(row, col), 'hidden');
			}
		}
		return states;
	}

	// Grid state
	let cellStates = $state<Map<string, CellState>>(createInitialCellStates());
	let isDragging = $state(false);
	let revealProgress = $state(0);
	let logoVisible = $state(false);

	// Get logo cells based on type
	const logoData = $derived(logoType === 'cube' ? getCubeLogoCells() : getCSLettermarkCells());
	const logoCellSet = $derived(new Set(logoData.cells));
	const gridLines = generateGridLines();

	// Track previous logoType to detect changes
	let previousLogoType = $state(logoType);

	// Reset when logoType changes
	$effect(() => {
		if (logoType !== previousLogoType) {
			untrack(() => {
				cellStates = createInitialCellStates();
				revealProgress = 0;
				logoVisible = false;
				previousLogoType = logoType;
			});
		}
	});

	// Handle timeline mode
	$effect(() => {
		const mode = interactionMode;
		const progress = timelineProgress;
		if (mode === 'timeline') {
			untrack(() => revealCellsByProgress(progress));
		}
	});

	function revealCellsByProgress(progress: number) {
		const totalLogoCells = logoData.cells.length;
		const cellsToReveal = Math.floor(progress * totalLogoCells);

		const newStates = new Map<string, CellState>();
		for (let row = 0; row < GRID_SIZE; row++) {
			for (let col = 0; col < GRID_SIZE; col++) {
				const key = getCellKey(row, col);
				newStates.set(key, 'hidden');
			}
		}

		// Reveal cells in order
		for (let i = 0; i < cellsToReveal && i < logoData.cells.length; i++) {
			newStates.set(logoData.cells[i], 'revealed');
		}

		cellStates = newStates;
		updateProgress();
	}

	function updateProgress() {
		const revealedCells = new Set<string>();
		for (const [key, state] of cellStates) {
			if (state === 'revealed' || state === 'logo-path') {
				revealedCells.add(key);
			}
		}
		revealProgress = calculateRevealProgress(revealedCells, logoData.cells);
		logoVisible = shouldShowLogo(revealProgress);
		onProgressChange?.(revealProgress);
	}

	function revealCell(row: number, col: number) {
		const key = getCellKey(row, col);
		const currentState = cellStates.get(key);

		if (currentState === 'hidden' || currentState === 'anticipating') {
			const newStates = new Map(cellStates);
			newStates.set(key, 'revealed');

			// Set adjacent cells to anticipating
			const adjacent = getAdjacentCells(row, col);
			for (const adj of adjacent) {
				const adjKey = getCellKey(adj.row, adj.col);
				const adjState = newStates.get(adjKey);
				if (adjState === 'hidden') {
					newStates.set(adjKey, 'anticipating');
				}
			}

			cellStates = newStates;
			updateProgress();
		}
	}

	function handleClick(event: MouseEvent) {
		if (interactionMode !== 'click') return;

		const svg = event.currentTarget as SVGSVGElement;
		const rect = svg.getBoundingClientRect();
		const x = ((event.clientX - rect.left) / rect.width) * (CANVAS_SIZE + CANVAS_PADDING * 2);
		const y = ((event.clientY - rect.top) / rect.height) * (CANVAS_SIZE + CANVAS_PADDING * 2);

		const cell = screenToGrid(x, y);
		if (cell) {
			revealCell(cell.row, cell.col);
		}
	}

	function handleMouseDown(event: MouseEvent) {
		if (interactionMode !== 'drag') return;
		isDragging = true;
		handleDrag(event);
	}

	function handleMouseMove(event: MouseEvent) {
		if (!isDragging || interactionMode !== 'drag') return;
		handleDrag(event);
	}

	function handleMouseUp() {
		isDragging = false;
	}

	function handleDrag(event: MouseEvent) {
		const svg = (event.currentTarget as Element).closest('svg') as SVGSVGElement;
		if (!svg) return;

		const rect = svg.getBoundingClientRect();
		const x = ((event.clientX - rect.left) / rect.width) * (CANVAS_SIZE + CANVAS_PADDING * 2);
		const y = ((event.clientY - rect.top) / rect.height) * (CANVAS_SIZE + CANVAS_PADDING * 2);

		const cell = screenToGrid(x, y);
		if (cell) {
			revealCell(cell.row, cell.col);
		}
	}

	function handleTouchStart(event: TouchEvent) {
		if (interactionMode !== 'drag') return;
		event.preventDefault();
		isDragging = true;
		handleTouch(event);
	}

	function handleTouchMove(event: TouchEvent) {
		if (!isDragging || interactionMode !== 'drag') return;
		event.preventDefault();
		handleTouch(event);
	}

	function handleTouchEnd() {
		isDragging = false;
	}

	function handleTouch(event: TouchEvent) {
		const touch = event.touches[0];
		const svg = (event.currentTarget as Element).closest('svg') as SVGSVGElement;
		if (!svg || !touch) return;

		const rect = svg.getBoundingClientRect();
		const x = ((touch.clientX - rect.left) / rect.width) * (CANVAS_SIZE + CANVAS_PADDING * 2);
		const y = ((touch.clientY - rect.top) / rect.height) * (CANVAS_SIZE + CANVAS_PADDING * 2);

		const cell = screenToGrid(x, y);
		if (cell) {
			revealCell(cell.row, cell.col);
		}
	}

	function getCellFill(state: CellState, isLogoPart: boolean): string {
		if (state === 'revealed' || state === 'logo-path') {
			return isLogoPart ? 'var(--color-fg-tertiary)' : 'var(--color-border-emphasis)';
		}
		if (state === 'anticipating') {
			return 'var(--color-border-default)';
		}
		return 'transparent';
	}

	function getCellOpacity(state: CellState): number {
		switch (state) {
			case 'revealed':
			case 'logo-path':
				return 0.4;
			case 'anticipating':
				return 0.2;
			default:
				return 0;
		}
	}

	export function reset() {
		const newStates = new Map<string, CellState>();
		for (let row = 0; row < GRID_SIZE; row++) {
			for (let col = 0; col < GRID_SIZE; col++) {
				const key = getCellKey(row, col);
				newStates.set(key, 'hidden');
			}
		}
		cellStates = newStates;
		revealProgress = 0;
		logoVisible = false;
		onProgressChange?.(0);
	}
</script>

<div class="grid-canvas-wrapper">
	<svg
		viewBox="0 0 {CANVAS_SIZE + CANVAS_PADDING * 2} {CANVAS_SIZE + CANVAS_PADDING * 2}"
		class="grid-canvas"
		role="img"
		aria-label="Interactive grid for {logoType === 'cube' ? 'cube' : 'CS lettermark'} logo"
		onclick={handleClick}
		onmousedown={handleMouseDown}
		onmousemove={handleMouseMove}
		onmouseup={handleMouseUp}
		onmouseleave={handleMouseUp}
		ontouchstart={handleTouchStart}
		ontouchmove={handleTouchMove}
		ontouchend={handleTouchEnd}
	>
		<!-- Background -->
		<rect
			x="0"
			y="0"
			width={CANVAS_SIZE + CANVAS_PADDING * 2}
			height={CANVAS_SIZE + CANVAS_PADDING * 2}
			class="canvas-bg"
		/>

		<!-- Grid lines (always visible, low opacity) -->
		<g class="grid-lines">
			{#each gridLines as line}
				<line
					x1={line.x1}
					y1={line.y1}
					x2={line.x2}
					y2={line.y2}
					class="grid-line"
				/>
			{/each}
		</g>

		<!-- Cell fills (revealed via interaction) -->
		<g class="cell-fills">
			{#each Array(GRID_SIZE) as _, row}
				{#each Array(GRID_SIZE) as _, col}
					{@const key = getCellKey(row, col)}
					{@const state = cellStates.get(key) ?? 'hidden'}
					{@const isLogoPart = logoCellSet.has(key)}
					<rect
						x={CANVAS_PADDING + col * CELL_SIZE}
						y={CANVAS_PADDING + row * CELL_SIZE}
						width={CELL_SIZE}
						height={CELL_SIZE}
						fill={getCellFill(state, isLogoPart)}
						opacity={getCellOpacity(state)}
						class="cell"
						class:logo-cell={isLogoPart}
						class:revealed={state === 'revealed'}
						class:anticipating={state === 'anticipating'}
					/>
				{/each}
			{/each}
		</g>

		<!-- Logo paths (fade in at threshold) -->
		<g class="logo-paths" class:visible={logoVisible}>
			{#each logoData.paths as path, i}
				<path
					d={path}
					class="logo-path"
					class:face-top={logoType === 'cube' && i === 0}
					class:face-left={logoType === 'cube' && i === 1}
					class:face-right={logoType === 'cube' && i === 2}
					class:stroke-only={logoType === 'cs-lettermark'}
					style="--path-delay: {i * 100}ms"
				/>
			{/each}
		</g>
	</svg>

	<div class="progress-indicator">
		<span class="progress-value">{Math.round(revealProgress * 100)}%</span>
		<span class="progress-label">revealed</span>
	</div>
</div>

<style>
	.grid-canvas-wrapper {
		position: relative;
		width: 100%;
		max-width: 400px;
	}

	.grid-canvas {
		width: 100%;
		height: auto;
		cursor: crosshair;
		touch-action: none;
		user-select: none;
	}

	.canvas-bg {
		fill: var(--color-bg-pure);
	}

	.grid-line {
		stroke: var(--color-border-emphasis);
		stroke-width: 1;
		opacity: 0.5;
	}

	.cell {
		transition:
			fill var(--duration-micro) var(--ease-standard),
			opacity var(--duration-standard) var(--ease-standard);
	}

	.cell.logo-cell.revealed {
		fill: var(--color-fg-tertiary);
	}

	.cell.anticipating {
		animation: pulse 1.5s ease-in-out infinite;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 0.1;
		}
		50% {
			opacity: 0.25;
		}
	}

	.logo-paths {
		opacity: 0;
		transition: opacity var(--duration-complex) var(--ease-standard);
	}

	.logo-paths.visible {
		opacity: 1;
	}

	.logo-path {
		stroke: var(--color-fg-muted);
		stroke-width: 1;
		animation: fadeIn var(--duration-complex) var(--ease-standard) backwards;
		animation-delay: var(--path-delay, 0ms);
	}

	/* Cube face fills - varying opacity for 3D depth */
	.logo-path.face-top {
		fill: rgba(255, 255, 255, 0.25);
	}

	.logo-path.face-left {
		fill: rgba(255, 255, 255, 0.12);
	}

	.logo-path.face-right {
		fill: rgba(255, 255, 255, 0.05);
	}

	/* CS Lettermark - stroke only */
	.logo-path.stroke-only {
		fill: none;
		stroke: var(--color-fg-primary);
		stroke-width: 3;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: scale(0.95);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	.progress-indicator {
		display: flex;
		align-items: baseline;
		gap: var(--space-xs);
		margin-top: var(--space-sm);
		font-family: var(--font-mono);
	}

	.progress-value {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
	}

	.progress-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}
</style>
