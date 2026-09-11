import { z } from 'zod';

// A callback is evidence for operator review, never an assertion of personal
// ownership, consent or verified identity. Registry values remain separate.
const publicSource = z
  .string()
  .url()
  .max(2048)
  .refine((value) => {
    const u = new URL(value);
    return (
      u.protocol === 'https:' &&
      !u.username &&
      !u.password &&
      !u.port &&
      u.hostname.includes('.') &&
      !/^\d|\[/.test(u.hostname) &&
      !/(^|\.)(localhost|local|internal|test|invalid)$/.test(u.hostname)
    );
  }, 'A public HTTPS professional source is required.');
export const clayRequestSchema = z
  .object({
    npi: z.string().regex(/^\d{10}$/),
    confirm_paid_enrichment: z.literal(true)
  })
  .strict();
export const clayResultSchema = z
  .object({
    outcome: z.enum(['candidate', 'no_match', 'ambiguous']),
    identity_evidence: z.string().trim().min(5).max(2000),
    contacts: z
      .array(
        z
          .object({
            type: z.enum(['phone', 'email']),
            value: z.string().trim().min(3).max(254),
            source_url: publicSource,
            publication_context: z.literal('professional_contact'),
            evidence_quote: z.string().trim().min(10).max(1000)
          })
          .strict()
      )
      .max(2)
  })
  .strict()
  .superRefine((result, ctx) => {
    if (result.outcome !== 'candidate' && result.contacts.length)
      ctx.addIssue({ code: 'custom', message: 'Unresolved identity must not return contacts.' });
    if (result.outcome === 'candidate' && !result.contacts.length)
      ctx.addIssue({ code: 'custom', message: 'Candidate requires source evidence.' });
    const seen = new Set<string>();
    for (const contact of result.contacts) {
      if (seen.has(contact.type))
        ctx.addIssue({ code: 'custom', message: 'At most one contact per type.' });
      seen.add(contact.type);
      if (contact.type === 'phone' && !/^\+?[\d ()-]{7,30}$/.test(contact.value))
        ctx.addIssue({ code: 'custom', message: 'Invalid phone format.' });
      if (contact.type === 'email' && !z.string().email().safeParse(contact.value).success)
        ctx.addIssue({ code: 'custom', message: 'Invalid email format.' });
    }
  });
export type ClayResult = z.infer<typeof clayResultSchema>;
