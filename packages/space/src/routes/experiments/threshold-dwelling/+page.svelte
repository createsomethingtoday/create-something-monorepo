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
	import LightStudy from '$lib/components/LightStudy.svelte';
	import Circulation from '$lib/components/Circulation.svelte';
	import MaterialPalette, { type Material } from '$lib/components/MaterialPalette.svelte';
	import DailyRhythm, { type Activity, type DailyRhythmData } from '$lib/components/DailyRhythm.svelte';
	import type {
		FloorPlanData,
		SectionData,
		ElevationData,
		SitePlanData,
		RoofPlanData,
		SystemsData,
		LightStudyData,
		CirculationData
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
		roofDrain,
		sunPosition,
		seasonalPath,
		lightZone,
		thresholdMoment,
		circulationPath,
		zoneTransition
	} from '$lib/types/architecture';

	// Fullscreen state - Heidegger: tool appears only when summoned
	type ExpandedView = 'plan' | 'section' | 'elevation' | 'site' | 'roof' | 'systems' | 'light' | 'circulation' | 'materials' | 'rhythm' | null;
	let expandedView: ExpandedView = $state(null);
	let showBudget = $state(false);
	let showMaterials = $state(false);

	function toggleExpand(view: ExpandedView) {
		expandedView = expandedView === view ? null : view;
	}

	function handleGlobalKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && expandedView) {
			expandedView = null;
		}
	}

	// Format currency - Tufte: numbers should be readable
	function formatCurrency(amount: number): string {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		}).format(amount);
	}

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
			// West wall - hallway light
			floorPlanWindow(0, 16.5, 4, 'vertical'),

			// South wall - private zone threshold to earth/sky
			// (offset from doors at x=5, x=22, x=47)
			floorPlanWindow(12, 20, 6, 'horizontal'),  // Daughter's suite (clear of door at x=5)
			floorPlanWindow(28, 20, 8, 'horizontal'),  // Primary bedroom (clear of door at x=22)
			floorPlanWindow(38, 20, 5, 'horizontal'),  // Primary bath
			floorPlanWindow(54, 20, 6, 'horizontal'),  // In-law suite (clear of door at x=47)

			// North wall - service/public threshold
			floorPlanWindow(20, 42, 8, 'horizontal'),  // Kitchen
			floorPlanWindow(35, 42, 10, 'horizontal'), // Living/dining
			floorPlanWindow(50, 42, 5, 'horizontal'),  // Open zone corner

			// East wall - entry sequence light
			floorPlanWindow(65, 30, 6, 'vertical')     // Living room east
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
			costPerSF: 298,
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
				{ category: 'Structure', description: 'Exterior walls', estimate: 48000, notes: 'Cedar board & batten' },
				{
					category: 'Envelope',
					description: 'Windows & glazing',
					estimate: 95000,
					notes: '10 windows: 4 south (private), 3 north (public), 1 east, 1 west'
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
				{ category: 'Interior', description: 'Cedar millwork & cabinets', estimate: 62000, notes: 'Native Ashe Juniper throughout' },
				{ category: 'Interior', description: 'Cedar ceilings', estimate: 28000, notes: 'T&G planks, living & bedrooms' },
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
				{ category: 'Exterior', description: 'Cedar soffits', estimate: 12000, notes: 'T&G under all overhangs' },
				{ category: 'Exterior', description: 'Cedar decking', estimate: 18000, notes: 'Covered entry & patios' },
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
			lastUpdated: 'December 2025'
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

	// ============================================================================
	// LIGHT STUDY DATA (Sun Path / Shadow Analysis)
	// ============================================================================

	const lightStudyData: LightStudyData = {
		name: 'Johnson Residence',
		latitude: 32.7, // Grandview, Texas
		orientation: 0, // North-facing (long axis E-W)
		width: 65,
		depth: 42,

		// Building outline
		buildingOutline: [
			wall(0, 0, 65, 0),
			wall(65, 0, 65, 42),
			wall(65, 42, 0, 42),
			wall(0, 42, 0, 0)
		],

		overhangs: [
			overhang(65, 0, 10, 6, 'Kennel'),
			overhang(65, 6, 10, 7, 'Carport'),
			overhang(65, 13, 8, 14, 'Entry')
		],

		// Sun paths for Texas latitude (~32.7°N)
		sunPaths: [
			// Summer Solstice (June 21) - sun is high and north
			seasonalPath('summer', [
				sunPosition('morning', 65, 25),   // 8am: ENE, low
				sunPosition('noon', 170, 82),      // 12pm: Nearly overhead, slightly south
				sunPosition('afternoon', 255, 45), // 4pm: WSW, medium
				sunPosition('evening', 285, 15)    // 6pm: WNW, low
			], 0.5),

			// Equinox (March/September) - balanced
			seasonalPath('equinox', [
				sunPosition('morning', 85, 20),    // 8am: E, low
				sunPosition('noon', 180, 57),       // 12pm: S, medium-high
				sunPosition('afternoon', 255, 35), // 4pm: WSW, medium
				sunPosition('evening', 270, 10)    // 6pm: W, very low
			], 1.0),

			// Winter Solstice (December 21) - sun is low and south
			seasonalPath('winter', [
				sunPosition('morning', 115, 10),   // 8am: ESE, very low
				sunPosition('noon', 180, 34),       // 12pm: S, low
				sunPosition('afternoon', 225, 20), // 4pm: SW, very low
				sunPosition('evening', 245, 5)     // 6pm: WSW, horizon
			], 2.0)
		],

		// Light zones - where sun penetrates at different times
		lightZones: [
			// South bedrooms get morning/afternoon light
			lightZone(0, 20, 18, 22, 'direct', '7am-11am'),
			lightZone(18, 20, 21, 22, 'direct', '10am-2pm'),
			lightZone(39, 20, 26, 22, 'direct', '2pm-6pm'),
			// Open living gets diffuse north light + south clerestory
			lightZone(12, 0, 43, 13, 'diffuse', 'all day'),
			// Service zones are shaded
			lightZone(0, 0, 12, 13, 'shade', 'minimal'),
			lightZone(55, 0, 10, 13, 'shade', 'minimal')
		],

		// Glazing locations - thresholds between interior dwelling and world
		glazingLocations: [
			// South wall - private zone (morning sun, winter warmth)
			{ x: 12, y: 20, width: 6, orientation: 's' },  // Daughter's
			{ x: 28, y: 20, width: 8, orientation: 's' },  // Primary bedroom
			{ x: 38, y: 20, width: 5, orientation: 's' },  // Primary bath
			{ x: 54, y: 20, width: 6, orientation: 's' },  // In-law suite

			// North wall - public zone (diffuse light, summer shade)
			{ x: 20, y: 42, width: 8, orientation: 'n' },  // Kitchen
			{ x: 35, y: 42, width: 10, orientation: 'n' }, // Living/dining
			{ x: 50, y: 42, width: 5, orientation: 'n' },  // Open zone

			// East wall - morning threshold
			{ x: 65, y: 30, width: 6, orientation: 'e' },  // Living room

			// West wall - evening light
			{ x: 0, y: 16.5, width: 4, orientation: 'w' }  // Hallway
		],

		labels: [
			sectionLabel(9, 31, "Daughter's\n(AM light)", true),
			sectionLabel(28, 31, 'Primary\n(Midday)', true),
			sectionLabel(52, 31, 'In-Law\n(PM light)', true),
			sectionLabel(32, 6, 'Living\n(Diffuse)', true)
		]
	};

	// ============================================================================
	// CIRCULATION DATA (Threshold Moments)
	// ============================================================================

	const circulationData: CirculationData = {
		name: 'Threshold Moments',
		width: 75, // Include overhangs
		depth: 42,

		// Zones for context
		zones: pavilion.zones,

		// Key threshold moments - Heidegger's zones of becoming
		thresholds: [
			// Entry sequence
			thresholdMoment(73, 16, 'entry', 'Arrival',
				'The threshold where outside meets inside. A moment of transition from the world to dwelling.'),
			thresholdMoment(65, 16, 'transition', 'Vestibule',
				'Covered entry—neither fully outside nor inside. The pause before entering.'),
			thresholdMoment(55, 10, 'passage', 'Hall',
				'The corridor that distributes: public left, private right, service beyond.'),

			// Zone transitions
			thresholdMoment(32, 13, 'transition', 'Open/Private',
				'Where the open living zone meets the private corridor. Light gives way to intimacy.'),
			thresholdMoment(5, 20, 'passage', "Daughter's",
				'Threshold to the daughter\'s realm. Privacy within dwelling.'),
			thresholdMoment(22, 20, 'passage', 'Primary',
				'Entry to the primary suite. The deepest level of dwelling.'),
			thresholdMoment(47, 20, 'passage', 'In-Law',
				'The in-law suite threshold. Autonomy within togetherness.'),

			// Destinations
			thresholdMoment(32, 6, 'arrival', 'Living',
				'The heart of dwelling. Where the family gathers, where light fills the space.'),
			thresholdMoment(6, 8, 'arrival', 'Pantry',
				'The service threshold. Sustenance and preparation.')
		],

		// Circulation paths
		paths: [
			// Primary path: Entry → Living
			circulationPath([
				{ x: 73, y: 16 },
				{ x: 65, y: 16 },
				{ x: 55, y: 13 },
				{ x: 32, y: 13 },
				{ x: 32, y: 6 }
			], 'primary', 'Entry to Living'),

			// Secondary: Hall to private zones
			circulationPath([
				{ x: 32, y: 16 },
				{ x: 9, y: 16 },
				{ x: 5, y: 20 }
			], 'secondary', 'To Daughter'),
			circulationPath([
				{ x: 32, y: 16 },
				{ x: 22, y: 16 },
				{ x: 22, y: 20 }
			], 'secondary', 'To Primary'),
			circulationPath([
				{ x: 32, y: 16 },
				{ x: 47, y: 16 },
				{ x: 47, y: 20 }
			], 'secondary', 'To In-Law'),

			// Service path
			circulationPath([
				{ x: 6, y: 13 },
				{ x: 6, y: 8 }
			], 'service', 'Service')
		],

		// Zone transitions
		transitions: [
			zoneTransition('public', 'private', 0, 20, 65, 'horizontal'),
			zoneTransition('service', 'public', 12, 0, 13, 'vertical'),
			zoneTransition('open', 'public', 12, 13, 43, 'horizontal')
		]
	};

	// ============================================================================
	// MATERIAL PALETTE - Heidegger: how earth appears in dwelling
	// ============================================================================

	const materialPalette: Material[] = [
		// Structure - Miesian honesty
		{ name: 'Exposed Steel', category: 'structure', color: '#2a2a2a', location: 'Columns & beams', notes: 'Hot-rolled, clear-coated' },
		{ name: 'Concrete', category: 'structure', color: '#8a8a8a', location: 'Foundation slab', notes: 'Polished, sealed' },

		// Envelope - threshold between inside/outside
		{ name: 'Standing Seam', category: 'envelope', color: '#3d3d3d', location: 'Roof', notes: 'Galvalume, 24ga' },
		{ name: 'Clear Glass', category: 'envelope', color: '#a8d4e6', location: 'Windows', notes: 'Low-E, insulated' },
		{ name: 'Cedar Siding', category: 'envelope', color: '#8b6914', location: 'Exterior walls', notes: 'Board & batten, natural weather' },
		{ name: 'Cedar Soffit', category: 'envelope', color: '#a67c52', location: 'Overhangs', notes: 'T&G, connects inside/out' },

		// Interior - dwelling surfaces (cedar as unifying thread)
		{ name: 'Polished Concrete', category: 'interior', color: '#9a9590', location: 'All floors', notes: 'Radiant heat ready' },
		{ name: 'Cedar Millwork', category: 'interior', color: '#a67c52', location: 'Cabinets & built-ins', notes: 'Native Ashe Juniper' },
		{ name: 'Cedar Ceiling', category: 'interior', color: '#b8956c', location: 'Living & bedrooms', notes: 'T&G planks, aromatic' },
		{ name: 'Gypsum Board', category: 'interior', color: '#f5f5f5', location: 'Walls', notes: 'Level 5 finish, white' },

		// Exterior - earth connection
		{ name: 'Native Stone', category: 'exterior', color: '#b8a88a', location: 'Entry threshold', notes: 'Texas limestone' },
		{ name: 'Cedar Deck', category: 'exterior', color: '#9a7b4f', location: 'Covered patios', notes: 'Extends interior floor plane' },
		{ name: 'Gravel', category: 'exterior', color: '#c9c0b0', location: 'Driveway & paths', notes: 'Decomposed granite' }
	];

	// ============================================================================
	// DAILY RHYTHM DATA - Temporal dwelling
	// ============================================================================

	const dailyRhythmData: DailyRhythmData = {
		name: 'Typical Weekday',
		spaces: [
			'Kitchen',
			'Dining',
			'Living',
			'Primary Suite',
			"Daughter's Room",
			'In-Law Suite',
			'Pantry/Sit-in',
			'Covered Entry'
		],
		activities: [
			// Morning rhythm (6-9am)
			{ name: 'Wake', space: 'Primary Suite', startHour: 6, endHour: 7, person: 'Parents', intensity: 'low' },
			{ name: 'Wake', space: "Daughter's Room", startHour: 6.5, endHour: 7.5, person: 'Daughter', intensity: 'low' },
			{ name: 'Wake', space: 'In-Law Suite', startHour: 7, endHour: 8, person: 'In-Law', intensity: 'low' },
			{ name: 'Breakfast prep', space: 'Kitchen', startHour: 6.5, endHour: 8, person: 'Parents', intensity: 'high' },
			{ name: 'Family breakfast', space: 'Dining', startHour: 7.5, endHour: 8.5, person: 'Family', intensity: 'high' },

			// Daytime (9am-5pm) - parents at work, in-law at home
			{ name: 'Reading', space: 'Living', startHour: 9, endHour: 11, person: 'In-Law', intensity: 'medium' },
			{ name: 'Quiet time', space: 'Pantry/Sit-in', startHour: 11, endHour: 12, person: 'In-Law', intensity: 'low' },
			{ name: 'Lunch', space: 'Kitchen', startHour: 12, endHour: 13, person: 'In-Law', intensity: 'medium' },
			{ name: 'Rest', space: 'In-Law Suite', startHour: 13, endHour: 15, person: 'In-Law', intensity: 'low' },
			{ name: 'Garden', space: 'Covered Entry', startHour: 15, endHour: 17, person: 'In-Law', intensity: 'medium' },

			// After school (3-6pm)
			{ name: 'Homework', space: "Daughter's Room", startHour: 15.5, endHour: 17.5, person: 'Daughter', intensity: 'medium' },

			// Evening rhythm (5-10pm)
			{ name: 'Cooking', space: 'Kitchen', startHour: 17, endHour: 19, person: 'Parents', intensity: 'high' },
			{ name: 'Family dinner', space: 'Dining', startHour: 19, endHour: 20, person: 'Family', intensity: 'high' },
			{ name: 'Evening together', space: 'Living', startHour: 20, endHour: 22, person: 'Family', intensity: 'medium' },
			{ name: 'TV/Quiet', space: 'In-Law Suite', startHour: 20.5, endHour: 22, person: 'In-Law', intensity: 'low' },
			{ name: 'Wind down', space: "Daughter's Room", startHour: 21, endHour: 22, person: 'Daughter', intensity: 'low' },
			{ name: 'Evening', space: 'Primary Suite', startHour: 22, endHour: 23, person: 'Parents', intensity: 'low' },

			// Weekend guest rhythm (occasional)
			{ name: 'Guests arrive', space: 'Covered Entry', startHour: 18, endHour: 18.5, person: 'Guests', intensity: 'medium' }
		]
	};

	// Group line items by category - DRY
	const groupedCosts = pavilion.materials?.lineItems.reduce(
		(acc, item) => {
			if (!acc[item.category]) acc[item.category] = [];
			acc[item.category].push(item);
			return acc;
		},
		{} as Record<string, typeof pavilion.materials.lineItems>
	);

	const totalBudget = pavilion.materials
		? pavilion.materials.totalSF * pavilion.materials.costPerSF
		: 0;
</script>

<svelte:head>
	<title>Threshold Dwelling · CREATE SOMETHING</title>
	<meta
		name="description"
		content="Architectural visualization using Heidegger threshold zones. Tufte small multiples, Miesian clarity."
	/>
</svelte:head>

<svelte:window onkeydown={handleGlobalKeydown} />

<!--
	Unified Small-Multiples Layout

	Tufte: Show everything simultaneously for comparison
	Mies: Less is more—no mode switching
	Heidegger: Tool recedes; dwelling emerges
	Rams: Weniger, aber besser
	Canon: Golden ratio proportions (φ = 1.618)
-->

<div class="dwelling" class:has-expanded={expandedView !== null}>
	<!-- Header: Minimal, informational -->
	<header class="dwelling-header">
		<h1 class="dwelling-title">{pavilion.name}</h1>
		<p class="dwelling-meta">{pavilion.location}</p>
	</header>

	<!-- Primary: Floor Plan (φ proportion of vertical space) -->
	<section
		class="view-panel primary-view"
		class:expanded={expandedView === 'plan'}
		class:hidden={expandedView !== null && expandedView !== 'plan'}
	>
		<button class="expand-trigger" onclick={() => toggleExpand('plan')} aria-label="Toggle fullscreen floor plan">
			<FloorPlan plan={pavilion} showCaption={false} />
		</button>
	</section>

	<!-- Secondary: Section + Elevation (1:φ ratio between them) -->
	<section class="secondary-views" class:hidden={expandedView !== null && expandedView !== 'section' && expandedView !== 'elevation'}>
		<div
			class="view-panel secondary-left"
			class:expanded={expandedView === 'section'}
			class:hidden={expandedView !== null && expandedView !== 'section'}
		>
			<button class="expand-trigger" onclick={() => toggleExpand('section')} aria-label="Toggle fullscreen section">
				<Section section={sectionAA} expanded={expandedView === 'section'} />
			</button>
		</div>
		<div
			class="view-panel secondary-right"
			class:expanded={expandedView === 'elevation'}
			class:hidden={expandedView !== null && expandedView !== 'elevation'}
		>
			<button class="expand-trigger" onclick={() => toggleExpand('elevation')} aria-label="Toggle fullscreen elevation">
				<Elevation elevation={southElevation} expanded={expandedView === 'elevation'} />
			</button>
		</div>
	</section>

	<!-- Tertiary: Site + Roof + Systems + Light + Circulation + Rhythm (3×2 grid) -->
	<section class="tertiary-views" class:hidden={expandedView !== null && !['site', 'roof', 'systems', 'light', 'circulation', 'rhythm'].includes(expandedView)}>
		<div
			class="view-panel tertiary-item"
			class:expanded={expandedView === 'site'}
			class:hidden={expandedView !== null && expandedView !== 'site'}
		>
			<button class="expand-trigger" onclick={() => toggleExpand('site')} aria-label="Toggle fullscreen site plan">
				<SitePlan site={sitePlan} />
			</button>
		</div>
		<div
			class="view-panel tertiary-item"
			class:expanded={expandedView === 'roof'}
			class:hidden={expandedView !== null && expandedView !== 'roof'}
		>
			<button class="expand-trigger" onclick={() => toggleExpand('roof')} aria-label="Toggle fullscreen roof plan">
				<RoofPlan roof={roofPlan} />
			</button>
		</div>
		<div
			class="view-panel tertiary-item"
			class:expanded={expandedView === 'systems'}
			class:hidden={expandedView !== null && expandedView !== 'systems'}
		>
			<button class="expand-trigger" onclick={() => toggleExpand('systems')} aria-label="Toggle fullscreen systems">
				<Systems systems={systemsData} />
			</button>
		</div>
		<div
			class="view-panel tertiary-item"
			class:expanded={expandedView === 'light'}
			class:hidden={expandedView !== null && expandedView !== 'light'}
		>
			<button class="expand-trigger" onclick={() => toggleExpand('light')} aria-label="Toggle fullscreen light study">
				<LightStudy study={lightStudyData} showCaption={false} />
			</button>
		</div>
		<div
			class="view-panel tertiary-item"
			class:expanded={expandedView === 'circulation'}
			class:hidden={expandedView !== null && expandedView !== 'circulation'}
		>
			<button class="expand-trigger" onclick={() => toggleExpand('circulation')} aria-label="Toggle fullscreen circulation">
				<Circulation circulation={circulationData} showCaption={false} />
			</button>
		</div>
		<div
			class="view-panel tertiary-item"
			class:expanded={expandedView === 'rhythm'}
			class:hidden={expandedView !== null && expandedView !== 'rhythm'}
		>
			<button class="expand-trigger" onclick={() => toggleExpand('rhythm')} aria-label="Toggle fullscreen daily rhythm">
				<DailyRhythm rhythm={dailyRhythmData} showCaption={false} />
			</button>
		</div>
	</section>

	<!-- Footer: Integrated data summary (Tufte: data, not chrome) -->
	<footer class="dwelling-footer" class:hidden={expandedView !== null}>
		<div class="metric">
			<span class="metric-value">{pavilion.width}′ × {pavilion.depth}′</span>
			<span class="metric-label">Footprint</span>
		</div>
		<div class="metric">
			<span class="metric-value">{(pavilion.width * pavilion.depth).toLocaleString()}</span>
			<span class="metric-label">Square Feet</span>
		</div>
		<div class="metric">
			<span class="metric-value">{pavilion.bedrooms} / {pavilion.bathrooms}</span>
			<span class="metric-label">Bed / Bath</span>
		</div>
		<div class="metric clickable" role="button" tabindex="0" onclick={() => showBudget = !showBudget} onkeydown={(e) => e.key === 'Enter' && (showBudget = !showBudget)}>
			<span class="metric-value">{formatCurrency(totalBudget)}</span>
			<span class="metric-label">Budget {showBudget ? '−' : '+'}</span>
		</div>
		<div class="metric clickable" role="button" tabindex="0" onclick={() => showMaterials = !showMaterials} onkeydown={(e) => e.key === 'Enter' && (showMaterials = !showMaterials)}>
			<span class="metric-value">{materialPalette.length}</span>
			<span class="metric-label">Materials {showMaterials ? '−' : '+'}</span>
		</div>
	</footer>

	<!-- Budget Details: Collapsible price sheet (Rams: information on demand) -->
	{#if showBudget && pavilion.materials && !expandedView}
		<section class="budget-details">
			<header class="budget-header">
				<h2 class="budget-title">Construction Budget</h2>
				<span class="budget-meta">{formatCurrency(pavilion.materials.costPerSF)}/SF · {pavilion.materials.lastUpdated}</span>
			</header>

			<div class="budget-categories">
				{#each Object.entries(groupedCosts || {}) as [category, items]}
					<div class="budget-category">
						<h3 class="category-name">{category}</h3>
						{#each items as item}
							<div class="budget-item">
								<span class="item-desc">{item.description}</span>
								<span class="item-amount">{formatCurrency(item.estimate)}</span>
							</div>
							{#if item.notes}
								<p class="item-notes">{item.notes}</p>
							{/if}
						{/each}
					</div>
				{/each}
			</div>

			{#if pavilion.materials.assumptions?.length}
				<div class="budget-assumptions">
					<h3>Assumptions</h3>
					<ul>
						{#each pavilion.materials.assumptions as assumption}
							<li>{assumption}</li>
						{/each}
					</ul>
				</div>
			{/if}
		</section>
	{/if}

	<!-- Material Palette: Collapsible (Rams: information on demand) -->
	{#if showMaterials && !expandedView}
		<section class="materials-details">
			<MaterialPalette materials={materialPalette} projectName={pavilion.name} showCaption={false} />
		</section>
	{/if}

	<!-- Escape hint (only when expanded) -->
	{#if expandedView}
		<div class="escape-hint">Press Esc or click to exit</div>
	{/if}
</div>

<style>
	/*
	 * Threshold Dwelling: Unified Layout
	 *
	 * Golden Ratio Grid:
	 * - Primary view: 61.8% of vertical space (φ / (1 + φ))
	 * - Secondary views: 23.6% (1 / (1 + φ)²)
	 * - Tertiary views: 14.6% (remaining)
	 *
	 * Tufte: Maximum data density, minimum chrome
	 * Mies: Structural clarity through proportion
	 * Heidegger: Interface recedes, dwelling appears
	 */

	.dwelling {
		min-height: 100vh;
		background: var(--color-bg-pure);
		display: grid;
		grid-template-rows: auto 1fr auto auto auto;
		gap: var(--space-md);
		padding: var(--space-lg);
		max-width: 1400px;
		margin: 0 auto;
	}

	/* Header: Minimal identification */
	.dwelling-header {
		text-align: center;
		padding: var(--space-sm) 0;
	}

	.dwelling-title {
		font-family: var(--font-sans, system-ui, sans-serif);
		font-size: var(--text-h3);
		font-weight: 300;
		color: var(--color-fg-secondary);
		margin: 0;
		letter-spacing: 0.02em;
	}

	.dwelling-meta {
		font-family: var(--font-sans, system-ui, sans-serif);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		margin: var(--space-xs) 0 0 0;
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}

	/* Primary view: Floor Plan (dominant) */
	.primary-view {
		display: flex;
		justify-content: center;
		align-items: center;
	}

	/* Secondary views: Section + Elevation (φ ratio) */
	.secondary-views {
		display: grid;
		grid-template-columns: 1fr 1.618fr;
		gap: var(--space-md);
		border-top: 1px solid var(--color-border-default);
		padding-top: var(--space-md);
	}

	.secondary-left,
	.secondary-right {
		display: flex;
		justify-content: center;
		align-items: center;
	}

	/* Tertiary views: Site + Roof + Systems + Light + Circulation + Rhythm (3×2 grid) */
	.tertiary-views {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-md);
		border-top: 1px solid var(--color-border-default);
		padding-top: var(--space-md);
	}

	.tertiary-item {
		display: flex;
		justify-content: center;
		align-items: flex-start;
	}

	/* Footer: Data summary (Tufte sparkline style) */
	.dwelling-footer {
		display: flex;
		justify-content: center;
		gap: var(--space-xl);
		border-top: 1px solid var(--color-border-default);
		padding-top: var(--space-md);
	}

	.metric {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
	}

	.metric-value {
		font-family: var(--font-sans, system-ui, sans-serif);
		font-size: var(--text-body-lg);
		font-weight: 300;
		color: var(--color-fg-secondary);
		font-variant-numeric: tabular-nums;
	}

	.metric-label {
		font-family: var(--font-sans, system-ui, sans-serif);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.1em;
	}

	.metric.clickable {
		cursor: pointer;
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.metric.clickable:hover {
		opacity: 0.8;
	}

	/* Budget Details - Collapsible price sheet */
	.budget-details,
	.materials-details {
		border-top: 1px solid var(--color-border-default);
		padding: var(--space-lg) 0;
		font-family: var(--font-sans, system-ui, sans-serif);
	}

	.materials-details {
		display: flex;
		justify-content: center;
	}

	.budget-header {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		margin-bottom: var(--space-md);
	}

	.budget-title {
		font-size: var(--text-h3);
		font-weight: 300;
		color: var(--color-fg-secondary);
		margin: 0;
	}

	.budget-meta {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.budget-categories {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: var(--space-lg);
	}

	.budget-category {
		padding: var(--space-sm) 0;
	}

	.category-name {
		font-size: var(--text-caption);
		font-weight: 500;
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		margin: 0 0 var(--space-sm) 0;
		padding-bottom: var(--space-xs);
		border-bottom: 1px solid var(--color-border-default);
	}

	.budget-item {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		padding: 0.25rem 0;
	}

	.item-desc {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	.item-amount {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		font-variant-numeric: tabular-nums;
	}

	.item-notes {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		margin: 0.125rem 0 0.5rem 0;
		font-style: italic;
	}

	.budget-assumptions {
		margin-top: var(--space-lg);
		padding-top: var(--space-md);
		border-top: 1px solid var(--color-border-default);
	}

	.budget-assumptions h3 {
		font-size: var(--text-caption);
		font-weight: 500;
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		margin: 0 0 var(--space-sm) 0;
	}

	.budget-assumptions ul {
		margin: 0;
		padding: 0 0 0 var(--space-sm);
	}

	.budget-assumptions li {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		margin: 0.25rem 0;
	}

	/* Expand trigger - invisible button wrapper (Heidegger: tool recedes) */
	.expand-trigger {
		display: block;
		width: 100%;
		background: none;
		border: none;
		padding: 0;
		cursor: zoom-in;
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.expand-trigger:hover {
		opacity: 0.9;
	}

	.expand-trigger:focus-visible {
		outline: 1px solid var(--color-border-emphasis);
		outline-offset: var(--space-xs);
	}

	/* View panel states */
	.view-panel {
		transition: all var(--duration-standard) var(--ease-standard);
	}

	.view-panel.hidden {
		display: none;
	}

	.view-panel.expanded {
		position: fixed;
		inset: 0;
		z-index: 100;
		background: var(--color-bg-pure);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-lg);
	}

	.view-panel.expanded .expand-trigger {
		cursor: zoom-out;
		max-width: 100%;
		max-height: 100%;
	}

	/* Override component max-widths when expanded */
	.view-panel.expanded :global(.light-study),
	.view-panel.expanded :global(.circulation),
	.view-panel.expanded :global(.daily-rhythm) {
		max-width: 90vw;
		max-height: 80vh;
	}

	/* Hide sections when something is expanded */
	.has-expanded .secondary-views.hidden,
	.has-expanded .tertiary-views.hidden {
		display: none;
	}

	/* Escape hint - minimal, recedes */
	.escape-hint {
		position: fixed;
		bottom: var(--space-md);
		left: 50%;
		transform: translateX(-50%);
		z-index: 101;
		font-family: var(--font-sans, system-ui, sans-serif);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		background: var(--color-bg-elevated);
		padding: var(--space-xs) var(--space-sm);
		border-radius: var(--radius-sm);
		opacity: 0.7;
		pointer-events: none;
	}

	/* Responsive: Adjust grid on smaller screens */
	@media (max-width: 1200px) {
		.tertiary-views {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 1024px) {
		.secondary-views {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 768px) {
		.dwelling {
			padding: var(--space-md);
			gap: var(--space-sm);
		}

		.tertiary-views {
			grid-template-columns: 1fr;
		}

		.dwelling-footer {
			flex-wrap: wrap;
			gap: var(--space-md);
		}
	}
</style>
