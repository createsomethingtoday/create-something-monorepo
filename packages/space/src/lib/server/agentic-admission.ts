interface AdmissionEnv {
  AGENTIC_ADMISSION_TOKEN?: string;
  AGENTIC_ALLOWED_SUBMITTER_IDS?: string;
}

export class AgenticAdmissionError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

/** Only trusted server-populated identity may authorize forwarding the executor credential. */
export function authorizeAgenticSubmission(
  request: Request,
  user: { id: string } | undefined,
  env: AdmissionEnv
): string {
  if (!user?.id) throw new AgenticAdmissionError(401, 'Sign in to submit an agentic task');
  const token = env.AGENTIC_ADMISSION_TOKEN;
  const allowed = env.AGENTIC_ALLOWED_SUBMITTER_IDS?.split(',').map((id) => id.trim()).filter(Boolean);
  if (!token || token.length < 32 || !allowed?.length) {
    throw new AgenticAdmissionError(503, 'Agentic submission admission is not configured');
  }
  if (!allowed.includes(user.id)) throw new AgenticAdmissionError(403, 'Agentic submission is not allowed for this identity');
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) {
    throw new AgenticAdmissionError(403, 'Cross-origin submission is not allowed');
  }
  return `Bearer ${token}`;
}

export function validateSubmissionBudget(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new AgenticAdmissionError(400, 'Budget must be a finite positive number');
  }
  return value;
}
