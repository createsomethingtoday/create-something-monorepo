export type PendingCanvaBinding = {
  status: 'pending';
  reservationId: string;
  operatorSubject: string;
  createdAt: string;
  connectionRequestId: string | null;
};

export type LockedCanvaBinding = Omit<PendingCanvaBinding, 'status'> & {
  status: 'locked';
  connectedAccountId: string;
  lockedAt: string;
};

export type CanvaBindingRecord = PendingCanvaBinding | LockedCanvaBinding;

export interface CanvaBindingStore {
  read(): Promise<CanvaBindingRecord | null>;
  reservePending(input: {
    reservationId: string;
    operatorSubject: string;
    now: string;
  }): Promise<CanvaBindingRecord>;
  attachConnectionRequest(input: {
    reservationId: string;
    connectionRequestId: string;
  }): Promise<CanvaBindingRecord>;
  lock(input: {
    reservationId: string;
    connectedAccountId: string;
    lockedAt: string;
  }): Promise<CanvaBindingRecord>;
  releasePending(reservationId: string): Promise<void>;
  reset(input: {
    expectedConnectedAccountId: string;
    operatorSubject: string;
    resetAt: string;
    receiptId: string;
    revoked: boolean;
  }): Promise<void>;
}

export interface CanvaConnectionGateway {
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

export type CanvaConnectionStatus =
  | { status: 'unbound'; connectedAccountId: null }
  | {
      status: 'pending';
      connectedAccountId: null;
      connectionRequestId: string | null;
      createdAt: string;
    }
  | {
      status: 'locked';
      connectedAccountId: string;
      lockedAt: string;
    };

export class CanvaBindingError extends Error {
  constructor(readonly code: string, message: string) {
    super(`${code}: ${message}`);
    this.name = 'CanvaBindingError';
  }
}

export class CanvaClientBindingService {
  private readonly store: CanvaBindingStore;
  private readonly gateway: CanvaConnectionGateway;
  private readonly composioUserId: string;
  private readonly now: () => string;
  private readonly randomId: () => string;

  constructor(input: {
    store: CanvaBindingStore;
    gateway: CanvaConnectionGateway;
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
      throw new CanvaBindingError(
        'CANVA_CONNECTION_LOCKED',
        'Reset the existing client connection before creating another Connect Link.',
      );
    }
    if (existing?.status === 'pending') {
      throw new CanvaBindingError(
        'CANVA_CONNECTION_PENDING',
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

  async getStatus(): Promise<CanvaConnectionStatus> {
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
      createdAt: binding.createdAt,
    };
  }

  async requireLockedAccountId(): Promise<string> {
    const status = await this.getStatus();
    if (status.status !== 'locked') {
      throw new CanvaBindingError(
        'CANVA_CONNECTION_REQUIRED',
        'A client must complete the Canva Connect Link before Canva tools can run.',
      );
    }
    return status.connectedAccountId;
  }

  async resetConnection(input: {
    operatorSubject: string;
    confirmation: string;
    revoke?: boolean;
  }): Promise<{
    receiptId: string;
    previousConnectedAccountId: string;
    revoked: boolean;
    resetAt: string;
    operatorSubject: string;
  }> {
    const requiredConfirmation = `RESET ${this.composioUserId}`;
    if (input.confirmation !== requiredConfirmation) {
      throw new CanvaBindingError(
        'CANVA_RESET_CONFIRMATION_REQUIRED',
        `Pass the exact confirmation phrase: ${requiredConfirmation}`,
      );
    }

    const status = await this.getStatus();
    if (status.status !== 'locked') {
      throw new CanvaBindingError(
        'CANVA_CONNECTION_NOT_LOCKED',
        'There is no locked Canva account to reset.',
      );
    }

    const revoked = input.revoke ?? true;
    if (revoked) {
      await this.gateway.revoke(status.connectedAccountId);
    }

    const receipt = {
      receiptId: this.randomId(),
      previousConnectedAccountId: status.connectedAccountId,
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

  private async refreshBinding(): Promise<CanvaBindingRecord | null> {
    const binding = await this.store.read();
    if (!binding || binding.status === 'locked' || !binding.connectionRequestId) return binding;

    const connection = await this.gateway.getConnection(
      binding.connectionRequestId,
      this.composioUserId,
    );
    if (connection.status.toUpperCase() !== 'ACTIVE') return binding;
    if (connection.toolkit.toLowerCase() !== 'canva') {
      throw new CanvaBindingError(
        'CANVA_CONNECTION_TOOLKIT_MISMATCH',
        `Expected Canva but Composio returned ${connection.toolkit}.`,
      );
    }
    if (connection.userId !== this.composioUserId) {
      throw new CanvaBindingError(
        'CANVA_CONNECTION_USER_MISMATCH',
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
