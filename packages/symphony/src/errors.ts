export type SymphonyErrorCode =
  | 'missing_workflow_file'
  | 'workflow_parse_error'
  | 'workflow_front_matter_not_a_map'
  | 'template_parse_error'
  | 'template_render_error'
  | 'unsupported_tracker_kind'
  | 'missing_tracker_api_key'
  | 'missing_tracker_project_slug'
  | 'linear_api_request'
  | 'linear_api_status'
  | 'linear_graphql_errors'
  | 'linear_unknown_payload'
  | 'linear_missing_end_cursor'
  | 'invalid_workspace_cwd'
  | 'invalid_workspace_path'
  | 'response_timeout'
  | 'turn_timeout'
  | 'port_exit'
  | 'response_error'
  | 'turn_failed'
  | 'turn_cancelled'
  | 'turn_input_required'
  | 'codex_not_found'
  | 'hook_failed';

export class SymphonyError extends Error {
  readonly code: SymphonyErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(code: SymphonyErrorCode, message: string, options?: { cause?: unknown; details?: Record<string, unknown> }) {
    super(message, options?.cause ? { cause: options.cause } : undefined);
    this.name = 'SymphonyError';
    this.code = code;
    this.details = options?.details;
  }
}

export function isSymphonyError(error: unknown): error is SymphonyError {
  return error instanceof SymphonyError;
}
