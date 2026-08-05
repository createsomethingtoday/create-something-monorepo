declare const __PREFLIGHT_API_BASE__: string;

export const PREFLIGHT_API_BASE =
  typeof __PREFLIGHT_API_BASE__ === 'string' ? __PREFLIGHT_API_BASE__ : '';
