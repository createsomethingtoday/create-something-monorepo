/**
 * Lint rules for text that reaches an app developer.
 *
 * Copied from the template-review-guard mod (same Airtable composer, same
 * Zendesk renderer); keep the two in step. Two delivery paths want opposite
 * things:
 *  - composed: review_feedback goes into Airtable rich text and is wrapped by
 *    the Changes Requested / Rejected email template, which adds its own
 *    greeting and sign-off. Backticks truncate that email; blank lines between
 *    numbered items collapse every item to "1.".
 *  - verbatim: send_ticket_followup (public) and create_ticket deliver the
 *    Markdown as written, so they need their own greeting and sign-off.
 */
export type Lint = {
  /** Why the write must not go out as written. */
  deny?: string
  /** The text with deterministic fixes applied, when any applied. */
  fixed?: string
  /** Things worth saying that do not block the write. */
  warnings: string[]
}

const GREETING = /^\s*(hi|hello|hey|dear|greetings)\b/i
const SIGN_OFF =
  /(the\s+webflow\s+marketplace\s+team|^\s*(thanks|thank you|best|best regards|kind regards|regards|cheers|sincerely)[,!.]?\s*$)/im
const CROSS_REF = /\(\s*(item|see)\s+#?\d+\s*\)/i
const NUMBERED_GAP = /^(\d+\.\s[^\n]*)\n(?:[ \t]*\n)+(?=\d+\.\s)/gm

export function collapseNumberedGaps(text: string): { text: string; removed: number } {
  let removed = 0
  let out = text
  for (;;) {
    const next = out.replace(NUMBERED_GAP, (_m, line: string) => {
      removed += 1
      return `${line}\n`
    })
    if (next === out) break
    out = next
  }
  return { text: out, removed }
}

/** Feedback the Airtable composer wraps (review_feedback, rejection_feedback). */
export function lintComposed(text: string): Lint {
  const warnings: string[] = []
  if (text.includes('`')) {
    return {
      deny: 'contains a backtick; the Changes Requested email truncates at the first backtick. Rewrite without backticks (quote names in plain text).',
      warnings,
    }
  }
  if (GREETING.test(text)) {
    return {
      deny: 'starts with a greeting; the email template already adds "Hi {Creator Name}". Begin with the intro sentence instead.',
      warnings,
    }
  }
  if (SIGN_OFF.test(text)) {
    return {
      deny: 'ends with a sign-off; the email template already closes with "The Webflow Marketplace Team". Remove the sign-off.',
      warnings,
    }
  }
  if (CROSS_REF.test(text)) {
    warnings.push(
      'cross-references like "(item 4)" break because the RECOMMENDED list restarts numbering when rendered',
    )
  }
  const collapsed = collapseNumberedGaps(text)
  if (collapsed.removed > 0) {
    warnings.push(
      `removed ${collapsed.removed} blank line${collapsed.removed === 1 ? '' : 's'} between numbered items (Airtable would have renumbered them all "1.")`,
    )
    return { fixed: collapsed.text, warnings }
  }
  return { warnings }
}

/** Messages delivered as written (public ticket follow-up, new outreach ticket). */
export function lintVerbatim(text: string): Lint {
  const warnings: string[] = []
  if (!GREETING.test(text)) {
    return {
      deny: 'has no greeting; this path delivers the message verbatim with no email wrapper, so it needs its own greeting and sign-off.',
      warnings,
    }
  }
  if (!SIGN_OFF.test(text)) {
    warnings.push('has no sign-off; this path delivers the message verbatim')
  }
  return { warnings }
}
