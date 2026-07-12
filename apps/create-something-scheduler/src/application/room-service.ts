export const ROOM_POLICY_VERSION = 'meeting-room.v1';

export type RoomClock = {
  now(): string;
};

export type Room = {
  roomId: string;
  bookingId?: string;
  title: string;
  status: 'ready' | 'active' | 'ended';
  providerMeetingId: string;
  joinUrl: string;
  createdAt: string;
  endedAt?: string;
  participants: Partial<Record<RoomRole, RoomParticipant>>;
};

export type RoomRole = 'host' | 'guest';

export type RoomParticipant = {
  providerParticipantId: string;
  joinedAt: string;
};

export type EnsureMeetingResult =
  | { status: 'ready'; providerMeetingId: string }
  | { status: 'retryable'; reason: string };

export type RoomProvider = {
  ensureMeeting(input: { roomId: string; title: string }): Promise<EnsureMeetingResult>;
  issueParticipantCredential(input: {
    providerMeetingId: string;
    customParticipantId: string;
    displayName: string;
    role: RoomRole;
    providerParticipantId?: string;
  }): Promise<
    | {
        status: 'ready';
        providerParticipantId: string;
        providerToken: string;
      }
    | { status: 'retryable'; reason: string }
  >;
  endMeeting(input: { providerMeetingId: string }): Promise<
    | { status: 'ended' }
    | { status: 'retryable'; reason: string }
  >;
};

export type CreateRoomInput = {
  bookingId?: string;
  title: string;
  idempotencyKey: string;
  explicitIntent: boolean;
};

type RoomResultMetadata = {
  receiptId: string;
  policyVersion: typeof ROOM_POLICY_VERSION;
  occurredAt: string;
  nextActions: string[];
};

export type CreateRoomSuccess = RoomResultMetadata & {
  status: 'ready';
  room: Room;
  replayed: boolean;
  invites?: {
    hostUrl: string;
    guestUrl: string;
    expiresAt: string;
  };
};

export type CreateRoomResult =
  | CreateRoomSuccess
  | (RoomResultMetadata & {
      status: 'rejected' | 'retryable' | 'operator_required';
      reason: string;
    });

type StoredCreate = {
  fingerprint: string;
  result: CreateRoomSuccess;
};

type CapabilityClaims = {
  roomId: string;
  role: RoomRole;
  nonce: string;
  expiresAt: string;
};

export type RoomCapabilityCodec = {
  issue(claims: CapabilityClaims): Promise<string>;
  verify(
    token: string,
    input: { roomId: string; now: string }
  ): Promise<CapabilityClaims | null>;
};

export type JoinActionResult =
  | {
      status: 'ready';
      providerParticipantId: string;
      providerToken: string;
    }
  | { status: 'retryable'; reason: string };

export type JoinStoreResult =
  | {
      status: 'ready';
      providerParticipantId: string;
      providerToken: string;
      room: Room;
    }
  | { status: 'retryable'; reason: string }
  | { status: 'rejected'; reason: 'room_not_found' | 'room_ended' | 'capability_replayed' };

export type EndActionResult =
  | { status: 'ended' }
  | { status: 'retryable'; reason: string };

export type EndStoreResult =
  | { status: 'ended'; room: Room; replayed: boolean }
  | { status: 'rejected'; reason: 'room_not_found' | 'idempotency_key_conflict' | 'capability_replayed' }
  | { status: 'retryable'; reason: string };

export type RoomStore = {
  createExactlyOnce(
    idempotencyKey: string,
    fingerprint: string,
    action: () => Promise<CreateRoomResult>
  ): Promise<CreateRoomResult>;
  getRoom(roomId: string): Promise<Room | null>;
  exchangeJoinCapability(
    input: { roomId: string; role: RoomRole; nonce: string; occurredAt: string },
    action: (participant: RoomParticipant | undefined) => Promise<JoinActionResult>
  ): Promise<JoinStoreResult>;
  endExactlyOnce(
    input: { roomId: string; idempotencyKey: string; occurredAt: string; capabilityNonce?: string },
    action: (room: Room) => Promise<EndActionResult>
  ): Promise<EndStoreResult>;
};

export class InMemoryRoomStore implements RoomStore {
  private gate = Promise.resolve();
  private readonly creates = new Map<string, StoredCreate>();
  private readonly rooms = new Map<string, Room>();
  private readonly usedCapabilityNonces = new Set<string>();
  private readonly ends = new Map<string, { roomId: string; room: Room }>();

  async createExactlyOnce(
    idempotencyKey: string,
    fingerprint: string,
    action: () => Promise<CreateRoomResult>
  ): Promise<CreateRoomResult> {
    let release = () => {};
    const previousGate = this.gate;
    this.gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    await previousGate;
    try {
      const existing = this.creates.get(idempotencyKey);
      if (existing) {
        if (existing.fingerprint !== fingerprint) {
          return conflictResult(existing.result.occurredAt, idempotencyKey);
        }
        return structuredClone({ ...existing.result, replayed: true });
      }

      const result = await action();
      if (result.status === 'ready') {
        this.creates.set(idempotencyKey, {
          fingerprint,
          result: structuredClone(result)
        });
        this.rooms.set(result.room.roomId, structuredClone(result.room));
      }
      return structuredClone(result);
    } finally {
      release();
    }
  }

  async getRoom(roomId: string): Promise<Room | null> {
    const room = this.rooms.get(roomId);
    return room ? structuredClone(room) : null;
  }

  async exchangeJoinCapability(
    input: { roomId: string; role: RoomRole; nonce: string; occurredAt: string },
    action: (participant: RoomParticipant | undefined) => Promise<JoinActionResult>
  ): Promise<JoinStoreResult> {
    return this.withLock(async () => {
      const room = this.rooms.get(input.roomId);
      if (!room) return { status: 'rejected', reason: 'room_not_found' };
      if (room.status === 'ended') return { status: 'rejected', reason: 'room_ended' };
      const nonceKey = `${input.roomId}:${input.nonce}`;
      if (this.usedCapabilityNonces.has(nonceKey)) {
        return { status: 'rejected', reason: 'capability_replayed' };
      }

      const result = await action(room.participants[input.role]);
      if (result.status === 'retryable') return result;
      this.usedCapabilityNonces.add(nonceKey);
      room.participants[input.role] = {
        providerParticipantId: result.providerParticipantId,
        joinedAt: input.occurredAt
      };
      room.status = 'active';
      this.rooms.set(room.roomId, structuredClone(room));
      return { ...result, room: structuredClone(room) };
    });
  }

  async endExactlyOnce(
    input: { roomId: string; idempotencyKey: string; occurredAt: string; capabilityNonce?: string },
    action: (room: Room) => Promise<EndActionResult>
  ): Promise<EndStoreResult> {
    return this.withLock(async () => {
      const replay = this.ends.get(input.idempotencyKey);
      if (replay) {
        if (replay.roomId !== input.roomId) {
          return { status: 'rejected', reason: 'idempotency_key_conflict' };
        }
        return { status: 'ended', room: structuredClone(replay.room), replayed: true };
      }
      const room = this.rooms.get(input.roomId);
      if (!room) return { status: 'rejected', reason: 'room_not_found' };
      if (room.status === 'ended') {
        return { status: 'ended', room: structuredClone(room), replayed: true };
      }
      const capabilityKey = input.capabilityNonce
        ? `${input.roomId}:${input.capabilityNonce}`
        : null;
      if (capabilityKey && this.usedCapabilityNonces.has(capabilityKey)) {
        return { status: 'rejected', reason: 'capability_replayed' };
      }
      const result = await action(structuredClone(room));
      if (result.status === 'retryable') return result;
      if (capabilityKey) this.usedCapabilityNonces.add(capabilityKey);
      room.status = 'ended';
      room.endedAt = input.occurredAt;
      this.rooms.set(room.roomId, structuredClone(room));
      this.ends.set(input.idempotencyKey, { roomId: input.roomId, room: structuredClone(room) });
      return { status: 'ended', room: structuredClone(room), replayed: false };
    });
  }

  private async withLock<T>(action: () => Promise<T>): Promise<T> {
    let release = () => {};
    const previousGate = this.gate;
    this.gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previousGate;
    try {
      return await action();
    } finally {
      release();
    }
  }
}

export type IssueJoinCredentialResult =
  | (RoomResultMetadata & {
      status: 'ready';
      role: RoomRole;
      providerMeetingId: string;
      providerToken: string;
      providerParticipantId: string;
      nextCapability: string;
      cacheControl: 'no-store';
    })
  | (RoomResultMetadata & {
      status: 'rejected' | 'retryable';
      reason: string;
    });

export type RoomReadResult = RoomResultMetadata & (
  | { status: Room['status']; room: Room }
  | { status: 'rejected'; reason: 'room_not_found' }
);

export type EndRoomResult = RoomResultMetadata & (
  | { status: 'ended'; room: Room; replayed: boolean }
  | { status: 'rejected' | 'retryable' | 'operator_required'; reason: string }
);

export class RoomService {
  constructor(
    private readonly dependencies: {
      provider: RoomProvider;
      store: RoomStore;
      clock: RoomClock;
      publicOrigin: string;
      capabilities?: RoomCapabilityCodec;
      nonce?: () => string;
    }
  ) {}

  async createRoom(input: CreateRoomInput): Promise<CreateRoomResult> {
    const occurredAt = this.dependencies.clock.now();
    if (!input.explicitIntent) {
      return {
        ...metadata(occurredAt, input.idempotencyKey, []),
        status: 'operator_required',
        reason: 'explicit_intent_required'
      };
    }
    if (!input.idempotencyKey.trim() || !input.title.trim()) {
      return {
        ...metadata(occurredAt, input.idempotencyKey, []),
        status: 'rejected',
        reason: 'invalid_room_request'
      };
    }

    const fingerprint = JSON.stringify({
      bookingId: input.bookingId ?? null,
      title: input.title
    });
    const roomId = stableIdentifier('room', input.idempotencyKey);

    const result = await this.dependencies.store.createExactlyOnce(
      input.idempotencyKey,
      fingerprint,
      async () => {
        let providerResult: EnsureMeetingResult;
        try {
          providerResult = await this.dependencies.provider.ensureMeeting({
            roomId,
            title: input.title
          });
        } catch {
          providerResult = {
            status: 'retryable',
            reason: 'provider_meeting_unavailable'
          };
        }

        if (providerResult.status === 'retryable') {
          return {
            ...metadata(occurredAt, input.idempotencyKey, ['retry_create_room']),
            status: 'retryable',
            reason: providerResult.reason
          };
        }

        const origin = this.dependencies.publicOrigin.replace(/\/$/, '');
        const room: Room = {
          roomId,
          ...(input.bookingId ? { bookingId: input.bookingId } : {}),
          title: input.title,
          status: 'ready',
          providerMeetingId: providerResult.providerMeetingId,
          joinUrl: `${origin}/rooms/${roomId}`,
          createdAt: occurredAt,
          participants: {}
        };

        return {
          ...metadata(occurredAt, input.idempotencyKey, [
            'issue_join_credential',
            'get_room',
            'end_room'
          ]),
          status: 'ready',
          room,
          replayed: false
        };
      }
    );
    if (result.status !== 'ready' || !this.dependencies.capabilities) return result;
    const expiresAt = new Date(Date.parse(occurredAt) + 30 * 24 * 60 * 60 * 1000).toISOString();
    const origin = this.dependencies.publicOrigin.replace(/\/$/, '');
    const makeUrl = async (role: RoomRole) => {
      const token = await this.dependencies.capabilities!.issue({
        roomId: result.room.roomId,
        role,
        nonce: this.dependencies.nonce?.() ?? crypto.randomUUID(),
        expiresAt
      });
      return `${origin}/rooms/${result.room.roomId}?cap=${encodeURIComponent(token)}`;
    };
    return {
      ...result,
      invites: {
        hostUrl: await makeUrl('host'),
        guestUrl: await makeUrl('guest'),
        expiresAt
      }
    };
  }

  async issueJoinCredential(input: {
    roomId: string;
    capability: string;
    displayName: string;
  }): Promise<IssueJoinCredentialResult> {
    const occurredAt = this.dependencies.clock.now();
    const baseMetadata = metadata(occurredAt, `${input.roomId}:join`, []);
    const displayName = input.displayName.trim();
    if (!displayName || displayName.length > 80) {
      return { ...baseMetadata, status: 'rejected', reason: 'invalid_display_name' };
    }
    if (!this.dependencies.capabilities) {
      return { ...baseMetadata, status: 'retryable', reason: 'capability_service_unavailable' };
    }
    const claims = await this.dependencies.capabilities.verify(input.capability, {
      roomId: input.roomId,
      now: occurredAt
    });
    if (!claims) {
      return { ...baseMetadata, status: 'rejected', reason: 'invalid_or_expired_capability' };
    }

    const result = await this.dependencies.store.exchangeJoinCapability(
      {
        roomId: input.roomId,
        role: claims.role,
        nonce: claims.nonce,
        occurredAt
      },
      async (participant) => {
        try {
          return await this.dependencies.provider.issueParticipantCredential({
            providerMeetingId: (await this.dependencies.store.getRoom(input.roomId))
              ?.providerMeetingId ?? '',
            customParticipantId: stableIdentifier(`participant-${claims.role}`, input.roomId),
            displayName,
            role: claims.role,
            ...(participant ? { providerParticipantId: participant.providerParticipantId } : {})
          });
        } catch {
          return { status: 'retryable' as const, reason: 'provider_participant_unavailable' };
        }
      }
    );
    if (result.status !== 'ready') {
      return { ...baseMetadata, status: result.status, reason: result.reason };
    }

    const nextCapability = await this.dependencies.capabilities.issue({
      ...claims,
      nonce: this.dependencies.nonce?.() ?? crypto.randomUUID()
    });
    return {
      ...metadata(occurredAt, `${input.roomId}:join:${claims.nonce}`, ['get_room', 'leave_room']),
      status: 'ready',
      role: claims.role,
      providerMeetingId: result.room.providerMeetingId,
      providerToken: result.providerToken,
      providerParticipantId: result.providerParticipantId,
      nextCapability,
      cacheControl: 'no-store'
    };
  }

  async getRoom(input: { roomId: string }): Promise<RoomReadResult> {
    const occurredAt = this.dependencies.clock.now();
    const room = await this.dependencies.store.getRoom(input.roomId);
    if (!room) {
      return {
        ...metadata(occurredAt, `${input.roomId}:read`, []),
        status: 'rejected',
        reason: 'room_not_found'
      };
    }
    return {
      ...metadata(occurredAt, `${input.roomId}:read`, room.status === 'ended' ? [] : ['issue_join_credential', 'end_room']),
      status: room.status,
      room
    };
  }

  async endRoom(input: {
    roomId: string;
    idempotencyKey: string;
    explicitIntent: boolean;
    capability?: string;
  }): Promise<EndRoomResult> {
    const occurredAt = this.dependencies.clock.now();
    if (!input.explicitIntent) {
      return {
        ...metadata(occurredAt, input.idempotencyKey, []),
        status: 'operator_required',
        reason: 'explicit_intent_required'
      };
    }
    if (!input.idempotencyKey.trim()) {
      return {
        ...metadata(occurredAt, input.idempotencyKey, []),
        status: 'rejected',
        reason: 'invalid_end_request'
      };
    }

    let capabilityNonce: string | undefined;
    if (input.capability) {
      if (!this.dependencies.capabilities) {
        return {
          ...metadata(occurredAt, input.idempotencyKey, []),
          status: 'retryable',
          reason: 'capability_service_unavailable'
        };
      }
      const claims = await this.dependencies.capabilities.verify(input.capability, {
        roomId: input.roomId,
        now: occurredAt
      });
      if (!claims || claims.role !== 'host') {
        return {
          ...metadata(occurredAt, input.idempotencyKey, []),
          status: 'rejected',
          reason: 'host_capability_required'
        };
      }
      capabilityNonce = claims.nonce;
    }

    const result = await this.dependencies.store.endExactlyOnce(
      {
        roomId: input.roomId,
        idempotencyKey: input.idempotencyKey,
        occurredAt,
        ...(capabilityNonce ? { capabilityNonce } : {})
      },
      async (room) => {
        try {
          return await this.dependencies.provider.endMeeting({
            providerMeetingId: room.providerMeetingId
          });
        } catch {
          return { status: 'retryable' as const, reason: 'provider_end_unavailable' };
        }
      }
    );
    if (result.status !== 'ended') {
      return { ...metadata(occurredAt, input.idempotencyKey, ['retry_end_room']), ...result };
    }
    return {
      ...metadata(occurredAt, input.idempotencyKey, ['get_room']),
      status: 'ended',
      room: result.room,
      replayed: result.replayed
    };
  }
}

function metadata(occurredAt: string, idempotencyKey: string, nextActions: string[]): RoomResultMetadata {
  return {
    receiptId: stableIdentifier('receipt', idempotencyKey),
    policyVersion: ROOM_POLICY_VERSION,
    occurredAt,
    nextActions
  };
}

function conflictResult(occurredAt: string, idempotencyKey: string): CreateRoomResult {
  return {
    ...metadata(occurredAt, idempotencyKey, ['use_new_idempotency_key']),
    status: 'rejected',
    reason: 'idempotency_key_conflict'
  };
}

function stableIdentifier(prefix: string, value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${prefix}_${(hash >>> 0).toString(36)}`;
}
