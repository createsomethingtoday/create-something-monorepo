/**
 * Flow Diagram Renderer
 * Renders flow diagrams (process flows, architecture diagrams)
 */

import { canonTheme } from '../canon-theme.js';
import {
  svgRoot,
  group,
  rect,
  circle,
  text,
  multilineText,
  arrowMarker,
  arrowLine,
  cloud,
  diamond,
  cylinder,
  distribute,
} from '../svg-builder.js';
import type { FlowDiagram, FlowNode, FlowEdge, RenderResult, Point } from '../types.js';

interface LayoutNode extends FlowNode {
  x: number;
  y: number;
  width: number;
  height: number;
}

const NODE_WIDTH = 140;
const NODE_HEIGHT = 60;
const NODE_SPACING_H = 80;
const NODE_SPACING_V = 60;

/**
 * Auto-layout nodes in a grid
 */
function layoutNodes(
  nodes: FlowNode[],
  direction: 'horizontal' | 'vertical',
  width: number,
  height: number,
  padding: number
): LayoutNode[] {
  const availableWidth = width - padding * 2;
  const availableHeight = height - padding * 2;

  // Calculate grid dimensions
  const nodesPerRow = direction === 'horizontal' ? nodes.length : Math.ceil(Math.sqrt(nodes.length));
  const rows = Math.ceil(nodes.length / nodesPerRow);

  const layoutNodes: LayoutNode[] = [];

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const col = direction === 'horizontal' ? i : i % nodesPerRow;
    const row = direction === 'horizontal' ? 0 : Math.floor(i / nodesPerRow);

    // Distribute positions
    const xPositions = distribute(
      padding + NODE_WIDTH / 2,
      width - padding - NODE_WIDTH / 2,
      direction === 'horizontal' ? nodes.length : nodesPerRow
    );
    const yPositions = distribute(
      padding + NODE_HEIGHT / 2 + 40, // Extra space for title
      height - padding - NODE_HEIGHT / 2,
      rows
    );

    layoutNodes.push({
      ...node,
      x: node.position?.x ?? xPositions[col],
      y: node.position?.y ?? yPositions[row],
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    });
  }

  return layoutNodes;
}

/**
 * Render a single node
 */
function renderNode(node: LayoutNode): string {
  const { x, y, width, height, label, sublabel, shape = 'rect' } = node;

  let shapeElement: string;
  const fill = canonTheme.colors.bgSubtle;
  const stroke = canonTheme.colors.borderEmphasis;
  const strokeWidth = canonTheme.shapes.strokeDefault;

  switch (shape) {
    case 'circle':
      const radius = Math.min(width, height) / 2;
      shapeElement = circle(x, y, radius, { fill, stroke, strokeWidth });
      break;
    case 'diamond':
      shapeElement = diamond(x, y, width, height, { fill, stroke, strokeWidth });
      break;
    case 'cloud':
      shapeElement = cloud(x, y, width, height, { fill, stroke, strokeWidth });
      break;
    case 'cylinder':
      shapeElement = cylinder(x, y, width, height, { fill, stroke, strokeWidth });
      break;
    case 'rect':
    default:
      shapeElement = rect(x - width / 2, y - height / 2, width, height, {
        fill,
        stroke,
        strokeWidth,
        rx: canonTheme.shapes.radiusMd,
      });
  }

  // Render label
  const labelElement = text(x, sublabel ? y - 6 : y, label, {
    fill: canonTheme.colors.fgPrimary,
    fontSize: canonTheme.typography.bodySm,
    fontWeight: canonTheme.typography.weightMedium,
    textAnchor: 'middle',
    dominantBaseline: 'middle',
  });

  // Render sublabel if present
  const sublabelElement = sublabel
    ? text(x, y + 10, sublabel, {
        fill: canonTheme.colors.fgMuted,
        fontSize: canonTheme.typography.caption,
        textAnchor: 'middle',
        dominantBaseline: 'middle',
      })
    : '';

  return group(shapeElement + labelElement + sublabelElement);
}

/**
 * Calculate edge connection points
 */
function getConnectionPoint(
  node: LayoutNode,
  direction: 'left' | 'right' | 'top' | 'bottom'
): Point {
  const hw = node.width / 2;
  const hh = node.height / 2;

  switch (direction) {
    case 'left':
      return { x: node.x - hw, y: node.y };
    case 'right':
      return { x: node.x + hw, y: node.y };
    case 'top':
      return { x: node.x, y: node.y - hh };
    case 'bottom':
      return { x: node.x, y: node.y + hh };
  }
}

/**
 * Render an edge between nodes
 */
function renderEdge(
  edge: FlowEdge,
  nodes: Map<string, LayoutNode>,
  markerId: string
): string {
  const fromNode = nodes.get(edge.from);
  const toNode = nodes.get(edge.to);

  if (!fromNode || !toNode) {
    console.warn(`Edge references unknown node: ${edge.from} -> ${edge.to}`);
    return '';
  }

  // Determine connection directions based on relative positions
  const dx = toNode.x - fromNode.x;
  const dy = toNode.y - fromNode.y;

  let fromDir: 'left' | 'right' | 'top' | 'bottom';
  let toDir: 'left' | 'right' | 'top' | 'bottom';

  if (Math.abs(dx) > Math.abs(dy)) {
    // Horizontal connection
    fromDir = dx > 0 ? 'right' : 'left';
    toDir = dx > 0 ? 'left' : 'right';
  } else {
    // Vertical connection
    fromDir = dy > 0 ? 'bottom' : 'top';
    toDir = dy > 0 ? 'top' : 'bottom';
  }

  const from = getConnectionPoint(fromNode, fromDir);
  const to = getConnectionPoint(toNode, toDir);

  // Stroke style
  let strokeDasharray: string | undefined;
  if (edge.style === 'dashed') strokeDasharray = '8,4';
  if (edge.style === 'dotted') strokeDasharray = '2,4';

  const stroke = canonTheme.colors.fgTertiary;

  // Determine marker
  const markerEnd = edge.arrow !== 'none' && edge.arrow !== 'backward' ? `url(#${markerId})` : '';
  const markerStart = edge.arrow === 'backward' || edge.arrow === 'both' ? `url(#${markerId})` : '';

  let lineElement = `<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" stroke="${stroke}" stroke-width="${canonTheme.shapes.strokeDefault}"${strokeDasharray ? ` stroke-dasharray="${strokeDasharray}"` : ''}${markerEnd ? ` marker-end="${markerEnd}"` : ''}${markerStart ? ` marker-start="${markerStart}"` : ''}/>`;

  // Add edge label if present
  if (edge.label) {
    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;
    lineElement += text(midX, midY - 8, edge.label, {
      fill: canonTheme.colors.fgMuted,
      fontSize: canonTheme.typography.caption,
      textAnchor: 'middle',
    });
  }

  return lineElement;
}

/**
 * Render a flow diagram
 */
export function renderFlow(diagram: FlowDiagram): RenderResult {
  const { config, nodes, edges, direction = 'horizontal' } = diagram;
  const { width, height, padding = canonTheme.spacing.lg, title, subtitle } = config;

  // Layout nodes
  const layoutedNodes = layoutNodes(nodes, direction, width, height, padding);
  const nodeMap = new Map(layoutedNodes.map((n) => [n.id, n]));

  // Build SVG content
  const parts: string[] = [];

  // Add arrow marker definition
  const markerId = 'arrow';
  parts.push(`<defs>${arrowMarker(markerId, { color: canonTheme.colors.fgTertiary })}</defs>`);

  // Render title
  if (title) {
    parts.push(
      text(width / 2, padding, title, {
        fill: canonTheme.colors.fgPrimary,
        fontSize: canonTheme.typography.h2,
        fontWeight: canonTheme.typography.weightSemibold,
        textAnchor: 'middle',
      })
    );
  }

  // Render subtitle
  if (subtitle) {
    parts.push(
      text(width / 2, padding + 28, subtitle, {
        fill: canonTheme.colors.fgMuted,
        fontSize: canonTheme.typography.bodySm,
        textAnchor: 'middle',
      })
    );
  }

  // Render edges (behind nodes)
  for (const edge of edges) {
    parts.push(renderEdge(edge, nodeMap, markerId));
  }

  // Render nodes
  for (const node of layoutedNodes) {
    parts.push(renderNode(node));
  }

  const svg = svgRoot(width, height, parts.join('\n'));

  return { svg, width, height };
}
