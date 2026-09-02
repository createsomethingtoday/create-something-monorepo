export type StatusWritebackMap = Record<string, string | null>;

/**
 * Shared defaults preserve the existing behavior for every tenant while naming
 * the complete Half Dozen ticket lifecycle. A null value is an explicit
 * no-write state that a tenant may override when its client portal has a safe
 * equivalent.
 */
export const DEFAULT_HD_STATUS_WRITEBACK_MAP: Readonly<StatusWritebackMap> = {
  'Not Started': null,
  Responded: null,
  'Client Action': 'Action Required',
  Assigned: 'Under Review',
  'In Progress': 'In Progress',
  'Needs Review': null,
  Roadblock: 'Roadblock',
  Backburner: null,
  Complete: 'Complete',
  Archive: 'Archive',
};

export function parseStatusWritebackMap(value?: string): StatusWritebackMap {
  if (!value?.trim()) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error('CLIENT_OS_STATUS_MAP must be a JSON object of Half Dozen status names to client status names.');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('CLIENT_OS_STATUS_MAP must be a JSON object of Half Dozen status names to client status names.');
  }

  const statusMap: StatusWritebackMap = {};
  for (const [rawHdStatus, rawSourceStatus] of Object.entries(parsed)) {
    const hdStatus = rawHdStatus.trim();
    if (
      !hdStatus
      || (rawSourceStatus !== null && (typeof rawSourceStatus !== 'string' || !rawSourceStatus.trim()))
    ) {
      throw new Error('CLIENT_OS_STATUS_MAP entries must use non-empty string keys and values, or null values to disable writeback.');
    }
    if (!Object.prototype.hasOwnProperty.call(DEFAULT_HD_STATUS_WRITEBACK_MAP, hdStatus)) {
      throw new Error(`CLIENT_OS_STATUS_MAP cannot override unknown Half Dozen status "${hdStatus}".`);
    }
    statusMap[hdStatus] = rawSourceStatus === null ? null : rawSourceStatus.trim();
  }
  return statusMap;
}

export function mapHdStatusToOsStatus(
  value: string,
  overrides: StatusWritebackMap = {},
): string | null {
  if (!Object.prototype.hasOwnProperty.call(DEFAULT_HD_STATUS_WRITEBACK_MAP, value)) return null;
  const defaultStatus = DEFAULT_HD_STATUS_WRITEBACK_MAP[value] ?? null;
  if (!Object.prototype.hasOwnProperty.call(overrides, value)) return defaultStatus;
  const override = overrides[value];
  return override === null ? null : override.trim() || defaultStatus;
}

export function effectiveSourceStatusMap(overrides: StatusWritebackMap = {}): StatusWritebackMap {
  return Object.fromEntries(
    Object.keys(DEFAULT_HD_STATUS_WRITEBACK_MAP)
      .map((hdStatus) => [hdStatus, mapHdStatusToOsStatus(hdStatus, overrides)]),
  ) as StatusWritebackMap;
}
