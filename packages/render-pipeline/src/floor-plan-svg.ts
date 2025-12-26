/**
 * Floor Plan SVG Generator
 *
 * Generates SVG from FloorPlanData structure.
 * Mirrors the rendering logic from packages/space/src/lib/components/FloorPlan.svelte
 * but runs standalone without Svelte runtime.
 *
 * Supports Canon mode: white lines on black background with Inter font.
 */

/**
 * Render options for floor plan SVG
 */
export interface FloorPlanRenderOptions {
  /** Use Canon colors (white on black). Default: false for ControlNet compatibility */
  canon?: boolean;
  /** Font family. Default: 'Inter, system-ui, sans-serif' */
  fontFamily?: string;
}

export interface Zone {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'outer' | 'service' | 'public' | 'private' | 'open';
}

export interface Wall {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  exterior?: boolean;
}

export interface Room {
  x: number;
  y: number;
  name: string;
  small?: boolean;
}

export interface Column {
  x: number;
  y: number;
}

export interface Door {
  x: number;
  y: number;
  width: number;
  orientation: 'horizontal' | 'vertical';
}

export interface Window {
  x: number;
  y: number;
  width: number;
  orientation: 'horizontal' | 'vertical';
}

export interface Overhang {
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
}

export interface FloorPlanData {
  name: string;
  location?: string;
  width: number;
  depth: number;
  bedrooms?: number;
  bathrooms?: number;
  features?: string;
  zones: Zone[];
  walls: Wall[];
  rooms: Room[];
  columns?: Column[];
  doors?: Door[];
  windows?: Window[];
  overhangs?: Overhang[];
  entry?: { x: number; y: number };
}

/**
 * Generate SVG string from FloorPlanData
 * Produces high-contrast line drawings ideal for ControlNet
 *
 * @param plan - Floor plan data
 * @param options - Render options (canon mode, font family)
 */
export function generateFloorPlanSvg(
  plan: FloorPlanData,
  options: FloorPlanRenderOptions = {}
): string {
  const { canon = false, fontFamily = 'Inter, system-ui, sans-serif' } = options;

  // Canon color palette
  const colors = canon
    ? {
        bg: '#000000',
        fg: '#ffffff',
        zoneFill: '#0f0f0f',
        zoneOpenFill: '#171717'
      }
    : {
        bg: 'white',
        fg: 'black',
        zoneFill: '#e8e8e8',
        zoneOpenFill: '#f0f0f0'
      };

  const scale = 12;
  const margin = 20;

  // Calculate extent including overhangs
  const maxX = Math.max(
    plan.width,
    ...(plan.overhangs || []).map((o) => o.x + o.width)
  );
  const maxY = Math.max(
    plan.depth,
    ...(plan.overhangs || []).map((o) => o.y + o.height)
  );

  const svgWidth = maxX * scale + margin * 2 + 80;
  const svgHeight = maxY * scale + margin * 2 + 20;

  // Coordinate transforms (SVG y is inverted)
  const tx = (x: number): number => margin + x * scale;
  const ty = (y: number): number => svgHeight - margin - y * scale - 20;

  const parts: string[] = [];

  // SVG header
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}" width="${svgWidth}" height="${svgHeight}">`);

  // Background
  parts.push(`<rect x="0" y="0" width="${svgWidth}" height="${svgHeight}" fill="${colors.bg}"/>`);

  // Zones (light fills for ControlNet context)
  for (const zone of plan.zones) {
    const fill = zone.type === 'open' ? colors.zoneOpenFill : colors.zoneFill;
    parts.push(`<rect x="${tx(zone.x)}" y="${ty(zone.y + zone.height)}" width="${zone.width * scale}" height="${zone.height * scale}" fill="${fill}"/>`);
  }

  // Overhangs (dashed)
  for (const oh of plan.overhangs || []) {
    parts.push(`<rect x="${tx(oh.x)}" y="${ty(oh.y + oh.height)}" width="${oh.width * scale}" height="${oh.height * scale}" fill="none" stroke="${colors.fg}" stroke-width="0.5" stroke-dasharray="4 2"/>`);
  }

  // Walls - high contrast lines
  for (const wall of plan.walls) {
    const strokeWidth = wall.exterior ? 2.5 : 1.5;
    parts.push(`<line x1="${tx(wall.x1)}" y1="${ty(wall.y1)}" x2="${tx(wall.x2)}" y2="${ty(wall.y2)}" stroke="${colors.fg}" stroke-width="${strokeWidth}" stroke-linecap="square"/>`);
  }

  // Columns - filled squares
  for (const col of plan.columns || []) {
    parts.push(`<rect x="${tx(col.x) - 2.5}" y="${ty(col.y) - 2.5}" width="5" height="5" fill="${colors.fg}"/>`);
  }

  // Doors - tick marks
  for (const d of plan.doors || []) {
    const halfW = (d.width * scale) / 2;
    const tickLen = 3;
    if (d.orientation === 'horizontal') {
      parts.push(`<line x1="${tx(d.x) - halfW}" y1="${ty(d.y) - tickLen}" x2="${tx(d.x) - halfW}" y2="${ty(d.y) + tickLen}" stroke="${colors.fg}" stroke-width="0.5"/>`);
      parts.push(`<line x1="${tx(d.x) + halfW}" y1="${ty(d.y) - tickLen}" x2="${tx(d.x) + halfW}" y2="${ty(d.y) + tickLen}" stroke="${colors.fg}" stroke-width="0.5"/>`);
    } else {
      parts.push(`<line x1="${tx(d.x) - tickLen}" y1="${ty(d.y) - halfW}" x2="${tx(d.x) + tickLen}" y2="${ty(d.y) - halfW}" stroke="${colors.fg}" stroke-width="0.5"/>`);
      parts.push(`<line x1="${tx(d.x) - tickLen}" y1="${ty(d.y) + halfW}" x2="${tx(d.x) + tickLen}" y2="${ty(d.y) + halfW}" stroke="${colors.fg}" stroke-width="0.5"/>`);
    }
  }

  // Windows - thin lines
  for (const w of plan.windows || []) {
    const halfW = (w.width * scale) / 2;
    if (w.orientation === 'vertical') {
      parts.push(`<line x1="${tx(w.x) - 2}" y1="${ty(w.y) - halfW}" x2="${tx(w.x) - 2}" y2="${ty(w.y) + halfW}" stroke="${colors.fg}" stroke-width="1"/>`);
    } else {
      parts.push(`<line x1="${tx(w.x) - halfW}" y1="${ty(w.y) - 2}" x2="${tx(w.x) + halfW}" y2="${ty(w.y) - 2}" stroke="${colors.fg}" stroke-width="1"/>`);
    }
  }

  // Room labels
  for (const room of plan.rooms) {
    const fontSize = room.small ? 5 : 7;
    const lines = room.name.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const dy = i * 10;
      parts.push(`<text x="${tx(room.x)}" y="${ty(room.y) + dy}" font-family="${fontFamily}" font-size="${fontSize}" fill="${colors.fg}" text-anchor="middle" dominant-baseline="middle">${lines[i]}</text>`);
    }
  }

  // Entry arrow
  if (plan.entry) {
    parts.push(`<line x1="${tx(plan.entry.x + 4)}" y1="${ty(plan.entry.y)}" x2="${tx(plan.entry.x - 1)}" y2="${ty(plan.entry.y)}" stroke="${colors.fg}" stroke-width="1"/>`);
    parts.push(`<polygon points="${tx(plan.entry.x - 1)},${ty(plan.entry.y)} ${tx(plan.entry.x + 0.5)},${ty(plan.entry.y) - 3} ${tx(plan.entry.x + 0.5)},${ty(plan.entry.y) + 3}" fill="${colors.fg}"/>`);
  }

  // North arrow
  parts.push(`<line x1="${tx(plan.width + 5)}" y1="${ty(plan.depth - 4)}" x2="${tx(plan.width + 5)}" y2="${ty(plan.depth - 1)}" stroke="${colors.fg}" stroke-width="0.5"/>`);
  parts.push(`<text x="${tx(plan.width + 5)}" y="${ty(plan.depth) - 3}" font-family="${fontFamily}" font-size="6" fill="${colors.fg}" text-anchor="middle">N</text>`);

  parts.push('</svg>');

  return parts.join('\n');
}
