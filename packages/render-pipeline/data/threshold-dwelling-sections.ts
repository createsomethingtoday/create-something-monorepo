/**
 * Threshold Dwelling Section Data
 *
 * Vertical section cuts through the Miesian Family Pavilion.
 * Reveals ceiling heights, room layering, and spatial depth.
 *
 * Section A-A: Transverse (East-West) through living/kitchen
 * Section B-B: Longitudinal (North-South) through primary suite
 * Section C-C: Transverse through bedroom wing
 */

import type { SectionData, SectionCut } from '../src/section-svg.js';
import { THRESHOLD_DWELLING } from './threshold-dwelling.js';

/**
 * Transverse section through open living zone
 * Cuts E-W at Y=6.5 (through kitchen/dining/living)
 */
const SECTION_AA: SectionCut = {
  id: 'A-A',
  start: [0, 6.5],
  end: [65, 6.5],
  lookingDirection: 'south',
  groundExtension: 5,
  roofOverhang: 8, // Covered porch on west
  heightZones: [
    // Pantry (lower ceiling, service zone)
    { start: 0, end: 12, floor: 0, ceiling: 9, label: 'Pantry' },
    // Kitchen (open zone, rises to center)
    { start: 12, end: 24, floor: 0, ceiling: 9, slopeTo: 10, label: 'Kitchen' },
    // Dining (center peak)
    { start: 24, end: 36, floor: 0, ceiling: 11, label: 'Dining' },
    // Living (descends from peak)
    { start: 36, end: 55, floor: 0, ceiling: 11, slopeTo: 9, label: 'Living' },
    // Service east (dog utility, lower)
    { start: 55, end: 65, floor: 0, ceiling: 9, label: 'Dog\nUtility' }
  ],
  openings: [
    // North glass wall windows
    { position: 20, width: 8, sill: 0, head: 9, type: 'glass-wall' },
    { position: 33, width: 8, sill: 0, head: 9, type: 'glass-wall' },
    { position: 46, width: 8, sill: 0, head: 9, type: 'glass-wall' },
    // Pantry door
    { position: 9, width: 3, sill: 0, head: 8, type: 'door' }
  ]
};

/**
 * Longitudinal section through primary suite
 * Cuts N-S at X=28 (through primary bedroom and open zone)
 */
const SECTION_BB: SectionCut = {
  id: 'B-B',
  start: [28, 0],
  end: [28, 42],
  lookingDirection: 'west',
  groundExtension: 3,
  roofOverhang: 3,
  heightZones: [
    // Open zone (north - high ceiling)
    { start: 0, end: 13, floor: 0, ceiling: 11, label: 'Dining' },
    // Corridor
    { start: 13, end: 20, floor: 0, ceiling: 9, label: 'Hall' },
    // Primary bedroom
    { start: 20, end: 27, floor: 0, ceiling: 9, label: 'Primary\nBedroom' },
    // Primary closet/bath zone
    { start: 27, end: 42, floor: 0, ceiling: 9, label: 'Closet/Bath' }
  ],
  openings: [
    // North glass wall
    { position: 6, width: 10, sill: 0, head: 11, type: 'glass-wall' },
    // Corridor to bedroom door
    { position: 21, width: 3, sill: 0, head: 8, type: 'door' },
    // South window
    { position: 35, width: 8, sill: 2, head: 8, type: 'window' }
  ]
};

/**
 * Transverse section through bedroom wing
 * Cuts E-W at Y=31 (through all three bedroom suites)
 */
const SECTION_CC: SectionCut = {
  id: 'C-C',
  start: [0, 31],
  end: [65, 31],
  lookingDirection: 'north',
  groundExtension: 5,
  roofOverhang: 8, // Porch on west
  heightZones: [
    // Daughter's bedroom
    { start: 0, end: 18, floor: 0, ceiling: 9, label: "Daughter's\nBedroom" },
    // Primary suite
    { start: 18, end: 39, floor: 0, ceiling: 9, label: 'Primary\nSuite' },
    // In-law suite
    { start: 39, end: 65, floor: 0, ceiling: 9, label: 'In-Law\nSuite' }
  ],
  openings: [
    // West windows (daughter)
    { position: 3, width: 6, sill: 2, head: 8, type: 'window' },
    // Between daughter and primary (wall, no opening at this cut)
    // Primary south window
    { position: 28, width: 8, sill: 0, head: 9, type: 'glass-wall' },
    // In-law south window
    { position: 52, width: 8, sill: 0, head: 9, type: 'glass-wall' }
  ]
};

/**
 * Complete section data for threshold-dwelling
 */
export const THRESHOLD_DWELLING_SECTIONS: SectionData = {
  name: 'Miesian Family Pavilion - Sections',
  plan: THRESHOLD_DWELLING,
  sections: [SECTION_AA, SECTION_BB, SECTION_CC],
  defaultCeilingHeight: 9,
  roofThickness: 1,
  floorThickness: 0.5
};

/**
 * Room-specific section configurations for ControlNet conditioning
 * Maps each room to relevant section cuts
 */
export const ROOM_SECTIONS: Record<string, string[]> = {
  living: ['A-A'],
  kitchen: ['A-A'],
  dining: ['A-A', 'B-B'],
  'primary-bedroom': ['B-B', 'C-C'],
  'primary-bath': ['C-C'],
  'daughter-bedroom': ['C-C'],
  'inlaw-suite': ['C-C'],
  pantry: ['A-A'],
  entry: ['A-A']
};
