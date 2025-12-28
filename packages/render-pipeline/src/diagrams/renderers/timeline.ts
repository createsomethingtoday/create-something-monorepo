/**
 * Timeline Renderer
 * Renders timeline visualizations
 */

import { canonTheme } from '../canon-theme.js';
import { svgRoot, group, rect, circle, line, text } from '../svg-builder.js';
import type { TimelineDiagram, RenderResult } from '../types.js';

export function renderTimeline(diagram: TimelineDiagram): RenderResult {
  const { config, events, orientation = 'horizontal' } = diagram;
  const { width, height, padding = canonTheme.spacing.lg, title, subtitle } = config;

  const parts: string[] = [];

  // Title
  let titleHeight = 0;
  if (title) {
    parts.push(
      text(width / 2, padding, title, {
        fill: canonTheme.colors.fgPrimary,
        fontSize: canonTheme.typography.h2,
        fontWeight: canonTheme.typography.weightSemibold,
        textAnchor: 'middle',
      })
    );
    titleHeight += 32;
  }
  if (subtitle) {
    parts.push(
      text(width / 2, padding + titleHeight + 4, subtitle, {
        fill: canonTheme.colors.fgMuted,
        fontSize: canonTheme.typography.bodySm,
        textAnchor: 'middle',
      })
    );
    titleHeight += 24;
  }

  if (orientation === 'horizontal') {
    // Horizontal timeline
    const lineY = height / 2;
    const lineStartX = padding + 60;
    const lineEndX = width - padding - 60;

    // Main line
    parts.push(
      line(lineStartX, lineY, lineEndX, lineY, {
        stroke: canonTheme.colors.borderEmphasis,
        strokeWidth: 2,
      })
    );

    // Events
    const eventSpacing = (lineEndX - lineStartX) / (events.length - 1 || 1);

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const x = lineStartX + i * eventSpacing;
      const alternateY = i % 2 === 0; // Alternate above/below

      // Marker
      parts.push(
        circle(x, lineY, event.highlight ? 8 : 6, {
          fill: event.highlight ? canonTheme.colors.fgPrimary : canonTheme.colors.bgSubtle,
          stroke: canonTheme.colors.fgSecondary,
          strokeWidth: 2,
        })
      );

      // Connector line
      const labelY = alternateY ? lineY - 50 : lineY + 50;
      parts.push(
        line(x, lineY + (alternateY ? -10 : 10), x, labelY + (alternateY ? 30 : -30), {
          stroke: canonTheme.colors.borderDefault,
          strokeWidth: 1,
        })
      );

      // Date
      parts.push(
        text(x, labelY + (alternateY ? 0 : 0), event.date, {
          fill: canonTheme.colors.fgMuted,
          fontSize: canonTheme.typography.caption,
          textAnchor: 'middle',
          dominantBaseline: alternateY ? 'auto' : 'hanging',
        })
      );

      // Label
      parts.push(
        text(x, labelY + (alternateY ? 16 : -16), event.label, {
          fill: canonTheme.colors.fgPrimary,
          fontSize: canonTheme.typography.bodySm,
          fontWeight: canonTheme.typography.weightMedium,
          textAnchor: 'middle',
          dominantBaseline: alternateY ? 'hanging' : 'auto',
        })
      );

      // Description
      if (event.description) {
        parts.push(
          text(x, labelY + (alternateY ? 34 : -34), event.description, {
            fill: canonTheme.colors.fgTertiary,
            fontSize: canonTheme.typography.caption,
            textAnchor: 'middle',
            dominantBaseline: alternateY ? 'hanging' : 'auto',
          })
        );
      }
    }
  } else {
    // Vertical timeline
    const lineX = padding + 100;
    const lineStartY = padding + titleHeight + 40;
    const lineEndY = height - padding - 20;

    // Main line
    parts.push(
      line(lineX, lineStartY, lineX, lineEndY, {
        stroke: canonTheme.colors.borderEmphasis,
        strokeWidth: 2,
      })
    );

    // Events
    const eventSpacing = (lineEndY - lineStartY) / (events.length - 1 || 1);

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const y = lineStartY + i * eventSpacing;

      // Marker
      parts.push(
        circle(lineX, y, event.highlight ? 8 : 6, {
          fill: event.highlight ? canonTheme.colors.fgPrimary : canonTheme.colors.bgSubtle,
          stroke: canonTheme.colors.fgSecondary,
          strokeWidth: 2,
        })
      );

      // Date (left of line)
      parts.push(
        text(lineX - 20, y, event.date, {
          fill: canonTheme.colors.fgMuted,
          fontSize: canonTheme.typography.caption,
          textAnchor: 'end',
          dominantBaseline: 'middle',
        })
      );

      // Label (right of line)
      parts.push(
        text(lineX + 20, y - 8, event.label, {
          fill: canonTheme.colors.fgPrimary,
          fontSize: canonTheme.typography.bodySm,
          fontWeight: canonTheme.typography.weightMedium,
        })
      );

      // Description
      if (event.description) {
        parts.push(
          text(lineX + 20, y + 8, event.description, {
            fill: canonTheme.colors.fgTertiary,
            fontSize: canonTheme.typography.caption,
          })
        );
      }
    }
  }

  const svg = svgRoot(width, height, parts.join('\n'));
  return { svg, width, height };
}
