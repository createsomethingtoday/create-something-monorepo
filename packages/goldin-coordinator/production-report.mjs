import { readFileSync } from "node:fs";
import { readiness, scenario } from "./policy-model.mjs";
const policy = JSON.parse(
  readFileSync(
    new URL("./policy/production-proposal.json", import.meta.url),
    "utf8",
  ),
);
const assumptions = {
  durationMinutes: 90,
  bufferMinutes: 15,
  feeBps: 300,
  feeTreatment: "added",
  photographerCentsPerHour: 5000,
  editingCentsPerPerson: 2000,
  fixedCostCents: 3000,
};
const rows = [3, 5, 7].map((count) => ({
  count,
  ...scenario({ ...assumptions, count, unitCents: 15000, depositCents: 20000 }),
}));
process.stdout.write(
  JSON.stringify(
    {
      status: "proposed-not-approved",
      assumptions,
      warning:
        "Illustrative costs and provisional price; taxes excluded; not profit or production authorization",
      readiness: readiness(policy),
      rows,
    },
    null,
    2,
  ) + "\n",
);
