// Offline decision support. This module is never imported by the live Worker.
// Integer cents, explicit assumptions; it cannot approve a price or a launch.
const natural = (v) => Number.isSafeInteger(v) && v >= 0;
export function scenario({
  count,
  unitCents,
  fixedTotalCents,
  depositCents,
  durationMinutes,
  bufferMinutes,
  feeBps,
  feeTreatment,
  photographerCentsPerHour,
  editingCentsPerPerson,
  fixedCostCents,
}) {
  if (
    !Number.isSafeInteger(count) ||
    count < 1 ||
    ![
      depositCents,
      bufferMinutes,
      feeBps,
      photographerCentsPerHour,
      editingCentsPerPerson,
      fixedCostCents,
    ].every(natural) ||
    !Number.isSafeInteger(durationMinutes) ||
    durationMinutes <= 0 ||
    (unitCents !== undefined) === (fixedTotalCents !== undefined) ||
    (unitCents !== undefined && !natural(unitCents)) ||
    (fixedTotalCents !== undefined && !natural(fixedTotalCents)) ||
    !["included", "added"].includes(feeTreatment)
  )
    throw new Error("explicit valid scenario assumptions required");
  const exactBase =
    fixedTotalCents === undefined
      ? BigInt(unitCents) * BigInt(count)
      : BigInt(fixedTotalCents);
  const exactFee = (exactBase * BigInt(feeBps) + 5000n) / 10000n;
  const exactTotal = exactBase + (feeTreatment === "added" ? exactFee : 0n);
  const exactStaff =
    (BigInt(photographerCentsPerHour) *
      (BigInt(durationMinutes) + BigInt(bufferMinutes)) +
      59n) /
    60n;
  const exactCost =
    exactStaff +
    BigInt(editingCentsPerPerson) * BigInt(count) +
    BigInt(fixedCostCents);
  const exactContribution =
    exactBase - (feeTreatment === "included" ? exactFee : 0n) - exactCost;
  const outputs = [
    exactBase,
    exactFee,
    exactTotal,
    exactStaff,
    exactCost,
    exactContribution,
  ];
  const maximum = BigInt(Number.MAX_SAFE_INTEGER);
  if (
    outputs.some((v) => v > maximum || v < -maximum) ||
    BigInt(depositCents) > exactTotal
  )
    throw new Error("scenario overflow or invalid deposit");
  const [base, fee, total, , assumedCost, contribution] = outputs.map(Number);
  return {
    baseCents: base,
    feeCents: fee,
    totalCents: total,
    balanceCents: total - depositCents,
    assumedCostCents: assumedCost,
    contributionCents: contribution,
    depositCoverage: assumedCost ? depositCents / assumedCost : null,
    capacityPerPhotographerHour: 60 / (durationMinutes + bufferMinutes),
    taxIncluded: false,
    approved: false,
  };
}

const gates = [
  "pricing",
  "feesAndTaxes",
  "capacity",
  "holdExpiry",
  "cancellationRefund",
  "documentsAndFiles",
  "releaseOwnership",
  "intakeMode",
  "operationalNotionSchema",
  "staffAccess",
  "monitoringRecovery",
  "rollback",
];
export function readiness(policy, now = Date.now()) {
  const blockers = gates.filter((name) => {
    const entry = policy?.decisions?.[name];
    return (
      entry?.status !== "approved" ||
      typeof entry.owner !== "string" ||
      !entry.owner.trim() ||
      typeof entry.evidence !== "string" ||
      !entry.evidence.trim() ||
      typeof entry.version !== "string" ||
      !entry.version.trim() ||
      !Number.isFinite(Date.parse(entry.approvedAt)) ||
      Date.parse(entry.approvedAt) > now
    );
  });
  // This is a decision checklist, never deployment authorization.
  return {
    decisionsComplete: blockers.length === 0,
    blockers,
    productionEnabled: false,
    technicalBlockers: [
      "operational_production_transport_not_promoted",
      "persistent_access_requires_scoped_approval",
    ],
  };
}
