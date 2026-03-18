export interface ComposioConnectionParams {
  access_token: string;
  refresh_token: string;
  token_type?: string;
  x_refresh_token_expires_in?: number;
}

export interface ComposioConnectedAccount {
  id: string;
  appUniqueId: string;
  status: string;
  connectionParams: ComposioConnectionParams;
}

export interface QuickBooksConnectionSelectionResult {
  connection?: ComposioConnectedAccount;
  error?: string;
  status: 200 | 404 | 409;
}

export function resolveQuickBooksAuthConfigId(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  return value ? value : null;
}

export function selectActiveQuickBooksConnection(
  items: ComposioConnectedAccount[],
  options?: {
    connectedAccountId?: string | null;
  },
): QuickBooksConnectionSelectionResult {
  const activeQuickBooks = items.filter(
    (item) => item.appUniqueId === "quickbooks" && item.status === "ACTIVE",
  );

  const connectedAccountId = options?.connectedAccountId?.trim();
  if (connectedAccountId) {
    const exactMatch = activeQuickBooks.find((item) => item.id === connectedAccountId);
    if (!exactMatch) {
      return {
        error: `No active QuickBooks connection found for connected_account_id "${connectedAccountId}".`,
        status: 404,
      };
    }
    return { connection: exactMatch, status: 200 };
  }

  if (activeQuickBooks.length === 0) {
    return {
      error: "No active QuickBooks connection found. Has the user completed the OAuth flow?",
      status: 404,
    };
  }

  if (activeQuickBooks.length > 1) {
    return {
      error:
        "Multiple active QuickBooks connections found for this user. Pass connected_account_id from qbo_connect to bind the correct account.",
      status: 409,
    };
  }

  return { connection: activeQuickBooks[0], status: 200 };
}
