import {
  ControlActivationAccessError,
  ControlActivationValidationError
} from './control-activation.js';

export function controlActivationHttpErrorStatus(cause: unknown): 400 | 404 | null {
  if (cause instanceof ControlActivationValidationError) return 400;
  if (cause instanceof ControlActivationAccessError) return 404;
  return null;
}
