/**
 * Chart Renderer
 * Renders bar charts, line charts, and pie charts
 */

import { canonTheme, getDataColor } from '../canon-theme.js';
import {
  svgRoot,
  group,
  rect,
  circle,
  line,
  polyline,
  path,
  text,
} from '../svg-builder.js';
import type {
  BarChartDiagram,
  LineChartDiagram,
  PieChartDiagram,
  RenderResult,
  Point,
} from '../types.js';

// ============================================
// Bar Chart
// ============================================

export function renderBarChart(diagram: BarChartDiagram): RenderResult {
  const {
    config,
    data,
    orientation = 'vertical',
    showValues = true,
    showGrid = true,
  } = diagram;
  const { width, height, padding = canonTheme.spacing.lg, title } = config;

  const chartLeft = padding + 50; // Space for y-axis labels
  const chartRight = width - padding;
  const chartTop = padding + (title ? 40 : 0);
  const chartBottom = height - padding - 30; // Space for x-axis labels

  const chartWidth = chartRight - chartLeft;
  const chartHeight = chartBottom - chartTop;

  const maxValue = Math.max(...data.map((d) => d.value));
  const barCount = data.length;

  const parts: string[] = [];

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

  // Grid lines
  if (showGrid) {
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
      const y = chartTop + (chartHeight * i) / gridLines;
      parts.push(
        line(chartLeft, y, chartRight, y, {
          stroke: canonTheme.colors.borderDefault,
          strokeWidth: 1,
        })
      );
      // Y-axis labels
      const value = maxValue * (1 - i / gridLines);
      parts.push(
        text(chartLeft - 10, y, Math.round(value).toString(), {
          fill: canonTheme.colors.fgMuted,
          fontSize: canonTheme.typography.caption,
          textAnchor: 'end',
          dominantBaseline: 'middle',
        })
      );
    }
  }

  // Bars
  const barSpacing = 0.2; // 20% spacing
  const totalBarWidth = chartWidth / barCount;
  const barWidth = totalBarWidth * (1 - barSpacing);
  const barGap = totalBarWidth * barSpacing;

  for (let i = 0; i < data.length; i++) {
    const d = data[i];
    const barHeight = (d.value / maxValue) * chartHeight;
    const x = chartLeft + i * totalBarWidth + barGap / 2;
    const y = chartBottom - barHeight;
    const color = d.color ?? getDataColor(i);

    // Bar
    parts.push(
      rect(x, y, barWidth, barHeight, {
        fill: color,
        stroke: 'none',
        rx: canonTheme.shapes.radiusSm,
        ry: canonTheme.shapes.radiusSm,
      })
    );

    // Value label
    if (showValues) {
      parts.push(
        text(x + barWidth / 2, y - 8, d.value.toString(), {
          fill: canonTheme.colors.fgSecondary,
          fontSize: canonTheme.typography.caption,
          textAnchor: 'middle',
        })
      );
    }

    // X-axis label
    parts.push(
      text(x + barWidth / 2, chartBottom + 16, d.label, {
        fill: canonTheme.colors.fgMuted,
        fontSize: canonTheme.typography.caption,
        textAnchor: 'middle',
      })
    );
  }

  const svg = svgRoot(width, height, parts.join('\n'));
  return { svg, width, height };
}

// ============================================
// Line Chart
// ============================================

export function renderLineChart(diagram: LineChartDiagram): RenderResult {
  const {
    config,
    series,
    showPoints = true,
    showGrid = true,
    xLabel,
    yLabel,
  } = diagram;
  const { width, height, padding = canonTheme.spacing.lg, title } = config;

  const chartLeft = padding + 50;
  const chartRight = width - padding;
  const chartTop = padding + (title ? 40 : 0);
  const chartBottom = height - padding - 30;

  const chartWidth = chartRight - chartLeft;
  const chartHeight = chartBottom - chartTop;

  // Calculate data bounds
  const allYValues = series.flatMap((s) => s.data.map((d) => d.y));
  const maxY = Math.max(...allYValues);
  const minY = Math.min(0, Math.min(...allYValues));
  const yRange = maxY - minY;

  const allXValues = series.flatMap((s) => s.data.map((d) => (typeof d.x === 'number' ? d.x : 0)));
  const maxX = Math.max(...allXValues);
  const minX = Math.min(...allXValues);
  const xRange = maxX - minX || 1;

  const parts: string[] = [];

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

  // Grid
  if (showGrid) {
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
      const y = chartTop + (chartHeight * i) / gridLines;
      parts.push(
        line(chartLeft, y, chartRight, y, {
          stroke: canonTheme.colors.borderDefault,
          strokeWidth: 1,
        })
      );
      const value = maxY - (yRange * i) / gridLines;
      parts.push(
        text(chartLeft - 10, y, Math.round(value).toString(), {
          fill: canonTheme.colors.fgMuted,
          fontSize: canonTheme.typography.caption,
          textAnchor: 'end',
          dominantBaseline: 'middle',
        })
      );
    }
  }

  // Render each series
  for (let si = 0; si < series.length; si++) {
    const s = series[si];
    const color = s.color ?? getDataColor(si);

    const points: Point[] = s.data.map((d) => {
      const xVal = typeof d.x === 'number' ? d.x : 0;
      const x = chartLeft + ((xVal - minX) / xRange) * chartWidth;
      const y = chartBottom - ((d.y - minY) / yRange) * chartHeight;
      return { x, y };
    });

    // Line
    parts.push(
      polyline(points, {
        stroke: color,
        strokeWidth: canonTheme.shapes.strokeMedium,
        fill: 'none',
      })
    );

    // Points
    if (showPoints) {
      for (const p of points) {
        parts.push(
          circle(p.x, p.y, 4, {
            fill: color,
            stroke: canonTheme.colors.bgPure,
            strokeWidth: 2,
          })
        );
      }
    }
  }

  // Legend
  if (series.length > 1) {
    const legendY = chartTop - 10;
    let legendX = chartLeft;
    for (let si = 0; si < series.length; si++) {
      const s = series[si];
      const color = s.color ?? getDataColor(si);
      parts.push(
        rect(legendX, legendY - 6, 16, 3, {
          fill: color,
          stroke: 'none',
          rx: 1.5,
        })
      );
      parts.push(
        text(legendX + 22, legendY, s.name, {
          fill: canonTheme.colors.fgMuted,
          fontSize: canonTheme.typography.caption,
        })
      );
      legendX += 80;
    }
  }

  const svg = svgRoot(width, height, parts.join('\n'));
  return { svg, width, height };
}

// ============================================
// Pie Chart
// ============================================

export function renderPieChart(diagram: PieChartDiagram): RenderResult {
  const {
    config,
    data,
    donut = false,
    showLabels = true,
    showPercentages = true,
  } = diagram;
  const { width, height, padding = canonTheme.spacing.lg, title } = config;

  const centerX = width / 2;
  const centerY = height / 2 + (title ? 20 : 0);
  const radius = Math.min(width, height) / 2 - padding - 40;
  const innerRadius = donut ? radius * 0.6 : 0;

  const total = data.reduce((sum, d) => sum + d.value, 0);

  const parts: string[] = [];

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

  // Slices
  let currentAngle = -90; // Start at top

  for (let i = 0; i < data.length; i++) {
    const d = data[i];
    const sliceAngle = (d.value / total) * 360;
    const color = d.color ?? getDataColor(i);

    // Calculate arc path
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;
    const largeArc = sliceAngle > 180 ? 1 : 0;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = centerX + radius * Math.cos(startRad);
    const y1 = centerY + radius * Math.sin(startRad);
    const x2 = centerX + radius * Math.cos(endRad);
    const y2 = centerY + radius * Math.sin(endRad);

    let pathD: string;
    if (donut) {
      const ix1 = centerX + innerRadius * Math.cos(startRad);
      const iy1 = centerY + innerRadius * Math.sin(startRad);
      const ix2 = centerX + innerRadius * Math.cos(endRad);
      const iy2 = centerY + innerRadius * Math.sin(endRad);

      pathD = `M${x1},${y1} A${radius},${radius} 0 ${largeArc},1 ${x2},${y2} L${ix2},${iy2} A${innerRadius},${innerRadius} 0 ${largeArc},0 ${ix1},${iy1} Z`;
    } else {
      pathD = `M${centerX},${centerY} L${x1},${y1} A${radius},${radius} 0 ${largeArc},1 ${x2},${y2} Z`;
    }

    parts.push(
      path(pathD, {
        fill: color,
        stroke: canonTheme.colors.bgPure,
        strokeWidth: 2,
      })
    );

    // Label
    if (showLabels || showPercentages) {
      const midAngle = (startAngle + endAngle) / 2;
      const midRad = (midAngle * Math.PI) / 180;
      const labelRadius = radius + 20;
      const labelX = centerX + labelRadius * Math.cos(midRad);
      const labelY = centerY + labelRadius * Math.sin(midRad);

      const percentage = Math.round((d.value / total) * 100);
      const labelText = showLabels && showPercentages
        ? `${d.label} (${percentage}%)`
        : showLabels
          ? d.label
          : `${percentage}%`;

      parts.push(
        text(labelX, labelY, labelText, {
          fill: canonTheme.colors.fgSecondary,
          fontSize: canonTheme.typography.caption,
          textAnchor: midAngle > 90 && midAngle < 270 ? 'end' : 'start',
          dominantBaseline: 'middle',
        })
      );
    }

    currentAngle = endAngle;
  }

  const svg = svgRoot(width, height, parts.join('\n'));
  return { svg, width, height };
}
