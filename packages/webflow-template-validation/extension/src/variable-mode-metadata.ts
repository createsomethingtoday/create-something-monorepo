// Variable mode metadata collection for the Designer extension.
//
// Designer API typings 2.2 added VariableMode.getBreakpoint(): automatic modes
// are bound to a breakpoint, manual modes resolve to null. Older runtimes lack
// the method, so the read is feature-detected and never throws.

export interface VariableModeBreakpoint {
  // False when the runtime could not report breakpoint binding for this mode.
  available: boolean;
  breakpointId: string | null;
}

const UNAVAILABLE: VariableModeBreakpoint = { available: false, breakpointId: null };

export async function readVariableModeBreakpoint(mode: unknown): Promise<VariableModeBreakpoint> {
  if (!mode || typeof mode !== 'object') return UNAVAILABLE;

  try {
    const getBreakpoint = (mode as { getBreakpoint?: unknown }).getBreakpoint;
    if (typeof getBreakpoint !== 'function') return UNAVAILABLE;

    const breakpoint = await getBreakpoint.call(mode);
    if (breakpoint === null) return { available: true, breakpointId: null };
    if (typeof breakpoint === 'string' && breakpoint !== '') return { available: true, breakpointId: breakpoint };
    return UNAVAILABLE;
  } catch {
    return UNAVAILABLE;
  }
}
