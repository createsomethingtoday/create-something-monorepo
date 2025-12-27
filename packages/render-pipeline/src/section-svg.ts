/**
 * Section SVG Generator
 *
 * Generates architectural section SVGs from floor plan data.
 * Sections reveal vertical relationships: ceiling heights, room depths,
 * what's visible through openings.
 *
 * The tool recedes; dimensional truth emerges.
 */

import type { FloorPlanData, Wall, Column } from './floor-plan-svg.js';

/**
 * Height profile for a zone or room
 */
export interface HeightZone {
  /** Start position along section cut (in plan units) */
  start: number;
  /** End position along section cut (in plan units) */
  end: number;
  /** Floor height (typically 0) */
  floor: number;
  /** Ceiling height at this zone */
  ceiling: number;
  /** Optional: slope to next zone's ceiling */
  slopeTo?: number;
  /** Zone label for section annotation */
  label?: string;
}

/**
 * Opening in section (window or door)
 */
export interface SectionOpening {
  /** Position along section cut */
  position: number;
  /** Width of opening */
  width: number;
  /** Sill height (0 for doors) */
  sill: number;
  /** Head height */
  head: number;
  /** Type */
  type: 'window' | 'door' | 'glass-wall';
}

/**
 * Section cut definition
 */
export interface SectionCut {
  /** Section identifier (e.g., 'A-A', 'B-B') */
  id: string;
  /** Cut line start point [x, y] in plan coordinates */
  start: [number, number];
  /** Cut line end point [x, y] in plan coordinates */
  end: [number, number];
  /** Looking direction: 'north' | 'south' | 'east' | 'west' */
  lookingDirection: 'north' | 'south' | 'east' | 'west';
  /** Height zones along the cut */
  heightZones: HeightZone[];
  /** Openings visible in section */
  openings?: SectionOpening[];
  /** Ground line extension beyond building */
  groundExtension?: number;
  /** Roof overhang beyond wall */
  roofOverhang?: number;
}

/**
 * Complete section data for a building
 */
export interface SectionData {
  /** Building name */
  name: string;
  /** Reference to floor plan for wall detection */
  plan: FloorPlanData;
  /** Section cuts */
  sections: SectionCut[];
  /** Default floor-to-floor height */
  defaultCeilingHeight: number;
  /** Roof thickness */
  roofThickness?: number;
  /** Floor slab thickness */
  floorThickness?: number;
}

/**
 * Render options for section SVG
 */
export interface SectionRenderOptions {
  /** Use Canon colors (white on black). Default: false */
  canon?: boolean;
  /** Font family */
  fontFamily?: string;
  /** Scale factor (pixels per foot) */
  scale?: number;
  /** Show dimension lines */
  showDimensions?: boolean;
  /** Show material hatching */
  showHatching?: boolean;
}

/**
 * Check if a wall intersects a section cut line
 */
function wallIntersectsSection(
  wall: Wall,
  start: [number, number],
  end: [number, number]
): { intersects: boolean; position?: number } {
  // Section line parameters
  const [sx, sy] = start;
  const [ex, ey] = end;

  // Wall parameters
  const { x1, y1, x2, y2 } = wall;

  // Check for intersection using line-line intersection
  const denom = (x1 - x2) * (sy - ey) - (y1 - y2) * (sx - ex);
  if (Math.abs(denom) < 0.0001) return { intersects: false };

  const t = ((x1 - sx) * (sy - ey) - (y1 - sy) * (sx - ex)) / denom;
  const u = -((x1 - x2) * (y1 - sy) - (y1 - y2) * (x1 - sx)) / denom;

  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    // Calculate position along section line (0 to 1)
    const position = u;
    return { intersects: true, position };
  }

  return { intersects: false };
}

/**
 * Generate section SVG from section data
 */
export function generateSectionSvg(
  sectionData: SectionData,
  sectionId: string,
  options: SectionRenderOptions = {}
): string {
  const {
    canon = false,
    fontFamily = 'Inter, system-ui, sans-serif',
    scale = 12,
    showDimensions = true,
    showHatching = false
  } = options;

  const section = sectionData.sections.find((s) => s.id === sectionId);
  if (!section) {
    throw new Error(`Section ${sectionId} not found`);
  }

  // Canon color palette
  const colors = canon
    ? {
        bg: '#000000',
        fg: '#ffffff',
        cut: '#ffffff',
        beyond: 'rgba(255,255,255,0.4)',
        ground: '#333333',
        hatch: 'rgba(255,255,255,0.3)'
      }
    : {
        bg: 'white',
        fg: 'black',
        cut: 'black',
        beyond: 'rgba(0,0,0,0.3)',
        ground: '#cccccc',
        hatch: 'rgba(0,0,0,0.1)'
      };

  const margin = 40;
  const groundExt = section.groundExtension ?? 5;
  const roofOH = section.roofOverhang ?? 3;
  const roofThickness = sectionData.roofThickness ?? 1;
  const floorThickness = sectionData.floorThickness ?? 0.5;

  // Calculate section length
  const dx = section.end[0] - section.start[0];
  const dy = section.end[1] - section.start[1];
  const sectionLength = Math.sqrt(dx * dx + dy * dy);

  // Find max height
  const maxCeiling = Math.max(...section.heightZones.map((z) => z.ceiling));
  const maxHeight = maxCeiling + roofThickness + 2;

  // SVG dimensions
  const svgWidth = (sectionLength + groundExt * 2 + roofOH * 2) * scale + margin * 2;
  const svgHeight = maxHeight * scale + margin * 2;

  // Coordinate transforms
  const tx = (pos: number): number => margin + (groundExt + roofOH + pos) * scale;
  const ty = (height: number): number => svgHeight - margin - height * scale;

  const parts: string[] = [];

  // SVG header
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}" width="${svgWidth}" height="${svgHeight}">`
  );

  // Background
  parts.push(`<rect x="0" y="0" width="${svgWidth}" height="${svgHeight}" fill="${colors.bg}"/>`);

  // Ground line
  parts.push(
    `<line x1="${margin}" y1="${ty(0)}" x2="${svgWidth - margin}" y2="${ty(0)}" stroke="${colors.fg}" stroke-width="2"/>`
  );

  // Ground fill (below grade)
  if (showHatching) {
    parts.push(
      `<rect x="${margin}" y="${ty(0)}" width="${svgWidth - margin * 2}" height="${margin}" fill="${colors.ground}"/>`
    );
  }

  // Floor slab
  parts.push(
    `<rect x="${tx(0)}" y="${ty(0)}" width="${sectionLength * scale}" height="${floorThickness * scale}" fill="${colors.cut}" stroke="${colors.fg}" stroke-width="1"/>`
  );

  // Draw height zones (ceiling profiles)
  for (let i = 0; i < section.heightZones.length; i++) {
    const zone = section.heightZones[i];
    const nextZone = section.heightZones[i + 1];

    const x1 = tx(zone.start);
    const x2 = tx(zone.end);
    const ceilingY = ty(zone.ceiling);

    // Ceiling line
    parts.push(
      `<line x1="${x1}" y1="${ceilingY}" x2="${x2}" y2="${ceilingY}" stroke="${colors.fg}" stroke-width="2"/>`
    );

    // Roof slab above ceiling
    parts.push(
      `<rect x="${x1}" y="${ty(zone.ceiling + roofThickness)}" width="${(zone.end - zone.start) * scale}" height="${roofThickness * scale}" fill="${colors.cut}" stroke="${colors.fg}" stroke-width="1"/>`
    );

    // Connect to next zone if different height
    if (nextZone && Math.abs(nextZone.ceiling - zone.ceiling) > 0.1) {
      // Vertical transition or slope
      if (zone.slopeTo !== undefined) {
        // Sloped connection
        parts.push(
          `<line x1="${x2}" y1="${ceilingY}" x2="${tx(nextZone.start)}" y2="${ty(zone.slopeTo)}" stroke="${colors.fg}" stroke-width="2"/>`
        );
      } else {
        // Vertical step
        parts.push(
          `<line x1="${x2}" y1="${ceilingY}" x2="${x2}" y2="${ty(nextZone.ceiling)}" stroke="${colors.fg}" stroke-width="2"/>`
        );
      }
    }

    // Zone label
    if (zone.label && showDimensions) {
      const labelX = (x1 + x2) / 2;
      const labelY = ty(zone.ceiling / 2);
      parts.push(
        `<text x="${labelX}" y="${labelY}" font-family="${fontFamily}" font-size="8" fill="${colors.fg}" text-anchor="middle" dominant-baseline="middle">${zone.label}</text>`
      );
    }

    // Height dimension
    if (showDimensions) {
      const dimX = x1 + 10;
      parts.push(
        `<line x1="${dimX}" y1="${ty(0)}" x2="${dimX}" y2="${ceilingY}" stroke="${colors.fg}" stroke-width="0.5" stroke-dasharray="2 2"/>`
      );
      parts.push(
        `<text x="${dimX + 5}" y="${ty(zone.ceiling / 2)}" font-family="${fontFamily}" font-size="6" fill="${colors.fg}" dominant-baseline="middle">${zone.ceiling}'</text>`
      );
    }
  }

  // End walls (left and right building edges)
  const firstZone = section.heightZones[0];
  const lastZone = section.heightZones[section.heightZones.length - 1];

  // Left wall
  parts.push(
    `<line x1="${tx(0)}" y1="${ty(0)}" x2="${tx(0)}" y2="${ty(firstZone.ceiling)}" stroke="${colors.fg}" stroke-width="2.5"/>`
  );

  // Right wall
  parts.push(
    `<line x1="${tx(sectionLength)}" y1="${ty(0)}" x2="${tx(sectionLength)}" y2="${ty(lastZone.ceiling)}" stroke="${colors.fg}" stroke-width="2.5"/>`
  );

  // Roof overhangs
  parts.push(
    `<line x1="${tx(-roofOH)}" y1="${ty(firstZone.ceiling + roofThickness)}" x2="${tx(0)}" y2="${ty(firstZone.ceiling + roofThickness)}" stroke="${colors.fg}" stroke-width="1" stroke-dasharray="4 2"/>`
  );
  parts.push(
    `<line x1="${tx(sectionLength)}" y1="${ty(lastZone.ceiling + roofThickness)}" x2="${tx(sectionLength + roofOH)}" y2="${ty(lastZone.ceiling + roofThickness)}" stroke="${colors.fg}" stroke-width="1" stroke-dasharray="4 2"/>`
  );

  // Openings
  for (const opening of section.openings || []) {
    const x = tx(opening.position);
    const halfW = (opening.width * scale) / 2;
    const sillY = ty(opening.sill);
    const headY = ty(opening.head);

    if (opening.type === 'glass-wall') {
      // Full-height glass - thin line
      parts.push(
        `<line x1="${x - halfW}" y1="${sillY}" x2="${x - halfW}" y2="${headY}" stroke="${colors.fg}" stroke-width="0.5"/>`
      );
      parts.push(
        `<line x1="${x + halfW}" y1="${sillY}" x2="${x + halfW}" y2="${headY}" stroke="${colors.fg}" stroke-width="0.5"/>`
      );
    } else if (opening.type === 'window') {
      // Window with sill and head
      parts.push(
        `<rect x="${x - halfW}" y="${headY}" width="${opening.width * scale}" height="${(opening.head - opening.sill) * scale}" fill="none" stroke="${colors.fg}" stroke-width="1"/>`
      );
    } else {
      // Door opening
      parts.push(
        `<line x1="${x - halfW}" y1="${sillY}" x2="${x - halfW}" y2="${headY}" stroke="${colors.beyond}" stroke-width="0.5"/>`
      );
      parts.push(
        `<line x1="${x + halfW}" y1="${sillY}" x2="${x + halfW}" y2="${headY}" stroke="${colors.beyond}" stroke-width="0.5"/>`
      );
    }
  }

  // Find walls that intersect section cut and draw them
  for (const wall of sectionData.plan.walls) {
    const intersection = wallIntersectsSection(wall, section.start, section.end);
    if (intersection.intersects && intersection.position !== undefined) {
      const pos = intersection.position * sectionLength;
      // Find ceiling height at this position
      const zone = section.heightZones.find((z) => pos >= z.start && pos <= z.end);
      const height = zone?.ceiling ?? sectionData.defaultCeilingHeight;

      // Draw wall in section (thick line for cut walls)
      const strokeWidth = wall.exterior ? 3 : 2;
      parts.push(
        `<line x1="${tx(pos)}" y1="${ty(0)}" x2="${tx(pos)}" y2="${ty(height)}" stroke="${colors.cut}" stroke-width="${strokeWidth}"/>`
      );
    }
  }

  // Find columns that are on section line
  for (const col of sectionData.plan.columns || []) {
    // Check if column is on or near section line
    const colToStart = Math.sqrt(
      Math.pow(col.x - section.start[0], 2) + Math.pow(col.y - section.start[1], 2)
    );
    const colToEnd = Math.sqrt(
      Math.pow(col.x - section.end[0], 2) + Math.pow(col.y - section.end[1], 2)
    );
    const lineLength = sectionLength;

    // If column is within 1 unit of section line, draw it
    if (Math.abs(colToStart + colToEnd - lineLength) < 1) {
      const pos = colToStart;
      const zone = section.heightZones.find((z) => pos >= z.start && pos <= z.end);
      const height = zone?.ceiling ?? sectionData.defaultCeilingHeight;

      // Draw column as filled rectangle
      parts.push(
        `<rect x="${tx(pos) - 3}" y="${ty(height)}" width="6" height="${height * scale}" fill="${colors.fg}"/>`
      );
    }
  }

  // Section title
  parts.push(
    `<text x="${margin}" y="${margin - 15}" font-family="${fontFamily}" font-size="10" font-weight="bold" fill="${colors.fg}">SECTION ${section.id}</text>`
  );

  // Looking direction indicator
  const lookingText =
    section.lookingDirection === 'north'
      ? 'Looking North ↑'
      : section.lookingDirection === 'south'
        ? 'Looking South ↓'
        : section.lookingDirection === 'east'
          ? 'Looking East →'
          : 'Looking West ←';
  parts.push(
    `<text x="${svgWidth - margin}" y="${margin - 15}" font-family="${fontFamily}" font-size="8" fill="${colors.fg}" text-anchor="end">${lookingText}</text>`
  );

  // Scale bar
  if (showDimensions) {
    const scaleBarY = svgHeight - margin / 2;
    const scaleBarLen = 10 * scale; // 10 feet
    parts.push(
      `<line x1="${margin}" y1="${scaleBarY}" x2="${margin + scaleBarLen}" y2="${scaleBarY}" stroke="${colors.fg}" stroke-width="1"/>`
    );
    parts.push(
      `<line x1="${margin}" y1="${scaleBarY - 3}" x2="${margin}" y2="${scaleBarY + 3}" stroke="${colors.fg}" stroke-width="1"/>`
    );
    parts.push(
      `<line x1="${margin + scaleBarLen}" y1="${scaleBarY - 3}" x2="${margin + scaleBarLen}" y2="${scaleBarY + 3}" stroke="${colors.fg}" stroke-width="1"/>`
    );
    parts.push(
      `<text x="${margin + scaleBarLen / 2}" y="${scaleBarY - 5}" font-family="${fontFamily}" font-size="6" fill="${colors.fg}" text-anchor="middle">10'</text>`
    );
  }

  parts.push('</svg>');

  return parts.join('\n');
}

/**
 * Generate room section SVG for a specific room
 * Creates a vertical slice through the room showing ceiling height and openings
 */
export function generateRoomSectionSvg(
  sectionData: SectionData,
  roomName: string,
  options: SectionRenderOptions = {}
): string {
  // Find room in plan
  const room = sectionData.plan.rooms.find(
    (r) => r.name.toLowerCase().includes(roomName.toLowerCase())
  );
  if (!room) {
    throw new Error(`Room ${roomName} not found`);
  }

  // Create a simple section through the room center
  // This is a simplified version for per-room conditioning
  const { canon = false, fontFamily = 'Inter, system-ui, sans-serif', scale = 15 } = options;

  const colors = canon
    ? { bg: '#000000', fg: '#ffffff' }
    : { bg: 'white', fg: 'black' };

  // Estimate room bounds and height
  const roomWidth = 15; // Approximate
  const ceilingHeight = sectionData.defaultCeilingHeight;
  const margin = 30;

  const svgWidth = roomWidth * scale + margin * 2;
  const svgHeight = (ceilingHeight + 2) * scale + margin * 2;

  const tx = (x: number): number => margin + x * scale;
  const ty = (h: number): number => svgHeight - margin - h * scale;

  const parts: string[] = [];

  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}" width="${svgWidth}" height="${svgHeight}">`
  );
  parts.push(`<rect x="0" y="0" width="${svgWidth}" height="${svgHeight}" fill="${colors.bg}"/>`);

  // Floor
  parts.push(
    `<line x1="${margin}" y1="${ty(0)}" x2="${svgWidth - margin}" y2="${ty(0)}" stroke="${colors.fg}" stroke-width="2"/>`
  );

  // Ceiling
  parts.push(
    `<line x1="${margin}" y1="${ty(ceilingHeight)}" x2="${svgWidth - margin}" y2="${ty(ceilingHeight)}" stroke="${colors.fg}" stroke-width="2"/>`
  );

  // Walls
  parts.push(
    `<line x1="${margin}" y1="${ty(0)}" x2="${margin}" y2="${ty(ceilingHeight)}" stroke="${colors.fg}" stroke-width="2.5"/>`
  );
  parts.push(
    `<line x1="${svgWidth - margin}" y1="${ty(0)}" x2="${svgWidth - margin}" y2="${ty(ceilingHeight)}" stroke="${colors.fg}" stroke-width="2.5"/>`
  );

  // Room label
  parts.push(
    `<text x="${svgWidth / 2}" y="${ty(ceilingHeight / 2)}" font-family="${fontFamily}" font-size="10" fill="${colors.fg}" text-anchor="middle" dominant-baseline="middle">${room.name.replace('\n', ' ')}</text>`
  );

  // Height dimension
  parts.push(
    `<text x="${margin + 10}" y="${ty(ceilingHeight / 2)}" font-family="${fontFamily}" font-size="8" fill="${colors.fg}" dominant-baseline="middle">${ceilingHeight}'</text>`
  );

  parts.push('</svg>');

  return parts.join('\n');
}
