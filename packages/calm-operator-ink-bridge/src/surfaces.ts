import type { InkSurface } from './types.js';

export interface InkSurfaceProfile {
  id: InkSurface;
  label: string;
  role: 'calm_surface' | 'operator_console' | 'operator_sheet';
  display: 'eink' | 'lcd';
  refresh: 'slow' | 'fast';
  headlineChars: number;
  line1Chars: number;
  line2Chars: number;
  detailChars: number;
  actionChars: number;
  supportsLists: boolean;
  supportsDetailDrilldown: boolean;
}

const CORE_INK_PROFILE: InkSurfaceProfile = {
  id: 'core-ink',
  label: 'Core Ink',
  role: 'calm_surface',
  display: 'eink',
  refresh: 'slow',
  headlineChars: 22,
  line1Chars: 28,
  line2Chars: 46,
  detailChars: 120,
  actionChars: 42,
  supportsLists: false,
  supportsDetailDrilldown: false
};

const SURFACE_PROFILES: Record<string, InkSurfaceProfile> = {
  'core-ink': CORE_INK_PROFILE,
  't-embed': {
    id: 't-embed',
    label: 'T-Embed Operator Console',
    role: 'operator_console',
    display: 'lcd',
    refresh: 'fast',
    headlineChars: 26,
    line1Chars: 42,
    line2Chars: 72,
    detailChars: 220,
    actionChars: 80,
    supportsLists: true,
    supportsDetailDrilldown: true
  },
  'reterminal-e1001': {
    id: 'reterminal-e1001',
    label: 'reTerminal E1001 Operator Sheet',
    role: 'operator_sheet',
    display: 'eink',
    refresh: 'slow',
    headlineChars: 32,
    line1Chars: 80,
    line2Chars: 120,
    detailChars: 640,
    actionChars: 160,
    supportsLists: true,
    supportsDetailDrilldown: true
  },
  m5paper: {
    id: 'm5paper',
    label: 'M5Paper Operator Sheet',
    role: 'operator_sheet',
    display: 'eink',
    refresh: 'slow',
    headlineChars: 28,
    line1Chars: 64,
    line2Chars: 96,
    detailChars: 420,
    actionChars: 120,
    supportsLists: true,
    supportsDetailDrilldown: true
  },
  papers3: {
    id: 'papers3',
    label: 'PaperS3 Operator Sheet',
    role: 'operator_sheet',
    display: 'eink',
    refresh: 'slow',
    headlineChars: 28,
    line1Chars: 64,
    line2Chars: 96,
    detailChars: 420,
    actionChars: 120,
    supportsLists: true,
    supportsDetailDrilldown: true
  }
};

export function normalizeSurface(surface: string | null | undefined): InkSurface {
  const value = surface?.trim().toLowerCase();
  if (!value) return 'core-ink';
  if (value === 'coreink' || value === 'm5coreink' || value === 'm5-core-ink') return 'core-ink';
  if (value === 'm5paper' || value === 'm5-paper') return 'm5paper';
  if (value === 'papers3' || value === 'paper-s3' || value === 'm5papers3') return 'papers3';
  if (
    value === 'e1001' ||
    value === 'reterminal' ||
    value === 'reterminal-e1001' ||
    value === 'reterminal_e1001' ||
    value === 'seeed-reterminal-e1001' ||
    value === 'seeed_reterminal_e1001'
  ) {
    return 'reterminal-e1001';
  }
  if (
    value === 'tembed' ||
    value === 't-embed' ||
    value === 't_embed' ||
    value === 'lilygo-t-embed' ||
    value === 'lilygo_t_embed'
  ) {
    return 't-embed';
  }
  return value;
}

export function surfaceProfile(surface: string | null | undefined): InkSurfaceProfile {
  const normalized = normalizeSurface(surface);
  return SURFACE_PROFILES[normalized] ?? {
    ...CORE_INK_PROFILE,
    id: normalized,
    label: normalized
  };
}

export function listSurfaceProfiles(): InkSurfaceProfile[] {
  return Object.values(SURFACE_PROFILES);
}
