import { logger, schemaTask } from "@trigger.dev/sdk";

import {
  summarizeTriggerEnvironment,
  triggerFoundationHealthcheckPayloadSchema,
  triggerScenarioDispatchPayloadSchema,
} from "../src/index.js";

export const triggerFoundationHealthcheck = schemaTask({
  id: "cs-trigger-foundation-healthcheck",
  schema: triggerFoundationHealthcheckPayloadSchema,
  run: async (payload) => {
    const checkedAt = new Date().toISOString();
    const environment = summarizeTriggerEnvironment();

    logger.info("Trigger foundation healthcheck completed", {
      checkedAt,
      requestedBy: payload.requestedBy ?? "unknown",
      environment,
    });

    return {
      ok: true,
      phase: "foundation",
      checkedAt,
      requestedBy: payload.requestedBy ?? null,
      environment:
        payload.includeEnvironmentSummary === false ? undefined : environment,
    };
  },
});

export const triggerHalfDozenScenarioDispatch = schemaTask({
  id: "cs-halfdozen-scenario-dispatch",
  schema: triggerScenarioDispatchPayloadSchema,
  run: async (payload) => {
    const environment = summarizeTriggerEnvironment();
    const correlationId = payload.correlationId ?? crypto.randomUUID();
    const liveExecutionEnabled =
      environment.liveHalfDozenExecutionEnabled && payload.dryRun === false;

    logger.info("Prepared Half Dozen scenario dispatch", {
      correlationId,
      scenario: payload.scenario,
      initiatedBy: payload.initiatedBy,
      dryRun: payload.dryRun,
      liveExecutionEnabled,
    });

    return {
      status: liveExecutionEnabled
        ? "blocked_pending_shared_runtime"
        : "planned",
      phase: "trigger-foundation",
      scenario: payload.scenario,
      correlationId,
      initiatedBy: payload.initiatedBy,
      dryRun: payload.dryRun,
      notes: payload.notes ?? null,
      nextStep:
        "Extract the reusable OpenAI Agents SDK runtime from scripts/openai-agent-sdk-halfdozen-smoke.ts before enabling live execution in Trigger.dev.",
      environment,
    };
  },
});
