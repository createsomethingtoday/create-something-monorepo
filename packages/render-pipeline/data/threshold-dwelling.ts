/**
 * Threshold Dwelling Floor Plan Data
 *
 * Miesian Family Pavilion - 65' × 42' in Grandview, Texas
 * Cedar T&G ceiling, polished concrete, black steel frame, glass walls
 *
 * Extracted from packages/space/src/routes/experiments/threshold-dwelling/+page.svelte
 */

import type { FloorPlanData } from '../src/floor-plan-svg.js';

// Helper functions
const zone = (
  x: number,
  y: number,
  width: number,
  height: number,
  type: 'outer' | 'service' | 'public' | 'private' | 'open'
) => ({ x, y, width, height, type });

const wall = (x1: number, y1: number, x2: number, y2: number, exterior = false) => ({
  x1,
  y1,
  x2,
  y2,
  exterior
});

const room = (x: number, y: number, name: string, small = false) => ({
  x,
  y,
  name,
  small
});

const door = (
  x: number,
  y: number,
  width: number,
  orientation: 'horizontal' | 'vertical'
) => ({ x, y, width, orientation });

const floorPlanWindow = (
  x: number,
  y: number,
  width: number,
  orientation: 'horizontal' | 'vertical'
) => ({ x, y, width, orientation });

const overhang = (
  x: number,
  y: number,
  width: number,
  height: number,
  label?: string
) => ({ x, y, width, height, label });

export const THRESHOLD_DWELLING: FloorPlanData = {
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
    wall(65, 0, 65, 1.5, true),
    wall(65, 4.5, 65, 14.5, true),
    wall(65, 17.5, 65, 42, true),

    // Daughter's room
    wall(0, 20, 3.5, 20),
    wall(6.5, 20, 10, 20),
    wall(10, 20, 18, 20),
    wall(10, 20, 10, 23.5),
    wall(10, 26.5, 10, 28),
    wall(10, 28, 18, 28),
    wall(18, 20, 18, 28),
    wall(18, 28, 18, 42),

    // Primary suite
    wall(18, 20, 20.5, 20),
    wall(23.5, 20, 39, 20),
    wall(18, 27, 20.5, 27),
    wall(23.5, 27, 30.5, 27),
    wall(33.5, 27, 39, 27),
    wall(26, 20, 26, 27),
    wall(39, 20, 39, 27),
    wall(39, 27, 39, 42),

    // In-law suite
    wall(39, 20, 45.5, 20),
    wall(48.5, 20, 55, 20),
    wall(55, 20, 55, 22.5),
    wall(55, 25.5, 55, 28),
    wall(55, 28, 65, 28),
    wall(55, 20, 65, 20),

    // Service west: Laundry + Pantry
    wall(0, 4, 7.5, 4),
    wall(10.5, 4, 12, 4),
    wall(0, 13, 4.5, 13),
    wall(7.5, 13, 12, 13),
    wall(12, 0, 12, 13),

    // Service east: Dog Utility + Guest Bath
    wall(55, 0, 55, 8.5),
    wall(55, 11.5, 55, 13),
    wall(55, 6, 56.5, 6),
    wall(59.5, 6, 65, 6),
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
    room(6, 2, 'Laundry', true),
    room(6, 8.5, 'Pantry\nSit-in'),
    room(60, 3, 'Dog\nUtility', true),
    room(60, 9.5, 'Guest\nBath', true),
    room(20, 6.5, 'Kitchen'),
    room(33, 6.5, 'Dining'),
    room(46, 6.5, 'Living')
  ],

  doors: [
    // Service zone (west)
    door(9, 4, 3, 'horizontal'),
    door(6, 13, 3, 'horizontal'),
    // Private zone (west - daughter)
    door(5, 20, 3, 'horizontal'),
    door(10, 25, 3, 'vertical'),
    // Private zone (center - primary)
    door(22, 27, 3, 'horizontal'),
    door(22, 20, 3, 'horizontal'),
    door(32, 27, 3, 'horizontal'),
    // Private zone (east - in-law)
    door(47, 20, 3, 'horizontal'),
    door(55, 24, 3, 'vertical'),
    // Service zone (east)
    door(58, 6, 3, 'horizontal'),
    door(55, 10, 3, 'vertical'),
    // Main entry
    door(65, 16, 3, 'vertical')
  ],

  windows: [
    // North glass wall
    floorPlanWindow(20, 0, 8, 'horizontal'),
    floorPlanWindow(33, 0, 8, 'horizontal'),
    floorPlanWindow(46, 0, 8, 'horizontal'),
    // South glass wall
    floorPlanWindow(5, 42, 6, 'horizontal'),
    floorPlanWindow(28, 42, 8, 'horizontal'),
    floorPlanWindow(47, 42, 8, 'horizontal'),
    // Bedroom windows
    floorPlanWindow(0, 30, 6, 'vertical'),
    floorPlanWindow(0, 36, 5, 'vertical'),
    floorPlanWindow(65, 35, 5, 'vertical')
  ],

  columns: [
    { x: 12, y: 0 },
    { x: 12, y: 13 },
    { x: 55, y: 0 },
    { x: 55, y: 13 },
    { x: 18, y: 20 },
    { x: 39, y: 20 }
  ],

  overhangs: [
    overhang(65, 13, 10, 14, 'Covered\nEntry'),
    overhang(-8, 0, 8, 42, 'Covered\nPorch')
  ],

  entry: { x: 65, y: 16 }
};
