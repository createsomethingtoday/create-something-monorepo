/**
 * Creator email matching shared by the dashboard and Workers. Dependency-free:
 * no Airtable SDK, no Node built-ins.
 */

// Airtable rejects the entire formula when it references a field that is not
// present in the current base. Keep legacy aliases available for JS-side record
// parsing, but only use confirmed fields in server-side formulas.
export const CREATOR_EMAIL_FORMULA_FIELDS = [
  '🎨📧 Creator Email',
  '🎨📧 Creator WF Account Email',
  '📧Emails (from 🎨Creator)'
] as const;

// Email fields on the Creators table (the Assets fields above are lookups of these).
export const CREATOR_RECORD_EMAIL_FIELDS = ['📧Email', '📧WF Account Email', '📧Emails'] as const;

/**
 * Renders a value as a quoted Airtable formula literal.
 *
 * Airtable has no parameter binding, so every embedded value has to be quoted
 * here rather than at the call site. We pick the quote character the value does
 * not contain instead of relying on escape sequences, and reject values holding
 * both quote characters or control characters — a rejected value makes the query
 * fail closed instead of altering the formula.
 */
export function airtableFormulaValue(input: string): string {
  if (typeof input !== 'string') {
    throw new Error('Input must be a string');
  }

  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(input)) {
    throw new Error('Value contains control characters');
  }

  const hasSingleQuote = input.includes("'");
  const hasDoubleQuote = input.includes('"');

  if (hasSingleQuote && hasDoubleQuote) {
    throw new Error('Value cannot contain both single and double quotes');
  }

  return hasSingleQuote ? `"${input}"` : `'${input}'`;
}

/**
 * Splits an Airtable email field value into individual addresses.
 * Lookup and rollup fields arrive as comma/semicolon/newline-joined strings.
 */
function splitEmailList(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[,;\s<>]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/**
 * Exact-match one email against an Airtable field value.
 *
 * Substring matching here would grant one creator access to another whose
 * address merely contains theirs (`webflow@x.com` inside `team+webflow@x.com`).
 */
export function fieldContainsEmail(fieldValue: unknown, normalizedEmail: string): boolean {
  if (!normalizedEmail) return false;

  if (Array.isArray(fieldValue)) {
    return fieldValue.some((entry) => splitEmailList(String(entry)).includes(normalizedEmail));
  }

  if (typeof fieldValue === 'string') {
    return splitEmailList(fieldValue).includes(normalizedEmail);
  }

  return false;
}

/**
 * Builds an exact-match clause for one Airtable email field.
 *
 * ARRAYJOIN turns the field into a comma-separated list, so both sides are
 * comma-wrapped to anchor the match to a whole address. Spaces are stripped
 * because string fields may be written as "a@x.com, b@x.com".
 */
function buildEmailFieldMatchClause(field: string, emailLiteral: string): string {
  const joined = `LOWER(ARRAYJOIN({${field}}, ","))`;
  // Normalize the field into a comma-delimited list: strip spaces and treat
  // display-name brackets ("Name <a@x.com>") as delimiters so an exact match
  // still finds the address.
  const normalized = `SUBSTITUTE(SUBSTITUTE(SUBSTITUTE(${joined}, " ", ""), "<", ","), ">", ",")`;
  const haystack = `',' & ${normalized} & ','`;
  return `FIND(',' & ${emailLiteral} & ',', ${haystack}) > 0`;
}

function buildEmailMatchFormula(fields: readonly string[], email: string): string {
  const emailLiteral = airtableFormulaValue(email.trim().toLowerCase());
  const clauses = fields.map((field) => buildEmailFieldMatchClause(field, emailLiteral));

  return `OR(${clauses.join(', ')})`;
}

export function buildCreatorEmailMatchFormula(email: string): string {
  return buildEmailMatchFormula(CREATOR_EMAIL_FORMULA_FIELDS, email);
}

export function buildCreatorRecordEmailMatchFormula(email: string): string {
  return buildEmailMatchFormula(CREATOR_RECORD_EMAIL_FIELDS, email);
}
