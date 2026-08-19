const SIGNATURE_TOLERANCE_SECONDS = 300;
const MAX_WEBHOOK_BODY_BYTES = 256_000;
export const LANGFUSE_ALERT_REMINDER_INTERVAL_MS = 6 * 60 * 60 * 1000;

export type LangfuseMonitorAlert = {
  id: string;
  timestamp: string;
  type: 'monitor-alert';
  apiVersion: string;
  payload: {
    monitorId: string;
    projectId: string;
    permalink?: string;
    message: {
      title: string;
      body: string;
    };
    severity: string;
    timestamp: string;
    fromTimestamp?: string;
    toTimestamp?: string;
    view?: string;
    filters?: unknown[];
    window?: string;
  };
};

type HandlerOptions = {
  signingSecret?: string | string[];
  nowMs?: number;
  notificationState?: AlertNotificationStateStore;
  deliver: (alert: LangfuseMonitorAlert) => Promise<void>;
};

export type AlertNotificationStateStore = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
};

type AlertNotificationState = {
  active: boolean;
  lastAlertAtMs: number;
};

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

function parseSignatureHeader(
  header: string | null
): { timestamp: string; signature: string } | null {
  if (!header) return null;
  const fields = Object.fromEntries(
    header.split(',').map((part) => {
      const [key, ...value] = part.trim().split('=');
      return [key, value.join('=')];
    })
  );
  if (!fields.t || !fields.v1 || !/^\d+$/.test(fields.t) || !/^[a-f\d]{64}$/i.test(fields.v1)) {
    return null;
  }
  return { timestamp: fields.t, signature: fields.v1.toLowerCase() };
}

function hex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
}

async function validSignature(
  rawBody: string,
  header: string | null,
  secret: string,
  nowMs: number
): Promise<boolean> {
  const parsed = parseSignatureHeader(header);
  if (!parsed) return false;
  const timestampSeconds = Number(parsed.timestamp);
  const ageSeconds = Math.abs(nowMs / 1000 - timestampSeconds);
  if (!Number.isFinite(ageSeconds) || ageSeconds > SIGNATURE_TOLERANCE_SECONDS) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const expected = hex(
    await crypto.subtle.sign(
      'HMAC',
      key,
      new TextEncoder().encode(`${parsed.timestamp}.${rawBody}`)
    )
  );
  return constantTimeEqual(expected, parsed.signature);
}

function parseMonitorAlert(rawBody: string): LangfuseMonitorAlert | null {
  let value: unknown;
  try {
    value = JSON.parse(rawBody);
  } catch {
    return null;
  }
  if (!value || typeof value !== 'object') return null;
  const event = value as Record<string, unknown>;
  const payload = event.payload as Record<string, unknown> | undefined;
  const message = payload?.message as Record<string, unknown> | undefined;
  if (
    event.type !== 'monitor-alert' ||
    typeof event.id !== 'string' ||
    typeof event.timestamp !== 'string' ||
    typeof event.apiVersion !== 'string' ||
    !payload ||
    typeof payload.monitorId !== 'string' ||
    typeof payload.projectId !== 'string' ||
    typeof payload.severity !== 'string' ||
    typeof payload.timestamp !== 'string' ||
    !message ||
    typeof message.title !== 'string' ||
    typeof message.body !== 'string'
  ) {
    return null;
  }
  return value as LangfuseMonitorAlert;
}

function notificationStateKey(alert: LangfuseMonitorAlert): string {
  return `langfuse-alert:${encodeURIComponent(alert.payload.projectId)}:${encodeURIComponent(alert.payload.monitorId)}`;
}

function parseNotificationState(value: string | null): AlertNotificationState | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<AlertNotificationState>;
    if (
      typeof parsed.active !== 'boolean' ||
      typeof parsed.lastAlertAtMs !== 'number' ||
      !Number.isFinite(parsed.lastAlertAtMs)
    ) {
      return null;
    }
    return { active: parsed.active, lastAlertAtMs: parsed.lastAlertAtMs };
  } catch {
    return null;
  }
}

function isRecovery(alert: LangfuseMonitorAlert): boolean {
  return alert.payload.severity.trim().toUpperCase() === 'OK';
}

async function nextNotificationState(
  alert: LangfuseMonitorAlert,
  store: AlertNotificationStateStore | undefined,
  nowMs: number
): Promise<{ shouldDeliver: boolean; key?: string; value?: AlertNotificationState }> {
  if (!store) return { shouldDeliver: true };

  const key = notificationStateKey(alert);
  const previous = parseNotificationState(await store.get(key));
  if (isRecovery(alert)) {
    if (!previous?.active) return { shouldDeliver: false };
    return {
      shouldDeliver: true,
      key,
      value: { active: false, lastAlertAtMs: previous.lastAlertAtMs }
    };
  }

  if (
    previous?.active &&
    Number.isFinite(previous.lastAlertAtMs) &&
    nowMs - previous.lastAlertAtMs < LANGFUSE_ALERT_REMINDER_INTERVAL_MS
  ) {
    return { shouldDeliver: false };
  }
  return { shouldDeliver: true, key, value: { active: true, lastAlertAtMs: nowMs } };
}

export async function handleLangfuseAlertWebhook(
  request: Request,
  options: HandlerOptions
): Promise<Response> {
  if (request.method !== 'POST') {
    return json({ accepted: false, error: 'Method not allowed' }, 405);
  }
  const signingSecrets = (
    Array.isArray(options.signingSecret) ? options.signingSecret : [options.signingSecret]
  ).filter((secret): secret is string => Boolean(secret?.trim()));
  if (signingSecrets.length === 0) {
    return json({ accepted: false, error: 'Webhook signing is not configured' }, 503);
  }

  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > MAX_WEBHOOK_BODY_BYTES) {
    return json({ accepted: false, error: 'Payload too large' }, 413);
  }
  const signatureHeader = request.headers.get('x-langfuse-signature');
  const signatureChecks = await Promise.all(
    signingSecrets.map((secret) =>
      validSignature(rawBody, signatureHeader, secret, options.nowMs ?? Date.now())
    )
  );
  if (!signatureChecks.some(Boolean)) {
    return json({ accepted: false, error: 'Invalid webhook signature' }, 401);
  }

  const alert = parseMonitorAlert(rawBody);
  if (!alert) {
    return json({ accepted: false, error: 'Invalid monitor alert payload' }, 400);
  }

  let notification: { shouldDeliver: boolean; key?: string; value?: AlertNotificationState };
  try {
    notification = await nextNotificationState(
      alert,
      options.notificationState,
      options.nowMs ?? Date.now()
    );
  } catch (error) {
    console.warn(
      'Langfuse alert notification state unavailable; delivering without throttling',
      error
    );
    notification = { shouldDeliver: true };
  }

  try {
    if (notification.shouldDeliver) {
      await options.deliver(alert);
      if (notification.key && notification.value && options.notificationState) {
        try {
          await options.notificationState.put(notification.key, JSON.stringify(notification.value));
        } catch (error) {
          console.warn('Langfuse alert notification state write failed after delivery', error);
        }
      }
    }
  } catch (error) {
    console.error('Langfuse monitor alert delivery failed', error);
    return json({ accepted: false, error: 'Alert delivery failed' }, 502);
  }
  return json({ accepted: true, eventId: alert.id }, 202);
}
