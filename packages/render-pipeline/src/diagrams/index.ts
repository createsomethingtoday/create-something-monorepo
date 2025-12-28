/**
 * Diagrams Module
 * Programmatic Canon-compliant diagram generation
 *
 * @example
 * ```typescript
 * import { render, exportToPng } from './diagrams';
 *
 * const diagram = {
 *   type: 'flow',
 *   config: { width: 800, height: 400 },
 *   nodes: [
 *     { id: 'a', label: 'Input' },
 *     { id: 'b', label: 'Process' },
 *     { id: 'c', label: 'Output' }
 *   ],
 *   edges: [
 *     { from: 'a', to: 'b' },
 *     { from: 'b', to: 'c' }
 *   ]
 * };
 *
 * const result = render(diagram);
 * const png = await exportToPng(result);
 * ```
 */

// Types
export * from './types.js';

// Theme
export { canonTheme, getDataColor, withOpacity, goldenSubdivide } from './canon-theme.js';

// SVG Builder
export * from './svg-builder.js';

// Renderers
import { renderFlow } from './renderers/flow.js';
import { renderBarChart, renderLineChart, renderPieChart } from './renderers/chart.js';
import { renderTimeline } from './renderers/timeline.js';
import { renderMatrix } from './renderers/matrix.js';

export { renderFlow, renderBarChart, renderLineChart, renderPieChart, renderTimeline, renderMatrix };

// Export
export { exportToPng, saveToFile, exportBoth } from './export.js';

// Main render function
import type { Diagram, RenderResult } from './types.js';

/**
 * Render any diagram type
 */
export function render(diagram: Diagram): RenderResult {
  switch (diagram.type) {
    case 'flow':
      return renderFlow(diagram);
    case 'bar':
      return renderBarChart(diagram);
    case 'line':
      return renderLineChart(diagram);
    case 'pie':
      return renderPieChart(diagram);
    case 'timeline':
      return renderTimeline(diagram);
    case 'matrix':
      return renderMatrix(diagram);
    case 'org':
      throw new Error('Org chart renderer not yet implemented');
    default:
      throw new Error(`Unknown diagram type: ${(diagram as Diagram).type}`);
  }
}

/**
 * Convenience: Render and export to PNG in one call
 */
export async function renderToPng(
  diagram: Diagram,
  outputPath?: string,
  scale = 2
): Promise<Buffer> {
  const result = render(diagram);

  const { exportToPng, saveToFile } = await import('./export.js');

  if (outputPath) {
    await saveToFile(result, outputPath, { format: 'png', scale });
  }

  return exportToPng(result, { format: 'png', scale });
}

/**
 * Convenience: Render to SVG string
 */
export function renderToSvg(diagram: Diagram): string {
  return render(diagram).svg;
}
