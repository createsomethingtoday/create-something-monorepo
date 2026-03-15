import { z } from "zod";
const emailSchema = z.string().min(1, "Email is required").email("Invalid email format").transform((v) => v.toLowerCase().trim());
const nameSchema = z.string().min(1, "Name is required").max(100, "Name must be under 100 characters").transform((v) => v.trim());
const phoneSchema = z.string().min(1, "Phone number is required").regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format");
const optionalPhoneSchema = z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format").optional().or(z.literal(""));
const passwordSchema = z.string().min(8, "Password must be at least 8 characters").max(128, "Password must be under 128 characters");
z.string().url("Invalid URL format");
z.string().uuid("Invalid UUID format");
const positiveIntSchema = z.number().int().positive();
z.number().int().nonnegative();
const contactSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  message: z.string().min(1, "Message is required").max(5e3, "Message must be under 5000 characters").transform((v) => v.trim()),
  phone: optionalPhoneSchema,
  company: z.string().max(100).optional(),
  subject: z.string().max(200).optional(),
  service: z.string().max(100).optional(),
  assessment_id: z.string().max(50).optional()
});
z.object({
  email: emailSchema,
  source: z.string().max(50).optional(),
  tags: z.array(z.string().max(50)).max(10).optional()
});
z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required")
});
z.object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema.optional(),
  source: z.string().max(50).optional()
});
const magicLinkSchema = z.object({
  email: emailSchema,
  sessionId: z.string().min(32, "Invalid session ID")
});
z.object({
  phone: phoneSchema,
  name: nameSchema,
  location: z.string().max(100).optional(),
  preferences: z.record(z.string(), z.unknown()).optional()
});
z.object({
  phone: phoneSchema,
  name: nameSchema,
  skills: z.array(z.string().max(50)).min(1, "At least one skill is required").max(20),
  rate_min: positiveIntSchema.optional(),
  rate_max: positiveIntSchema.optional(),
  location: z.string().max(100).optional(),
  bio: z.string().max(1e3).optional()
});
z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().nonnegative().default(0)
});
async function parseBody(request, schema) {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);
    if (!result.success) {
      const firstError = result.error.issues[0];
      const errorMessage = firstError ? `${firstError.path.join(".")}: ${firstError.message}`.replace(/^: /, "") : "Invalid request body";
      return {
        success: false,
        error: errorMessage,
        details: result.error.issues
      };
    }
    return { success: true, data: result.data };
  } catch {
    return { success: false, error: "Invalid JSON body" };
  }
}
export {
  contactSchema as c,
  magicLinkSchema as m,
  parseBody as p
};
