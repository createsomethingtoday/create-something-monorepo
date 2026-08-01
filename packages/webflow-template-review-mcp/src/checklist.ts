/**
 * Parser and byte-preserving editor for the Airtable reviewer checklist fields
 * (`📝Review Checklist` and `🚀Publishing Checklist`).
 *
 * These fields are rich-text long-text values whose checkable units are lines
 * of the form `[ ] text` / `[x] text` anchored at the start of the line. Nested
 * `- …` and `    1. …` lines are sub-criteria, not checkboxes, and are never
 * treated as items.
 *
 * This module is intentionally dependency-free: no Airtable client, no MCP
 * types. It never throws — editing returns a discriminated result so callers
 * own error translation.
 */

/** Tuple form so callers can build `z.enum(...)` directly. */
export const CHECKLIST_KIND_VALUES = ['review', 'publishing'] as const;

export type ChecklistKind = (typeof CHECKLIST_KIND_VALUES)[number];

export const CHECKLIST_KINDS: readonly ChecklistKind[] = CHECKLIST_KIND_VALUES;

/** Matches a checkbox line: indent, `[ ]`/`[x]`, then the remainder. */
const ITEM_PATTERN = /^(\s*)\[([ xX])\]/;
const HEADING_PATTERN = /^(#{1,6})\s+(.*)$/;

export interface ChecklistItem {
  /** 1-based position among checkbox items, stable for a given raw value. */
  index: number;
  text: string;
  checked: boolean;
  /** Nearest preceding markdown heading, or null when the field has none. */
  section: string | null;
  /** 1-based line number in the raw field value. */
  lineNumber: number;
}

export interface ChecklistSection {
  title: string;
  level: number;
  lineNumber: number;
  itemIndexes: number[];
}

export interface ChecklistSummary {
  total: number;
  checked: number;
  unchecked: number;
  complete: boolean;
}

export interface ParsedChecklist {
  items: ChecklistItem[];
  sections: ChecklistSection[];
  summary: ChecklistSummary;
}

export interface ChecklistItemUpdate {
  index: number;
  checked: boolean;
  /** Optional stale-read guard for callers that selected an item from a prior read. */
  expectedText?: string;
}

export interface ChecklistItemChange {
  index: number;
  text: string;
  section: string | null;
  from: boolean;
  to: boolean;
}

export type ChecklistEditResult =
  | {
      ok: true;
      raw: string;
      /** Items whose state actually flipped. Empty when the edit was a no-op. */
      changed: ChecklistItemChange[];
      before: ParsedChecklist;
      after: ParsedChecklist;
    }
  | {
      ok: false;
      code:
        | 'CHECKLIST_EMPTY'
        | 'CHECKLIST_NO_ITEMS'
        | 'CHECKLIST_ITEM_OUT_OF_RANGE'
        | 'CHECKLIST_DUPLICATE_ITEM'
        | 'CHECKLIST_ITEM_TEXT_MISMATCH'
        | 'CHECKLIST_NO_UPDATES';
      message: string;
      details?: Record<string, unknown>;
    };

function summarize(items: ChecklistItem[]): ChecklistSummary {
  const checked = items.filter((item) => item.checked).length;
  return {
    total: items.length,
    checked,
    unchecked: items.length - checked,
    complete: items.length > 0 && checked === items.length
  };
}

/**
 * Parse a raw checklist field value into items and sections.
 *
 * Splitting on `\n` and rejoining is lossless, so line numbers here index
 * directly into the same split used by {@link setChecklistItemStates}.
 */
export function parseChecklist(raw: string | undefined | null): ParsedChecklist {
  const lines = typeof raw === 'string' ? raw.split('\n') : [];
  const items: ChecklistItem[] = [];
  const sections: ChecklistSection[] = [];
  let currentSection: ChecklistSection | null = null;

  lines.forEach((line, offset) => {
    // Tolerate CRLF sources: `\r` rides along as the final character of `line`.
    const content = line.endsWith('\r') ? line.slice(0, -1) : line;
    const lineNumber = offset + 1;

    const heading = HEADING_PATTERN.exec(content);
    if (heading) {
      currentSection = {
        title: heading[2].trim(),
        level: heading[1].length,
        lineNumber,
        itemIndexes: []
      };
      sections.push(currentSection);
      return;
    }

    const match = ITEM_PATTERN.exec(content);
    if (!match) return;

    const index = items.length + 1;
    items.push({
      index,
      text: content.slice(match[0].length).trim(),
      checked: match[2] !== ' ',
      section: currentSection?.title ?? null,
      lineNumber
    });
    currentSection?.itemIndexes.push(index);
  });

  return { items, sections, summary: summarize(items) };
}

/**
 * Flip specific checkbox tokens, preserving every other byte of the field.
 *
 * Only the three characters `[ ]` / `[x]` on a targeted line are rewritten;
 * indentation, item text, sub-bullets, headings, and trailing whitespace are
 * left exactly as found.
 */
export function setChecklistItemStates(
  raw: string | undefined | null,
  updates: readonly ChecklistItemUpdate[]
): ChecklistEditResult {
  if (typeof raw !== 'string' || raw.length === 0) {
    return {
      ok: false,
      code: 'CHECKLIST_EMPTY',
      message: 'Checklist field is empty; there is nothing to check off.'
    };
  }
  if (updates.length === 0) {
    return {
      ok: false,
      code: 'CHECKLIST_NO_UPDATES',
      message: 'No checklist item updates were provided.'
    };
  }

  const before = parseChecklist(raw);
  if (before.items.length === 0) {
    return {
      ok: false,
      code: 'CHECKLIST_NO_ITEMS',
      message: 'Checklist field contains no "[ ]" checkbox items to update.'
    };
  }

  const seen = new Set<number>();
  const duplicates: number[] = [];
  const outOfRange: number[] = [];
  for (const update of updates) {
    if (seen.has(update.index)) duplicates.push(update.index);
    seen.add(update.index);
    if (!Number.isInteger(update.index) || update.index < 1 || update.index > before.items.length) {
      outOfRange.push(update.index);
    }
  }

  if (duplicates.length > 0) {
    return {
      ok: false,
      code: 'CHECKLIST_DUPLICATE_ITEM',
      message: 'Each checklist item index may appear at most once per update.',
      details: { duplicate_indexes: [...new Set(duplicates)] }
    };
  }
  if (outOfRange.length > 0) {
    return {
      ok: false,
      code: 'CHECKLIST_ITEM_OUT_OF_RANGE',
      message: `Checklist item index must be between 1 and ${before.items.length}.`,
      details: { invalid_indexes: outOfRange, total_items: before.items.length }
    };
  }

  const textMismatches = updates.flatMap((update) => {
    const actualText = before.items[update.index - 1].text;
    return update.expectedText !== undefined && update.expectedText !== actualText
      ? [{ index: update.index, expected_text: update.expectedText, actual_text: actualText }]
      : [];
  });
  if (textMismatches.length > 0) {
    return {
      ok: false,
      code: 'CHECKLIST_ITEM_TEXT_MISMATCH',
      message:
        'Checklist item text changed since it was read; re-read the checklist before applying item updates.',
      details: { mismatches: textMismatches }
    };
  }

  const lines = raw.split('\n');
  const changed: ChecklistItemChange[] = [];

  for (const update of updates) {
    const item = before.items[update.index - 1];
    if (item.checked === update.checked) continue;

    const lineIndex = item.lineNumber - 1;
    const line = lines[lineIndex];
    const match = ITEM_PATTERN.exec(line.endsWith('\r') ? line.slice(0, -1) : line);
    if (!match) continue;

    const indentLength = match[1].length;
    const token = update.checked ? '[x]' : '[ ]';
    lines[lineIndex] = line.slice(0, indentLength) + token + line.slice(indentLength + 3);

    changed.push({
      index: item.index,
      text: item.text,
      section: item.section,
      from: item.checked,
      to: update.checked
    });
  }

  const nextRaw = lines.join('\n');
  return { ok: true, raw: nextRaw, changed, before, after: parseChecklist(nextRaw) };
}

/** Set every checkbox item to `checked`. Backs the opt-in bulk publishing mark. */
export function setAllChecklistItems(
  raw: string | undefined | null,
  checked: boolean
): ChecklistEditResult {
  const parsed = parseChecklist(raw);
  if (parsed.items.length === 0) {
    return setChecklistItemStates(raw, [{ index: 1, checked }]);
  }
  return setChecklistItemStates(
    raw,
    parsed.items.map((item) => ({ index: item.index, checked }))
  );
}
