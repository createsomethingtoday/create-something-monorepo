import { describe, expect, it } from 'vitest';

import {
  CANON_DESIGN_AUDIT_PRINCIPLES,
  buildCanonDesignAuditChecks,
  createCanonDesignAuditReport,
  renderCanonDesignAudit
} from './index.js';

describe('Canon design audit contract', () => {
  it('keeps the principle set stable for agent-facing audits', () => {
    expect(CANON_DESIGN_AUDIT_PRINCIPLES.map((principle) => principle.name)).toEqual([
      'Subtractive',
      'Honest Materials',
      'Transparent Use',
      'Mathematical Harmony'
    ]);
  });

  it('filters audit checks by section', () => {
    expect(buildCanonDesignAuditChecks('colors').map((check) => check.section)).toEqual(['colors']);
    expect(buildCanonDesignAuditChecks('all').map((check) => check.section)).toEqual([
      'colors',
      'typography',
      'spacing',
      'motion',
      'layout'
    ]);
  });

  it('uses current Canon token names in color and spacing checks', () => {
    const colors = buildCanonDesignAuditChecks('colors')[0]!;
    const spacing = buildCanonDesignAuditChecks('spacing')[0]!;

    expect(colors.items.join(' ')).toContain('--color-performance-bg-surface');
    expect(colors.items.join(' ')).toContain('--color-performance-fg-primary');
    expect(colors.items.join(' ')).not.toContain('--bg-primary');
    expect(colors.items.join(' ')).not.toContain('--fg-primary');
    expect(spacing.items.join(' ')).toContain('--space-performance-xs');
  });

  it('creates and renders the Markdown audit report consumed by MCP', () => {
    const report = createCanonDesignAuditReport({
      design: 'A dense workflow panel with proof rows and a state transition animation.',
      section: 'motion'
    });
    const rendered = renderCanonDesignAudit({
      design: report.design,
      section: report.section
    });

    expect(report.checks.map((check) => check.section)).toEqual(['motion']);
    expect(rendered).toContain('## Canon Design Audit');
    expect(rendered).toContain('**Section:** motion');
    expect(rendered).toContain('### Guiding Principles');
    expect(rendered).toContain('| Subtractive | Can anything be removed? |');
    expect(rendered).toContain('### Motion');
    expect(rendered).toContain('prefers-reduced-motion');
    expect(rendered).toContain('less reveals more');
  });
});
