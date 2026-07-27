export interface ContactSubmission {
  name: string;
  email: string;
  phone: string;
}

function sanitize(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

export function parseContactSubmission(body: unknown): ContactSubmission | null {
  if (!body || typeof body !== 'object') return null;
  const payload = body as Record<string, unknown>;
  const name = sanitize(payload.name, 120);
  const email = sanitize(payload.email, 180);
  const phone = sanitize(payload.phone, 40);

  if (!name || !phone) return null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;

  return {
    name,
    email,
    phone
  };
}
