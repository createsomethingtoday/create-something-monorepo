/**
 * SVG to PNG Download Endpoint
 *
 * Generates a Canon-compliant PNG (white on black) from the Threshold Dwelling floor plan.
 * Uses @resvg/resvg-wasm for Cloudflare Workers compatibility.
 */

import type { RequestHandler } from './$types';
import { Resvg, initWasm } from '@resvg/resvg-wasm';

let wasmInitialized = false;

async function ensureWasmInitialized(origin: string): Promise<void> {
  if (wasmInitialized) return;

  // Fetch WASM from our own static folder (bundled with deployment)
  const wasmUrl = `${origin}/wasm/resvg.wasm`;
  const wasmResponse = await fetch(wasmUrl);

  if (!wasmResponse.ok) {
    throw new Error(`Failed to fetch WASM: ${wasmResponse.status} ${wasmResponse.statusText}`);
  }

  const wasmModule = await wasmResponse.arrayBuffer();
  await initWasm(wasmModule);
  wasmInitialized = true;
}

// Floor plan data (matches threshold-dwelling page)
const pavilion = {
  name: 'Miesian Family Pavilion',
  location: 'Johnson Residence · Grandview, Texas',
  width: 65,
  depth: 42,
  bedrooms: 3,
  bathrooms: 4,
  features: 'In-Law Suite',

  zones: [
    { x: 0, y: 0, width: 12, height: 4, type: 'service' },
    { x: 0, y: 4, width: 12, height: 9, type: 'service' },
    { x: 55, y: 0, width: 10, height: 6, type: 'service' },
    { x: 55, y: 6, width: 10, height: 7, type: 'public' },
    { x: 0, y: 13, width: 12, height: 7, type: 'public' },
    { x: 12, y: 13, width: 43, height: 7, type: 'public' },
    { x: 0, y: 20, width: 18, height: 22, type: 'private' },
    { x: 18, y: 20, width: 21, height: 22, type: 'private' },
    { x: 39, y: 20, width: 26, height: 22, type: 'private' },
    { x: 12, y: 0, width: 43, height: 13, type: 'open' }
  ],

  walls: [
    { x1: 0, y1: 42, x2: 65, y2: 42, exterior: true },
    { x1: 0, y1: 0, x2: 65, y2: 0, exterior: true },
    { x1: 0, y1: 0, x2: 0, y2: 42, exterior: true },
    { x1: 65, y1: 0, x2: 65, y2: 1.5, exterior: true },
    { x1: 65, y1: 4.5, x2: 65, y2: 14.5, exterior: true },
    { x1: 65, y1: 17.5, x2: 65, y2: 42, exterior: true },
    { x1: 0, y1: 20, x2: 3.5, y2: 20 },
    { x1: 6.5, y1: 20, x2: 10, y2: 20 },
    { x1: 10, y1: 20, x2: 18, y2: 20 },
    { x1: 10, y1: 20, x2: 10, y2: 23.5 },
    { x1: 10, y1: 26.5, x2: 10, y2: 28 },
    { x1: 10, y1: 28, x2: 18, y2: 28 },
    { x1: 18, y1: 20, x2: 18, y2: 28 },
    { x1: 18, y1: 28, x2: 18, y2: 42 },
    { x1: 18, y1: 20, x2: 20.5, y2: 20 },
    { x1: 23.5, y1: 20, x2: 39, y2: 20 },
    { x1: 18, y1: 27, x2: 20.5, y2: 27 },
    { x1: 23.5, y1: 27, x2: 30.5, y2: 27 },
    { x1: 33.5, y1: 27, x2: 39, y2: 27 },
    { x1: 26, y1: 20, x2: 26, y2: 27 },
    { x1: 39, y1: 20, x2: 39, y2: 27 },
    { x1: 39, y1: 27, x2: 39, y2: 42 },
    { x1: 39, y1: 20, x2: 45.5, y2: 20 },
    { x1: 48.5, y1: 20, x2: 55, y2: 20 },
    { x1: 55, y1: 20, x2: 55, y2: 22.5 },
    { x1: 55, y1: 25.5, x2: 55, y2: 28 },
    { x1: 55, y1: 28, x2: 65, y2: 28 },
    { x1: 55, y1: 20, x2: 65, y2: 20 },
    { x1: 0, y1: 4, x2: 7.5, y2: 4 },
    { x1: 10.5, y1: 4, x2: 12, y2: 4 },
    { x1: 0, y1: 13, x2: 4.5, y2: 13 },
    { x1: 7.5, y1: 13, x2: 12, y2: 13 },
    { x1: 12, y1: 0, x2: 12, y2: 13 },
    { x1: 55, y1: 0, x2: 55, y2: 8.5 },
    { x1: 55, y1: 11.5, x2: 55, y2: 13 },
    { x1: 55, y1: 6, x2: 56.5, y2: 6 },
    { x1: 59.5, y1: 6, x2: 65, y2: 6 },
    { x1: 55, y1: 13, x2: 65, y2: 13 }
  ],

  rooms: [
    { x: 9, y: 35, name: "Daughter's\nBedroom" },
    { x: 14, y: 24, name: 'Bath', small: true },
    { x: 28.5, y: 35, name: 'Primary\nBedroom' },
    { x: 22, y: 23.5, name: 'Closet', small: true },
    { x: 32.5, y: 23.5, name: 'Bath', small: true },
    { x: 47, y: 32, name: 'In-Law\nSuite' },
    { x: 60, y: 24, name: 'Bath', small: true },
    { x: 60, y: 35, name: 'Sitting', small: true },
    { x: 6, y: 2, name: 'Laundry', small: true },
    { x: 6, y: 8.5, name: 'Pantry\nSit-in' },
    { x: 60, y: 3, name: 'Dog\nUtility', small: true },
    { x: 60, y: 9.5, name: 'Guest\nBath', small: true },
    { x: 20, y: 6.5, name: 'Kitchen' },
    { x: 33, y: 6.5, name: 'Dining' },
    { x: 46, y: 6.5, name: 'Living' }
  ],

  doors: [
    { x: 9, y: 4, width: 3, orientation: 'horizontal' },
    { x: 6, y: 13, width: 3, orientation: 'horizontal' },
    { x: 5, y: 20, width: 3, orientation: 'horizontal' },
    { x: 10, y: 25, width: 3, orientation: 'vertical' },
    { x: 22, y: 27, width: 3, orientation: 'horizontal' },
    { x: 22, y: 20, width: 3, orientation: 'horizontal' },
    { x: 32, y: 27, width: 3, orientation: 'horizontal' },
    { x: 47, y: 20, width: 3, orientation: 'horizontal' },
    { x: 55, y: 24, width: 3, orientation: 'vertical' },
    { x: 58, y: 6, width: 3, orientation: 'horizontal' },
    { x: 55, y: 10, width: 3, orientation: 'vertical' },
    { x: 65, y: 3, width: 3, orientation: 'vertical' },
    { x: 65, y: 16, width: 3, orientation: 'vertical' }
  ],

  windows: [
    { x: 0, y: 16.5, width: 4, orientation: 'vertical' },
    { x: 12, y: 20, width: 6, orientation: 'horizontal' },
    { x: 28, y: 20, width: 8, orientation: 'horizontal' },
    { x: 38, y: 20, width: 5, orientation: 'horizontal' },
    { x: 54, y: 20, width: 6, orientation: 'horizontal' },
    { x: 20, y: 42, width: 8, orientation: 'horizontal' },
    { x: 35, y: 42, width: 10, orientation: 'horizontal' },
    { x: 50, y: 42, width: 5, orientation: 'horizontal' },
    { x: 65, y: 30, width: 6, orientation: 'vertical' }
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
    { x: 65, y: 0, width: 10, height: 6, label: 'Dog\nKennel' },
    { x: 65, y: 6, width: 10, height: 7, label: 'Carport' },
    { x: 65, y: 13, width: 8, height: 14, label: 'Covered\nEntry' }
  ],

  entry: { x: 73, y: 16 }
};

/**
 * Generate Canon-styled SVG (white on black)
 */
function generateCanonFloorPlanSvg(): string {
  // Use system fonts that are widely available
  const fontFamily = 'system-ui, -apple-system, sans-serif';

  // Canon colors
  const colors = {
    bg: '#000000',
    fg: '#ffffff',
    zoneFill: '#0f0f0f',
    zoneOpenFill: '#171717',
    zoneService: '#0a0a0a',
    zonePublic: '#121212',
    zonePrivate: '#0d0d0d'
  };

  const scale = 12;
  const margin = 20;

  const maxX = Math.max(
    pavilion.width,
    ...pavilion.overhangs.map((o) => o.x + o.width)
  );
  const maxY = Math.max(
    pavilion.depth,
    ...pavilion.overhangs.map((o) => o.y + o.height)
  );

  const svgWidth = maxX * scale + margin * 2 + 80;
  const svgHeight = maxY * scale + margin * 2 + 20;

  const tx = (x: number): number => margin + x * scale;
  const ty = (y: number): number => svgHeight - margin - y * scale - 20;

  const parts: string[] = [];

  // SVG header
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}" width="${svgWidth}" height="${svgHeight}">`);

  // Background
  parts.push(`<rect x="0" y="0" width="${svgWidth}" height="${svgHeight}" fill="${colors.bg}"/>`);

  // Zones
  for (const zone of pavilion.zones) {
    let fill = colors.zoneFill;
    if (zone.type === 'open') fill = colors.zoneOpenFill;
    else if (zone.type === 'service') fill = colors.zoneService;
    else if (zone.type === 'public') fill = colors.zonePublic;
    else if (zone.type === 'private') fill = colors.zonePrivate;
    parts.push(`<rect x="${tx(zone.x)}" y="${ty(zone.y + zone.height)}" width="${zone.width * scale}" height="${zone.height * scale}" fill="${fill}"/>`);
  }

  // Overhangs
  for (const oh of pavilion.overhangs) {
    parts.push(`<rect x="${tx(oh.x)}" y="${ty(oh.y + oh.height)}" width="${oh.width * scale}" height="${oh.height * scale}" fill="none" stroke="${colors.fg}" stroke-width="0.5" stroke-dasharray="4 2"/>`);
    if (oh.label) {
      const lines = oh.label.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const dy = i * 10;
        parts.push(`<text x="${tx(oh.x + oh.width / 2)}" y="${ty(oh.y + oh.height / 2) + dy}" font-family="${fontFamily}" font-size="5" fill="rgba(255,255,255,0.5)" text-anchor="middle" dominant-baseline="middle">${lines[i]}</text>`);
      }
    }
  }

  // Walls
  for (const wall of pavilion.walls) {
    const strokeWidth = wall.exterior ? 2.5 : 1.5;
    parts.push(`<line x1="${tx(wall.x1)}" y1="${ty(wall.y1)}" x2="${tx(wall.x2)}" y2="${ty(wall.y2)}" stroke="${colors.fg}" stroke-width="${strokeWidth}" stroke-linecap="square"/>`);
  }

  // Columns
  for (const col of pavilion.columns) {
    parts.push(`<rect x="${tx(col.x) - 2.5}" y="${ty(col.y) - 2.5}" width="5" height="5" fill="${colors.fg}"/>`);
  }

  // Doors
  for (const d of pavilion.doors) {
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

  // Windows
  for (const w of pavilion.windows) {
    const halfW = (w.width * scale) / 2;
    if (w.orientation === 'vertical') {
      parts.push(`<line x1="${tx(w.x) - 2}" y1="${ty(w.y) - halfW}" x2="${tx(w.x) - 2}" y2="${ty(w.y) + halfW}" stroke="${colors.fg}" stroke-width="1"/>`);
    } else {
      parts.push(`<line x1="${tx(w.x) - halfW}" y1="${ty(w.y) - 2}" x2="${tx(w.x) + halfW}" y2="${ty(w.y) - 2}" stroke="${colors.fg}" stroke-width="1"/>`);
    }
  }

  // Room labels
  for (const room of pavilion.rooms) {
    const fontSize = room.small ? 5 : 7;
    const lines = room.name.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const dy = i * 10;
      parts.push(`<text x="${tx(room.x)}" y="${ty(room.y) + dy}" font-family="${fontFamily}" font-size="${fontSize}" fill="${colors.fg}" text-anchor="middle" dominant-baseline="middle">${lines[i]}</text>`);
    }
  }

  // Entry arrow
  if (pavilion.entry) {
    parts.push(`<line x1="${tx(pavilion.entry.x + 4)}" y1="${ty(pavilion.entry.y)}" x2="${tx(pavilion.entry.x - 1)}" y2="${ty(pavilion.entry.y)}" stroke="${colors.fg}" stroke-width="1"/>`);
    parts.push(`<polygon points="${tx(pavilion.entry.x - 1)},${ty(pavilion.entry.y)} ${tx(pavilion.entry.x + 0.5)},${ty(pavilion.entry.y) - 3} ${tx(pavilion.entry.x + 0.5)},${ty(pavilion.entry.y) + 3}" fill="${colors.fg}"/>`);
  }

  // North arrow
  parts.push(`<line x1="${tx(pavilion.width + 5)}" y1="${ty(pavilion.depth - 4)}" x2="${tx(pavilion.width + 5)}" y2="${ty(pavilion.depth - 1)}" stroke="${colors.fg}" stroke-width="0.5"/>`);
  parts.push(`<text x="${tx(pavilion.width + 5)}" y="${ty(pavilion.depth) - 3}" font-family="${fontFamily}" font-size="6" fill="${colors.fg}" text-anchor="middle">N</text>`);

  // Title block
  parts.push(`<text x="${margin}" y="${margin - 5}" font-family="${fontFamily}" font-size="8" fill="${colors.fg}" font-weight="500">${pavilion.name}</text>`);
  parts.push(`<text x="${margin}" y="${margin - 15}" font-family="${fontFamily}" font-size="6" fill="rgba(255,255,255,0.5)">SCALE: 1/4″ = 1′-0″</text>`);

  parts.push('</svg>');

  return parts.join('\n');
}

export const GET: RequestHandler = async ({ url }) => {
  try {
    const width = parseInt(url.searchParams.get('width') || '1024');

    // Initialize WASM if not already done
    await ensureWasmInitialized(url.origin);

    // Generate Canon-styled SVG
    const svg = generateCanonFloorPlanSvg();

    // Convert to PNG using WASM
    const resvg = new Resvg(svg, {
      fitTo: { mode: 'width', value: width }
    });

    const pngData = resvg.render();
    const pngBuffer = pngData.asPng();

    // Create a new Uint8Array copy for Response compatibility
    const responseBuffer = new Uint8Array(pngBuffer);

    return new Response(responseBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': 'attachment; filename="threshold-dwelling-floorplan.png"',
        'Cache-Control': 'public, max-age=31536000'
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const stack = error instanceof Error ? error.stack : '';
    return new Response(JSON.stringify({ error: message, stack }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
