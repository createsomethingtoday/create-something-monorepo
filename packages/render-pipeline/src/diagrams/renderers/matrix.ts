/**
 * Matrix Renderer
 * Renders comparison matrices and tables
 */

import { canonTheme } from '../canon-theme.js';
import { svgRoot, rect, line, text, circle } from '../svg-builder.js';
import type { MatrixDiagram, MatrixCell, RenderResult } from '../types.js';

export function renderMatrix(diagram: MatrixDiagram): RenderResult {
  const { config, rowHeaders, columnHeaders, cells, caption } = diagram;
  const { width, height, padding = canonTheme.spacing.lg, title } = config;

  const parts: string[] = [];

  // Calculate dimensions
  const rows = rowHeaders.length;
  const cols = columnHeaders.length;

  const headerRowHeight = 40;
  const headerColWidth = 120;
  const cellWidth = (width - padding * 2 - headerColWidth) / cols;
  const cellHeight = (height - padding * 2 - headerRowHeight - (title ? 50 : 0) - (caption ? 30 : 0)) / rows;

  const tableTop = padding + (title ? 50 : 0);
  const tableLeft = padding;

  // Title
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

  // Header row background
  parts.push(
    rect(tableLeft + headerColWidth, tableTop, cellWidth * cols, headerRowHeight, {
      fill: canonTheme.colors.bgSubtle,
      stroke: 'none',
      rx: 0,
    })
  );

  // Column headers
  for (let c = 0; c < cols; c++) {
    const x = tableLeft + headerColWidth + c * cellWidth + cellWidth / 2;
    const y = tableTop + headerRowHeight / 2;
    parts.push(
      text(x, y, columnHeaders[c], {
        fill: canonTheme.colors.fgSecondary,
        fontSize: canonTheme.typography.bodySm,
        fontWeight: canonTheme.typography.weightMedium,
        textAnchor: 'middle',
        dominantBaseline: 'middle',
      })
    );
  }

  // Row headers and cells
  for (let r = 0; r < rows; r++) {
    const rowY = tableTop + headerRowHeight + r * cellHeight;

    // Row header
    parts.push(
      text(tableLeft + headerColWidth - 10, rowY + cellHeight / 2, rowHeaders[r], {
        fill: canonTheme.colors.fgSecondary,
        fontSize: canonTheme.typography.bodySm,
        fontWeight: canonTheme.typography.weightMedium,
        textAnchor: 'end',
        dominantBaseline: 'middle',
      })
    );

    // Cells
    for (let c = 0; c < cols; c++) {
      const cell = cells[r]?.[c];
      if (!cell) continue;

      const cellX = tableLeft + headerColWidth + c * cellWidth;
      const cellY = rowY;
      const cellCenterX = cellX + cellWidth / 2;
      const cellCenterY = cellY + cellHeight / 2;

      // Cell border
      parts.push(
        rect(cellX, cellY, cellWidth, cellHeight, {
          fill: cell.highlight ? canonTheme.colors.bgSubtle : 'none',
          stroke: canonTheme.colors.borderDefault,
          strokeWidth: 1,
          rx: 0,
        })
      );

      // Cell content
      if (typeof cell.value === 'boolean') {
        // Render checkmark or X
        if (cell.value) {
          // Checkmark
          parts.push(
            `<path d="M${cellCenterX - 8},${cellCenterY} l4,4 l8,-8" fill="none" stroke="${canonTheme.colors.success}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`
          );
        } else {
          // X mark
          parts.push(
            `<path d="M${cellCenterX - 6},${cellCenterY - 6} l12,12 M${cellCenterX + 6},${cellCenterY - 6} l-12,12" fill="none" stroke="${canonTheme.colors.fgMuted}" stroke-width="2" stroke-linecap="round"/>`
          );
        }
      } else {
        // Text value
        parts.push(
          text(cellCenterX, cellCenterY, String(cell.value), {
            fill: cell.highlight ? canonTheme.colors.fgPrimary : canonTheme.colors.fgSecondary,
            fontSize: canonTheme.typography.bodySm,
            textAnchor: 'middle',
            dominantBaseline: 'middle',
          })
        );
      }
    }

    // Row divider
    if (r < rows - 1) {
      parts.push(
        line(tableLeft + headerColWidth, rowY + cellHeight, tableLeft + headerColWidth + cellWidth * cols, rowY + cellHeight, {
          stroke: canonTheme.colors.borderDefault,
          strokeWidth: 1,
        })
      );
    }
  }

  // Caption
  if (caption) {
    parts.push(
      text(width / 2, height - padding, caption, {
        fill: canonTheme.colors.fgMuted,
        fontSize: canonTheme.typography.caption,
        textAnchor: 'middle',
      })
    );
  }

  const svg = svgRoot(width, height, parts.join('\n'));
  return { svg, width, height };
}
