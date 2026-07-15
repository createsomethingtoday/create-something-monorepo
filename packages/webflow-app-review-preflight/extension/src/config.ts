declare const __PREFLIGHT_API_BASE__: string;
declare const __PREFLIGHT_COMPANION_EXTENSION_ID__: string;

export const PREFLIGHT_API_BASE =
  typeof __PREFLIGHT_API_BASE__ === 'string' ? __PREFLIGHT_API_BASE__ : '';

export const PREFLIGHT_COMPANION_EXTENSION_ID =
  typeof __PREFLIGHT_COMPANION_EXTENSION_ID__ === 'string'
    ? __PREFLIGHT_COMPANION_EXTENSION_ID__
    : 'eiogakldgljpbbmplgckjkoglfgabblm';
