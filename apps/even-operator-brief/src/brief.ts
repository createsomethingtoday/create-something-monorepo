export type OperatorBriefCounts = {
  active_alerts?: number;
  poor_health?: number;
};

export type OperatorBriefClock = {
  display_time?: string;
  local_date?: string;
  timezone?: string;
};

export type OperatorBriefSourceLink = {
  label: string;
  url?: string;
  kind?: string;
  id?: string;
};

export type OperatorBrief = {
  state?: string;
  headline?: string;
  line1?: string;
  line2?: string;
  detail?: string;
  action?: string;
  urgent?: boolean;
  generated_at?: string;
  surface?: string;
  signal?: string;
  detail_label?: string;
  counts?: OperatorBriefCounts;
  clock?: OperatorBriefClock;
  source_links?: OperatorBriefSourceLink[];
};

export type BriefView = 'home' | 'detail' | 'sources' | 'status';

const MAX_LINE = 24;
const HOME_LINE = 23;
const FOOTER_LINE = 24;

export function compactText(value: unknown, max = MAX_LINE): string {
  const text = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
  if (!text) return '';
  if (text.length <= max) return text;
  if (max <= 3) return text.slice(0, max);
  return `${text.slice(0, max - 3).trimEnd()}...`;
}

export function normalizeBrief(input: unknown): OperatorBrief {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return {};
  }

  const record = input as Record<string, unknown>;
  return {
    state: stringValue(record.state),
    headline: stringValue(record.headline),
    line1: stringValue(record.line1),
    line2: stringValue(record.line2),
    detail: stringValue(record.detail),
    action: stringValue(record.action),
    urgent: record.urgent === true,
    generated_at: stringValue(record.generated_at),
    surface: stringValue(record.surface),
    signal: stringValue(record.signal),
    detail_label: stringValue(record.detail_label),
    counts: countsValue(record.counts),
    clock: clockValue(record.clock),
    source_links: sourceLinksValue(record.source_links)
  };
}

export function formatBriefScreen(brief: OperatorBrief, view: BriefView): string {
  switch (view) {
    case 'detail':
      return joinLines([
        compactText(brief.headline || 'OPERATOR BRIEF', 22),
        '',
        compactText(brief.detail || brief.line2 || 'No detail available.', 44),
        '',
        `Do: ${compactText(brief.action || 'Review source', 36)}`,
        footer(brief, 'detail')
      ]);
    case 'sources':
      return formatSources(brief);
    case 'status':
      return joinLines([
        'STATUS',
        '',
        `State: ${compactText(brief.state || 'unknown', 24)}`,
        `Signal: ${compactText(brief.signal || 'operator', 22)}`,
        `Alerts: ${brief.counts?.active_alerts ?? 0}`,
        `Health: ${brief.counts?.poor_health ?? 0}`,
        footer(brief, 'status')
      ]);
    case 'home':
    default:
      return joinLines([
        compactText(brief.headline || 'CALM OPERATOR', 20),
        brief.urgent && !/attention/i.test(brief.headline ?? '') ? 'ATTENTION' : '',
        '',
        compactText(brief.line1 || 'No decisions pending', HOME_LINE),
        compactText(brief.line2 || 'You can step away.', HOME_LINE),
        '',
        `Next: ${compactText(brief.action || 'Stay available', 17)}`,
        footer(brief, 'tap')
      ]);
  }
}

export function missingTokenScreen(): string {
  return joinLines([
    'CS OPERATOR BRIEF',
    '',
    'Missing device token.',
    '',
    'Open with:',
    '?token=INK_DEVICE_TOKEN',
    '',
    'Double-tap exits.'
  ]);
}

export function loadingScreen(): string {
  return joinLines(['CS OPERATOR BRIEF', '', 'Syncing operator state...', '', 'Double-tap exits.']);
}

export function errorScreen(message: string): string {
  return joinLines([
    'BRIEF UNAVAILABLE',
    '',
    compactText(message, 48),
    '',
    'Tap to retry.',
    'Double-tap exits.'
  ]);
}

function formatSources(brief: OperatorBrief): string {
  const links = brief.source_links ?? [];
  if (links.length === 0) {
    return joinLines([
      'SOURCES',
      '',
      compactText(brief.detail_label || 'No source labels available.', 44),
      '',
      footer(brief, 'sources')
    ]);
  }

  return joinLines([
    'SOURCES',
    '',
    ...links.slice(0, 4).map((link) => {
      const prefix = link.kind ? `${compactText(link.kind, 8)}:` : '';
      return compactText(`${prefix}${link.label}`, 44);
    }),
    '',
    footer(brief, 'sources')
  ]);
}

function footer(brief: OperatorBrief, label: string): string {
  const time = brief.clock?.display_time || ageLabel(brief.generated_at) || 'freshness unknown';
  const signal = brief.signal ? compactText(brief.signal, 7).toUpperCase() : 'OP';
  return compactText(`${time} ${signal} | ${label}`, FOOTER_LINE);
}

function ageLabel(generatedAt: string | undefined): string {
  if (!generatedAt) return '';
  const generated = Date.parse(generatedAt);
  if (!Number.isFinite(generated)) return '';
  const ageMinutes = Math.max(0, Math.round((Date.now() - generated) / 60_000));
  if (ageMinutes < 1) return 'now';
  if (ageMinutes < 90) return `${ageMinutes}m`;
  return `${Math.round(ageMinutes / 60)}h`;
}

function joinLines(lines: string[]): string {
  return lines.filter((line, index, all) => {
    if (line !== '') return true;
    return all[index - 1] !== '' && all[index + 1] !== '';
  }).join('\n');
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function countsValue(value: unknown): OperatorBriefCounts | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  return {
    active_alerts: numberValue(record.active_alerts),
    poor_health: numberValue(record.poor_health)
  };
}

function clockValue(value: unknown): OperatorBriefClock | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  return {
    display_time: stringValue(record.display_time),
    local_date: stringValue(record.local_date),
    timezone: stringValue(record.timezone)
  };
}

function sourceLinksValue(value: unknown): OperatorBriefSourceLink[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item): OperatorBriefSourceLink | null => {
      if (typeof item !== 'object' || item === null || Array.isArray(item)) return null;
      const record = item as Record<string, unknown>;
      const label = stringValue(record.label);
      if (!label) return null;
      const url = stringValue(record.url);
      const kind = stringValue(record.kind);
      const id = stringValue(record.id);
      return {
        label,
        ...(url ? { url } : {}),
        ...(kind ? { kind } : {}),
        ...(id ? { id } : {})
      };
    })
    .filter((item): item is OperatorBriefSourceLink => item !== null)
    .slice(0, 8);
}
