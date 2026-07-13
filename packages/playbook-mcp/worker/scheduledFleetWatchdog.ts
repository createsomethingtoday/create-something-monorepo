import type { DeterministicFleetWatchdogResult } from './deterministicFleetWatchdog.js';

export type ScheduledFleetWatchdogEvidence = {
  runId: string;
  route: string;
  cron: string;
  success: boolean;
  durationMs: number;
  result?: DeterministicFleetWatchdogResult;
  errorMessage?: string;
};

export type ScheduledFleetWatchdogInput = {
  runId: string;
  route: string;
  scheduledTimeMs: number;
  run: () => Promise<DeterministicFleetWatchdogResult>;
  record: (evidence: ScheduledFleetWatchdogEvidence) => Promise<void>;
  notifySuccess: (
    result: DeterministicFleetWatchdogResult,
    runId: string,
    durationMs: number
  ) => void;
  notifyError: (message: string, runId: string, durationMs: number) => void;
  now?: () => number;
};

function shouldEscalate(result: DeterministicFleetWatchdogResult): boolean {
  return (
    result.degraded ||
    !result.required_tool_coverage.all_required_tools_called ||
    !result.required_tool_coverage.all_required_tools_successful ||
    result.failed_required_tool_calls.length > 0
  );
}

export async function runScheduledDeterministicFleetWatchdog(
  input: ScheduledFleetWatchdogInput
): Promise<void> {
  const now = input.now ?? Date.now;
  const startedAt = now();
  try {
    const result = await input.run();
    const durationMs = now() - startedAt;
    const escalate = shouldEscalate(result);
    await input.record({
      runId: input.runId,
      route: input.route,
      cron: new Date(input.scheduledTimeMs).toISOString(),
      success: !escalate,
      durationMs,
      result,
      errorMessage: escalate
        ? (result.degraded_reason ?? 'Fleet watchdog degraded.')
        : undefined
    });
    input.notifySuccess(result, input.runId, durationMs);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const durationMs = now() - startedAt;
    await input.record({
      runId: input.runId,
      route: input.route,
      cron: new Date(input.scheduledTimeMs).toISOString(),
      success: false,
      durationMs,
      errorMessage: message
    });
    input.notifyError(message, input.runId, durationMs);
  }
}
