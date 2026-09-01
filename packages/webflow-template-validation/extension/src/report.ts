// Markdown report builder — pure so it can be unit-tested. The panel's
// "Copy report" action feeds it the last run; the output is what creators
// paste into support tickets.

export interface ReportIssueLike {
  severity: string;
  message: string;
  location?: string;
  howToFix?: string;
  details?: {
    location?: string;
    howToFix?: string;
    pages?: string[];
    duplicates?: string[][];
    [key: string]: any;
  };
}

export interface ReportCategoryLike {
  category: string;
  issues?: ReportIssueLike[];
}

export interface ReportInput {
  url?: string | null;
  generatedAt: string;
  correlationId?: string | null;
  outcomeBadge?: string;
  outcomeTitle?: string;
  errors: number;
  warnings: number;
  infos: number;
  categories: ReportCategoryLike[];
  domainLastPublished?: string | null;
  extensionVersion?: string;
  workerVersion?: string | null;
}

export function buildReportMarkdown(input: ReportInput): string {
  const lines: Array<string | null> = [
    '# Webflow Way Validator Report',
    '',
    `- Site: ${input.url || 'Unknown'}`,
    `- Generated: ${input.generatedAt}`,
    input.domainLastPublished ? `- Validated publish from: ${input.domainLastPublished}` : null,
    input.correlationId ? `- Correlation ID: ${input.correlationId}` : null,
    input.extensionVersion
      ? `- Validator: extension v${input.extensionVersion}${input.workerVersion ? ` · worker v${input.workerVersion}` : ''}`
      : null,
    input.outcomeBadge ? `- Outcome: ${input.outcomeBadge}${input.outcomeTitle ? ` — ${input.outcomeTitle}` : ''}` : null,
    `- Errors: ${input.errors} · Warnings: ${input.warnings} · Info: ${input.infos}`,
    '',
  ];

  for (const category of input.categories) {
    const issues = category.issues || [];
    lines.push(`## ${category.category} — ${issues.length === 0 ? 'passed' : `${issues.length} issue(s)`}`);
    for (const issue of issues) {
      lines.push(`- [${issue.severity.toUpperCase()}] ${issue.message}`);
      const location = issue.location || issue.details?.location;
      if (location) lines.push(`  - Location: ${location}`);
      const howToFix = issue.howToFix || issue.details?.howToFix;
      if (howToFix) lines.push(`  - Fix: ${howToFix}`);
      for (const page of issue.details?.pages || []) {
        lines.push(`  - Affected page: ${formatDetailLabel(page)}`);
      }
      for (const group of issue.details?.duplicates || []) {
        const labels = group.map(formatDetailLabel).filter(Boolean);
        if (labels.length > 0) lines.push(`  - Duplicate group: ${labels.join(' · ')}`);
      }
    }
    lines.push('');
  }

  return lines.filter((line): line is string => line !== null).join('\n');
}

function formatDetailLabel(value: string): string {
  return String(value).replace(/\s+/g, ' ').trim();
}
