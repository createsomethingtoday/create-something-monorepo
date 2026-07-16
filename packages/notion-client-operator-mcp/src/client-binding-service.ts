export type PendingNotionBinding = {
  status: 'pending';
  reservationId: string;
  operatorSubject: string;
  createdAt: string;
  connectionRequestId: string | null;
  redirectUrl: string | null;
};

export type LockedNotionBinding = Omit<PendingNotionBinding, 'status'> & {
  status: 'locked';
  connectedAccountId: string;
  lockedAt: string;
};

export type NotionBindingRecord = PendingNotionBinding | LockedNotionBinding;

export interface NotionBindingStore {
  read(): Promise<NotionBindingRecord | null>;
  reservePending(input: {
    reservationId: string;
    operatorSubject: string;
    now: string;
  }): Promise<NotionBindingRecord>;
  attachConnectionRequest(input: {
    reservationId: string;
    connectionRequestId: string;
    redirectUrl: string;
  }): Promise<NotionBindingRecord>;
  lock(input: {
    reservationId: string;
    connectedAccountId: string;
    lockedAt: string;
  }): Promise<NotionBindingRecord>;
  releasePending(reservationId: string): Promise<void>;
  reset(input: {
    expectedConnectedAccountId: string;
    operatorSubject: string;
    resetAt: string;
    receiptId: string;
    revoked: boolean;
  }): Promise<void>;
  resetPending(input: {
    expectedReservationId: string;
    previousConnectionRequestId: string | null;
    operatorSubject: string;
    resetAt: string;
    receiptId: string;
    revoked: boolean;
  }): Promise<void>;
}

export interface NotionConnectionGateway {
  authorize(input: {
    userId: string;
  }): Promise<{ connectionRequestId: string; redirectUrl: string }>;
  getConnection(connectionRequestId: string, expectedUserId: string): Promise<{
    id: string;
    status: string;
    toolkit: string;
    userId: string;
  }>;
  revoke(connectedAccountId: string): Promise<void>;
}

export type NotionConnectionStatus =
  | { status: 'unbound'; connectedAccountId: null }
  | {
      status: 'pending';
      connectedAccountId: null;
      connectionRequestId: string | null;
      redirectUrl: string | null;
      createdAt: string;
    }
  | {
      status: 'locked';
      connectedAccountId: string;
      lockedAt: string;
    };

export class NotionBindingError extends Error {
  constructor(readonly code: string, message: string) {
    super(`${code}: ${message}`);
    this.name = 'NotionBindingError';
  }
}

export class NotionClientBindingService {
  private readonly store: NotionBindingStore;
  private readonly gateway: NotionConnectionGateway;
  private readonly composioUserId: string;
  private readonly now: () => string;
  private readonly randomId: () => string;

  constructor(input: {
    store: NotionBindingStore;
    gateway: NotionConnectionGateway;
    composioUserId: string;
    now?: () => string;
    randomId?: () => string;
  }) {
    this.store = input.store;
    this.gateway = input.gateway;
    this.composioUserId = input.composioUserId;
    this.now = input.now ?? (() => new Date().toISOString());
    this.randomId = input.randomId ?? (() => crypto.randomUUID());
  }

  async createConnectLink(input: { operatorSubject: string }): Promise<{
    status: 'pending';
    redirectUrl: string;
    connectionRequestId: string;
  }> {
    const existing = await this.refreshBinding();
    if (existing?.status === 'locked') {
      throw new NotionBindingError(
        'NOTION_CONNECTION_LOCKED',
        'Reset the existing client connection before creating another Connect Link.',
      );
    }
    if (existing?.status === 'pending') {
      throw new NotionBindingError(
        'NOTION_CONNECTION_PENDING',
        'Complete the existing Connect Link before creating another one.',
      );
    }

    const reservationId = this.randomId();
    await this.store.reservePending({
      reservationId,
      operatorSubject: input.operatorSubject,
      now: this.now(),
    });

    try {
      const request = await this.gateway.authorize({ userId: this.composioUserId });
      await this.store.attachConnectionRequest({
        reservationId,
        connectionRequestId: request.connectionRequestId,
        redirectUrl: request.redirectUrl,
      });
      return {
        status: 'pending',
        redirectUrl: request.redirectUrl,
        connectionRequestId: request.connectionRequestId,
      };
    } catch (error) {
      await this.store.releasePending(reservationId);
      throw error;
    }
  }

  async getStatus(): Promise<NotionConnectionStatus> {
    const binding = await this.refreshBinding();
    if (!binding) return { status: 'unbound', connectedAccountId: null };
    if (binding.status === 'locked') {
      return {
        status: 'locked',
        connectedAccountId: binding.connectedAccountId,
        lockedAt: binding.lockedAt,
      };
    }
    return {
      status: 'pending',
      connectedAccountId: null,
      connectionRequestId: binding.connectionRequestId,
      redirectUrl: binding.redirectUrl ?? null,
      createdAt: binding.createdAt,
    };
  }

  async requireLockedAccountId(): Promise<string> {
    const status = await this.getStatus();
    if (status.status !== 'locked') {
      throw new NotionBindingError(
        'NOTION_CONNECTION_REQUIRED',
        'A client must complete the Notion Connect Link before Notion tools can run.',
      );
    }
    return status.connectedAccountId;
  }

  async resetConnection(input: {
    operatorSubject: string;
    confirmation: string;
    revoke?: boolean;
  }): Promise<
    | {
        receiptId: string;
        previousConnectedAccountId: string;
        revoked: boolean;
        resetAt: string;
        operatorSubject: string;
      }
    | {
        receiptId: string;
        previousStatus: 'pending';
        previousConnectionRequestId: string | null;
        revoked: boolean;
        resetAt: string;
        operatorSubject: string;
      }
  > {
    const requiredConfirmation = `RESET ${this.composioUserId}`;
    if (input.confirmation !== requiredConfirmation) {
      throw new NotionBindingError(
        'NOTION_RESET_CONFIRMATION_REQUIRED',
        `Pass the exact confirmation phrase: ${requiredConfirmation}`,
      );
    }

    const binding = await this.store.read();
    if (!binding) {
      throw new NotionBindingError(
        'NOTION_CONNECTION_NOT_BOUND',
        'There is no pending or locked Notion connection to reset.',
      );
    }

    const revoked = input.revoke ?? true;
    if (binding.status === 'pending') {
      if (revoked && binding.connectionRequestId) {
        await this.gateway.revoke(binding.connectionRequestId);
      }
      const receipt = {
        receiptId: this.randomId(),
        previousStatus: 'pending' as const,
        previousConnectionRequestId: binding.connectionRequestId,
        revoked,
        resetAt: this.now(),
        operatorSubject: input.operatorSubject,
      };
      await this.store.resetPending({
        expectedReservationId: binding.reservationId,
        previousConnectionRequestId: receipt.previousConnectionRequestId,
        operatorSubject: receipt.operatorSubject,
        resetAt: receipt.resetAt,
        receiptId: receipt.receiptId,
        revoked: receipt.revoked,
      });
      return receipt;
    }

    if (revoked) {
      await this.gateway.revoke(binding.connectedAccountId);
    }

    const receipt = {
      receiptId: this.randomId(),
      previousConnectedAccountId: binding.connectedAccountId,
      revoked,
      resetAt: this.now(),
      operatorSubject: input.operatorSubject,
    };
    await this.store.reset({
      expectedConnectedAccountId: receipt.previousConnectedAccountId,
      operatorSubject: receipt.operatorSubject,
      resetAt: receipt.resetAt,
      receiptId: receipt.receiptId,
      revoked: receipt.revoked,
    });
    return receipt;
  }

  private async refreshBinding(): Promise<NotionBindingRecord | null> {
    const binding = await this.store.read();
    if (!binding || binding.status === 'locked' || !binding.connectionRequestId) return binding;

    const connection = await this.gateway.getConnection(
      binding.connectionRequestId,
      this.composioUserId,
    );
    if (connection.status.toUpperCase() !== 'ACTIVE') return binding;
    if (connection.toolkit.toLowerCase() !== 'notion') {
      throw new NotionBindingError(
        'NOTION_CONNECTION_TOOLKIT_MISMATCH',
        `Expected Notion but Composio returned ${connection.toolkit}.`,
      );
    }
    if (connection.userId !== this.composioUserId) {
      throw new NotionBindingError(
        'NOTION_CONNECTION_USER_MISMATCH',
        'The completed connection belongs to a different client identity.',
      );
    }

    return this.store.lock({
      reservationId: binding.reservationId,
      connectedAccountId: connection.id,
      lockedAt: this.now(),
    });
  }
}
