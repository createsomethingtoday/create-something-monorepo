import { createHash } from "node:crypto";

const fields = [
  "priceVersion",
  "count",
  "payer",
  "participants",
  "start",
  "end",
  "resource",
  "holdMs",
];
// App-owned staff observation format. This is not a Pixieset export/API contract.
export function reviewedIntake(actor, envelope) {
  const fail = () => {
    throw new Error("complete staff-reviewed intake required");
  };
  if (
    !actor?.operator ||
    !actor.tenant ||
    envelope?.version !== 1 ||
    envelope.tenant !== actor.tenant ||
    envelope.reviewedBy !== actor.operator ||
    envelope.provider !== "pixieset-supervised" ||
    typeof envelope.accountId !== "string" ||
    !envelope.accountId.trim() ||
    typeof envelope.bookingId !== "string" ||
    !envelope.bookingId.trim() ||
    typeof envelope.evidence !== "string" ||
    !envelope.evidence.trim() ||
    !Number.isFinite(Date.parse(envelope.observedAt)) ||
    Object.keys(envelope.booking ?? {}).some((k) => !fields.includes(k)) ||
    fields.some((k) => envelope.booking?.[k] === undefined)
  )
    fail();
  const source =
    "pixieset-supervised:" +
    createHash("sha256")
      .update(
        JSON.stringify([actor.tenant, envelope.accountId, envelope.bookingId]),
      )
      .digest("hex");
  const booking = Object.fromEntries(
    fields.map((k) => [k, envelope.booking[k]]),
  );
  return {
    source,
    ...booking,
    provenance: {
      provider: envelope.provider,
      observedAt: envelope.observedAt,
      evidence: envelope.evidence,
      reviewedBy: actor.operator,
    },
  };
}
