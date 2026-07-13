import { describe, expect, it, vi } from 'vitest';
import { RealtimeKitProvider } from './realtimekit.js';

describe('RealtimeKitProvider', () => {
  it('reconciles a meeting before creation and sends explicit no-recording defaults', async () => {
    const requests: Request[] = [];
    const fetcher = vi.fn(async (request: Request) => {
      requests.push(request.clone() as Request);
      if (request.method === 'GET') {
        return Response.json({ success: true, data: [] });
      }
      return Response.json({
        success: true,
        data: { id: 'meeting-controlled' }
      });
    });
    const provider = makeProvider(fetcher);

    await expect(provider.ensureMeeting({
      roomId: 'room-controlled',
      title: 'Create Something Together'
    })).resolves.toEqual({
      status: 'ready',
      providerMeetingId: 'meeting-controlled'
    });
    expect(requests).toHaveLength(2);
    expect(requests[0]?.url).toContain('/meetings?search=room-controlled');
    expect(requests[1]?.method).toBe('POST');
    await expect(requests[1]?.json()).resolves.toEqual({
      title: 'Create Something Together [room-controlled]',
      record_on_start: false,
      live_stream_on_start: false,
      persist_chat: false,
      summarize_on_end: false,
      transcribe_on_end: false,
      session_keep_alive_time_in_secs: 60
    });
    expect(requests[1]?.headers.get('authorization')).toBe('Bearer protected-token');
  });

  it('adds one role participant, refreshes it, and never sends PII as custom ID', async () => {
    const requests: Request[] = [];
    const fetcher = vi.fn(async (request: Request) => {
      requests.push(request.clone() as Request);
      if (request.url.endsWith('/token')) {
        return Response.json({ success: true, data: { token: 'fresh-token' } });
      }
      return Response.json({
        success: true,
        data: { id: 'participant-controlled', token: 'initial-token' }
      });
    });
    const provider = makeProvider(fetcher);

    await expect(provider.issueParticipantCredential({
      providerMeetingId: 'meeting-controlled',
      customParticipantId: 'participant_guest_internal',
      displayName: 'guest@example.com',
      role: 'guest'
    })).resolves.toEqual({
      status: 'ready',
      providerParticipantId: 'participant-controlled',
      providerToken: 'initial-token'
    });
    await expect(provider.issueParticipantCredential({
      providerMeetingId: 'meeting-controlled',
      customParticipantId: 'participant_guest_internal',
      displayName: 'guest@example.com',
      role: 'guest',
      providerParticipantId: 'participant-controlled'
    })).resolves.toEqual({
      status: 'ready',
      providerParticipantId: 'participant-controlled',
      providerToken: 'fresh-token'
    });
    const addedBody = await requests[0]?.json();
    expect(addedBody).toEqual({
      custom_participant_id: 'participant_guest_internal',
      name: 'guest@example.com',
      preset_name: 'create_something_guest'
    });
    expect(JSON.stringify(addedBody)).not.toContain('custom_participant_id":"guest@');
    expect(requests[1]?.url).toContain('/participants/participant-controlled/token');
  });

  it('inactivates a meeting before kicking all live peers and normalizes uncertainty', async () => {
    const requests: Request[] = [];
    const fetcher = vi.fn(async (request: Request) => {
      requests.push(request.clone() as Request);
      if (request.method === 'PATCH') return Response.json({ success: true, data: {} });
      return new Response('No active session', { status: 404 });
    });
    const provider = makeProvider(fetcher);

    await expect(provider.endMeeting({ providerMeetingId: 'meeting-controlled' }))
      .resolves.toEqual({ status: 'ended' });
    expect(requests.map((request) => `${request.method} ${request.url}`)).toEqual([
      expect.stringMatching(/^PATCH .*\/meetings\/meeting-controlled$/),
      expect.stringMatching(/^POST .*\/active-session\/kick-all$/)
    ]);
    await expect(requests[0]?.json()).resolves.toEqual({ status: 'INACTIVE' });

    const unavailable = makeProvider(async () => new Response('upstream exploded', { status: 503 }));
    await expect(unavailable.ensureMeeting({ roomId: 'room', title: 'Title' }))
      .resolves.toEqual({ status: 'retryable', reason: 'realtimekit_unavailable' });
  });
});

function makeProvider(fetcher: (request: Request) => Promise<Response>): RealtimeKitProvider {
  return new RealtimeKitProvider({
    accountId: 'account-controlled',
    appId: 'app-controlled',
    apiToken: 'protected-token',
    hostPresetName: 'create_something_host',
    guestPresetName: 'create_something_guest',
    fetcher
  });
}
