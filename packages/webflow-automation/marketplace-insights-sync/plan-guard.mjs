/** Refuse destructive replacement plans when upstream input is missing. */
export function assertSourceCoverage({ sellers, assets, categories }) {
  for (const [name, rows] of Object.entries({ sellers, assets, categories })) {
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error(`Refusing sync: ${name} source is empty. No writes are safe until source coverage is verified.`);
    }
  }
}

export function parseMaxDeleteFraction(args) {
  const index = args.indexOf('--max-delete-fraction');
  if (index === -1) return 0.25;
  const raw = args[index + 1];
  const value = raw?.trim() ? Number(raw) : NaN;
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error('--max-delete-fraction requires a number from 0 to 1.');
  }
  return value;
}

export function assertReplacementPlan({ label, plannedCount, existingCount, deleteCount }, maxDeleteFraction) {
  if (plannedCount === 0) throw new Error(`Refusing sync: ${label} would be empty.`);
  if (existingCount > 0 && deleteCount / existingCount > maxDeleteFraction) {
    throw new Error(`Refusing sync: ${label} would delete ${deleteCount} of ${existingCount} rows, exceeding the ${maxDeleteFraction * 100}% limit. Review a dry-run plan before explicitly raising --max-delete-fraction.`);
  }
}
