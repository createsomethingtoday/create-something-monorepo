import type { ControlActivationActorRole } from './control-activation.js';

function storedControlRole(metadataJson: string): ControlActivationActorRole {
  try {
    const metadata = JSON.parse(metadataJson) as { control_role?: unknown };
    return metadata.control_role === 'account_owner' ? 'account_owner' : 'account_reader';
  } catch {
    return 'account_reader';
  }
}

export function deriveControlActivationRole(input: {
  email: string;
  metadataJson: string;
  operatorEmails?: string;
}): ControlActivationActorRole {
  const operators = new Set(
    (input.operatorEmails ?? '')
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
  );
  if (operators.has(input.email.trim().toLowerCase())) return 'agency_operator';
  return storedControlRole(input.metadataJson);
}
