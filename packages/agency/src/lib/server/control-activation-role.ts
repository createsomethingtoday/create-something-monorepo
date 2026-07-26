import type { ControlActivationActorRole } from './control-activation.js';

function configuredControlRole(
  metadataJson: string
): Extract<ControlActivationActorRole, 'account_owner' | 'account_reader'> | null {
  try {
    const metadata = JSON.parse(metadataJson) as { control_role?: unknown };
    if (metadata.control_role === 'account_owner' || metadata.control_role === 'account_reader') {
      return metadata.control_role;
    }
    return null;
  } catch {
    return null;
  }
}

function configuredOperator(input: { email: string; operatorEmails?: string }): boolean {
  const operators = new Set(
    (input.operatorEmails ?? '')
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
  );
  return operators.has(input.email.trim().toLowerCase());
}

export function deriveControlActivationRole(input: {
  email: string;
  metadataJson: string;
  operatorEmails?: string;
}): ControlActivationActorRole {
  if (configuredOperator(input)) return 'agency_operator';
  return configuredControlRole(input.metadataJson) ?? 'account_reader';
}

export function deriveControlCredentialRole(input: {
  email: string;
  metadataJson: string;
  operatorEmails?: string;
}): ControlActivationActorRole | null {
  if (configuredOperator(input)) return 'agency_operator';
  // Credential roles are new execution authority. Do not reinterpret a legacy
  // entitlement's presentation fallback as an implicit Control access grant.
  return configuredControlRole(input.metadataJson);
}
