// Email-format validation for creator and support email fields.
//
// The form uses noValidate, so type="email" inputs never block on their own.
// Without this check, values like "<redacted>" or "N/A" reach Airtable and the
// review team has no address to open a Zendesk ticket with. Required-ness is
// handled elsewhere; empty values pass here.
//
// Reserved example domains (RFC 2606/6761) are rejected too: they can't
// receive mail, and "email@example.com" is this form's own placeholder text.

export const EMAIL_FIELDS = [
  { key: 'creatorWfAccountEmail', label: 'Webflow account email' },
  { key: 'creatorContactEmail', label: 'Contact email' },
  { key: 'appSupportEmail', label: 'Support email' },
];

// Practical shape check, not full RFC 5322: one @, no whitespace or
// bracket/quote characters, a dotted domain ending in a 2+ letter TLD.
const EMAIL_PATTERN = /^[^\s@<>()[\]\\,;:"]+@([^\s@<>()[\]\\,;:"]+\.[A-Za-z]{2,})$/;

const RESERVED_DOMAINS = ['example.com', 'example.net', 'example.org'];
const RESERVED_TLDS = ['example', 'test', 'invalid', 'localhost'];

function isReservedDomain(domain) {
  const host = domain.toLowerCase();
  if (RESERVED_DOMAINS.some((reserved) => host === reserved || host.endsWith(`.${reserved}`))) {
    return true;
  }
  const tld = host.split('.').pop();
  return RESERVED_TLDS.includes(tld);
}

export function getEmailError(value, { fieldLabel = 'Email' } = {}) {
  const email = String(value ?? '').trim();
  if (!email) {
    return '';
  }

  const match = EMAIL_PATTERN.exec(email);
  if (!match || email.includes('..')) {
    return `${fieldLabel} must be a real email address we can reach you at (for example, name@yourcompany.com). Placeholders like "<redacted>" or "N/A" can't be accepted.`;
  }

  if (isReservedDomain(match[1])) {
    return `${fieldLabel} uses a placeholder domain that can't receive mail. Enter a real address on your own domain.`;
  }

  return '';
}

export function getEmailFieldErrors(fields = {}) {
  const errors = {};

  for (const { key, label } of EMAIL_FIELDS) {
    const raw = fields[key];
    const value = Array.isArray(raw) ? raw[0] : raw;
    const error = getEmailError(value, { fieldLabel: label });
    if (error) {
      errors[key] = error;
    }
  }

  return errors;
}
