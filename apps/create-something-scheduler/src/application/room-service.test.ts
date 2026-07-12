import { describe, expect, it, vi } from 'vitest';
import {
  InMemoryRoomStore,
  RoomService,
  type RoomProvider
} from './room-service.js';
import { HmacRoomCapabilitySigner } from '../auth/action-tokens.js';

describe('RoomService', () => {
  it('creates one receipted room and safely replays the same intent', async () => {
    const ensureMeeting = vi.fn(async (_input: { roomId: string; title: string }) => ({
      status: 'ready' as const,
      providerMeetingId: 'rtk-meeting-controlled'
    }));
    const provider: RoomProvider = {
      ensureMeeting,
      issueParticipantCredential: vi.fn(),
      endMeeting: vi.fn()
    };
    const service = new RoomService({
      provider,
      store: new InMemoryRoomStore(),
      clock: { now: () => '2026-07-11T22:00:00Z' },
      publicOrigin: 'https://scheduler.local'
    });
    const input = {
      title: 'Create Something Together',
      bookingId: 'booking-controlled',
      idempotencyKey: 'room-for-booking-controlled',
      explicitIntent: true
    };

    const created = await service.createRoom(input);
    const replayed = await service.createRoom(input);

    expect(created).toMatchObject({
      status: 'ready',
      replayed: false,
      policyVersion: 'meeting-room.v1',
      room: {
        status: 'ready',
        bookingId: 'booking-controlled',
        providerMeetingId: 'rtk-meeting-controlled',
        joinUrl: expect.stringMatching(/^https:\/\/scheduler\.local\/rooms\//)
      },
      nextActions: ['issue_join_credential', 'get_room', 'end_room']
    });
    expect(replayed).toEqual({ ...created, replayed: true });
    expect(ensureMeeting).toHaveBeenCalledTimes(1);
    expect(ensureMeeting).toHaveBeenCalledWith(expect.objectContaining({
      roomId: created.status === 'ready' ? created.room.roomId : undefined,
      title: 'Create Something Together'
    }));

    await expect(service.createRoom({ ...input, title: 'Changed title' })).resolves.toMatchObject({
      status: 'rejected',
      reason: 'idempotency_key_conflict'
    });
    expect(ensureMeeting).toHaveBeenCalledTimes(1);
  });

  it('fails closed without persisting a partial room when the provider is unavailable', async () => {
    const store = new InMemoryRoomStore();
    const ensureMeeting = vi.fn(async (_input: { roomId: string; title: string }) => ({
      status: 'retryable' as const,
      reason: 'realtimekit_unavailable'
    }));
    const service = new RoomService({
      provider: {
        ensureMeeting,
        issueParticipantCredential: vi.fn(),
        endMeeting: vi.fn()
      },
      store,
      clock: { now: () => '2026-07-11T22:00:00Z' },
      publicOrigin: 'https://scheduler.local'
    });

    const result = await service.createRoom({
      title: 'Provider failure room',
      idempotencyKey: 'provider-failure-room',
      explicitIntent: true
    });

    expect(result).toMatchObject({
      status: 'retryable',
      reason: 'realtimekit_unavailable'
    });
    const attemptedRoomId = ensureMeeting.mock.calls[0]?.[0].roomId;
    expect(attemptedRoomId).toBeTruthy();
    await expect(store.getRoom(attemptedRoomId!)).resolves.toBeNull();
  });

  it('exchanges one-time role capabilities, rotates refresh access, and ends terminally', async () => {
    const signer = new HmacRoomCapabilitySigner('controlled-room-secret-with-enough-entropy');
    const issueParticipantCredential = vi.fn(async (input: {
      role: 'host' | 'guest';
      providerParticipantId?: string;
    }) => ({
      status: 'ready' as const,
      providerParticipantId: input.providerParticipantId ?? `participant-${input.role}`,
      providerToken: `provider-token-${input.role}`
    }));
    const endMeeting = vi.fn(async () => ({ status: 'ended' as const }));
    const provider: RoomProvider = {
      ensureMeeting: vi.fn(async () => ({
        status: 'ready' as const,
        providerMeetingId: 'rtk-meeting-lifecycle'
      })),
      issueParticipantCredential,
      endMeeting
    };
    let nonce = 0;
    const service = new RoomService({
      provider,
      store: new InMemoryRoomStore(),
      capabilities: signer,
      nonce: () => `rotated-nonce-${++nonce}`,
      clock: { now: () => '2026-07-11T22:00:00Z' },
      publicOrigin: 'https://scheduler.local'
    });
    const created = await service.createRoom({
      title: 'Create Something Together',
      idempotencyKey: 'room-lifecycle',
      explicitIntent: true
    });
    expect(created.status).toBe('ready');
    if (created.status !== 'ready') throw new Error('Expected room');
    const roomId = created.room.roomId;
    const guestCapability = await signer.issue({
      roomId,
      role: 'guest',
      nonce: 'initial-guest-nonce',
      expiresAt: '2026-07-11T23:00:00Z'
    });
    const hostCapability = await signer.issue({
      roomId,
      role: 'host',
      nonce: 'initial-host-nonce',
      expiresAt: '2026-07-11T23:00:00Z'
    });

    const hostJoin = await service.issueJoinCredential({
      roomId,
      capability: hostCapability,
      displayName: 'Host Operator'
    });
    expect(hostJoin).toMatchObject({
      status: 'ready',
      role: 'host',
      providerParticipantId: 'participant-host'
    });

    const guestJoin = await service.issueJoinCredential({
      roomId,
      capability: guestCapability,
      displayName: 'Client Guest'
    });
    expect(guestJoin).toMatchObject({
      status: 'ready',
      role: 'guest',
      providerMeetingId: 'rtk-meeting-lifecycle',
      providerToken: 'provider-token-guest',
      cacheControl: 'no-store',
      nextCapability: expect.any(String)
    });
    await expect(service.issueJoinCredential({
      roomId,
      capability: guestCapability,
      displayName: 'Client Guest'
    })).resolves.toMatchObject({ status: 'rejected', reason: 'capability_replayed' });

    if (guestJoin.status !== 'ready') throw new Error('Expected guest credential');
    const refreshed = await service.issueJoinCredential({
      roomId,
      capability: guestJoin.nextCapability,
      displayName: 'Client Guest'
    });
    expect(refreshed).toMatchObject({ status: 'ready', role: 'guest' });
    expect(issueParticipantCredential).toHaveBeenNthCalledWith(3, expect.objectContaining({
      providerParticipantId: 'participant-guest',
      role: 'guest'
    }));

    const read = await service.getRoom({ roomId });
    expect(read).toMatchObject({
      status: 'active',
      room: {
        participants: {
          host: { providerParticipantId: 'participant-host' },
          guest: { providerParticipantId: 'participant-guest' }
        }
      }
    });
    if (read.status !== 'active') throw new Error('Expected active room');
    expect(Object.keys(read.room.participants)).toEqual(['host', 'guest']);
    expect(JSON.stringify(read)).not.toContain('provider-token');

    if (refreshed.status !== 'ready') throw new Error('Expected refreshed credential');
    await expect(service.endRoom({
      roomId,
      idempotencyKey: 'guest-cannot-end',
      explicitIntent: true,
      capability: refreshed.nextCapability
    })).resolves.toMatchObject({ status: 'rejected', reason: 'host_capability_required' });

    await expect(service.endRoom({
      roomId,
      idempotencyKey: 'end-lifecycle',
      explicitIntent: false
    })).resolves.toMatchObject({ status: 'operator_required' });
    const ended = await service.endRoom({
      roomId,
      idempotencyKey: 'end-lifecycle',
      explicitIntent: true
    });
    const replayedEnd = await service.endRoom({
      roomId,
      idempotencyKey: 'end-lifecycle',
      explicitIntent: true
    });
    expect(ended).toMatchObject({ status: 'ended', replayed: false });
    expect(replayedEnd).toEqual({ ...ended, replayed: true });
    expect(endMeeting).toHaveBeenCalledTimes(1);
    await expect(service.issueJoinCredential({
      roomId,
      capability: guestJoin.nextCapability,
      displayName: 'Client Guest'
    })).resolves.toMatchObject({ status: 'rejected', reason: 'room_ended' });
  });
});
