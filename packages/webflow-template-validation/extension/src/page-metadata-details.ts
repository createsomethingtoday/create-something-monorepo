import { escapeHtml } from './utils';

export interface PageMetadataIssueDetails {
  pages?: unknown;
  duplicates?: unknown;
  [key: string]: unknown;
}

function renderDetails(label: string, items: string[]): string {
  if (items.length === 0) return '';

  return `
    <details class="issue-subitems-details">
      <summary class="issue-subitems-summary">
        <strong>${label} (${items.length})</strong>
      </summary>
      <div class="issue-subitems-list">
        ${items.map((item) => `<div class="subitem">• ${escapeHtml(item)}</div>`).join('')}
      </div>
    </details>
  `;
}

/** A page entry is a label, or { url, detail } from the reviewer-standard checks. */
export function formatPageDetail(page: unknown): string {
  if (typeof page === 'string') return page.replace(/\s+/g, ' ').trim();
  if (!page || typeof page !== 'object') return '';
  const { url, detail } = page as { url?: unknown; detail?: unknown };
  return [url, detail]
    .filter((part): part is string => typeof part === 'string' && part.trim() !== '')
    .map((part) => part.replace(/\s+/g, ' ').trim())
    .join(' — ');
}

export function createPageMetadataDetailsHTML(details?: PageMetadataIssueDetails): string {
  if (!details) return '';

  const pages = Array.isArray(details.pages)
    ? details.pages.map(formatPageDetail).filter((page) => page !== '')
    : [];
  const duplicates = Array.isArray(details.duplicates)
    ? details.duplicates
        .filter((group): group is unknown[] => Array.isArray(group))
        .map((group) =>
          group
            .filter((page): page is string => typeof page === 'string' && page.trim() !== '')
            .join(' · ')
        )
        .filter(Boolean)
    : [];

  return [
    renderDetails(`View affected page${pages.length === 1 ? '' : 's'}`, pages),
    renderDetails(`View duplicate group${duplicates.length === 1 ? '' : 's'}`, duplicates)
  ].join('');
}
