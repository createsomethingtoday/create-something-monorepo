export interface ValidationSubmitIssueLike {
  id?: string;
  severity: string;
  message: string;
  howToFix?: string;
  location?: string;
  details?: {
    pages?: string[];
    duplicates?: string[][];
    [key: string]: unknown;
  };
}

export function buildValidationSubmitIssue(issue: ValidationSubmitIssueLike): Record<string, unknown> {
  const pages = Array.isArray(issue.details?.pages) ? issue.details.pages : undefined;
  const duplicates = Array.isArray(issue.details?.duplicates) ? issue.details.duplicates : undefined;

  return {
    id: issue.id,
    severity: issue.severity,
    message: issue.message,
    howToFix: issue.howToFix,
    location: issue.location,
    details: pages || duplicates ? { pages, duplicates } : undefined,
  };
}
