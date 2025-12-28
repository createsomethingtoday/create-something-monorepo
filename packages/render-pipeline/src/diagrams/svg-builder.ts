/**
 * SVG Builder
 * Fluent API for building Canon-compliant SVG elements
 */

import { canonTheme } from './canon-theme.js';
import type { Point, Size } from './types.js';

// ============================================
// SVG Element Builders
// ============================================

/**
 * Escape text for XML/SVG
 */
export function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Create SVG root element
 */
export function svgRoot(
  width: number,
  height: number,
  content: string,
  options: { viewBox?: string; background?: string } = {}
): string {
  const viewBox = options.viewBox ?? `0 0 ${width} ${height}`;
  const bg = options.background ?? canonTheme.colors.bgPure;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${viewBox}">
  <rect width="100%" height="100%" fill="${bg}"/>
  ${content}
</svg>`;
}

/**
 * Create a group element
 */
export function group(content: string, transform?: string, attrs?: Record<string, string>): string {
  const transformAttr = transform ? ` transform="${transform}"` : '';
  const extraAttrs = attrs
    ? Object.entries(attrs)
        .map(([k, v]) => ` ${k}="${v}"`)
        .join('')
    : '';
  return `<g${transformAttr}${extraAttrs}>${content}</g>`;
}

/**
 * Create a rectangle
 */
export function rect(
  x: number,
  y: number,
  width: number,
  height: number,
  options: {
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    rx?: number;
    ry?: number;
  } = {}
): string {
  const {
    fill = 'none',
    stroke = canonTheme.colors.borderDefault,
    strokeWidth = canonTheme.shapes.strokeDefault,
    rx = canonTheme.shapes.radiusMd,
    ry = rx,
  } = options;

  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;
}

/**
 * Create a circle
 */
export function circle(
  cx: number,
  cy: number,
  r: number,
  options: {
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
  } = {}
): string {
  const {
    fill = 'none',
    stroke = canonTheme.colors.borderDefault,
    strokeWidth = canonTheme.shapes.strokeDefault,
  } = options;

  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;
}

/**
 * Create an ellipse
 */
export function ellipse(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  options: {
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
  } = {}
): string {
  const {
    fill = 'none',
    stroke = canonTheme.colors.borderDefault,
    strokeWidth = canonTheme.shapes.strokeDefault,
  } = options;

  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;
}

/**
 * Create a line
 */
export function line(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  options: {
    stroke?: string;
    strokeWidth?: number;
    strokeDasharray?: string;
  } = {}
): string {
  const {
    stroke = canonTheme.colors.borderEmphasis,
    strokeWidth = canonTheme.shapes.strokeDefault,
    strokeDasharray,
  } = options;

  const dashAttr = strokeDasharray ? ` stroke-dasharray="${strokeDasharray}"` : '';
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${strokeWidth}"${dashAttr}/>`;
}

/**
 * Create a polyline (multiple connected line segments)
 */
export function polyline(
  points: Point[],
  options: {
    stroke?: string;
    strokeWidth?: number;
    fill?: string;
    strokeLinejoin?: 'round' | 'miter' | 'bevel';
  } = {}
): string {
  const {
    stroke = canonTheme.colors.fgPrimary,
    strokeWidth = canonTheme.shapes.strokeMedium,
    fill = 'none',
    strokeLinejoin = 'round',
  } = options;

  const pointsStr = points.map((p) => `${p.x},${p.y}`).join(' ');
  return `<polyline points="${pointsStr}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linejoin="${strokeLinejoin}"/>`;
}

/**
 * Create a path
 */
export function path(
  d: string,
  options: {
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    strokeLinecap?: 'round' | 'butt' | 'square';
    strokeLinejoin?: 'round' | 'miter' | 'bevel';
  } = {}
): string {
  const {
    fill = 'none',
    stroke = canonTheme.colors.fgPrimary,
    strokeWidth = canonTheme.shapes.strokeDefault,
    strokeLinecap = 'round',
    strokeLinejoin = 'round',
  } = options;

  return `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="${strokeLinecap}" stroke-linejoin="${strokeLinejoin}"/>`;
}

/**
 * Create text element
 */
export function text(
  x: number,
  y: number,
  content: string,
  options: {
    fill?: string;
    fontSize?: number;
    fontWeight?: number;
    fontFamily?: string;
    textAnchor?: 'start' | 'middle' | 'end';
    dominantBaseline?: 'auto' | 'middle' | 'hanging' | 'text-top';
  } = {}
): string {
  const {
    fill = canonTheme.colors.fgPrimary,
    fontSize = canonTheme.typography.body,
    fontWeight = canonTheme.typography.weightNormal,
    fontFamily = canonTheme.typography.fontFamily,
    textAnchor = 'start',
    dominantBaseline = 'auto',
  } = options;

  return `<text x="${x}" y="${y}" fill="${fill}" font-size="${fontSize}" font-weight="${fontWeight}" font-family="${fontFamily}" text-anchor="${textAnchor}" dominant-baseline="${dominantBaseline}">${escapeXml(content)}</text>`;
}

/**
 * Create multi-line text (tspan elements)
 */
export function multilineText(
  x: number,
  y: number,
  lines: string[],
  options: {
    fill?: string;
    fontSize?: number;
    fontWeight?: number;
    fontFamily?: string;
    textAnchor?: 'start' | 'middle' | 'end';
    lineHeight?: number;
  } = {}
): string {
  const {
    fill = canonTheme.colors.fgPrimary,
    fontSize = canonTheme.typography.body,
    fontWeight = canonTheme.typography.weightNormal,
    fontFamily = canonTheme.typography.fontFamily,
    textAnchor = 'start',
    lineHeight = fontSize * 1.4,
  } = options;

  const tspans = lines
    .map(
      (line, i) =>
        `<tspan x="${x}" dy="${i === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`
    )
    .join('');

  return `<text x="${x}" y="${y}" fill="${fill}" font-size="${fontSize}" font-weight="${fontWeight}" font-family="${fontFamily}" text-anchor="${textAnchor}">${tspans}</text>`;
}

// ============================================
// Shape Primitives for Diagrams
// ============================================

/**
 * Create an arrow marker definition
 */
export function arrowMarker(
  id: string,
  options: { color?: string; size?: number } = {}
): string {
  const { color = canonTheme.colors.fgSecondary, size = 8 } = options;

  return `<marker id="${id}" markerWidth="${size}" markerHeight="${size}" refX="${size - 1}" refY="${size / 2}" orient="auto" markerUnits="strokeWidth">
    <path d="M0,0 L0,${size} L${size},${size / 2} z" fill="${color}"/>
  </marker>`;
}

/**
 * Create a line with arrow
 */
export function arrowLine(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  markerId: string,
  options: {
    stroke?: string;
    strokeWidth?: number;
  } = {}
): string {
  const {
    stroke = canonTheme.colors.fgSecondary,
    strokeWidth = canonTheme.shapes.strokeDefault,
  } = options;

  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${strokeWidth}" marker-end="url(#${markerId})"/>`;
}

/**
 * Create a cloud shape (for flow diagrams)
 */
export function cloud(
  cx: number,
  cy: number,
  width: number,
  height: number,
  options: { fill?: string; stroke?: string; strokeWidth?: number } = {}
): string {
  const {
    fill = 'none',
    stroke = canonTheme.colors.borderDefault,
    strokeWidth = canonTheme.shapes.strokeDefault,
  } = options;

  // Simplified cloud using ellipses
  const rx = width / 2;
  const ry = height / 2;
  const bumpRx = rx * 0.4;
  const bumpRy = ry * 0.5;

  return `<g>
    <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>
    <ellipse cx="${cx - rx * 0.5}" cy="${cy - ry * 0.3}" rx="${bumpRx}" ry="${bumpRy}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>
    <ellipse cx="${cx + rx * 0.5}" cy="${cy - ry * 0.3}" rx="${bumpRx}" ry="${bumpRy}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>
  </g>`;
}

/**
 * Create a diamond shape
 */
export function diamond(
  cx: number,
  cy: number,
  width: number,
  height: number,
  options: { fill?: string; stroke?: string; strokeWidth?: number } = {}
): string {
  const {
    fill = 'none',
    stroke = canonTheme.colors.borderDefault,
    strokeWidth = canonTheme.shapes.strokeDefault,
  } = options;

  const hw = width / 2;
  const hh = height / 2;
  const d = `M${cx},${cy - hh} L${cx + hw},${cy} L${cx},${cy + hh} L${cx - hw},${cy} Z`;

  return path(d, { fill, stroke, strokeWidth });
}

/**
 * Create a cylinder shape (for databases)
 */
export function cylinder(
  cx: number,
  cy: number,
  width: number,
  height: number,
  options: { fill?: string; stroke?: string; strokeWidth?: number } = {}
): string {
  const {
    fill = 'none',
    stroke = canonTheme.colors.borderDefault,
    strokeWidth = canonTheme.shapes.strokeDefault,
  } = options;

  const rx = width / 2;
  const ry = height * 0.1; // Ellipse height for top/bottom
  const bodyHeight = height - ry * 2;

  return `<g>
    <path d="M${cx - rx},${cy - bodyHeight / 2}
             L${cx - rx},${cy + bodyHeight / 2}
             A${rx},${ry} 0 0,0 ${cx + rx},${cy + bodyHeight / 2}
             L${cx + rx},${cy - bodyHeight / 2}"
          fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>
    <ellipse cx="${cx}" cy="${cy - bodyHeight / 2}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>
  </g>`;
}

// ============================================
// Layout Helpers
// ============================================

/**
 * Calculate center point
 */
export function center(size: Size): Point {
  return { x: size.width / 2, y: size.height / 2 };
}

/**
 * Calculate bounding box for points
 */
export function boundingBox(points: Point[]): { min: Point; max: Point; size: Size } {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const min = { x: Math.min(...xs), y: Math.min(...ys) };
  const max = { x: Math.max(...xs), y: Math.max(...ys) };
  return {
    min,
    max,
    size: { width: max.x - min.x, height: max.y - min.y },
  };
}

/**
 * Distribute items evenly across a range
 */
export function distribute(start: number, end: number, count: number): number[] {
  if (count === 1) return [(start + end) / 2];
  const step = (end - start) / (count - 1);
  return Array.from({ length: count }, (_, i) => start + i * step);
}

/**
 * Calculate point on circle
 */
export function pointOnCircle(cx: number, cy: number, r: number, angleDeg: number): Point {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}
