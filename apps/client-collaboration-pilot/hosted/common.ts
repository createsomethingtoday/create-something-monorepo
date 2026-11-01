export class BoundaryError extends Error {
  constructor(
    public code: string,
    public status = 409,
  ) {
    super(code);
  }
}
export function requireValue(
  ok: unknown,
  code: string,
  status = 409,
): asserts ok {
  if (!ok) throw new BoundaryError(code, status);
}
export function text(value: unknown, max: number): asserts value is string {
  requireValue(
    typeof value === "string" && value.trim().length > 0 && value.length <= max,
    "invalid_text",
    400,
  );
}
export function exactKeys(value: Record<string, unknown>, keys: string[]) {
  requireValue(
    value &&
      !Array.isArray(value) &&
      Object.keys(value).every((k) => keys.includes(k)),
    "unknown_argument",
    400,
  );
}
export async function hash(value: unknown) {
  const input = typeof value === "string" ? value : JSON.stringify(value);
  return [
    ...new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input)),
    ),
  ]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
export type Member = Readonly<{
  project: string;
  issuer: string;
  subject: string;
  email: string;
  revision: number;
  expiresAt: number;
}>;
export type D1 = Pick<D1Database, "prepare" | "batch" | "withSession">;
