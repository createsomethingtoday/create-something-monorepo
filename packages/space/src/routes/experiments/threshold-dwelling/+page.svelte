<script lang="ts">
	/**
	 * Threshold Dwelling Experiment
	 *
	 * Complete architectural visualization of the Miesian Family Pavilion.
	 * Five views, one pattern: declarative data → SVG rendering.
	 */

	import FloorPlan from '$lib/components/FloorPlan.svelte';
	import Section from '$lib/components/Section.svelte';
	import Elevation from '$lib/components/Elevation.svelte';
	import SitePlan from '$lib/components/SitePlan.svelte';
	import RoofPlan from '$lib/components/RoofPlan.svelte';
	import Systems from '$lib/components/Systems.svelte';
	import type {
		FloorPlanData,
		SectionData,
		ElevationData,
		SitePlanData,
		RoofPlanData,
		SystemsData
	} from '$lib/types/architecture';
	import {
		zone,
		wall,
		room,
		door,
		floorPlanWindow,
		overhang,
		sectionElement,
		sectionLabel,
		sectionDimension,
		elevationElement,
		elevationWindow,
		siteFeature,
		setbackLine,
		roofSlope,
		roofDrain
	} from '$lib/types/architecture';

	// View toggle
	type ViewType = 'plan' | 'section' | 'elevation' | 'site' | 'roof' | 'systems';
	let currentView: ViewType = $state('plan');

	const views: { id: ViewType; label: string }[] = [
		{ id: 'plan', label: 'Plan' },
		{ id: 'section', label: 'Section' },
		{ id: 'elevation', label: 'Elevation' },
		{ id: 'site', label: 'Site' },
		{ id: 'roof', label: 'Roof' },
		{ id: 'systems', label: 'Systems' }
	];

	// ============================================================================
	// FLOOR PLAN DATA
	// ============================================================================

	const pavilion: FloorPlanData = {
		name: 'Miesian Family Pavilion',
		location: 'Johnson Residence · Grandview, Texas',
		width: 65,
		depth: 42,
		bedrooms: 3,
		bathrooms: 4,
		features: 'In-Law Suite',

		zones: [
			// Service West: Laundry (SW corner, compact) + Pantry with sit-in
			zone(0, 0, 12, 4, 'service'), // Laundry - compact SW corner
			zone(0, 4, 12, 9, 'service'), // Pantry with sit-in - stops at hallway
			// Service East: Dog Utility + Guest Bath (adjacent)
			zone(55, 0, 10, 6, 'service'), // Dog Utility
			zone(55, 6, 10, 7, 'public'), // Guest Bath - east side, near entry
			// Public corridor (west side + center)
			zone(0, 13, 12, 7, 'public'), // West hallway - separates pantry from daughter
			zone(12, 13, 43, 7, 'public'), // Center corridor
			// Private
			zone(0, 20, 18, 22, 'private'), // Daughter's suite
			zone(18, 20, 21, 22, 'private'), // Primary suite
			zone(39, 20, 26, 22, 'private'), // In-law suite
			// Open
			zone(12, 0, 43, 13, 'open')
		],

		walls: [
			// Exterior
			wall(0, 42, 65, 42, true),
			wall(0, 0, 65, 0, true),
			wall(0, 0, 0, 42, true),
			// East exterior wall with door openings
			wall(65, 0, 65, 1.5, true), // South of kennel door
			wall(65, 4.5, 65, 14.5, true), // Between kennel and main entry
			wall(65, 17.5, 65, 42, true), // North of main entry

			// Daughter's room - wall with door opening at x=5
			wall(0, 20, 3.5, 20),
			wall(6.5, 20, 10, 20),
			wall(10, 20, 18, 20),
			// Daughter's bath - vertical wall with door opening at y=25
			wall(10, 20, 10, 23.5),
			wall(10, 26.5, 10, 28),
			wall(10, 28, 18, 28),
			wall(18, 20, 18, 28),
			wall(18, 28, 18, 42),

			// Primary suite - wall at y=20 with door opening at x=22
			wall(18, 20, 20.5, 20),
			wall(23.5, 20, 39, 20),
			// Primary hallway wall at y=27 with doors at x=22 (closet) and x=32 (bath)
			wall(18, 27, 20.5, 27),
			wall(23.5, 27, 30.5, 27),
			wall(33.5, 27, 39, 27),
			wall(26, 20, 26, 27),
			wall(39, 20, 39, 27),
			wall(39, 27, 39, 42),

			// In-law suite - wall at y=20 with door opening at x=47
			wall(39, 20, 45.5, 20),
			wall(48.5, 20, 55, 20),
			// In-law bath - vertical wall with door opening at y=24
			wall(55, 20, 55, 22.5),
			wall(55, 25.5, 55, 28),
			wall(55, 28, 65, 28),
			wall(55, 20, 65, 20),

			// Service west: Laundry + Pantry with door openings
			wall(0, 4, 7.5, 4), // West of laundry/pantry door
			wall(10.5, 4, 12, 4), // East of laundry/pantry door
			wall(0, 13, 4.5, 13), // West of pantry/hallway door
			wall(7.5, 13, 12, 13), // East of pantry/hallway door
			wall(12, 0, 12, 13),

			// Service east: Dog Utility + Guest Bath with door openings
			wall(55, 0, 55, 8.5), // Below guest bath door
			wall(55, 11.5, 55, 13), // Above guest bath door
			wall(55, 6, 56.5, 6), // West of dog utility door
			wall(59.5, 6, 65, 6), // East of dog utility door
			wall(55, 13, 65, 13)
		],

		rooms: [
			room(9, 35, "Daughter's\nBedroom"),
			room(14, 24, 'Bath', true),
			room(28.5, 35, 'Primary\nBedroom'),
			room(22, 23.5, 'Closet', true),
			room(32.5, 23.5, 'Bath', true),
			room(47, 32, 'In-Law\nSuite'),
			room(60, 24, 'Bath', true),
			room(60, 35, 'Sitting', true),
			room(6, 2, 'Laundry', true), // SW corner, compact
			room(6, 8.5, 'Pantry\nSit-in'), // Wine/smoke nook, respects hallway
			room(60, 3, 'Dog\nUtility', true),
			room(60, 9.5, 'Guest\nBath', true), // East side, near entry
			room(20, 6.5, 'Kitchen'),
			room(33, 6.5, 'Dining'),
			room(46, 6.5, 'Living')
		],

		doors: [
			// Service zone (west) - Laundry + Pantry/Sit-in
			door(9, 4, 3, 'horizontal'), // Between laundry and pantry
			door(6, 13, 3, 'horizontal'), // Pantry access from hallway
			// Private zone (west - daughter)
			door(5, 20, 3, 'horizontal'), // Daughter's room from hallway
			door(10, 25, 3, 'vertical'), // Daughter's bath
			// Private zone (center - primary)
			door(22, 27, 3, 'horizontal'), // Primary closet from hallway
			door(22, 20, 3, 'horizontal'), // Closet to bedroom
			door(32, 27, 3, 'horizontal'), // Primary bath
			// Private zone (east - in-law)
			door(47, 20, 3, 'horizontal'), // In-law suite from hallway
			door(55, 24, 3, 'vertical'), // In-law bath
			// Service zone (east) - Dog Utility + Guest Bath
			door(58, 6, 3, 'horizontal'), // Dog utility
			door(55, 10, 3, 'vertical'), // Guest bath from open zone
			// East exterior entries
			door(65, 3, 3, 'vertical'), // Kennel to utility
			door(65, 16, 3, 'vertical') // Main entry - in hallway corridor
		],

		windows: [
			floorPlanWindow(0, 16.5, 4, 'vertical') // West hallway window
		],

		columns: [
			{ x: 10, y: 3 },
			{ x: 32.5, y: 3 },
			{ x: 55, y: 3 },
			{ x: 10, y: 39 },
			{ x: 32.5, y: 39 },
			{ x: 55, y: 39 }
		],

		overhangs: [
			overhang(65, 0, 10, 6, 'Dog\nKennel'),
			overhang(65, 6, 10, 7, 'Carport'),
			overhang(65, 13, 8, 14, 'Covered\nEntry')
		],

		entry: { x: 73, y: 16 },

		materials: {
			totalSF: 2730,
			costPerSF: 225,
			lineItems: [
				{
					category: 'Site',
					description: 'Site preparation',
					estimate: 15000,
					notes: 'Clearing, grading, utilities'
				},
				{
					category: 'Site',
					description: 'Foundation (slab-on-grade)',
					estimate: 45000,
					notes: 'Post-tensioned slab'
				},
				{ category: 'Site', description: 'Driveway & parking', estimate: 12000 },
				{
					category: 'Structure',
					description: 'Steel frame & columns',
					estimate: 85000,
					notes: 'Miesian exposed structure'
				},
				{ category: 'Structure', description: 'Roof structure', estimate: 35000 },
				{ category: 'Structure', description: 'Exterior walls', estimate: 42000 },
				{
					category: 'Envelope',
					description: 'Windows & glazing',
					estimate: 65000,
					notes: 'Floor-to-ceiling east wall'
				},
				{
					category: 'Envelope',
					description: 'Roofing',
					estimate: 28000,
					notes: 'Standing seam metal'
				},
				{ category: 'Envelope', description: 'Insulation', estimate: 18000 },
				{ category: 'Interior', description: 'Interior walls & doors', estimate: 32000 },
				{
					category: 'Interior',
					description: 'Flooring',
					estimate: 38000,
					notes: 'Polished concrete throughout'
				},
				{ category: 'Interior', description: 'Cabinetry & millwork', estimate: 55000 },
				{ category: 'Interior', description: 'Paint & finishes', estimate: 22000 },
				{
					category: 'Systems',
					description: 'HVAC',
					estimate: 42000,
					notes: 'Mini-split system, zoned'
				},
				{ category: 'Systems', description: 'Electrical', estimate: 35000 },
				{ category: 'Systems', description: 'Plumbing', estimate: 38000, notes: '4 full baths' },
				{
					category: 'Systems',
					description: 'Solar prep',
					estimate: 8000,
					notes: 'Conduit & panel space'
				},
				{ category: 'Fixtures', description: 'Kitchen appliances', estimate: 18000 },
				{ category: 'Fixtures', description: 'Bathroom fixtures', estimate: 24000 },
				{ category: 'Fixtures', description: 'Lighting', estimate: 15000 },
				{ category: 'Exterior', description: 'Carport structure', estimate: 18000 },
				{
					category: 'Exterior',
					description: 'Dog kennel',
					estimate: 8000,
					notes: 'Covered, concrete floor'
				},
				{ category: 'Exterior', description: 'Landscaping allowance', estimate: 15000 }
			],
			assumptions: [
				'Texas Gulf Coast region pricing (2025)',
				'Owner-managed general contracting',
				'Standard permits & inspections included',
				'Does not include land acquisition',
				'10% contingency recommended'
			],
			lastUpdated: 'November 2025'
		}
	};

	// ============================================================================
	// SECTION DATA
	// ============================================================================

	const sectionAA: SectionData = {
		name: 'Longitudinal Section',
		cutLine: 'A-A',
		width: 75,
		height: 18,
		groundLevel: 2,

		elements: [
			// Grade line
			sectionElement(0, 2, 75, 2, 'grade'),
			// Foundation/floor slab
			sectionElement(0, 2, 0, 3, 'floor', true),
			sectionElement(0, 3, 65, 3, 'floor'),
			sectionElement(65, 2, 65, 3, 'floor', true),
			// West exterior wall
			sectionElement(0, 3, 0, 12, 'wall', true),
			// Service zone ceiling (lower - 9')
			sectionElement(0, 12, 12, 12, 'ceiling'),
			sectionElement(12, 12, 12, 14, 'wall'),
			// Open zone ceiling (higher - 11')
			sectionElement(12, 14, 55, 14, 'ceiling'),
			sectionElement(55, 14, 55, 12, 'wall'),
			// East service zone ceiling
			sectionElement(55, 12, 65, 12, 'ceiling'),
			// East exterior wall
			sectionElement(65, 3, 65, 12, 'wall', true),
			// Roof structure
			sectionElement(0, 12, 0, 15, 'roof', true),
			sectionElement(0, 15, 32.5, 16, 'roof'),
			sectionElement(32.5, 16, 65, 15, 'roof'),
			sectionElement(65, 15, 65, 12, 'roof', true),
			// Carport overhang
			sectionElement(65, 12, 75, 11, 'roof'),
			sectionElement(75, 11, 75, 3, 'wall'),
			// Interior walls
			sectionElement(12, 3, 12, 12, 'wall'),
			sectionElement(55, 3, 55, 12, 'wall')
		],

		labels: [
			sectionLabel(6, 7, 'Pantry\nSit-in'),
			sectionLabel(33, 8, 'Living · Dining · Kitchen'),
			sectionLabel(60, 7, 'Guest Bath', true),
			sectionLabel(70, 7, 'Carport', true)
		],

		dimensions: [
			sectionDimension(-2, 3, 12, "9'-0\""),
			sectionDimension(33, 3, 14, "11'-0\""),
			sectionDimension(70, 3, 11, "8'-0\"")
		]
	};

	// ============================================================================
	// ELEVATION DATA (South Elevation)
	// ============================================================================

	const southElevation: ElevationData = {
		name: 'Miesian Family Pavilion',
		direction: 'south',
		width: 75,
		height: 18,
		groundLevel: 2,

		elements: [
			// Grade
			elevationElement(0, 2, 75, 2, 'grade'),
			// Main building outline
			elevationElement(0, 3, 0, 15, 'wall'),
			elevationElement(0, 15, 32.5, 16, 'roof'),
			elevationElement(32.5, 16, 65, 15, 'roof'),
			elevationElement(65, 15, 65, 3, 'wall'),
			elevationElement(0, 3, 65, 3, 'wall'),
			// Carport
			elevationElement(65, 11, 75, 11, 'roof'),
			elevationElement(75, 11, 75, 3, 'column'),
			// Columns visible on south
			elevationElement(10, 3, 10, 15, 'column'),
			elevationElement(32.5, 3, 32.5, 16, 'column'),
			elevationElement(55, 3, 55, 15, 'column')
		],

		windows: [
			// Floor-to-ceiling windows in private zone (south wall)
			elevationWindow(1, 3, 8, 9),
			elevationWindow(19, 3, 19, 9),
			elevationWindow(40, 3, 14, 9)
		],

		labels: [
			sectionLabel(4.5, 8, "Daughter's", true),
			sectionLabel(28, 8, 'Primary', true),
			sectionLabel(47, 8, 'In-Law', true),
			sectionLabel(70, 7, 'Carport', true)
		],

		dimensions: [sectionDimension(-2, 3, 15, "12'-0\""), sectionDimension(70, 3, 11, "8'-0\"")]
	};

	// ============================================================================
	// SITE PLAN DATA
	// ============================================================================

	const sitePlan: SitePlanData = {
		name: 'Johnson Residence Site',
		width: 150,
		depth: 120,

		propertyLines: [
			wall(0, 0, 150, 0),
			wall(150, 0, 150, 120),
			wall(150, 120, 0, 120),
			wall(0, 120, 0, 0)
		],

		setbacks: [
			setbackLine(25, 0, 25, 120, "25' Front"),
			setbackLine(0, 10, 150, 10, "10' Side"),
			setbackLine(0, 110, 150, 110, "10' Side"),
			setbackLine(125, 0, 125, 120, "25' Rear")
		],

		features: [
			// Main building (centered on lot)
			siteFeature(40, 40, 65, 42, 'building', 'Pavilion'),
			// Carport and dog kennel
			siteFeature(105, 40, 10, 27, 'building'),
			// Driveway
			siteFeature(105, 0, 20, 40, 'driveway', 'Drive'),
			// Patio (west side)
			siteFeature(25, 50, 15, 20, 'patio', 'Patio'),
			// Pool area (southwest)
			siteFeature(25, 75, 12, 20, 'pool', 'Pool'),
			// Garden beds
			siteFeature(10, 95, 30, 15, 'garden'),
			// Trees
			siteFeature(15, 25, 8, 8, 'tree'),
			siteFeature(130, 95, 10, 10, 'tree'),
			siteFeature(10, 60, 6, 6, 'tree')
		],

		labels: [
			sectionLabel(75, 5, 'County Road', true),
			sectionLabel(145, 60, 'E', true),
			sectionLabel(5, 60, 'W', true)
		]
	};

	// ============================================================================
	// ROOF PLAN DATA
	// ============================================================================

	const roofPlan: RoofPlanData = {
		name: 'Miesian Family Pavilion',
		width: 75,
		depth: 42,

		outline: [
			wall(0, 0, 65, 0),
			wall(65, 0, 65, 42),
			wall(65, 42, 0, 42),
			wall(0, 42, 0, 0),
			// Carport outline
			wall(65, 0, 75, 0),
			wall(75, 0, 75, 27),
			wall(75, 27, 65, 27)
		],

		slopes: [
			// Main roof - slight pitch to center ridge
			roofSlope(0, 21, 32.5, 21, 's'),
			roofSlope(65, 21, 32.5, 21, 's'),
			// Ridge line
			roofSlope(32.5, 0, 32.5, 42, 'e'),
			// Carport slope
			roofSlope(65, 13, 75, 13, 'e')
		],

		drains: [
			roofDrain(5, 21),
			roofDrain(60, 21),
			roofDrain(70, 5),
			roofDrain(70, 22)
		],

		overhangs: [overhang(65, 0, 10, 6, 'Kennel'), overhang(65, 6, 10, 7, 'Carport')],

		labels: [
			sectionLabel(16, 10, 'West Slope', true),
			sectionLabel(48, 10, 'East Slope', true),
			sectionLabel(32.5, 35, 'Ridge'),
			sectionLabel(70, 20, 'Carport', true)
		]
	};

	// ============================================================================
	// SYSTEMS DATA (MEP)
	// ============================================================================

	const systemsData: SystemsData = {
		name: 'Miesian Family Pavilion - MEP Systems',
		width: 65,
		depth: 42,

		// HVAC Equipment
		hvacEquipment: [
			{ x: 6, y: 8, type: 'air_handler', label: 'Air Handler' },
			{ x: 70, y: 10, type: 'condenser', label: 'Condenser' },
			{ x: 9, y: 35, type: 'mini_split', label: 'Daughter' },
			{ x: 28, y: 35, type: 'mini_split', label: 'Primary' },
			{ x: 52, y: 35, type: 'mini_split', label: 'In-Law' },
			{ x: 32, y: 6, type: 'thermostat', label: 'Main' }
		],

		// HVAC Zones
		hvacZones: [
			{ x: 0, y: 20, width: 18, height: 22, name: 'Zone 1' },
			{ x: 18, y: 20, width: 21, height: 22, name: 'Zone 2' },
			{ x: 39, y: 20, width: 26, height: 22, name: 'Zone 3' },
			{ x: 12, y: 0, width: 43, height: 13, name: 'Zone 4' }
		],

		// Duct runs (main trunk + branches)
		ducts: [
			// Main supply trunk
			{ x1: 6, y1: 8, x2: 6, y2: 20, type: 'supply' },
			{ x1: 6, y1: 20, x2: 50, y2: 20, type: 'supply' },
			// Branches to bedrooms
			{ x1: 9, y1: 20, x2: 9, y2: 35, type: 'supply' },
			{ x1: 28, y1: 20, x2: 28, y2: 35, type: 'supply' },
			{ x1: 50, y1: 20, x2: 52, y2: 35, type: 'supply' },
			// Return air
			{ x1: 32, y1: 6, x2: 6, y2: 6, type: 'return' },
			{ x1: 6, y1: 6, x2: 6, y2: 8, type: 'return' }
		],

		// Plumbing Fixtures
		plumbingFixtures: [
			{ x: 3, y: 2, type: 'water_heater', label: 'Water Heater' },
			{ x: 0, y: 0, type: 'main_shutoff', label: 'Main' },
			{ x: 70, y: 0, type: 'hose_bib', label: 'Hose' },
			{ x: 0, y: 42, type: 'hose_bib', label: 'Hose' }
		],

		// Pipe runs (simplified wet wall runs)
		pipes: [
			// Main supply line
			{ x1: 0, y1: 0, x2: 3, y2: 2, type: 'supply' },
			{ x1: 3, y1: 2, x2: 3, y2: 4, type: 'supply' },
			// West wet wall (laundry + baths)
			{ x1: 3, y1: 4, x2: 10, y2: 4, type: 'supply' },
			{ x1: 10, y1: 4, x2: 10, y2: 28, type: 'supply' },
			// Primary bath wet wall
			{ x1: 10, y1: 28, x2: 26, y2: 28, type: 'supply' },
			{ x1: 26, y1: 28, x2: 39, y2: 28, type: 'supply' },
			// In-law bath
			{ x1: 39, y1: 28, x2: 55, y2: 28, type: 'supply' },
			{ x1: 55, y1: 28, x2: 55, y2: 13, type: 'supply' },
			{ x1: 55, y1: 13, x2: 60, y2: 6, type: 'supply' },
			// Drain lines
			{ x1: 10, y1: 4, x2: 10, y2: 0, type: 'drain' },
			{ x1: 10, y1: 28, x2: 10, y2: 0, type: 'drain' },
			{ x1: 32, y1: 28, x2: 32, y2: 0, type: 'drain' },
			{ x1: 60, y1: 6, x2: 60, y2: 0, type: 'drain' }
		],

		// Electrical Equipment
		electricalEquipment: [
			{ x: 62, y: 10, type: 'panel', label: 'Main Panel\n200A' },
			{ x: 6, y: 6, type: 'subpanel', label: 'Service\n100A' },
			{ x: 65, y: 0, type: 'meter', label: 'Meter' }
		],

		// Circuit Zones
		circuits: [
			{ x: 0, y: 0, width: 12, height: 13, circuit: 'Service 20A' },
			{ x: 12, y: 0, width: 22, height: 13, circuit: 'Kitchen 20A' },
			{ x: 34, y: 0, width: 21, height: 13, circuit: 'Living 15A' },
			{ x: 0, y: 20, width: 18, height: 22, circuit: 'Daughter 15A' },
			{ x: 18, y: 20, width: 21, height: 22, circuit: 'Primary 15A' },
			{ x: 39, y: 20, width: 26, height: 22, circuit: 'In-Law 15A' }
		],

		labels: [
			sectionLabel(32.5, 21, 'Main Corridor')
		]
	};
</script>

<svelte:head>
	<title>Threshold Dwelling · CREATE SOMETHING</title>
	<meta
		name="description"
		content="Architectural visualization using Heidegger threshold zones. Five views, one pattern."
	/>
</svelte:head>

<div class="experiment">
	<div class="view-controls">
		{#each views as view}
			<button
				class="view-btn"
				class:active={currentView === view.id}
				onclick={() => (currentView = view.id)}
			>
				{view.label}
			</button>
		{/each}
	</div>

	<div class="visualization">
		{#if currentView === 'plan'}
			<FloorPlan plan={pavilion} />
		{:else if currentView === 'section'}
			<Section section={sectionAA} />
		{:else if currentView === 'elevation'}
			<Elevation elevation={southElevation} />
		{:else if currentView === 'site'}
			<SitePlan site={sitePlan} />
		{:else if currentView === 'roof'}
			<RoofPlan roof={roofPlan} />
		{:else if currentView === 'systems'}
			<Systems systems={systemsData} />
		{/if}
	</div>
</div>

<style>
	.experiment {
		min-height: 100vh;
		background: var(--color-bg-pure);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: var(--space-xl);
		gap: var(--space-lg);
	}

	.view-controls {
		display: flex;
		gap: 1px;
		background: var(--color-border-default);
		border-radius: var(--radius-sm);
		overflow: hidden;
	}

	.view-btn {
		font-family: var(--font-sans, system-ui, sans-serif);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		background: var(--color-bg-pure);
		border: none;
		padding: var(--space-xs) var(--space-sm);
		cursor: pointer;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.view-btn:hover {
		color: var(--color-fg-tertiary);
		background: var(--color-hover);
	}

	.view-btn.active {
		color: var(--color-fg-primary);
		background: var(--color-active);
	}

	.visualization {
		max-width: 1000px;
		width: 100%;
	}

	@media (max-width: 768px) {
		.experiment {
			padding: var(--space-md);
		}

		.view-controls {
			flex-wrap: wrap;
			justify-content: center;
		}
	}
</style>
