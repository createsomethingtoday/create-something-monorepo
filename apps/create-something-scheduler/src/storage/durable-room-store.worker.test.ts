import { env, runInDurableObject } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import type { CreateRoomSuccess, Room } from '../application/room-service.js';
import { DurableRoomStore } from './durable-room-store.js';

describe('DurableRoomStore', () => {
  it('persists room creation, consumes a capability once, and never stores provider tokens', async () => {
    const stub = env.SCHEDULER.get(env.SCHEDULER.idFromName('durable-room-lifecycle'));
    const room: Room = {
      roomId: 'room_durable',
      title: 'Durable Room',
      status: 'ready',
      providerMeetingId: 'meeting_durable',
      joinUrl: 'https://scheduler.local/rooms/room_durable',
      createdAt: '2026-07-11T22:00:00Z',
      participants: {}
    };
    const created: CreateRoomSuccess = {
      status: 'ready',
      room,
      replayed: false,
      receiptId: 'receipt_room_durable',
      policyVersion: 'meeting-room.v1',
      occurredAt: room.createdAt,
      nextActions: ['issue_join_credential', 'get_room', 'end_room']
    };

    const createAudit = await runInDurableObject(stub, async (_instance, state) => {
      const firstStore = new DurableRoomStore(state);
      let providerCreates = 0;
      const first = await firstStore.createExactlyOnce('create-key', 'fingerprint', async () => {
        providerCreates += 1;
        return created;
      });
      const replay = await new DurableRoomStore(state).createExactlyOnce(
        'create-key',
        'fingerprint',
        async () => {
          providerCreates += 1;
          return created;
        }
      );
      return { first, replay, providerCreates };
    });
    expect(createAudit).toEqual({
      first: created,
      replay: { ...created, replayed: true },
      providerCreates: 1
    });

    const joinAudit = await runInDurableObject(stub, async (_instance, state) => {
      const store = new DurableRoomStore(state);
      let providerJoins = 0;
      const exchange = () => store.exchangeJoinCapability({
        roomId: room.roomId,
        role: 'guest',
        nonce: 'one-time-nonce',
        occurredAt: '2026-07-11T22:05:00Z'
      }, async () => {
        providerJoins += 1;
        return {
          status: 'ready' as const,
          providerParticipantId: 'participant_durable',
          providerToken: 'provider-token-must-not-persist'
        };
      });
      const results = await Promise.all([exchange(), exchange()]);
      const stored = state.storage.sql.exec<{ room_json: string }>(
        'SELECT room_json FROM meeting_rooms WHERE room_id = ?',
        room.roomId
      ).one();
      const idempotency = state.storage.sql.exec<{ result_json: string }>(
        'SELECT result_json FROM meeting_room_create_idempotency WHERE idempotency_key = ?',
        'create-key'
      ).one();
      return { results, providerJoins, stored: stored.room_json, idempotency: idempotency.result_json };
    });
    expect(joinAudit.results.map((result) => result.status).sort()).toEqual(['ready', 'rejected']);
    expect(joinAudit.providerJoins).toBe(1);
    expect(joinAudit.stored).not.toContain('provider-token-must-not-persist');
    expect(joinAudit.idempotency).not.toContain('provider-token-must-not-persist');
    expect(JSON.parse(joinAudit.stored)).toMatchObject({
      status: 'active',
      participants: { guest: { providerParticipantId: 'participant_durable' } }
    });
  });

  it('persists terminal end and replays without rerunning the provider', async () => {
    const stub = env.SCHEDULER.get(env.SCHEDULER.idFromName('durable-room-end'));
    const room: Room = {
      roomId: 'room_end_durable',
      title: 'End Room',
      status: 'ready',
      providerMeetingId: 'meeting_end_durable',
      joinUrl: 'https://scheduler.local/rooms/room_end_durable',
      createdAt: '2026-07-11T22:00:00Z',
      participants: {}
    };
    const result = await runInDurableObject(stub, async (_instance, state) => {
      const store = new DurableRoomStore(state);
      await store.createExactlyOnce('end-create', 'fingerprint', async () => ({
        status: 'ready',
        room,
        replayed: false,
        receiptId: 'receipt_end_create',
        policyVersion: 'meeting-room.v1',
        occurredAt: room.createdAt,
        nextActions: []
      }));
      let providerEnds = 0;
      const input = {
        roomId: room.roomId,
        idempotencyKey: 'end-key',
        occurredAt: '2026-07-11T22:30:00Z'
      };
      const first = await store.endExactlyOnce(input, async () => {
        providerEnds += 1;
        return { status: 'ended' };
      });
      const replay = await new DurableRoomStore(state).endExactlyOnce(input, async () => {
        providerEnds += 1;
        return { status: 'ended' };
      });
      return { first, replay, providerEnds, room: await store.getRoom(room.roomId) };
    });

    expect(result.providerEnds).toBe(1);
    expect(result.first).toMatchObject({ status: 'ended', replayed: false });
    expect(result.replay).toMatchObject({ status: 'ended', replayed: true });
    expect(result.room).toMatchObject({ status: 'ended', endedAt: '2026-07-11T22:30:00Z' });
  });
});
