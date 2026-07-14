export interface TemplateSubmissionReceiptRequest {
  creatorEmail: string;
  templateName: string;
  submittedAfter: string;
}

export interface TemplateSubmissionReceiptCandidate {
  assetId?: string;
  versionId?: string;
  assetType?: string;
  creatorMatched: boolean;
  reviewStatus?: string;
}

export type TemplateSubmissionReceiptResult =
  | {
      state: 'confirmed';
      receipt: {
        assetId: string;
        versionId: string;
        reviewStatus: string;
      };
    }
  | {
      state: 'processing';
      reason: 'receipt_pending';
    };

type ReceiptLookup = (
  request: TemplateSubmissionReceiptRequest
) => Promise<TemplateSubmissionReceiptCandidate | null>;

interface ReceiptPollingOptions {
  timeoutMs?: number;
  pollIntervalMs?: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

function isValidReceipt(
  candidate: TemplateSubmissionReceiptCandidate | null
): candidate is TemplateSubmissionReceiptCandidate & {
  assetId: string;
  versionId: string;
  reviewStatus: string;
} {
  if (!candidate?.assetId || !candidate.versionId || !candidate.creatorMatched) {
    return false;
  }

  if (!/template/i.test(candidate.assetType || '')) {
    return false;
  }

  return /ready for review|response to review|in review/i.test(candidate.reviewStatus || '');
}

export async function waitForTemplateSubmissionReceipt(
  lookup: ReceiptLookup,
  request: TemplateSubmissionReceiptRequest,
  options: ReceiptPollingOptions = {}
): Promise<TemplateSubmissionReceiptResult> {
  const timeoutMs = options.timeoutMs ?? 15_000;
  const pollIntervalMs = options.pollIntervalMs ?? 1_000;
  const now = options.now ?? Date.now;
  const sleep =
    options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const startedAt = now();

  while (true) {
    const candidate = await lookup(request);
    if (isValidReceipt(candidate)) {
      return {
        state: 'confirmed',
        receipt: {
          assetId: candidate.assetId,
          versionId: candidate.versionId,
          reviewStatus: candidate.reviewStatus
        }
      };
    }

    if (now() - startedAt >= timeoutMs) {
      return { state: 'processing', reason: 'receipt_pending' };
    }

    await sleep(pollIntervalMs);
  }
}
