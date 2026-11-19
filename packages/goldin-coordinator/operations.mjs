import { productionProfile } from "./production-profile.mjs";
// Counts only: never expose booking, payer, evidence, credentials or destination IDs.
export function operationalHealth(items, { enabled, alarm }, now = Date.now()) {
  const counts = Object.fromEntries(
    [
      "pending",
      "retry",
      "sending",
      "uncertain",
      "blocked",
      "exhausted",
      "done",
    ].map((s) => [s, 0]),
  );
  let overdue = 0;
  for (const item of items) {
    if (!Object.hasOwn(counts, item.status))
      throw new Error("invalid outbox status");
    const count = item.count ?? 1;
    const due =
      item.due ??
      (["pending", "retry", "sending"].includes(item.status) && item.next <= now
        ? 1
        : 0);
    if (
      !Number.isSafeInteger(count) ||
      count < 0 ||
      !Number.isSafeInteger(due) ||
      due < 0 ||
      due > count
    )
      throw new Error("invalid health aggregate");
    counts[item.status] += count;
    overdue += due;
  }
  const attention = [];
  if (counts.uncertain) attention.push("reconcile_uncertain_before_retry");
  if (counts.blocked) attention.push("review_blocked_projection");
  if (counts.retry) attention.push("inspect_retry_budget");
  if (counts.exhausted) attention.push("approved_retry_reset_required");
  if (overdue && (!enabled || alarm === null))
    attention.push("dispatcher_not_scheduled");
  return { counts, overdue, enabled, alarm, attention, externalEffects: [] };
}

// Operational production transport/policies are not approved or implemented yet.
// A production environment must not silently inherit the less restricted local harness.
export function assertEnvironmentAction(env, action) {
  if (["local-test", "review", "synthetic"].includes(env.ENVIRONMENT)) return;
  if (
    env.ENVIRONMENT === "production" &&
    ["health", "dispatch_status", "dispatch_stop"].includes(action)
  )
    return;
  productionProfile(env);
}
