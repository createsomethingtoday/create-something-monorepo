export type CanonDesignAuditSection = 'colors' | 'typography' | 'spacing' | 'motion' | 'layout';

export type CanonDesignAuditSectionInput = CanonDesignAuditSection | 'all';

export type CanonDesignAuditPrinciple = {
  name: string;
  question: string;
  guidance: string;
};

export type CanonDesignAuditCheckGroup = {
  area: string;
  section: CanonDesignAuditSection;
  items: string[];
};

export type CanonDesignAuditReport = {
  design: string;
  section: CanonDesignAuditSectionInput;
  principles: CanonDesignAuditPrinciple[];
  checks: CanonDesignAuditCheckGroup[];
};

export type CanonDesignAuditRenderOptions = {
  design: string;
  section?: CanonDesignAuditSectionInput;
};

export const CANON_DESIGN_AUDIT_SECTIONS: readonly CanonDesignAuditSectionInput[] = [
  'colors',
  'typography',
  'spacing',
  'motion',
  'layout',
  'all'
] as const;

export const CANON_DESIGN_AUDIT_PRINCIPLES: CanonDesignAuditPrinciple[] = [
  {
    name: 'Subtractive',
    question: 'Can anything be removed?',
    guidance: 'Every element must earn its existence.'
  },
  {
    name: 'Honest Materials',
    question: 'Are tokens used as intended?',
    guidance: 'Canon tokens encode decisions; respect their purpose.'
  },
  {
    name: 'Transparent Use',
    question: 'Does the interface recede?',
    guidance: 'Zuhandenheit: the design disappears in use.'
  },
  {
    name: 'Mathematical Harmony',
    question: 'Does spacing follow the scale?',
    guidance: 'Golden-ratio and modular scales create harmony.'
  }
];

export const CANON_DESIGN_AUDIT_CHECKS: CanonDesignAuditCheckGroup[] = [
  {
    area: 'Colors',
    section: 'colors',
    items: [
      'Backgrounds use Canon tokens such as --color-bg-pure, --color-bg-base, --color-bg-surface, --color-bg-elevated, or Clear surface tokens?',
      'Text uses Canon foreground tokens such as --color-fg-primary, --color-fg-secondary, --color-fg-tertiary, --color-fg-muted, or Clear text tokens?',
      'Semantic colors are reserved for success, error, warning, info, run, wait, stop, proof, or review states?',
      'Hierarchy comes from tokenized contrast, opacity, type, and spacing instead of one-off color values?',
      'WCAG AA contrast is maintained: 4.5:1 for body text and 3:1 for large text or non-text UI?'
    ]
  },
  {
    area: 'Typography',
    section: 'typography',
    items: [
      'Type uses Canon type tokens or the Canon stack instead of a local font fork?',
      'Font sizes follow Canon typography tokens or the documented modular scale?',
      'Line heights preserve readable scanning for dense operational surfaces?',
      'Heading hierarchy is semantic, ordered, and useful for navigation?',
      'Body copy remains readable at the surface density: 16px base or an explicit compact-surface exception?'
    ]
  },
  {
    area: 'Spacing',
    section: 'spacing',
    items: [
      'Component internals use Canon spacing tokens such as --space-xs through --space-xl?',
      'Page and tool surfaces use stable layout primitives, grid tracks, gaps, and responsive constraints instead of manual offsets?',
      'Large spacing tokens are reserved for true sections, not dense panels, sidebars, dashboards, or controls?',
      'Related items sit closer than unrelated items, preserving scan rhythm and decision grouping?',
      'Navigation, sticky headers, and overlays account for owned header height and safe-area offsets?'
    ]
  },
  {
    area: 'Motion',
    section: 'motion',
    items: [
      'Motion uses Canon duration and easing tokens instead of local timing values?',
      'Animation clarifies entrance, exit, state change, progression, selection, or handoff?',
      'prefers-reduced-motion preferences are respected for every animated path?',
      'Motion does not block reading, decision-making, or repeated operational use?',
      'Decorative effects stay subordinate to evidence, state, and next action.'
    ]
  },
  {
    area: 'Layout',
    section: 'layout',
    items: [
      'The layout uses Canon primitives, registry-backed components, or documented overlays before inventing local UI?',
      'Cards are only used for repeated items, modals, or genuinely framed tools; page sections are not nested card shells?',
      'Responsive breakpoints and fixed-format UI elements have stable dimensions or constraints?',
      'Content width, line length, and control density support scanning and repeated use?',
      'Visual hierarchy is established through structure, type, spacing, state, and proof rather than decoration.'
    ]
  }
];

export function buildCanonDesignAuditChecks(
  section: CanonDesignAuditSectionInput = 'all'
): CanonDesignAuditCheckGroup[] {
  return CANON_DESIGN_AUDIT_CHECKS.filter(
    (check) => section === 'all' || check.section === section
  );
}

export function createCanonDesignAuditReport({
  design,
  section = 'all'
}: CanonDesignAuditRenderOptions): CanonDesignAuditReport {
  return {
    design,
    section,
    principles: CANON_DESIGN_AUDIT_PRINCIPLES,
    checks: buildCanonDesignAuditChecks(section)
  };
}

export function renderCanonDesignAudit(options: CanonDesignAuditRenderOptions): string {
  const report = createCanonDesignAuditReport(options);
  const lines = [
    '## Canon Design Audit',
    '',
    `**Design:** ${report.design.slice(0, 300)}`,
    '',
    `**Section:** ${report.section}`,
    '',
    '### Guiding Principles',
    '',
    '| Principle | Question | Guidance |',
    '|-----------|----------|----------|'
  ];

  for (const principle of report.principles) {
    lines.push(`| ${principle.name} | ${principle.question} | ${principle.guidance} |`);
  }

  lines.push('');

  for (const check of report.checks) {
    lines.push(`### ${check.area}`, '');
    for (const item of check.items) {
      lines.push(`- [ ] ${item}`);
    }
    lines.push('');
  }

  lines.push(
    '---',
    '*Canon compliance is not checklist adherence; it is alignment with the philosophy that less reveals more.*'
  );

  return lines.join('\n');
}
