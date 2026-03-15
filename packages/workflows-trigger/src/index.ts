import { z } from "zod";

export const halfDozenScenarioSchema = z.enum([
  "fleet-watchdog",
  "inbox-triage",
  "dedup",
]);

export type HalfDozenScenario = z.infer<typeof halfDozenScenarioSchema>;

export const triggerFoundationHealthcheckPayloadSchema = z.object({
  includeEnvironmentSummary: z.boolean().default(true),
  requestedBy: z.string().trim().min(1).optional(),
});

export type TriggerFoundationHealthcheckPayload = z.infer<
  typeof triggerFoundationHealthcheckPayloadSchema
>;

export const triggerScenarioDispatchPayloadSchema = z.object({
  scenario: halfDozenScenarioSchema,
  correlationId: z.string().trim().min(1).optional(),
  initiatedBy: z.enum(["manual", "schedule", "api"]).default("manual"),
  dryRun: z.boolean().default(true),
  notes: z.string().trim().min(1).optional(),
});

export type TriggerScenarioDispatchPayload = z.infer<
  typeof triggerScenarioDispatchPayloadSchema
>;

export function summarizeTriggerEnvironment() {
  return {
    triggerProjectRefConfigured: Boolean(process.env.TRIGGER_PROJECT_REF),
    triggerSecretKeyConfigured: Boolean(process.env.TRIGGER_SECRET_KEY),
    triggerAccessTokenConfigured: Boolean(process.env.TRIGGER_ACCESS_TOKEN),
    openAiConfigured: Boolean(process.env.OPENAI_API_KEY),
    braintrustConfigured: Boolean(process.env.BRAINTRUST_API_KEY),
    liveHalfDozenExecutionEnabled:
      process.env.CS_TRIGGER_ENABLE_LIVE_HALFDOZEN === "true",
  };
}
