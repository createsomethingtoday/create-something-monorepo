// ── Copy and formatting ──────────────────────────────────────────────────────
// Every reader-facing string lives here so localizing this surface is a data
// change rather than a hunt through four components. The Webflow prop panel
// deliberately exposes only the high-traffic copy (title, launcher, placeholder,
// welcome, starters); the rest is overridable in code via the `strings` prop.

export interface TemplateChatStrings {
  /** Header controls. */
  newChat: string;
  newChatConfirm: string;
  expand: string;
  exitFullscreen: string;
  closeChat: string;
  introToggle: (title: string) => string;

  /** Conversation chrome. */
  jumpToLatest: string;
  tryAgain: string;
  refineResults: string;
  composerLabel: string;
  composerHint: string;
  characterLimit: (used: string, limit: string) => string;

  /** Result sets. */
  /** Price shown on a free template card. */
  priceFree: string;
  whyItFits: (reason: string) => string;
  previewLabel: string;
  deckLabel: (count: number, title?: string) => string;

  /** Turn progress. */
  progressPhases: Record<
    'preparing' | 'understanding' | 'searching' | 'curating' | 'presenting',
    { title: string; detail: string }
  >;
  progressSteps: [string, string, string, string];
  progressSlowDetail: string;
  progressSlowAnnouncement: string;

  /** Durable receipts. */
  receiptStopped: string;
  receiptFailed: string;
  receiptReady: string;
  receiptRecommendations: (count: number) => string;
  receiptFreeOnly: string;
  receiptSortedBy: (sort: string) => string;
  receiptHighlights: (count: number) => string;
  receiptPageUpdate: (details: string) => string;
  receiptFilterReset: string;
  receiptSearchUpdate: string;
  undoPageUpdate: string;

  /** Live preview. */
  backToChat: string;
  previewDevice: string;
  deviceDesktop: string;
  deviceTablet: string;
  deviceMobile: string;
  openSite: string;
  loadingPreview: string;
  useForFree: string;
  buyFor: (price: string) => string;
  viewTemplate: string;
  previewOf: (name: string) => string;
}

export const DEFAULT_TEMPLATE_CHAT_STRINGS: TemplateChatStrings = {
  newChat: 'New chat',
  newChatConfirm: 'Start over?',
  expand: 'Expand to fullscreen',
  exitFullscreen: 'Exit fullscreen',
  closeChat: 'Close chat',
  introToggle: (title) => `How ${title} works`,

  jumpToLatest: 'Latest',
  tryAgain: 'Try again',
  refineResults: 'Refine these results',
  composerLabel: 'Describe the site you want to build',
  composerHint: 'Enter to send · Shift+Enter for a new line',
  characterLimit: (used, limit) => `${used} / ${limit} character limit`,

  priceFree: 'Free',
  whyItFits: (reason) => `Why it fits — ${reason}`,
  previewLabel: 'Live preview',
  deckLabel: (count, title) =>
    title ? `${title} — ${count} templates` : `${count} template recommendations`,

  progressPhases: {
    preparing: {
      title: 'Preparing a secure search',
      detail: 'Connecting securely to the template catalog.',
    },
    understanding: {
      title: 'Understanding your request',
      detail: 'Identifying the requirements that matter most.',
    },
    searching: {
      title: 'Searching the template catalog',
      detail: 'Checking the template catalog for strong matches.',
    },
    curating: {
      title: 'Curating the strongest matches',
      detail: 'Comparing fit, style, and useful features.',
    },
    presenting: {
      title: 'Preparing your recommendations',
      detail: 'Organizing the strongest matches for review.',
    },
  },
  progressSteps: ['Preparing search', 'Searching catalog', 'Comparing matches', 'Presenting results'],
  progressSlowDetail: 'Still working — this is taking a little longer than usual.',
  progressSlowAnnouncement: 'This is taking longer than usual.',

  receiptStopped: 'Search stopped',
  receiptFailed: 'Search interrupted',
  receiptReady: 'Response ready',
  receiptRecommendations: (count) =>
    `${count} template ${count === 1 ? 'recommendation' : 'recommendations'} ready`,
  receiptFreeOnly: 'Free only',
  receiptSortedBy: (sort) => `Sorted by ${sort}`,
  receiptHighlights: (count) =>
    count === 1 ? '1 template highlighted on the page' : `${count} templates highlighted on the page`,
  receiptPageUpdate: (details) => `Page updated · ${details}`,
  receiptFilterReset: 'Page filters reset',
  receiptSearchUpdate: 'Page search updated',
  undoPageUpdate: 'Undo page update',

  backToChat: 'Back to chat',
  previewDevice: 'Preview device',
  deviceDesktop: 'Desktop',
  deviceTablet: 'Tablet',
  deviceMobile: 'Mobile',
  openSite: 'Open site',
  loadingPreview: 'Loading live preview',
  useForFree: 'Use for free',
  buyFor: (price) => `Buy — ${price}`,
  viewTemplate: 'View template',
  previewOf: (name) => `Live preview of ${name}`,
};

export type TemplateChatStringsOverride = Partial<
  Omit<TemplateChatStrings, 'progressPhases' | 'progressSteps'>
> & {
  progressPhases?: Partial<TemplateChatStrings['progressPhases']>;
  progressSteps?: TemplateChatStrings['progressSteps'];
};

/** Merges caller overrides over the defaults, one level deep for phases. */
export function resolveTemplateChatStrings(
  override?: TemplateChatStringsOverride,
): TemplateChatStrings {
  if (!override) return DEFAULT_TEMPLATE_CHAT_STRINGS;
  return {
    ...DEFAULT_TEMPLATE_CHAT_STRINGS,
    ...override,
    progressPhases: { ...DEFAULT_TEMPLATE_CHAT_STRINGS.progressPhases, ...override.progressPhases },
    progressSteps: override.progressSteps ?? DEFAULT_TEMPLATE_CHAT_STRINGS.progressSteps,
  };
}

/**
 * Formats a template price for display.
 *
 * The previous `$${price} USD` hardcoded both the symbol and the currency,
 * which is wrong on a localized marketplace. Intl handles placement, grouping
 * and the symbol; a missing or unsupported locale falls back to the raw number
 * rather than throwing during render.
 */
export function formatTemplatePrice(
  price: number,
  locale?: string,
  currency = 'USD',
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      // Template prices are whole dollars; showing .00 is noise.
      minimumFractionDigits: Number.isInteger(price) ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(price);
  } catch {
    return `${price} ${currency}`;
  }
}
