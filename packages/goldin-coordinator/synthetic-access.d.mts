export const SYNTHETIC_SUBJECT: string;
export const SYNTHETIC_TENANT: string;
export function syntheticWindow(env: Record<string, string | undefined>, now?: number): void;
export function syntheticActor(env: Record<string, string | undefined>, actor: {operator:string;tenant:string;roles:string[]}, email?: string, now?: number): void;
