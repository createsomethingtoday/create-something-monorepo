import { logger, schedules, schemaTask } from "@trigger.dev/sdk";

import {
  formatHalfDozenErrorResult,
  runHalfDozenScenario,
  summarizeTriggerEnvironment,
  triggerFoundationHealthcheckPayloadSchema,
  triggerScenarioDispatchPayloadSchema,
} from "../src/index.js";
import { halfDozenReadOnlyQueue, triggerFoundationQueue } from "./queues.js";

export const triggerFoundationHealthcheck = schemaTask({
  id: "cs-trigger-foundation-healthcheck",
  queue: triggerFoundationQueue,
  schema: triggerFoundationHealthcheckPayloadSchema,
  onStartAttempt: ({ payload }) => {
    logger.info("Starting Trigger foundation healthcheck", {
      requestedBy: payload.requestedBy ?? "unknown",
    });
  },
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
  queue: halfDozenReadOnlyQueue,
  schema: triggerScenarioDispatchPayloadSchema,
  onStartAttempt: ({ payload }) => {
    logger.info("Starting Half Dozen scenario dispatch", {
      scenario: payload.scenario,
      initiatedBy: payload.initiatedBy,
      dryRun: payload.dryRun,
    });
  },
  onComplete: ({ payload, result }) => {
    logger.info("Completed Half Dozen scenario dispatch", {
      scenario: payload.scenario,
      status: result.ok ? "ok" : "error",
    });
  },
  run: async (payload) => {
    const environment = summarizeTriggerEnvironment();
    const correlationId = payload.correlationId ?? crypto.randomUUID();
    const liveExecutionEnabled =
      environment.liveHalfDozenExecutionEnabled && payload.dryRun === false;
    const liveScenarioSupported = payload.scenario === "fleet-watchdog";

    logger.info("Prepared Half Dozen scenario dispatch", {
      correlationId,
      scenario: payload.scenario,
      initiatedBy: payload.initiatedBy,
      dryRun: payload.dryRun,
      liveExecutionEnabled,
      liveScenarioSupported,
    });

    if (liveExecutionEnabled && liveScenarioSupported) {
      try {
        const result = await runHalfDozenScenario({
          scenario: payload.scenario,
          connectOnly: false,
          correlationId,
          traceProjectName:
            process.env.BRAINTRUST_PROJECT_NAME ?? "Create Something",
          traceTags: ["trigger", "scheduled-orchestration"],
        });

        return {
          status: "executed",
          phase: "trigger-live-readonly",
          scenario: payload.scenario,
          correlationId,
          initiatedBy: payload.initiatedBy,
          dryRun: payload.dryRun,
          notes: payload.notes ?? null,
          result,
        };
      } catch (error) {
        logger.error("Half Dozen live dispatch failed", {
          scenario: payload.scenario,
          correlationId,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    }

    if (liveExecutionEnabled && !liveScenarioSupported) {
      const failure = formatHalfDozenErrorResult(
        new Error(
          `Live Trigger.dev execution is currently limited to fleet-watchdog during the Phase 2 read-only pilot. Received scenario "${payload.scenario}".`,
        ),
        correlationId,
      );

      return {
        status: "blocked_phase_scope",
        phase: "trigger-foundation",
        scenario: payload.scenario,
        correlationId,
        initiatedBy: payload.initiatedBy,
        dryRun: payload.dryRun,
        notes: payload.notes ?? null,
        environment,
        failure,
        nextStep:
          "Keep non-watchdog scenarios on the script/manual lane until the bounded-write Trigger.dev lane is implemented.",
      };
    }

    return {
      status: "planned",
      phase: "trigger-foundation",
      scenario: payload.scenario,
      correlationId,
      initiatedBy: payload.initiatedBy,
      dryRun: payload.dryRun,
      notes: payload.notes ?? null,
      nextStep:
        "Enable CS_TRIGGER_ENABLE_LIVE_HALFDOZEN=true to let fleet-watchdog execute through the shared runtime in Trigger.dev.",
      environment,
    };
  },
});

export const triggerHalfDozenFleetWatchdogHourly = schedules.task({
  id: "cs-halfdozen-fleet-watchdog-hourly",
  queue: halfDozenReadOnlyQueue,
  cron: {
    pattern: "0 * * * *",
    timezone: "America/Chicago",
    environments: ["PRODUCTION", "STAGING"],
  },
  run: async (payload) => {
    const timestamp = payload.timestamp.toISOString();
    const lastTimestamp = payload.lastTimestamp?.toISOString() ?? null;
    const liveExecutionEnabled =
      process.env.CS_TRIGGER_ENABLE_LIVE_HALFDOZEN === "true";

    logger.info("Scheduling fleet-watchdog dispatch", {
      timestamp,
      lastTimestamp,
      liveExecutionEnabled,
    });

    const handle = await triggerHalfDozenScenarioDispatch.trigger(
      {
        scenario: "fleet-watchdog",
        initiatedBy: "schedule",
        dryRun: !liveExecutionEnabled,
        notes: `Scheduled hourly watchdog for ${timestamp}`,
      },
      {
        idempotencyKey: `fleet-watchdog-hourly:${timestamp}`,
        idempotencyKeyTTL: "2h",
      },
    );

    return {
      status: liveExecutionEnabled
        ? "scheduled_pending_shared_runtime"
        : "scheduled_dry_run",
      scheduledAt: timestamp,
      previousScheduledAt: lastTimestamp,
      liveExecutionEnabled,
      dispatchRun: handle,
    };
  },
});
