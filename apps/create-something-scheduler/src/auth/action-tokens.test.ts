import { describe, expect, it } from 'vitest';
import {
  HmacActionTokenSigner,
  HmacProposalSigner,
  HmacRoomCapabilitySigner
} from './action-tokens.js';

describe('HMAC scheduler tokens', () => {
  it('round-trips proposal payloads and rejects tampering', async () => {
    const signer = new HmacProposalSigner('controlled-signing-secret-with-enough-entropy');
    const token = await signer.sign('{"proposalId":"proposal_controlled"}');

    await expect(signer.verify(token)).resolves.toBe('{"proposalId":"proposal_controlled"}');
    await expect(signer.verify(`${token}tampered`)).resolves.toBeNull();
  });

  it('issues booking-scoped action tokens and rejects expired or cross-booking access', async () => {
    const signer = new HmacActionTokenSigner('controlled-action-secret-with-enough-entropy');
    const token = await signer.issue({
      bookingId: 'booking_controlled',
      expiresAt: '2026-08-14T16:00:00Z'
    });

    await expect(signer.verify(token, '2026-07-14T16:00:00Z')).resolves.toEqual({
      role: 'booking',
      bookingId: 'booking_controlled'
    });
    await expect(signer.verify(token, '2026-09-14T16:00:00Z')).resolves.toBeNull();
    await expect(signer.verify(`${token}.invalid`, '2026-07-14T16:00:00Z')).resolves.toBeNull();
  });

  it('binds room join capabilities to room, role, expiry, and nonce', async () => {
    const signer = new HmacRoomCapabilitySigner('controlled-room-secret-with-enough-entropy');
    const token = await signer.issue({
      roomId: 'room_controlled',
      role: 'guest',
      nonce: 'nonce_controlled',
      expiresAt: '2026-07-11T23:00:00Z'
    });

    await expect(signer.verify(token, {
      roomId: 'room_controlled',
      now: '2026-07-11T22:00:00Z'
    })).resolves.toEqual({
      roomId: 'room_controlled',
      role: 'guest',
      nonce: 'nonce_controlled',
      expiresAt: '2026-07-11T23:00:00Z'
    });
    await expect(signer.verify(token, {
      roomId: 'room_other',
      now: '2026-07-11T22:00:00Z'
    })).resolves.toBeNull();
    await expect(signer.verify(token, {
      roomId: 'room_controlled',
      now: '2026-07-12T00:00:00Z'
    })).resolves.toBeNull();
    await expect(signer.verify(`${token}tampered`, {
      roomId: 'room_controlled',
      now: '2026-07-11T22:00:00Z'
    })).resolves.toBeNull();
  });
});
