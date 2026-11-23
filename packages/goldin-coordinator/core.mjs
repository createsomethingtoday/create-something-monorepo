import { createHash } from "node:crypto";
const requireThat = (v, message) => {
  if (!v) throw new Error(message);
};
const money = (v) => Number.isSafeInteger(v) && v >= 0;
const fingerprint = (v) =>
  createHash("sha256").update(JSON.stringify(v)).digest("hex");
const instant = (s) => {
  requireThat(
    typeof s === "string" && /(?:Z|[+-]\d\d:\d\d)$/.test(s),
    "explicit time offset required",
  );
  const n = Date.parse(s);
  requireThat(Number.isFinite(n), "invalid instant");
  return n;
};
/** Local operator-only pilot. Caller supplies identity from a trusted local operator process, never a request body. */
export class CoordinatorCore {
  #transaction;
  #db;
  #clock;
  constructor(db, clock = Date.now, transaction) {
    this.#transaction = transaction;
    this.#clock = clock;
    this.#db = db;
    this.#db.exec(`
   CREATE TABLE IF NOT EXISTS bookings(tenant TEXT, source TEXT, body TEXT NOT NULL, PRIMARY KEY(tenant,source));
   CREATE TABLE IF NOT EXISTS events(tenant TEXT, source TEXT, event TEXT, hash TEXT, receipt TEXT, PRIMARY KEY(tenant,source,event));
   CREATE TABLE IF NOT EXISTS prices(tenant TEXT, version TEXT, body TEXT, PRIMARY KEY(tenant,version));
   CREATE TABLE IF NOT EXISTS outbox_audit(tenant TEXT, id TEXT, body TEXT);
   CREATE TABLE IF NOT EXISTS outbox(tenant TEXT, id TEXT, source TEXT, body TEXT, status TEXT, attempts INTEGER, next INTEGER, receipt TEXT, PRIMARY KEY(tenant,id));`);
  }
  close() {
    this.#db.close();
  }
  #auth(a) {
    requireThat(
      a &&
        typeof a.tenant === "string" &&
        a.tenant.length > 0 &&
        typeof a.operator === "string" &&
        a.operator.length > 0,
      "authorized local operator required",
    );
  }
  #tx(fn) {
    if (this.#transaction) return this.#transaction(fn);
    this.#db.exec("BEGIN IMMEDIATE");
    try {
      const r = fn();
      this.#db.exec("COMMIT");
      return r;
    } catch (e) {
      this.#db.exec("ROLLBACK");
      throw e;
    }
  }
  approvePrice(a, p) {
    this.#auth(a);
    requireThat(
      p &&
        p.version &&
        p.currency === "USD" &&
        ["solo", "group"].includes(p.kind) &&
        money(p.unit) &&
        p.unit > 0 &&
        money(p.deposit) &&
        p.deposit > 0 &&
        Number.isInteger(p.min) &&
        Number.isInteger(p.max) &&
        p.min >= 1 &&
        p.max >= p.min &&
        (p.basis === undefined || ["per_person", "fixed"].includes(p.basis)) &&
        (p.durationMinutes === undefined ||
          (Number.isSafeInteger(p.durationMinutes) &&
            p.durationMinutes > 0 &&
            p.durationMinutes <= 1440)) &&
        [p.bufferBeforeMinutes, p.bufferAfterMinutes].every(
          (v) =>
            v === undefined || (Number.isSafeInteger(v) && v >= 0 && v <= 1440),
        ) &&
        (p.kind !== "solo" ||
          (p.min === 1 &&
            (p.max === 1 || (p.basis === "fixed" && p.max === 2)))),
      "invalid approved price",
    );
    this.#db
      .prepare("INSERT INTO prices VALUES(?,?,?)")
      .run(
        a.tenant,
        p.version,
        JSON.stringify({ ...p, approvedBy: a.operator }),
      );
  }
  price(a, version) {
    this.#auth(a);
    const row = this.#db
      .prepare("SELECT body FROM prices WHERE tenant=? AND version=?")
      .get(a.tenant, version);
    requireThat(row, "approved pricing required");
    return JSON.parse(row.body);
  }
  hasBooking(a, source) {
    this.#auth(a);
    return Boolean(
      this.#db
        .prepare("SELECT 1 FROM bookings WHERE tenant=? AND source=?")
        .get(a.tenant, source),
    );
  }
  get(a, source) {
    this.#auth(a);
    const r = this.#db
      .prepare("SELECT body FROM bookings WHERE tenant=? AND source=?")
      .get(a.tenant, source);
    requireThat(r, "booking not found");
    return JSON.parse(r.body);
  }
  #save(a, b) {
    this.#db
      .prepare("UPDATE bookings SET body=? WHERE tenant=? AND source=?")
      .run(JSON.stringify(b), a.tenant, b.source);
  }
  intake(a, i) {
    this.#auth(a);
    return this.#tx(() => {
      requireThat(
        i && typeof i.source === "string" && i.source.length > 0,
        "stable source required",
      );
      const existing = this.#db
        .prepare("SELECT body FROM bookings WHERE tenant=? AND source=?")
        .get(a.tenant, i.source);
      if (existing) {
        const b = JSON.parse(existing.body);
        requireThat(b.intakeHash === fingerprint(i), "source payload conflict");
        return b;
      }
      const row = this.#db
        .prepare("SELECT body FROM prices WHERE tenant=? AND version=?")
        .get(a.tenant, i.priceVersion);
      requireThat(row, "approved pricing required");
      const p = JSON.parse(row.body);
      requireThat(
        Number.isInteger(i.count) &&
          i.count >= p.min &&
          i.count <= p.max &&
          typeof i.payer === "string" &&
          i.payer.length > 0 &&
          Array.isArray(i.participants) &&
          i.participants.length === i.count &&
          new Set(i.participants).size === i.count &&
          i.participants.every((x) => typeof x === "string" && x.length > 0),
        "structured payer and roster required",
      );
      const start = instant(i.start),
        end = instant(i.end);
      requireThat(
        start < end &&
          start > this.#clock() &&
          typeof i.resource === "string" &&
          i.resource.length > 0,
        "invalid capacity interval",
      );
      requireThat(
        Number.isSafeInteger(i.holdMs) && i.holdMs > 0 && i.holdMs <= 900000,
        "hold must be at most 15 minutes",
      );
      requireThat(
        p.durationMinutes === undefined ||
          end - start === p.durationMinutes * 60000,
        "package duration mismatch",
      );
      const reservedStart = start - (p.bufferBeforeMinutes ?? 0) * 60000;
      const reservedEnd = end + (p.bufferAfterMinutes ?? 0) * 60000;
      for (const r of this.#db
        .prepare("SELECT body FROM bookings WHERE tenant=?")
        .all(a.tenant)) {
        const b = JSON.parse(r.body);
        if (
          b.resource === i.resource &&
          b.status !== "cancelled" &&
          (b.status === "confirmed" || b.holdUntil > this.#clock())
        )
          requireThat(
            reservedEnd <= (b.reservedStart ?? b.start) ||
              reservedStart >= (b.reservedEnd ?? b.end),
            "capacity conflict",
          );
      }
      const total = p.basis === "fixed" ? p.unit : p.unit * i.count;
      requireThat(money(total) && p.deposit <= total, "invalid total");
      const b = {
        source: i.source,
        intakeHash: fingerprint(i),
        ...(i.provenance ? { provenance: structuredClone(i.provenance) } : {}),
        payer: i.payer,
        participants: i.participants,
        count: i.count,
        price: { ...p, total },
        resource: i.resource,
        start,
        end,
        reservedStart,
        reservedEnd,
        holdUntil: this.#clock() + i.holdMs,
        status: "held",
        payment: {
          revision: 0,
          paid: 0,
          refunded: 0,
          disputed: false,
          reconciled: false,
        },
        production: {
          rawReceived: false,
          rawVerified: false,
          galleryApproved: false,
          documents: false,
        },
        delivery: "blocked",
        audit: [{ action: "intake", operator: a.operator, at: this.#clock() }],
      };
      this.#db
        .prepare("INSERT INTO bookings VALUES(?,?,?)")
        .run(a.tenant, i.source, JSON.stringify(b));
      this.#enqueue(a, b, ["intake"]);
      return b;
    });
  }
  event(a, source, e) {
    this.#auth(a);
    return this.#tx(() => {
      requireThat(
        e && typeof e.id === "string" && e.id.length > 0,
        "event id required",
      );
      const hash = fingerprint(e);
      const old = this.#db
        .prepare("SELECT * FROM events WHERE tenant=? AND source=? AND event=?")
        .get(a.tenant, source, e.id);
      if (old) {
        requireThat(old.hash === hash, "event payload conflict");
        return JSON.parse(old.receipt);
      }
      const b = this.get(a, source);
      let outcome = "applied";
      const prerequisitesBefore = fingerprint({
        payment: b.payment,
        production: b.production,
        status: b.status,
      });
      switch (e.type) {
        case "payment": {
          requireThat(
            Number.isSafeInteger(e.revision) &&
              e.revision > 0 &&
              money(e.paid) &&
              money(e.refunded) &&
              e.refunded <= e.paid &&
              typeof e.disputed === "boolean" &&
              e.reconciled === true &&
              typeof e.evidence === "string" &&
              e.evidence.length > 0,
            "reconciled payment snapshot required",
          );
          if (e.revision === b.payment.revision) {
            requireThat(
              e.paid === b.payment.paid &&
                e.refunded === b.payment.refunded &&
                e.disputed === b.payment.disputed,
              "conflicting payment revision",
            );
            outcome = "stale";
            break;
          }
          if (e.revision < b.payment.revision) {
            outcome = "stale";
            break;
          }
          b.payment = {
            revision: e.revision,
            paid: e.paid,
            refunded: e.refunded,
            disputed: e.disputed,
            reconciled: true,
            evidence: e.evidence,
          };
          break;
        }
        case "confirm":
          requireThat(
            b.status === "held" &&
              b.holdUntil > this.#clock() &&
              b.payment.reconciled &&
              b.payment.paid >= b.price.deposit &&
              !b.payment.refunded &&
              !b.payment.disputed,
            "confirmation blocked",
          );
          b.status = "confirmed";
          break;
        case "slot_reopened":
          break;
        case "cancel":
          requireThat(
            e.reason && e.approval,
            "explicit cancellation approval required",
          );
          b.status = "cancelled";
          b.cancellation = {
            reason: e.reason,
            approval: e.approval,
            operator: a.operator,
            at: this.#clock(),
          };
          break;
        case "raw_manifest": {
          requireThat(
            Array.isArray(e.expected) &&
              e.expected.length > 0 &&
              Array.isArray(e.received) &&
              e.evidence,
            "file manifest required",
          );
          const valid = (f) =>
            f &&
            typeof f.path === "string" &&
            f.path.length > 0 &&
            Number.isSafeInteger(f.bytes) &&
            f.bytes > 0 &&
            typeof f.sha256 === "string" &&
            /^[a-f0-9]{64}$/.test(f.sha256);
          requireThat(
            e.expected.every(valid) &&
              e.received.every(valid) &&
              new Set(e.expected.map((f) => f.path)).size ===
                e.expected.length &&
              new Set(e.received.map((f) => f.path)).size === e.received.length,
            "unique card/folder paths, sizes and hashes required",
          );
          b.production.rawReceived = true;
          b.production.rawVerified =
            e.expected.length === e.received.length &&
            e.expected.every((f) =>
              e.received.some(
                (r) =>
                  r.path === f.path &&
                  r.bytes === f.bytes &&
                  r.sha256 === f.sha256,
              ),
            );
          b.production.rawManifest = {
            expected: e.expected,
            received: e.received,
            evidence: e.evidence,
          };
          break;
        }
        case "gallery_review":
          requireThat(
            e.gallery && e.recipient === b.payer && e.evidence,
            "gallery and intended recipient required",
          );
          b.production.galleryApproved = true;
          b.production.gallery = {
            id: e.gallery,
            recipient: e.recipient,
            evidence: e.evidence,
          };
          break;
        case "production":
          requireThat(
            [
              "rawReceived",
              "rawVerified",
              "galleryApproved",
              "documents",
            ].includes(e.field) &&
              typeof e.value === "boolean" &&
              typeof e.evidence === "string" &&
              e.evidence.length > 0,
            "production evidence required",
          );
          requireThat(
            !(["rawVerified", "galleryApproved"].includes(e.field) && e.value),
            "use manifest or gallery review",
          );
          b.production[e.field] = e.value;
          b.production[e.field + "Evidence"] = {
            reference: e.evidence,
            operator: a.operator,
            at: this.#clock(),
          };
          if (e.field === "rawReceived" && !e.value)
            b.production.rawVerified = false;
          break;
        case "release_review":
          requireThat(
            e.approval &&
              e.recipient === b.payer &&
              e.gallery === b.production.gallery?.id &&
              e.recipient === b.production.gallery?.recipient &&
              this.eligibility(b).eligible,
            "release review blocked",
          );
          b.delivery = "reviewed_no_send";
          b.releaseReview = {
            approval: e.approval,
            recipient: e.recipient,
            gallery: e.gallery,
            stateDigest: prerequisitesBefore,
            operator: a.operator,
            at: this.#clock(),
          };
          break;
        default:
          throw new Error("unsupported event");
      }
      const eligibility = this.eligibility(b);
      if (
        !eligibility.eligible ||
        (e.type !== "release_review" &&
          prerequisitesBefore !==
            fingerprint({
              payment: b.payment,
              production: b.production,
              status: b.status,
            }))
      ) {
        b.delivery = "blocked";
        if (b.releaseReview) b.releaseReview.invalidatedAt = this.#clock();
      }
      const receipt = {
        event: e.id,
        source,
        tenant: a.tenant,
        outcome,
        operator: a.operator,
        at: this.#clock(),
        eligibility,
        externalEffects: [],
        delivery: b.delivery,
      };
      b.audit.push({
        event: e.id,
        type: e.type,
        payload: structuredClone(e),
        operator: a.operator,
        at: receipt.at,
      });
      this.#save(a, b);
      this.#db
        .prepare("INSERT INTO events VALUES(?,?,?,?,?)")
        .run(a.tenant, source, e.id, hash, JSON.stringify(receipt));
      if (outcome === "applied") this.#enqueue(a, b, ["event", e.id]);
      return receipt;
    });
  }
  #enqueue(a, b, event) {
    this.#db
      .prepare("INSERT INTO outbox VALUES(?,?,?,?,?,?,?,?)")
      .run(
        a.tenant,
        JSON.stringify([b.source, ...event]),
        b.source,
        JSON.stringify(b),
        "pending",
        0,
        0,
        "{}",
      );
  }
  outboxStatusCounts(a) {
    this.#auth(a);
    return this.#db
      .prepare(
        `SELECT status, COUNT(*) AS count,
      SUM(CASE WHEN status IN ('pending','retry','sending') AND next <= ? THEN 1 ELSE 0 END) AS due
      FROM outbox WHERE tenant=? GROUP BY status`,
      )
      .all(this.#clock(), a.tenant);
  }
  outbox(a) {
    this.#auth(a);
    return this.#db
      .prepare("SELECT * FROM outbox WHERE tenant=? ORDER BY rowid")
      .all(a.tenant)
      .map((r) => ({
        ...r,
        body: JSON.parse(r.body),
        receipt: JSON.parse(r.receipt),
        history: this.#db
          .prepare(
            "SELECT body FROM outbox_audit WHERE tenant=? AND id=? ORDER BY rowid",
          )
          .all(a.tenant, r.id)
          .map((x) => JSON.parse(x.body)),
      }));
  }
  claim(a, id) {
    this.#auth(a);
    return this.#tx(() => {
      const r = this.outbox(a).find((r) => r.id === id);
      requireThat(r, "outbox item not found");
      requireThat(
        ["pending", "retry"].includes(r.status) &&
          r.next <= this.#clock() &&
          r.attempts < 3,
        "outbox item not retryable",
      );
      // Only the earliest unfinished projection per booking may run.
      requireThat(
        !this.outbox(a).some(
          (x) =>
            x.source === r.source &&
            x.id !== r.id &&
            x.status !== "done" &&
            this.outbox(a).findIndex((z) => z.id === x.id) <
              this.outbox(a).findIndex((z) => z.id === id),
        ),
        "prior projection unresolved",
      );
      this.#db
        .prepare(
          "UPDATE outbox SET status=?, attempts=?, next=? WHERE tenant=? AND id=?",
        )
        .run("sending", r.attempts + 1, this.#clock() + 30000, a.tenant, id);
      return { ...r, status: "sending", attempts: r.attempts + 1 };
    });
  }
  settle(a, id, status, receipt) {
    this.#auth(a);
    return this.#tx(() => {
      const current = this.outbox(a).find((r) => r.id === id);
      requireThat(current?.status === "sending", "outbox item not sending");
      if (status === "retry" && current?.attempts >= 3) status = "exhausted";
      requireThat(
        ["done", "retry", "blocked", "uncertain", "exhausted"].includes(status),
        "invalid outbox status",
      );
      this.#db
        .prepare(
          "UPDATE outbox SET status=?, next=?, receipt=? WHERE tenant=? AND id=? AND status=?",
        )
        .run(
          status,
          this.#clock() + 1000,
          JSON.stringify(receipt),
          a.tenant,
          id,
          "sending",
        );
      this.#outboxAudit(a, id, { action: "settle", status, receipt });
      return this.outbox(a).find((r) => r.id === id);
    });
  }
  recoverSending(a) {
    this.#auth(a);
    for (const item of this.outbox(a))
      if (item.status === "sending" && item.next <= this.#clock())
        this.settle(a, item.id, "uncertain", {
          error: "interrupted_dispatch",
          externalEffects: [],
          outcome: "unknown",
        });
  }
  #outboxAudit(a, id, data) {
    this.#db
      .prepare("INSERT INTO outbox_audit VALUES(?,?,?)")
      .run(
        a.tenant,
        id,
        JSON.stringify({ ...data, operator: a.operator, at: this.#clock() }),
      );
  }
  resetRetry(a, id, approval) {
    this.#auth(a);
    requireThat(
      typeof approval === "string" && approval.length > 0,
      "retry approval required",
    );
    return this.#tx(() => {
      const r = this.outbox(a).find((r) => r.id === id);
      requireThat(
        r && r.status === "exhausted",
        "only known no-write exhaustion can reset",
      );
      this.#db
        .prepare(
          "UPDATE outbox SET status=?,attempts=?,receipt=? WHERE tenant=? AND id=?",
        )
        .run(
          "retry",
          0,
          JSON.stringify({
            resets: [
              ...(r.receipt.resets ?? []),
              { approval, operator: a.operator, at: this.#clock() },
            ],
            previous: r.receipt,
          }),
          a.tenant,
          id,
        );
      this.#outboxAudit(a, id, { action: "retry_reset", approval });
      return this.outbox(a).find((r) => r.id === id);
    });
  }
  reconcileOutbox(a, id, receipt) {
    this.#auth(a);
    return this.#tx(() => {
      const r = this.outbox(a).find((r) => r.id === id);
      requireThat(
        r &&
          ["sending", "uncertain"].includes(r.status) &&
          receipt.reconciled === true,
        "reconciliation required",
      );
      this.#db
        .prepare(
          "UPDATE outbox SET status=?, receipt=? WHERE tenant=? AND id=?",
        )
        .run(
          "done",
          JSON.stringify({
            ...receipt,
            operator: a.operator,
            at: this.#clock(),
          }),
          a.tenant,
          id,
        );
      this.#outboxAudit(a, id, { action: "reconcile", receipt });
      return this.outbox(a).find((r) => r.id === id);
    });
  }
  eligibility(b) {
    const reasons = [];
    if (b.status !== "confirmed") reasons.push("not_confirmed");
    if (
      !b.payment.reconciled ||
      b.payment.paid - b.payment.refunded !== b.price.total
    )
      reasons.push("balance_not_reconciled_paid");
    if (b.payment.refunded || b.payment.disputed)
      reasons.push("refund_or_dispute");
    for (const k of ["rawVerified", "galleryApproved", "documents"])
      if (!b.production[k]) reasons.push(k);
    return { eligible: reasons.length === 0, reasons };
  }
}
/** No network/write capability. Field IDs must be verified against a read-only schema first. */
export function notionPlan(booking, mapping, schema) {
  requireThat(
    mapping &&
      mapping.verified === true &&
      mapping.databaseId === schema?.databaseId,
    "unverified Notion mapping",
  );
  requireThat(
    new Set(Object.values(mapping.fields)).size ===
      Object.values(mapping.fields).length,
    "duplicate Notion destination property",
  );
  const values = {
    source: booking.source,
    payment: booking.payment,
    production: booking.production,
    delivery: booking.delivery,
  };
  const properties = {};
  for (const [key, id] of Object.entries(mapping.fields)) {
    requireThat(
      Object.hasOwn(values, key) && schema.propertyIds.includes(id),
      "unknown mapping field",
    );
    properties[id] = structuredClone(values[key]);
  }
  requireThat(mapping.fields.source, "stable source mapping required");
  return {
    mode: "simulation",
    databaseId: mapping.databaseId,
    lookup: { property: mapping.fields.source, equals: booking.source },
    properties,
    externalEffects: [],
  };
}
