import type {
  NotionBindingRecord,
  NotionBindingStore,
} from './client-binding-service.js';

type DurableObjectStubLike = {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
};

export class DurableNotionBindingStore implements NotionBindingStore {
  constructor(private readonly stub: DurableObjectStubLike) {}

  async read(): Promise<NotionBindingRecord | null> {
    const response = await this.stub.fetch('https://binding.internal/binding');
    if (response.status === 404) return null;
    return readJson<NotionBindingRecord>(response);
  }

  reservePending(input: {
    reservationId: string;
    operatorSubject: string;
    now: string;
  }): Promise<NotionBindingRecord> {
    return this.post<NotionBindingRecord>('/reserve', input);
  }

  attachConnectionRequest(input: {
    reservationId: string;
    connectionRequestId: string;
    redirectUrl: string;
  }): Promise<NotionBindingRecord> {
    return this.post<NotionBindingRecord>('/attach', input);
  }

  lock(input: {
    reservationId: string;
    connectedAccountId: string;
    lockedAt: string;
  }): Promise<NotionBindingRecord> {
    return this.post<NotionBindingRecord>('/lock', input);
  }

  async releasePending(reservationId: string): Promise<void> {
    await this.post('/release', { reservationId });
  }

  async reset(input: {
    expectedConnectedAccountId: string;
    operatorSubject: string;
    resetAt: string;
    receiptId: string;
    revoked: boolean;
  }): Promise<void> {
    await this.post('/reset', input);
  }

  async resetPending(input: {
    expectedReservationId: string;
    previousConnectionRequestId: string | null;
    operatorSubject: string;
    resetAt: string;
    receiptId: string;
    revoked: boolean;
  }): Promise<void> {
    await this.post('/reset-pending', input);
  }

  private async post<T = Record<string, unknown>>(path: string, body: unknown): Promise<T> {
    const response = await this.stub.fetch(`https://binding.internal${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return readJson<T>(response);
  }
}

export class NotionClientBindingObject {
  constructor(private readonly state: DurableObjectState) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    try {
      if (request.method === 'GET' && url.pathname === '/binding') {
        const binding = await this.state.storage.get<NotionBindingRecord>('binding');
        return binding ? Response.json(binding) : Response.json({ error: 'not_found' }, { status: 404 });
      }
      if (request.method !== 'POST') return Response.json({ error: 'not_found' }, { status: 404 });
      const body = (await request.json()) as Record<string, unknown>;

      if (url.pathname === '/reserve') {
        const existing = await this.state.storage.get<NotionBindingRecord>('binding');
        if (existing) return conflict('NOTION_BINDING_NOT_AVAILABLE');
        const record: NotionBindingRecord = {
          status: 'pending',
          reservationId: requiredString(body, 'reservationId'),
          operatorSubject: requiredString(body, 'operatorSubject'),
          createdAt: requiredString(body, 'now'),
          connectionRequestId: null,
          redirectUrl: null,
        };
        await this.state.storage.put('binding', record);
        return Response.json(record);
      }

      const existing = await this.state.storage.get<NotionBindingRecord>('binding');
      if (!existing) return conflict('NOTION_BINDING_NOT_AVAILABLE');

      if (url.pathname === '/attach') {
        const reservationId = requiredString(body, 'reservationId');
        if (existing.status !== 'pending' || existing.reservationId !== reservationId) {
          return conflict('NOTION_RESERVATION_MISMATCH');
        }
        const record: NotionBindingRecord = {
          ...existing,
          connectionRequestId: requiredString(body, 'connectionRequestId'),
          redirectUrl: requiredString(body, 'redirectUrl'),
        };
        await this.state.storage.put('binding', record);
        return Response.json(record);
      }

      if (url.pathname === '/lock') {
        const reservationId = requiredString(body, 'reservationId');
        const connectedAccountId = requiredString(body, 'connectedAccountId');
        if (
          existing.status === 'locked' &&
          existing.reservationId === reservationId &&
          existing.connectedAccountId === connectedAccountId
        ) {
          return Response.json(existing);
        }
        if (existing.status !== 'pending' || existing.reservationId !== reservationId) {
          return conflict('NOTION_RESERVATION_MISMATCH');
        }
        const record: NotionBindingRecord = {
          ...existing,
          status: 'locked',
          connectedAccountId,
          lockedAt: requiredString(body, 'lockedAt'),
        };
        await this.state.storage.put('binding', record);
        return Response.json(record);
      }

      if (url.pathname === '/release') {
        const reservationId = requiredString(body, 'reservationId');
        if (existing.status === 'pending' && existing.reservationId === reservationId) {
          await this.state.storage.delete('binding');
        }
        return Response.json({ ok: true });
      }

      if (url.pathname === '/reset') {
        const expectedConnectedAccountId = requiredString(body, 'expectedConnectedAccountId');
        if (
          existing.status !== 'locked' ||
          existing.connectedAccountId !== expectedConnectedAccountId
        ) {
          return conflict('NOTION_LOCK_MISMATCH');
        }
        const receiptId = requiredString(body, 'receiptId');
        const receipt = {
          receiptId,
          previousConnectedAccountId: expectedConnectedAccountId,
          operatorSubject: requiredString(body, 'operatorSubject'),
          resetAt: requiredString(body, 'resetAt'),
          revoked: body.revoked === true,
        };
        await this.state.storage.put(`audit:${receiptId}`, receipt);
        await this.state.storage.delete('binding');
        return Response.json({ ok: true, receipt });
      }

      if (url.pathname === '/reset-pending') {
        const expectedReservationId = requiredString(body, 'expectedReservationId');
        if (
          existing.status !== 'pending' ||
          existing.reservationId !== expectedReservationId
        ) {
          return conflict('NOTION_RESERVATION_MISMATCH');
        }
        const receiptId = requiredString(body, 'receiptId');
        const receipt = {
          receiptId,
          previousStatus: 'pending',
          previousConnectionRequestId:
            typeof body.previousConnectionRequestId === 'string'
              ? body.previousConnectionRequestId
              : null,
          operatorSubject: requiredString(body, 'operatorSubject'),
          resetAt: requiredString(body, 'resetAt'),
          revoked: body.revoked === true,
        };
        await this.state.storage.put(`audit:${receiptId}`, receipt);
        await this.state.storage.delete('binding');
        return Response.json({ ok: true, receipt });
      }

      return Response.json({ error: 'not_found' }, { status: 404 });
    } catch (error) {
      return Response.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 400 },
      );
    }
  }
}

async function readJson<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? `Binding store request failed with ${response.status}.`);
  }
  return payload;
}

function requiredString(value: Record<string, unknown>, key: string): string {
  const result = value[key];
  if (typeof result !== 'string' || !result.trim()) throw new Error(`${key} is required.`);
  return result;
}

function conflict(error: string): Response {
  return Response.json({ error }, { status: 409 });
}
