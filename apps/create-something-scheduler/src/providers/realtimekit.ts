import type { RoomProvider, RoomRole } from '../application/room-service.js';

type RealtimeKitProviderOptions = {
  accountId: string;
  appId: string;
  apiToken: string;
  hostPresetName: string;
  guestPresetName: string;
  fetcher?: (request: Request) => Promise<Response>;
};

type ApiEnvelope = {
  success?: boolean;
  data?: unknown;
};

export class RealtimeKitProvider implements RoomProvider {
  private readonly fetcher: (request: Request) => Promise<Response>;
  private readonly baseUrl: string;

  constructor(private readonly options: RealtimeKitProviderOptions) {
    this.fetcher = options.fetcher ?? ((request) => fetch(request));
    this.baseUrl = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(options.accountId)}/realtime/kit/${encodeURIComponent(options.appId)}`;
  }

  async ensureMeeting(input: { roomId: string; title: string }) {
    const marker = `[${input.roomId}]`;
    const search = await this.request(`/meetings?search=${encodeURIComponent(input.roomId)}`);
    if (!search.ok) return retryable();
    const existing = arrayData(search.body).find((meeting) =>
      typeof meeting.title === 'string' && meeting.title.includes(marker)
    );
    if (existing && typeof existing.id === 'string') {
      return { status: 'ready' as const, providerMeetingId: existing.id };
    }

    const created = await this.request('/meetings', {
      method: 'POST',
      body: JSON.stringify({
        title: `${input.title} ${marker}`,
        record_on_start: false,
        live_stream_on_start: false,
        persist_chat: false,
        summarize_on_end: false,
        transcribe_on_end: false,
        session_keep_alive_time_in_secs: 60
      })
    });
    const meetingId = objectData(created.body)?.id;
    if (!created.ok || typeof meetingId !== 'string') return retryable();
    return { status: 'ready' as const, providerMeetingId: meetingId };
  }

  async issueParticipantCredential(input: {
    providerMeetingId: string;
    customParticipantId: string;
    displayName: string;
    role: RoomRole;
    providerParticipantId?: string;
  }) {
    if (input.providerParticipantId) {
      const refreshed = await this.request(
        `/meetings/${encodeURIComponent(input.providerMeetingId)}/participants/${encodeURIComponent(input.providerParticipantId)}/token`,
        { method: 'POST' }
      );
      const token = objectData(refreshed.body)?.token;
      if (!refreshed.ok || typeof token !== 'string') return participantRetryable();
      return {
        status: 'ready' as const,
        providerParticipantId: input.providerParticipantId,
        providerToken: token
      };
    }

    const added = await this.request(
      `/meetings/${encodeURIComponent(input.providerMeetingId)}/participants`,
      {
        method: 'POST',
        body: JSON.stringify({
          custom_participant_id: input.customParticipantId,
          name: input.displayName,
          preset_name: input.role === 'host'
            ? this.options.hostPresetName
            : this.options.guestPresetName
        })
      }
    );
    const data = objectData(added.body);
    if (
      !added.ok ||
      typeof data?.id !== 'string' ||
      typeof data.token !== 'string'
    ) return participantRetryable();
    return {
      status: 'ready' as const,
      providerParticipantId: data.id,
      providerToken: data.token
    };
  }

  async endMeeting(input: { providerMeetingId: string }) {
    const meetingPath = `/meetings/${encodeURIComponent(input.providerMeetingId)}`;
    const inactivated = await this.request(meetingPath, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'INACTIVE' })
    });
    if (!inactivated.ok) return endRetryable();

    const kicked = await this.request(`${meetingPath}/active-session/kick-all`, {
      method: 'POST'
    });
    if (!kicked.ok && kicked.status !== 404) return endRetryable();
    return { status: 'ended' as const };
  }

  private async request(
    path: string,
    init: { method?: string; body?: string } = {}
  ): Promise<{ ok: boolean; status: number; body: ApiEnvelope | null }> {
    try {
      const request = new Request(`${this.baseUrl}${path}`, {
        method: init.method ?? 'GET',
        headers: {
          authorization: `Bearer ${this.options.apiToken}`,
          accept: 'application/json',
          ...(init.body ? { 'content-type': 'application/json' } : {})
        },
        ...(init.body ? { body: init.body } : {})
      });
      const response = await this.fetcher(request as Request);
      const body = await readEnvelope(response);
      return {
        ok: response.ok && body?.success === true,
        status: response.status,
        body
      };
    } catch {
      return { ok: false, status: 0, body: null };
    }
  }
}

function objectData(envelope: ApiEnvelope | null): Record<string, unknown> | null {
  return envelope?.data && typeof envelope.data === 'object' && !Array.isArray(envelope.data)
    ? envelope.data as Record<string, unknown>
    : null;
}

function arrayData(envelope: ApiEnvelope | null): Array<Record<string, unknown>> {
  return Array.isArray(envelope?.data)
    ? envelope.data.filter((value): value is Record<string, unknown> =>
        Boolean(value) && typeof value === 'object' && !Array.isArray(value)
      )
    : [];
}

async function readEnvelope(response: Response): Promise<ApiEnvelope | null> {
  try {
    const value = await response.json();
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value as ApiEnvelope
      : null;
  } catch {
    return null;
  }
}

function retryable() {
  return { status: 'retryable' as const, reason: 'realtimekit_unavailable' };
}

function participantRetryable() {
  return { status: 'retryable' as const, reason: 'realtimekit_participant_unavailable' };
}

function endRetryable() {
  return { status: 'retryable' as const, reason: 'realtimekit_end_unavailable' };
}
