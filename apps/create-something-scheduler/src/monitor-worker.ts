import { DurableObject } from 'cloudflare:workers';
import { z } from 'zod';
import { assessSyncHealth, type SyncHealth } from './notifications/sync-health.js';
import { ResendNotificationPort } from './providers/resend.js';

type Delivery = {
  idempotencyKey: string; from: string; to: string; subject: string; text: string;
  createdAt: string; messageId?: string;
};
type Incident = { id: string; openedAt: string; alert: Delivery; recovery?: Delivery };
type Check = SyncHealth & { checkedAt: string; trigger: 'cron' | 'operator' };
const incidentKey = 'sync-monitor:incident';
const lastCheckKey = 'sync-monitor:last-check';

export class SyncMonitor extends DurableObject<SyncMonitorEnv> {
  private queue: Promise<void> = Promise.resolve();

  private serialized<T>(task: () => Promise<T>): Promise<T> {
    const result = this.queue.then(task);
    this.queue = result.then(() => undefined, () => undefined);
    return result;
  }

  private async deliver(delivery: Delivery, save: () => void): Promise<boolean> {
    if (delivery.messageId) return true;
    if (Date.now() - Date.parse(delivery.createdAt) >= 23 * 3600_000) {
      this.ctx.storage.kv.put('sync-monitor:last-delivery', { status: 'reconciliation_required', idempotencyKey: delivery.idempotencyKey });
      return false;
    }
    try {
      const result = await new ResendNotificationPort({
        apiKey: this.env.RESEND_API_KEY, from: delivery.from
      }).sendSyncNotification(delivery);
      delivery.messageId = result.messageId;
      save();
      this.ctx.storage.kv.put('sync-monitor:last-delivery', { status: 'accepted', messageId: result.messageId });
      return true;
    } catch {
      this.ctx.storage.kv.put('sync-monitor:last-delivery', { status: 'retryable', idempotencyKey: delivery.idempotencyKey });
      return false;
    }
  }

  private deliveryFailure(trigger: 'cron' | 'operator') {
    return { healthy: false, reason: 'notification_delivery_failed', expiresAt: null,
      checkedAt: new Date().toISOString(), trigger, alertOpen: true, notificationDelivered: false };
  }

  private message(id: string, kind: 'warning' | 'recovery' | 'test', text: string): Delivery {
    return {
      idempotencyKey: `scheduler-sync/${id}/${kind}`,
      from: this.env.RESEND_FROM, to: this.env.ALERT_EMAIL,
      subject: kind === 'test' ? '[TEST] Meeting sync alert verification'
        : kind === 'recovery' ? '[Recovered] Meeting sync is healthy again'
        : '[Action needed] Meeting sync needs attention',
      text, createdAt: new Date().toISOString()
    };
  }

  async check(trigger: 'cron' | 'operator' = 'cron') {
    return this.serialized(async () => {
      let incident = this.ctx.storage.kv.get<Incident>(incidentKey);
      if (incident) {
        const pending = incident.recovery ?? incident.alert;
        if (!await this.deliver(pending, () => this.ctx.storage.kv.put(incidentKey, incident))) return this.deliveryFailure(trigger);
        if (incident.recovery?.messageId) {
          this.ctx.storage.kv.put('sync-monitor:last-incident', incident);
          this.ctx.storage.kv.delete(incidentKey);
          incident = undefined;
        }
      }
      let health: SyncHealth;
      try {
        const response = await fetch(this.env.SCHEDULER_STATUS_URL, {
          headers: { authorization: `Bearer ${this.env.OPERATOR_API_TOKEN}` },
          signal: AbortSignal.timeout(10_000)
        });
        health = response.ok ? assessSyncHealth(await response.json(), Date.now())
          : { healthy: false, reason: `scheduler_status_http_${response.status}`, expiresAt: null };
      } catch {
        health = { healthy: false, reason: 'scheduler_status_unavailable', expiresAt: null };
      }
      const checkedAt = new Date().toISOString();
      const check = { ...health, checkedAt, trigger } satisfies Check;
      this.ctx.storage.kv.put(lastCheckKey, check);
      if (!health.healthy && !incident) {
        const id = crypto.randomUUID();
        incident = {
          id, openedAt: checkedAt,
          alert: this.message(id, 'warning', [
            'The meeting-sync monitor detected a problem.',
            `Reason: ${health.reason}`,
            `Checked at: ${checkedAt}`,
            health.expiresAt ? `Current busy-time data expires at: ${health.expiresAt}` : 'Current expiry could not be verified.',
            'Bookings may pause if the calendar sync is not restored before expiry.',
            'Check the cloud refresh and Google Calendar authorization.',
            'Booking page: https://schedule.createsomething.agency',
            'You will receive a recovery email when the sync is healthy again.'
          ].join('\n\n'))
        };
        this.ctx.storage.kv.put(incidentKey, incident);
        if (!await this.deliver(incident.alert, () => this.ctx.storage.kv.put(incidentKey, incident))) return this.deliveryFailure(trigger);
      } else if (health.healthy && incident) {
        incident.recovery = this.message(incident.id, 'recovery', [
          'The cloud meeting sync is healthy again. Verified booking availability is restored.',
          `Checked at: ${checkedAt}`,
          `Busy-time data expires at: ${health.expiresAt}`,
          'Booking page: https://schedule.createsomething.agency'
        ].join('\n\n'));
        this.ctx.storage.kv.put(incidentKey, incident);
        if (!await this.deliver(incident.recovery, () => this.ctx.storage.kv.put(incidentKey, incident))) return this.deliveryFailure(trigger);
        this.ctx.storage.kv.put('sync-monitor:last-incident', incident);
        this.ctx.storage.kv.delete(incidentKey);
      }
      return { ...check, alertOpen: !health.healthy, notificationDelivered: true };
    });
  }

  async sendTestNotification(id: string) {
    return this.serialized(async () => {
      const key = `sync-monitor:test:${id}`;
      let delivery = this.ctx.storage.kv.get<Delivery>(key);
      if (!delivery) {
        delivery = this.message(id, 'test', 'TEST ONLY: This verifies delivery of meeting-sync alerts to you. No calendar failure was simulated, and no booking or calendar event was changed.\n\nThe independent cloud monitor checks every five minutes, warns on failed or overdue refreshes, and sends one recovery email when healthy again.');
        this.ctx.storage.kv.put(key, delivery);
      }
      if (!await this.deliver(delivery, () => this.ctx.storage.kv.put(key, delivery))) return { status: 'retryable', reason: 'notification_delivery_failed' };
      const result = { status: 'accepted', messageId: delivery.messageId, idempotencyKey: delivery.idempotencyKey };
      this.ctx.storage.kv.put('sync-monitor:last-test', result);
      return result;
    });
  }

  status() {
    return {
      lastCheck: this.ctx.storage.kv.get<Check>(lastCheckKey) ?? null,
      incidentOpen: Boolean(this.ctx.storage.kv.get(incidentKey)),
      lastTest: this.ctx.storage.kv.get('sync-monitor:last-test') ?? null,
      lastDelivery: this.ctx.storage.kv.get('sync-monitor:last-delivery') ?? null
    };
  }
}

export default {
  async scheduled(_controller: ScheduledController, env: SyncMonitorEnv): Promise<void> {
    const result = await env.MONITOR.getByName('scheduler-sync').check('cron');
    console.log(JSON.stringify({ event: 'scheduler_sync_monitor', ...result }));
    if (!result.notificationDelivered) throw new Error('sync_monitor_notification_failed');
  },
  async fetch(request: Request, env: SyncMonitorEnv): Promise<Response> {
    if (!env.OPERATOR_API_TOKEN || request.headers.get('authorization') !== `Bearer ${env.OPERATOR_API_TOKEN}`) {
      return Response.json({ error: 'operator_scope_required' }, { status: 403 });
    }
    const path = new URL(request.url).pathname;
    const monitor = env.MONITOR.getByName('scheduler-sync');
    if (request.method === 'GET' && path === '/status') return Response.json(await monitor.status());
    if (request.method === 'POST' && (path === '/check' || path === '/test')) {
      let body: unknown;
      try { body = await request.json(); } catch { return Response.json({ error: 'invalid_json' }, { status: 400 }); }
      const parsed = z.object({ explicitIntent: z.literal(true), idempotencyKey: z.string().regex(/^[a-zA-Z0-9_-]{8,120}$/).optional() }).strict().safeParse(body);
      if (!parsed.success) return Response.json({ error: 'explicit_intent_required' }, { status: 428 });
      if (path === '/test') {
        if (!parsed.data.idempotencyKey) return Response.json({ error: 'idempotency_key_required' }, { status: 400 });
        const result = await monitor.sendTestNotification(parsed.data.idempotencyKey);
        return Response.json(result, { status: result.status === 'accepted' ? 200 : 503 });
      }
      const result = await monitor.check('operator');
      return Response.json(result, { status: result.notificationDelivered ? 200 : 503 });
    }
    return Response.json({ error: 'not_found' }, { status: 404 });
  }
} satisfies ExportedHandler<SyncMonitorEnv>;
