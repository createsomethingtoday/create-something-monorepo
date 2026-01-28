/**
 * SVG Operations Library
 *
 * Predefined SVG operations without external API calls.
 * Canon advantage: Explicit operations = no API cost, deterministic results,
 * user learns vocabulary.
 */

export type SvgOperation =
	| { type: 'add-furniture'; furniture: FurnitureType; position: [number, number] }
	| { type: 'add-people'; count: number; zone: string }
	| { type: 'remove-element'; selector: string }
	| { type: 'add-label'; text: string; position: [number, number] };

export type FurnitureType = 'sofa' | 'table' | 'bed' | 'chair' | 'desk' | 'plant';

// Furniture symbol library - architectural plan view symbols
const FURNITURE_SYMBOLS: Record<FurnitureType, { svg: string; width: number; height: number }> = {
	sofa: {
		svg: `<g class="furniture sofa">
			<rect x="0" y="0" width="30" height="12" fill="none" stroke="currentColor" stroke-width="0.5"/>
			<rect x="1" y="1" width="28" height="3" fill="none" stroke="currentColor" stroke-width="0.3"/>
		</g>`,
		width: 30,
		height: 12
	},
	table: {
		svg: `<g class="furniture table">
			<circle cx="8" cy="8" r="8" fill="none" stroke="currentColor" stroke-width="0.5"/>
		</g>`,
		width: 16,
		height: 16
	},
	bed: {
		svg: `<g class="furniture bed">
			<rect x="0" y="0" width="20" height="25" fill="none" stroke="currentColor" stroke-width="0.5"/>
			<rect x="2" y="2" width="16" height="6" fill="none" stroke="currentColor" stroke-width="0.3"/>
		</g>`,
		width: 20,
		height: 25
	},
	chair: {
		svg: `<g class="furniture chair">
			<rect x="0" y="0" width="6" height="6" fill="none" stroke="currentColor" stroke-width="0.5"/>
			<rect x="0" y="6" width="6" height="2" fill="none" stroke="currentColor" stroke-width="0.3"/>
		</g>`,
		width: 6,
		height: 8
	},
	desk: {
		svg: `<g class="furniture desk">
			<rect x="0" y="0" width="20" height="10" fill="none" stroke="currentColor" stroke-width="0.5"/>
		</g>`,
		width: 20,
		height: 10
	},
	plant: {
		svg: `<g class="furniture plant">
			<circle cx="3" cy="3" r="3" fill="none" stroke="currentColor" stroke-width="0.5"/>
		</g>`,
		width: 6,
		height: 6
	}
};

// People symbols for plan view
const PEOPLE_SYMBOL = `<g class="person">
	<circle cx="1.5" cy="1.5" r="1.5" fill="none" stroke="currentColor" stroke-width="0.4"/>
</g>`;

/**
 * Apply an SVG operation to the SVG content
 */
export function applySvgOperation(svg: string, operation: SvgOperation): string {
	switch (operation.type) {
		case 'add-furniture':
			return insertFurniture(svg, operation.furniture, operation.position);
		case 'add-people':
			return insertPeople(svg, operation.count, operation.zone);
		case 'remove-element':
			return removeElement(svg, operation.selector);
		case 'add-label':
			return insertLabel(svg, operation.text, operation.position);
		default:
			return svg;
	}
}

/**
 * Insert furniture symbol at position
 */
function insertFurniture(svg: string, furniture: FurnitureType, position: [number, number]): string {
	const symbol = FURNITURE_SYMBOLS[furniture];
	if (!symbol) return svg;

	const [x, y] = position;
	const furnitureElement = `<g transform="translate(${x}, ${y})">${symbol.svg}</g>`;

	// Insert before closing </svg> tag
	return svg.replace('</svg>', `${furnitureElement}</svg>`);
}

/**
 * Insert people symbols in a zone
 */
function insertPeople(svg: string, count: number, _zone: string): string {
	// For now, scatter people in a grid pattern
	// In production, we'd parse the zone and place within bounds
	let peopleElements = '';
	const startX = 50;
	const startY = 50;
	const spacing = 5;

	for (let i = 0; i < count; i++) {
		const row = Math.floor(i / 4);
		const col = i % 4;
		const x = startX + col * spacing;
		const y = startY + row * spacing;
		peopleElements += `<g transform="translate(${x}, ${y})">${PEOPLE_SYMBOL}</g>`;
	}

	return svg.replace('</svg>', `${peopleElements}</svg>`);
}

/**
 * Remove elements matching a simple selector (id or class)
 */
function removeElement(svg: string, selector: string): string {
	// Simple removal by id
	if (selector.startsWith('#')) {
		const id = selector.slice(1);
		const regex = new RegExp(`<[^>]+id=["']${id}["'][^>]*>.*?</[^>]+>`, 'gs');
		return svg.replace(regex, '');
	}

	// Simple removal by class
	if (selector.startsWith('.')) {
		const className = selector.slice(1);
		const regex = new RegExp(`<[^>]+class=["'][^"']*${className}[^"']*["'][^>]*>.*?</[^>]+>`, 'gs');
		return svg.replace(regex, '');
	}

	return svg;
}

/**
 * Insert a text label at position
 */
function insertLabel(svg: string, text: string, position: [number, number]): string {
	const [x, y] = position;
	const labelElement = `<text x="${x}" y="${y}" font-size="4" fill="currentColor" font-family="sans-serif">${text}</text>`;
	return svg.replace('</svg>', `${labelElement}</svg>`);
}

/**
 * Get available furniture types with metadata
 * Icons are Lucide icon names (rendered in component)
 */
export function getFurnitureTypes(): Array<{
	type: FurnitureType;
	name: string;
	icon: string;
}> {
	return [
		{ type: 'sofa', name: 'Sofa', icon: 'sofa' },
		{ type: 'table', name: 'Table', icon: 'circle' },
		{ type: 'bed', name: 'Bed', icon: 'bed-double' },
		{ type: 'chair', name: 'Chair', icon: 'armchair' },
		{ type: 'desk', name: 'Desk', icon: 'square' },
		{ type: 'plant', name: 'Plant', icon: 'flower-2' }
	];
}

/**
 * Get available operations for the UI
 * Icons are Lucide icon names (rendered in component)
 */
export function getAvailableOperations(): Array<{
	type: SvgOperation['type'];
	name: string;
	description: string;
	icon: string;
}> {
	return [
		{
			type: 'add-furniture',
			name: 'Add Furniture',
			description: 'Place furniture symbols on the plan',
			icon: 'sofa'
		},
		{
			type: 'add-people',
			name: 'Add People',
			description: 'Add human figures to show scale',
			icon: 'users'
		},
		{
			type: 'add-label',
			name: 'Add Label',
			description: 'Add text labels to rooms',
			icon: 'tag'
		},
		{
			type: 'remove-element',
			name: 'Remove Element',
			description: 'Remove elements by ID or class',
			icon: 'trash-2'
		}
	];
}
