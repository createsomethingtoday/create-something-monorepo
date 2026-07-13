import {
  ROOM_POLICY_VERSION,
  type CreateRoomResult,
  type CreateRoomSuccess,
  type EndActionResult,
  type EndStoreResult,
  type JoinActionResult,
  type JoinStoreResult,
  type Room,
  type RoomParticipant,
  type RoomRole,
  type RoomStore
} from '../application/room-service.js';

type CreateRow = {
  fingerprint: string;
  result_json: string;
};

type RoomRow = {
  room_json: string;
};

type EndRow = {
  room_id: string;
  room_json: string;
};

export class DurableRoomStore implements RoomStore {
  constructor(private readonly state: DurableObjectState) {
    state.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS meeting_rooms (
        room_id TEXT PRIMARY KEY,
        status TEXT NOT NULL,
        provider_meeting_id TEXT NOT NULL,
        room_json TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS meeting_room_create_idempotency (
        idempotency_key TEXT PRIMARY KEY,
        fingerprint TEXT NOT NULL,
        room_id TEXT NOT NULL,
        result_json TEXT NOT NULL,
        FOREIGN KEY(room_id) REFERENCES meeting_rooms(room_id)
      );
      CREATE TABLE IF NOT EXISTS meeting_room_capability_nonces (
        room_id TEXT NOT NULL,
        nonce TEXT NOT NULL,
        role TEXT NOT NULL,
        consumed_at TEXT NOT NULL,
        PRIMARY KEY(room_id, nonce),
        FOREIGN KEY(room_id) REFERENCES meeting_rooms(room_id)
      );
      CREATE TABLE IF NOT EXISTS meeting_room_end_idempotency (
        idempotency_key TEXT PRIMARY KEY,
        room_id TEXT NOT NULL,
        room_json TEXT NOT NULL,
        FOREIGN KEY(room_id) REFERENCES meeting_rooms(room_id)
      );
    `);
  }

  async createExactlyOnce(
    idempotencyKey: string,
    fingerprint: string,
    action: () => Promise<CreateRoomResult>
  ): Promise<CreateRoomResult> {
    return this.state.blockConcurrencyWhile(async () => {
      const replay = this.state.storage.sql.exec<CreateRow>(
        `SELECT fingerprint, result_json
           FROM meeting_room_create_idempotency
          WHERE idempotency_key = ?`,
        idempotencyKey
      ).toArray()[0];
      if (replay) {
        const result = JSON.parse(replay.result_json) as CreateRoomSuccess;
        if (replay.fingerprint !== fingerprint) {
          return {
            receiptId: result.receiptId,
            policyVersion: ROOM_POLICY_VERSION,
            occurredAt: result.occurredAt,
            nextActions: ['use_new_idempotency_key'],
            status: 'rejected',
            reason: 'idempotency_key_conflict'
          };
        }
        return { ...result, replayed: true };
      }

      const result = await action();
      if (result.status !== 'ready') return result;
      this.state.storage.transactionSync(() => {
        this.state.storage.sql.exec(
          `INSERT INTO meeting_rooms(room_id, status, provider_meeting_id, room_json)
           VALUES (?, ?, ?, ?)`,
          result.room.roomId,
          result.room.status,
          result.room.providerMeetingId,
          JSON.stringify(result.room)
        );
        this.state.storage.sql.exec(
          `INSERT INTO meeting_room_create_idempotency(
             idempotency_key, fingerprint, room_id, result_json
           ) VALUES (?, ?, ?, ?)`,
          idempotencyKey,
          fingerprint,
          result.room.roomId,
          JSON.stringify(result)
        );
      });
      return result;
    });
  }

  async getRoom(roomId: string): Promise<Room | null> {
    const row = this.state.storage.sql.exec<RoomRow>(
      'SELECT room_json FROM meeting_rooms WHERE room_id = ?',
      roomId
    ).toArray()[0];
    return row ? JSON.parse(row.room_json) as Room : null;
  }

  async exchangeJoinCapability(
    input: { roomId: string; role: RoomRole; nonce: string; occurredAt: string },
    action: (participant: RoomParticipant | undefined) => Promise<JoinActionResult>
  ): Promise<JoinStoreResult> {
    return this.state.blockConcurrencyWhile(async () => {
      const room = await this.getRoom(input.roomId);
      if (!room) return { status: 'rejected', reason: 'room_not_found' };
      if (room.status === 'ended') return { status: 'rejected', reason: 'room_ended' };
      const replay = this.state.storage.sql.exec<{ nonce: string }>(
        `SELECT nonce FROM meeting_room_capability_nonces
          WHERE room_id = ? AND nonce = ?`,
        input.roomId,
        input.nonce
      ).toArray()[0];
      if (replay) return { status: 'rejected', reason: 'capability_replayed' };

      const result = await action(room.participants[input.role]);
      if (result.status === 'retryable') return result;
      room.status = 'active';
      room.participants[input.role] = {
        providerParticipantId: result.providerParticipantId,
        joinedAt: input.occurredAt
      };
      this.state.storage.transactionSync(() => {
        this.state.storage.sql.exec(
          `INSERT INTO meeting_room_capability_nonces(room_id, nonce, role, consumed_at)
           VALUES (?, ?, ?, ?)`,
          input.roomId,
          input.nonce,
          input.role,
          input.occurredAt
        );
        this.updateRoom(room);
      });
      return { ...result, room };
    });
  }

  async endExactlyOnce(
    input: { roomId: string; idempotencyKey: string; occurredAt: string; capabilityNonce?: string },
    action: (room: Room) => Promise<EndActionResult>
  ): Promise<EndStoreResult> {
    return this.state.blockConcurrencyWhile(async () => {
      const replay = this.state.storage.sql.exec<EndRow>(
        `SELECT room_id, room_json
           FROM meeting_room_end_idempotency
          WHERE idempotency_key = ?`,
        input.idempotencyKey
      ).toArray()[0];
      if (replay) {
        if (replay.room_id !== input.roomId) {
          return { status: 'rejected', reason: 'idempotency_key_conflict' };
        }
        return {
          status: 'ended',
          room: JSON.parse(replay.room_json) as Room,
          replayed: true
        };
      }
      const room = await this.getRoom(input.roomId);
      if (!room) return { status: 'rejected', reason: 'room_not_found' };
      if (room.status === 'ended') return { status: 'ended', room, replayed: true };
      if (input.capabilityNonce) {
        const consumed = this.state.storage.sql.exec<{ nonce: string }>(
          `SELECT nonce FROM meeting_room_capability_nonces
            WHERE room_id = ? AND nonce = ?`,
          input.roomId,
          input.capabilityNonce
        ).toArray()[0];
        if (consumed) return { status: 'rejected', reason: 'capability_replayed' };
      }

      const result = await action(room);
      if (result.status === 'retryable') return result;
      room.status = 'ended';
      room.endedAt = input.occurredAt;
      this.state.storage.transactionSync(() => {
        if (input.capabilityNonce) {
          this.state.storage.sql.exec(
            `INSERT INTO meeting_room_capability_nonces(room_id, nonce, role, consumed_at)
             VALUES (?, ?, 'host', ?)`,
            input.roomId,
            input.capabilityNonce,
            input.occurredAt
          );
        }
        this.updateRoom(room);
        this.state.storage.sql.exec(
          `INSERT INTO meeting_room_end_idempotency(idempotency_key, room_id, room_json)
           VALUES (?, ?, ?)`,
          input.idempotencyKey,
          room.roomId,
          JSON.stringify(room)
        );
      });
      return { status: 'ended', room, replayed: false };
    });
  }

  private updateRoom(room: Room): void {
    this.state.storage.sql.exec(
      `UPDATE meeting_rooms
          SET status = ?, provider_meeting_id = ?, room_json = ?
        WHERE room_id = ?`,
      room.status,
      room.providerMeetingId,
      JSON.stringify(room),
      room.roomId
    );
  }
}
