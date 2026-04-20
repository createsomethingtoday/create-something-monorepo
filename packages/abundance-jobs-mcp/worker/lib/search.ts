const SEARCH_TERM_ALIASES: Record<string, string[]> = {
  travel: ['travel', 'traveler', 'travelers', 'traveling', 'travelling'],
  rn: ['rn', 'registered nurse', 'registered nurses', 'nurse', 'nurses', 'nursing'],
  nurse: ['nurse', 'nurses', 'nursing', 'rn', 'registered nurse', 'registered nurses'],
  er: ['er', 'ed', 'emergency room', 'emergency department'],
  ed: ['ed', 'er', 'emergency room', 'emergency department'],
  tele: ['tele', 'telemetry', 'ms tele', 'med surg tele', 'med/surg tele'],
  telemetry: ['telemetry', 'tele', 'ms tele', 'med surg tele', 'med/surg tele'],
  medsurg: ['medsurg', 'med surg', 'med-surg', 'medical surgical'],
  'med-surg': ['med-surg', 'med surg', 'medsurg', 'medical surgical'],
  'med/surg': ['med/surg', 'med surg', 'med-surg', 'medsurg', 'medical surgical'],
  icu: ['icu', 'intensive care'],
  picu: ['picu', 'pediatric intensive care'],
  nicu: ['nicu', 'neonatal intensive care'],
  pcu: ['pcu', 'progressive care'],
  pacu: ['pacu', 'post anesthesia care'],
  snf: ['snf', 'skilled nursing', 'skilled nursing facility'],
  lpn: ['lpn', 'licensed practical nurse'],
  cna: ['cna', 'certified nursing assistant'],
};

export function tokenizePublicJobSearchTerms(rawQuery: string): string[] {
  return (
    rawQuery
      .trim()
      .toLowerCase()
      .match(/[\p{L}\p{N}_]+(?:[/'-][\p{L}\p{N}_]+)*/gu)
      ?.map((token) => token.replaceAll('"', '').trim())
      .filter(Boolean)
      .slice(0, 12) ?? []
  );
}

export function expandPublicJobSearchTerm(term: string): string[] {
  const normalized = term.trim().toLowerCase();
  if (!normalized) return [];

  const aliases = SEARCH_TERM_ALIASES[normalized] ?? [normalized];
  const merged = [normalized, ...aliases];

  return Array.from(
    new Set(
      merged
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
}

export function buildPublicJobSearchGroups(rawQuery: string): string[][] {
  const terms = tokenizePublicJobSearchTerms(rawQuery);
  if (terms.length === 0) {
    throw new Error('Query must contain at least one searchable term.');
  }

  return terms.map((term) => expandPublicJobSearchTerm(term));
}

export function normalizePublicJobFtsQuery(rawQuery: string): string {
  const groups = buildPublicJobSearchGroups(rawQuery);

  return groups
    .map((group) => {
      const normalizedGroup = group.map((term) => quoteFtsTerm(term));
      if (normalizedGroup.length === 1) {
        return normalizedGroup[0];
      }
      return `(${normalizedGroup.join(' OR ')})`;
    })
    .join(' AND ');
}

function quoteFtsTerm(term: string): string {
  const escaped = term.replaceAll('"', '""');
  if (/[\s/-]/.test(escaped)) {
    return `"${escaped}"`;
  }
  return escaped;
}
