import { Temporal } from '@js-temporal/polyfill';

const LINK_POLICY = {
  slug: 'createsomething/together',
  version: 'createsomething-together.v2',
  timezone: 'America/Chicago',
  availableDays: new Set([2, 4]),
  opensAtHour: 11,
  closesAtHour: 17,
  durationMinutes: 30,
  durationOptionsMinutes: [30, 60] as const,
  incrementMinutes: 30,
  minimumNoticeMinutes: 60
} as const;

export type Clock = {
  now(): string;
};

export type BusyInterval = {
  start: string;
  end: string;
};

export type CalendarAvailability =
  | { status: 'available'; intervals: BusyInterval[] }
  | { status: 'unavailable'; reason: string };

export type CalendarPort = {
  listBusyIntervals(input: { from: string; to: string }): Promise<CalendarAvailability>;
  createEvent(input: {
    slot: AvailableSlot;
    scheduler: SchedulerIdentity;
    idempotencyKey: string;
    context?: BookingContext;
    conferencing?: {
      provider: 'first_party';
      roomId: string;
      joinUrl: string;
    };
  }): Promise<{
    status: 'created';
    eventId: string;
    meetUrl: string;
  }>;
  updateEvent?(input: {
    eventId: string;
    slot: AvailableSlot;
    idempotencyKey: string;
    context?: BookingContext;
    conferencing?: {
      provider: 'first_party';
      joinUrl: string;
    };
  }): Promise<{
    status: 'updated';
    eventId: string;
    meetUrl: string;
  }>;
  cancelEvent?(input: {
    eventId: string;
    idempotencyKey: string;
  }): Promise<{ status: 'cancelled' }>;
};

export type ConferencingPort = {
  createRoom(input: {
    bookingId: string;
    title: string;
    idempotencyKey: string;
  }): Promise<
    | { status: 'ready'; roomId: string; joinUrl: string }
    | { status: 'retryable'; reason: string }
  >;
};

export type ProposalSigner = {
  sign(payload: string): string | Promise<string>;
  verify(token: string): string | null | Promise<string | null>;
};

export type SchedulerIdentity = {
  name: string;
  email: string;
};

export type BookingContext = {
  source?: string;
  intent?: string;
  lane?: string;
  warmup?: string;
  readiness?: string;
  score?: number;
  atlasSessionId?: string;
  agentMessages?: number;
  warmupNotes?: string;
};

export type AvailabilityInput = {
  from: string;
  to: string;
  timezone: string;
  durationMinutes?: number;
};

export type MeetingDurationMinutes = typeof LINK_POLICY.durationOptionsMinutes[number];

export type AvailableSlot = {
  start: string;
  end: string;
};

export type AvailabilityOverride = {
  overrideId: string;
  date: string;
  opensAt: string;
  closesAt: string;
  timezone: string;
  reason: string;
  createdAt: string;
};

export type AvailabilityOverrideStore = {
  list(): Promise<AvailabilityOverride[]>;
  upsert(override: AvailabilityOverride): Promise<void>;
  delete(overrideId: string): Promise<boolean>;
};

export class InMemoryAvailabilityOverrideStore implements AvailabilityOverrideStore {
  private readonly overrides = new Map<string, AvailabilityOverride>();

  async list(): Promise<AvailabilityOverride[]> {
    return Array.from(this.overrides.values(), (override) => structuredClone(override));
  }

  async upsert(override: AvailabilityOverride): Promise<void> {
    this.overrides.set(override.overrideId, structuredClone(override));
  }

  async delete(overrideId: string): Promise<boolean> {
    return this.overrides.delete(overrideId);
  }
}

export type UpsertAvailabilityOverrideInput = Omit<AvailabilityOverride, 'createdAt'> & {
  explicitIntent: boolean;
};

export type AvailabilityOverrideMutationResult = ResultMetadata & (
  | { status: 'applied'; override: AvailabilityOverride }
  | { status: 'operator_required' | 'rejected'; reason: string }
);

export type AvailabilityOverrideListResult = ResultMetadata & {
  status: 'available';
  overrides: AvailabilityOverride[];
};

export type DeleteAvailabilityOverrideResult = ResultMetadata & (
  | { status: 'deleted'; overrideId: string }
  | { status: 'operator_required' | 'rejected'; reason: string }
);

type ResultMetadata = {
  receiptId: string;
  policyVersion: string;
  occurredAt: string;
  nextActions: string[];
};

export type LifecycleReceipt = ResultMetadata & {
  status: 'proposed' | 'committed' | 'rescheduled' | 'cancelled' | 'rejected' | 'retryable' | 'operator_required' | 'reminder_sent' | 'reminder_retryable' | 'reminder_failed' | 'override_applied' | 'override_deleted';
  bookingId?: string;
  reason?: string;
  context?: BookingContext;
};

export type ReminderJob = {
  reminderId: string;
  receiptId: string;
  bookingId: string;
  policyVersion: string;
  runAt: string;
  status: 'pending' | 'retryable' | 'sent' | 'failed' | 'cancelled';
  scheduler: SchedulerIdentity;
  slot: AvailableSlot;
  meetUrl: string;
};

export type CommittedReceipt = LifecycleReceipt & {
  status: 'committed';
  bookingId: string;
};

export type TransitionReceipt = LifecycleReceipt & {
  status: 'rescheduled' | 'cancelled';
  bookingId: string;
};

export type AvailabilityResult =
  | (ResultMetadata & {
      status: 'available';
      timezone: string;
      durationMinutes: MeetingDurationMinutes;
      slots: AvailableSlot[];
    })
  | (ResultMetadata & {
      status: 'retryable';
      reason: string;
      durationMinutes: MeetingDurationMinutes;
      slots: [];
    });

export type PrepareBookingInput = {
  slot: AvailableSlot;
  scheduler: SchedulerIdentity;
  context?: BookingContext;
};

export type PrepareBookingResult =
  | (ResultMetadata & {
      status: 'proposed';
      proposalId: string;
      proposalToken: string;
      expiresAt: string;
      slot: AvailableSlot;
      context?: BookingContext;
    })
  | (ResultMetadata & {
      status: 'rejected' | 'retryable';
      reason: string;
    });

export type Booking = {
  bookingId: string;
  proposalId: string;
  status: 'committed' | 'rescheduled' | 'cancelled';
  slot: AvailableSlot;
  scheduler: SchedulerIdentity;
  context?: BookingContext;
  provider: {
    eventId: string;
    meetUrl: string;
  };
};

export type CommitActionResult =
  | { status: 'committed'; booking: Booking; reminder?: ReminderJob }
  | { status: 'rejected' | 'retryable'; reason: string };

export type TransitionActionResult =
  | { status: 'rescheduled'; booking: Booking; reminder?: ReminderJob }
  | { status: 'cancelled'; booking: Booking; reminder?: ReminderJob }
  | { status: 'rejected' | 'retryable'; reason: string };

export type BookingStore = {
  commitExactlyOnce(
    input: {
      proposalId: string;
      slot: AvailableSlot;
      idempotencyKey: string;
      receipt: CommittedReceipt;
    },
    action: () => Promise<CommitActionResult>
  ): Promise<CommitActionResult & { replayed?: boolean }>;
  transitionExactlyOnce(
    input: {
      bookingId: string;
      idempotencyKey: string;
      targetSlot?: AvailableSlot;
      receipt: TransitionReceipt;
    },
    action: (booking: Booking) => Promise<TransitionActionResult>
  ): Promise<TransitionActionResult & { replayed?: boolean }>;
  getBooking(bookingId: string): Promise<Booking | null>;
  recordReceipt(receipt: LifecycleReceipt): Promise<void>;
  getReceipt(receiptId: string): Promise<LifecycleReceipt | null>;
};

export type CommitBookingInput = {
  proposalToken: string;
  idempotencyKey: string;
  explicitIntent: boolean;
};

export type CommitBookingResult = ResultMetadata & (
  | { status: 'committed'; booking: Booking; replayed: boolean }
  | { status: 'rejected' | 'retryable' | 'operator_required'; reason: string }
);

export type BookingReadResult = ResultMetadata & (
  | { status: Booking['status']; booking: Booking }
  | { status: 'rejected'; reason: 'booking_not_found' }
);

export type RescheduleBookingInput = {
  bookingId: string;
  newSlot: AvailableSlot;
  idempotencyKey: string;
  explicitIntent: boolean;
};

export type CancelBookingInput = {
  bookingId: string;
  idempotencyKey: string;
  explicitIntent: boolean;
};

export type TransitionBookingResult = ResultMetadata & (
  | { status: 'rescheduled' | 'cancelled'; booking: Booking; replayed: boolean }
  | { status: 'rejected' | 'retryable' | 'operator_required'; reason: string }
);

export type ReceiptReadResult = ResultMetadata & (
  | { status: LifecycleReceipt['status']; receipt: LifecycleReceipt }
  | { status: 'rejected'; reason: 'receipt_not_found' }
);

type ProposalPayload = {
  proposalId: string;
  link: string;
  slot: AvailableSlot;
  scheduler: SchedulerIdentity;
  expiresAt: string;
  policyVersion: string;
  context?: BookingContext;
};

export class InMemoryBookingStore implements BookingStore {
  private gate = Promise.resolve();
  private readonly committedByIdempotency = new Map<
    string,
    { proposalId: string; booking: Booking }
  >();
  private readonly bookings = new Map<string, Booking>();
  private readonly receipts = new Map<string, LifecycleReceipt>();
  private readonly reminders = new Map<string, ReminderJob>();
  private readonly claimedSlots = new Set<string>();
  private readonly transitionsByIdempotency = new Map<
    string,
    {
      fingerprint: string;
      status: 'rescheduled' | 'cancelled';
      booking: Booking;
    }
  >();

  async commitExactlyOnce(
    input: {
      proposalId: string;
      slot: AvailableSlot;
      idempotencyKey: string;
      receipt: CommittedReceipt;
    },
    action: () => Promise<CommitActionResult>
  ): Promise<CommitActionResult & { replayed?: boolean }> {
    let release = () => {};
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    const previous = this.gate;
    this.gate = previous.then(() => current);
    await previous;

    try {
      const replay = this.committedByIdempotency.get(input.idempotencyKey);
      if (replay) {
        if (replay.proposalId !== input.proposalId) {
          return { status: 'rejected', reason: 'idempotency_key_conflict' };
        }
        return { status: 'committed', booking: replay.booking, replayed: true };
      }
      if (this.transitionsByIdempotency.has(input.idempotencyKey)) {
        return { status: 'rejected', reason: 'idempotency_key_conflict' };
      }
      const slotKey = `${input.slot.start}/${input.slot.end}`;
      if (this.claimedSlots.has(slotKey)) return { status: 'rejected', reason: 'slot_claimed' };

      const result = await action();
      if (result.status === 'committed') {
        this.claimedSlots.add(slotKey);
        this.committedByIdempotency.set(input.idempotencyKey, {
          proposalId: input.proposalId,
          booking: result.booking
        });
        this.bookings.set(result.booking.bookingId, result.booking);
        this.receipts.set(input.receipt.receiptId, input.receipt);
        if (result.reminder) this.reminders.set(result.reminder.reminderId, result.reminder);
      }
      return result;
    } finally {
      release();
    }
  }

  async transitionExactlyOnce(
    input: {
      bookingId: string;
      idempotencyKey: string;
      targetSlot?: AvailableSlot;
      receipt: TransitionReceipt;
    },
    action: (booking: Booking) => Promise<TransitionActionResult>
  ): Promise<TransitionActionResult & { replayed?: boolean }> {
    let release = () => {};
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    const previous = this.gate;
    this.gate = previous.then(() => current);
    await previous;
    try {
      const replay = this.transitionsByIdempotency.get(input.idempotencyKey);
      const fingerprint = transitionFingerprint(input);
      if (replay) {
        if (replay.fingerprint !== fingerprint) {
          return { status: 'rejected', reason: 'idempotency_key_conflict' };
        }
        return { status: replay.status, booking: replay.booking, replayed: true };
      }
      if (this.committedByIdempotency.has(input.idempotencyKey)) {
        return { status: 'rejected', reason: 'idempotency_key_conflict' };
      }
      const booking = this.bookings.get(input.bookingId);
      if (!booking) return { status: 'rejected', reason: 'booking_not_found' };
      if (booking.status === 'cancelled') {
        return { status: 'rejected', reason: 'booking_cancelled' };
      }
      if (input.targetSlot) {
        const targetKey = `${input.targetSlot.start}/${input.targetSlot.end}`;
        const currentKey = `${booking.slot.start}/${booking.slot.end}`;
        if (targetKey !== currentKey && this.claimedSlots.has(targetKey)) {
          return { status: 'rejected', reason: 'slot_claimed' };
        }
      }
      const result = await action(booking);
      if (result.status === 'rescheduled' || result.status === 'cancelled') {
        this.claimedSlots.delete(`${booking.slot.start}/${booking.slot.end}`);
        if (result.status === 'rescheduled') {
          this.claimedSlots.add(`${result.booking.slot.start}/${result.booking.slot.end}`);
        }
        this.bookings.set(result.booking.bookingId, result.booking);
        this.receipts.set(input.receipt.receiptId, input.receipt);
        if (result.reminder) this.reminders.set(result.reminder.reminderId, result.reminder);
        this.transitionsByIdempotency.set(input.idempotencyKey, {
          fingerprint,
          status: result.status,
          booking: result.booking
        });
        return { ...result, replayed: false };
      }
      return result;
    } finally {
      release();
    }
  }

  async getBooking(bookingId: string): Promise<Booking | null> {
    return this.bookings.get(bookingId) ?? null;
  }

  async recordReceipt(receipt: LifecycleReceipt): Promise<void> {
    this.receipts.set(receipt.receiptId, receipt);
  }

  async getReceipt(receiptId: string): Promise<LifecycleReceipt | null> {
    return this.receipts.get(receiptId) ?? null;
  }
}

export class BookingService {
  constructor(
    private readonly dependencies: {
      calendar: CalendarPort;
      clock: Clock;
      proposalSigner?: ProposalSigner;
      bookingStore?: BookingStore;
      availabilityOverrides?: AvailabilityOverrideStore;
      conferencing?: ConferencingPort;
    }
  ) {}

  getLink() {
    return {
      slug: LINK_POLICY.slug,
      title: 'Create Something Together',
      description: "Let's find a time to meet",
      organizer: {
        name: 'Micah Johnson',
        email: 'micah@createsomething.io'
      },
      timezone: LINK_POLICY.timezone,
      durationMinutes: LINK_POLICY.durationMinutes,
      durationOptionsMinutes: [...LINK_POLICY.durationOptionsMinutes],
      incrementMinutes: LINK_POLICY.incrementMinutes,
      minimumNoticeMinutes: LINK_POLICY.minimumNoticeMinutes,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
      availability: [
        { day: 'Tuesday', opensAt: '11:00', closesAt: '17:00' },
        { day: 'Thursday', opensAt: '11:00', closesAt: '17:00' }
      ],
      conferencing: this.dependencies.conferencing ? 'create_something_room' : 'google_meet',
      policyVersion: LINK_POLICY.version
    } as const;
  }

  async upsertAvailabilityOverride(
    input: UpsertAvailabilityOverrideInput
  ): Promise<AvailabilityOverrideMutationResult> {
    const occurredAt = Temporal.Instant.from(this.dependencies.clock.now()).toString();
    const metadata: ResultMetadata = {
      receiptId: receiptId('override', input.overrideId),
      policyVersion: LINK_POLICY.version,
      occurredAt,
      nextActions: []
    };
    if (!input.explicitIntent) {
      return {
        ...metadata,
        status: 'operator_required',
        reason: 'explicit_intent_required',
        nextActions: ['confirm_override_intent']
      };
    }
    const store = this.dependencies.availabilityOverrides;
    if (!store) {
      return {
        ...metadata,
        status: 'rejected',
        reason: 'availability_override_store_unavailable',
        nextActions: ['contact_operator']
      };
    }
    const validation = validateAvailabilityOverride(input, occurredAt);
    if (validation) {
      return {
        ...metadata,
        status: 'rejected',
        reason: validation,
        nextActions: ['correct_override']
      };
    }
    const override: AvailabilityOverride = {
      overrideId: input.overrideId.trim(),
      date: input.date,
      opensAt: input.opensAt,
      closesAt: input.closesAt,
      timezone: input.timezone,
      reason: input.reason.trim(),
      createdAt: occurredAt
    };
    await store.upsert(override);
    await this.dependencies.bookingStore?.recordReceipt({
      ...metadata,
      status: 'override_applied',
      reason: override.reason,
      nextActions: ['list_availability', 'delete_override']
    });
    return {
      ...metadata,
      status: 'applied',
      override,
      nextActions: ['list_availability', 'delete_override']
    };
  }

  async listAvailabilityOverrides(): Promise<AvailabilityOverrideListResult> {
    const occurredAt = Temporal.Instant.from(this.dependencies.clock.now()).toString();
    return {
      receiptId: receiptId('override-list', occurredAt),
      policyVersion: LINK_POLICY.version,
      occurredAt,
      nextActions: ['upsert_override', 'delete_override'],
      status: 'available',
      overrides: await this.dependencies.availabilityOverrides?.list() ?? []
    };
  }

  async deleteAvailabilityOverride(input: {
    overrideId: string;
    explicitIntent: boolean;
  }): Promise<DeleteAvailabilityOverrideResult> {
    const occurredAt = Temporal.Instant.from(this.dependencies.clock.now()).toString();
    const metadata: ResultMetadata = {
      receiptId: receiptId('override-delete', input.overrideId),
      policyVersion: LINK_POLICY.version,
      occurredAt,
      nextActions: []
    };
    if (!input.explicitIntent) {
      return {
        ...metadata,
        status: 'operator_required',
        reason: 'explicit_intent_required',
        nextActions: ['confirm_override_delete_intent']
      };
    }
    const store = this.dependencies.availabilityOverrides;
    if (!store || !await store.delete(input.overrideId)) {
      return {
        ...metadata,
        status: 'rejected',
        reason: 'availability_override_not_found',
        nextActions: ['list_overrides']
      };
    }
    await this.dependencies.bookingStore?.recordReceipt({
      ...metadata,
      status: 'override_deleted',
      reason: input.overrideId,
      nextActions: ['list_availability']
    });
    return {
      ...metadata,
      status: 'deleted',
      overrideId: input.overrideId,
      nextActions: ['list_availability']
    };
  }

  async listAvailability(input: AvailabilityInput): Promise<AvailabilityResult> {
    const from = Temporal.Instant.from(input.from);
    const to = Temporal.Instant.from(input.to);
    const durationMinutes = meetingDuration(input.durationMinutes);
    if (Temporal.Instant.compare(from, to) >= 0) {
      throw new Error('Availability window must end after it starts.');
    }

    const occurredAt = Temporal.Instant.from(this.dependencies.clock.now()).toString();
    const metadata: ResultMetadata = {
      receiptId: availabilityReceiptId(input),
      policyVersion: LINK_POLICY.version,
      occurredAt,
      nextActions: []
    };
    const provider = await this.dependencies.calendar.listBusyIntervals({
      from: from.toString(),
      to: to.toString()
    });

    if (provider.status === 'unavailable') {
      return {
        ...metadata,
        status: 'retryable',
        reason: provider.reason,
        durationMinutes,
        slots: [],
        nextActions: ['retry_availability', 'contact_operator']
      };
    }

    const noticeBoundary = Temporal.Instant.from(occurredAt).add({
      minutes: LINK_POLICY.minimumNoticeMinutes
    });
    let overrides: AvailabilityOverride[] = [];
    try {
      overrides = await this.dependencies.availabilityOverrides?.list() ?? [];
    } catch {
      return {
        ...metadata,
        status: 'retryable',
        reason: 'availability_policy_unavailable',
        durationMinutes,
        slots: [],
        nextActions: ['retry_availability', 'contact_operator']
      };
    }
    const slots = candidateSlots(from, to, overrides, durationMinutes).filter((slot) => {
      const start = Temporal.Instant.from(slot.start);
      if (Temporal.Instant.compare(start, noticeBoundary) < 0) return false;
      return !provider.intervals.some((busy) => overlaps(slot, busy));
    });

    return {
      ...metadata,
      status: 'available',
      timezone: input.timezone,
      durationMinutes,
      slots,
      nextActions: slots.length > 0 ? ['prepare_booking'] : ['choose_another_window']
    };
  }

  async prepareBooking(input: PrepareBookingInput): Promise<PrepareBookingResult> {
    const signer = this.dependencies.proposalSigner;
    if (!signer) throw new Error('Proposal signing is not configured.');
    const occurredAt = Temporal.Instant.from(this.dependencies.clock.now()).toString();
    const metadata: ResultMetadata = {
      receiptId: receiptId('prepare', `${input.slot.start}:${input.scheduler.email}`),
      policyVersion: LINK_POLICY.version,
      occurredAt,
      nextActions: []
    };
    let durationMinutes: MeetingDurationMinutes;
    try {
      durationMinutes = meetingDuration(slotDurationMinutes(input.slot));
    } catch {
      return {
        ...metadata,
        status: 'rejected',
        reason: 'unsupported_duration',
        nextActions: ['list_availability']
      };
    }
    const availability = await this.listAvailability({
      from: input.slot.start,
      to: input.slot.end,
      timezone: LINK_POLICY.timezone,
      durationMinutes
    });
    if (availability.status === 'retryable') {
      return {
        ...metadata,
        status: 'retryable',
        reason: availability.reason,
        nextActions: ['retry_prepare', 'contact_operator']
      };
    }
    const selectedSlot = availability.slots.find(
      (slot) => slot.start === input.slot.start && slot.end === input.slot.end
    );
    if (!selectedSlot) {
      return {
        ...metadata,
        status: 'rejected',
        reason: 'slot_unavailable',
        nextActions: ['list_availability']
      };
    }

    const expiresAt = Temporal.Instant.from(occurredAt).add({ minutes: 10 }).toString();
    const proposalId = receiptId(
      'proposal',
      `${selectedSlot.start}:${input.scheduler.email}:${occurredAt}`
    );
    const context = normalizeBookingContext(input.context);
    const proposalPayload = JSON.stringify({
      proposalId,
      link: LINK_POLICY.slug,
      slot: selectedSlot,
      scheduler: input.scheduler,
      expiresAt,
      policyVersion: LINK_POLICY.version,
      ...(context ? { context } : {})
    });

    return {
      ...metadata,
      status: 'proposed',
      proposalId,
      proposalToken: await signer.sign(proposalPayload),
      expiresAt,
      slot: selectedSlot,
      ...(context ? { context } : {}),
      nextActions: ['obtain_explicit_intent', 'commit_booking']
    };
  }

  async commitBooking(input: CommitBookingInput): Promise<CommitBookingResult> {
    const occurredAt = Temporal.Instant.from(this.dependencies.clock.now()).toString();
    const metadata: ResultMetadata = {
      receiptId: receiptId('commit', input.idempotencyKey),
      policyVersion: LINK_POLICY.version,
      occurredAt,
      nextActions: []
    };
    if (!input.explicitIntent) {
      return {
        ...metadata,
        status: 'operator_required',
        reason: 'explicit_intent_required',
        nextActions: ['confirm_booking_intent']
      };
    }
    if (!input.idempotencyKey.trim()) {
      return {
        ...metadata,
        status: 'rejected',
        reason: 'idempotency_key_required',
        nextActions: ['supply_idempotency_key']
      };
    }

    const signer = this.dependencies.proposalSigner;
    const store = this.dependencies.bookingStore;
    if (!signer || !store) throw new Error('Booking commit dependencies are not configured.');
    const proposal = parseProposal(await signer.verify(input.proposalToken));
    if (!proposal || proposal.link !== LINK_POLICY.slug || proposal.policyVersion !== LINK_POLICY.version) {
      return {
        ...metadata,
        status: 'rejected',
        reason: 'invalid_proposal',
        nextActions: ['prepare_booking']
      };
    }
    if (Temporal.Instant.compare(Temporal.Instant.from(occurredAt), Temporal.Instant.from(proposal.expiresAt)) >= 0) {
      return {
        ...metadata,
        status: 'rejected',
        reason: 'proposal_expired',
        nextActions: ['prepare_booking']
      };
    }

    const bookingId = receiptId('booking', proposal.proposalId);
    const committedReceipt: CommittedReceipt = {
      ...metadata,
      status: 'committed',
      bookingId,
      ...(proposal.context ? { context: proposal.context } : {}),
      nextActions: ['get_booking', 'reschedule_booking', 'cancel_booking']
    };
    const stored = await store.commitExactlyOnce(
      {
        proposalId: proposal.proposalId,
        slot: proposal.slot,
        idempotencyKey: input.idempotencyKey,
        receipt: committedReceipt
      },
      async () => {
        const provider = await this.dependencies.calendar.listBusyIntervals({
          from: proposal.slot.start,
          to: proposal.slot.end
        });
        if (provider.status === 'unavailable') {
          return { status: 'retryable', reason: provider.reason };
        }
        if (provider.intervals.some((busy) => overlaps(proposal.slot, busy))) {
          return { status: 'rejected', reason: 'slot_unavailable' };
        }
        let conferencing: {
          provider: 'first_party';
          roomId: string;
          joinUrl: string;
        } | undefined;
        if (this.dependencies.conferencing) {
          const room = await this.dependencies.conferencing.createRoom({
            bookingId,
            title: `Micah Johnson and ${proposal.scheduler.name}`,
            idempotencyKey: `booking-room:${input.idempotencyKey}`
          });
          if (room.status === 'retryable') return room;
          conferencing = {
            provider: 'first_party',
            roomId: room.roomId,
            joinUrl: room.joinUrl
          };
        }
        let event: Awaited<ReturnType<CalendarPort['createEvent']>>;
        try {
          event = await this.dependencies.calendar.createEvent({
            slot: proposal.slot,
            scheduler: proposal.scheduler,
            idempotencyKey: input.idempotencyKey,
            ...(proposal.context ? { context: proposal.context } : {}),
            ...(conferencing ? { conferencing } : {})
          });
        } catch (error) {
          return {
            status: 'retryable',
            reason: providerFailureReason(error)
          };
        }
        const booking: Booking = {
          bookingId,
          proposalId: proposal.proposalId,
          status: 'committed',
          slot: proposal.slot,
          scheduler: proposal.scheduler,
          ...(proposal.context ? { context: proposal.context } : {}),
          provider: {
            eventId: event.eventId,
            meetUrl: event.meetUrl
          }
        };
        return {
          status: 'committed',
          booking,
          reminder: reminderForBooking(booking)
        };
      }
    );

    if (stored.status === 'committed') {
      return {
        ...metadata,
        status: 'committed',
        booking: stored.booking,
        replayed: stored.replayed ?? false,
        nextActions: committedReceipt.nextActions
      };
    }
    return {
      ...metadata,
      status: stored.status,
      reason: stored.reason,
      nextActions: stored.reason === 'slot_claimed' || stored.reason === 'slot_unavailable'
        ? ['list_availability']
        : ['retry_commit', 'contact_operator']
    };
  }

  async rescheduleBooking(input: RescheduleBookingInput): Promise<TransitionBookingResult> {
    const store = this.dependencies.bookingStore;
    const updateEvent = this.dependencies.calendar.updateEvent;
    if (!store || !updateEvent) throw new Error('Reschedule dependencies are not configured.');
    const occurredAt = Temporal.Instant.from(this.dependencies.clock.now()).toString();
    const metadata: ResultMetadata = {
      receiptId: receiptId('reschedule', input.idempotencyKey),
      policyVersion: LINK_POLICY.version,
      occurredAt,
      nextActions: []
    };
    if (!input.explicitIntent) {
      return {
        ...metadata,
        status: 'operator_required',
        reason: 'explicit_intent_required',
        nextActions: ['confirm_reschedule_intent']
      };
    }
    const transitionReceipt: TransitionReceipt = {
      ...metadata,
      status: 'rescheduled',
      bookingId: input.bookingId,
      nextActions: ['get_booking', 'cancel_booking']
    };
    const stored = await store.transitionExactlyOnce(
      {
        bookingId: input.bookingId,
        idempotencyKey: input.idempotencyKey,
        targetSlot: input.newSlot,
        receipt: transitionReceipt
      },
      async (booking) => {
        const currentDuration = slotDurationMinutes(booking.slot);
        const requestedDuration = slotDurationMinutes(input.newSlot);
        if (requestedDuration !== currentDuration) {
          return { status: 'rejected', reason: 'duration_change_requires_new_booking' };
        }
        let durationMinutes: MeetingDurationMinutes;
        try {
          durationMinutes = meetingDuration(requestedDuration);
        } catch {
          return { status: 'rejected', reason: 'unsupported_duration' };
        }
        const availability = await this.listAvailability({
          from: input.newSlot.start,
          to: input.newSlot.end,
          timezone: LINK_POLICY.timezone,
          durationMinutes
        });
        if (availability.status === 'retryable') {
          return { status: 'retryable', reason: availability.reason };
        }
        if (!availability.slots.some(
          (slot) => slot.start === input.newSlot.start && slot.end === input.newSlot.end
        )) {
          return { status: 'rejected', reason: 'slot_unavailable' };
        }
        try {
          const provider = await updateEvent.call(this.dependencies.calendar, {
            eventId: booking.provider.eventId,
            slot: input.newSlot,
            idempotencyKey: input.idempotencyKey,
            ...(booking.context ? { context: booking.context } : {}),
            ...(booking.provider.meetUrl.includes('/rooms/') ? {
              conferencing: {
                provider: 'first_party' as const,
                joinUrl: booking.provider.meetUrl
              }
            } : {})
          });
          const updatedBooking: Booking = {
            ...booking,
            status: 'rescheduled',
            slot: input.newSlot,
            provider: {
              eventId: provider.eventId,
              meetUrl: provider.meetUrl
            }
          };
          return {
            status: 'rescheduled',
            booking: updatedBooking,
            reminder: reminderForBooking(updatedBooking)
          };
        } catch (error) {
          return { status: 'retryable', reason: providerFailureReason(error) };
        }
      }
    );
    if (stored.status === 'rescheduled') {
      return {
        ...metadata,
        status: 'rescheduled',
        booking: stored.booking,
        replayed: stored.replayed ?? false,
        nextActions: transitionReceipt.nextActions
      };
    }
    if (stored.status === 'cancelled') {
      throw new Error('Reschedule transition returned an invalid cancelled status.');
    }
    const nextActions = stored.reason === 'duration_change_requires_new_booking'
      ? ['prepare_new_booking']
      : stored.reason === 'slot_claimed' || stored.reason === 'slot_unavailable' || stored.reason === 'unsupported_duration'
        ? ['list_availability']
        : ['retry_reschedule', 'contact_operator'];
    await store.recordReceipt({
      ...metadata,
      status: stored.status,
      bookingId: input.bookingId,
      reason: stored.reason,
      nextActions
    });
    return {
      ...metadata,
      status: stored.status,
      reason: stored.reason,
      nextActions
    };
  }

  async cancelBooking(input: CancelBookingInput): Promise<TransitionBookingResult> {
    const store = this.dependencies.bookingStore;
    const cancelEvent = this.dependencies.calendar.cancelEvent;
    if (!store || !cancelEvent) throw new Error('Cancellation dependencies are not configured.');
    const occurredAt = Temporal.Instant.from(this.dependencies.clock.now()).toString();
    const metadata: ResultMetadata = {
      receiptId: receiptId('cancel', input.idempotencyKey),
      policyVersion: LINK_POLICY.version,
      occurredAt,
      nextActions: []
    };
    if (!input.explicitIntent) {
      return {
        ...metadata,
        status: 'operator_required',
        reason: 'explicit_intent_required',
        nextActions: ['confirm_cancel_intent']
      };
    }
    const transitionReceipt: TransitionReceipt = {
      ...metadata,
      status: 'cancelled',
      bookingId: input.bookingId,
      nextActions: ['get_booking', 'list_availability']
    };
    const stored = await store.transitionExactlyOnce(
      {
        bookingId: input.bookingId,
        idempotencyKey: input.idempotencyKey,
        receipt: transitionReceipt
      },
      async (booking) => {
        try {
          await cancelEvent.call(this.dependencies.calendar, {
            eventId: booking.provider.eventId,
            idempotencyKey: input.idempotencyKey
          });
          return {
            status: 'cancelled',
            booking: { ...booking, status: 'cancelled' },
            reminder: { ...reminderForBooking(booking), status: 'cancelled' }
          };
        } catch (error) {
          return { status: 'retryable', reason: providerFailureReason(error) };
        }
      }
    );
    if (stored.status === 'cancelled') {
      return {
        ...metadata,
        status: 'cancelled',
        booking: stored.booking,
        replayed: stored.replayed ?? false,
        nextActions: transitionReceipt.nextActions
      };
    }
    if (stored.status === 'rescheduled') {
      throw new Error('Cancel transition returned an invalid rescheduled status.');
    }
    const nextActions = ['retry_cancel', 'contact_operator'];
    await store.recordReceipt({
      ...metadata,
      status: stored.status,
      bookingId: input.bookingId,
      reason: stored.reason,
      nextActions
    });
    return {
      ...metadata,
      status: stored.status,
      reason: stored.reason,
      nextActions
    };
  }

  async getBooking(bookingId: string): Promise<BookingReadResult> {
    const store = this.dependencies.bookingStore;
    if (!store) throw new Error('Booking storage is not configured.');
    const occurredAt = Temporal.Instant.from(this.dependencies.clock.now()).toString();
    const metadata: ResultMetadata = {
      receiptId: receiptId('read_booking', bookingId),
      policyVersion: LINK_POLICY.version,
      occurredAt,
      nextActions: []
    };
    const booking = await store.getBooking(bookingId);
    if (!booking) {
      return {
        ...metadata,
        status: 'rejected',
        reason: 'booking_not_found',
        nextActions: ['verify_booking_id', 'contact_operator']
      };
    }
    return {
      ...metadata,
      status: booking.status,
      booking,
      nextActions: booking.status === 'cancelled'
        ? ['list_availability']
        : ['reschedule_booking', 'cancel_booking']
    };
  }

  async getReceipt(receiptIdValue: string): Promise<ReceiptReadResult> {
    const store = this.dependencies.bookingStore;
    if (!store) throw new Error('Booking storage is not configured.');
    const occurredAt = Temporal.Instant.from(this.dependencies.clock.now()).toString();
    const metadata: ResultMetadata = {
      receiptId: receiptId('read_receipt', receiptIdValue),
      policyVersion: LINK_POLICY.version,
      occurredAt,
      nextActions: []
    };
    const receipt = await store.getReceipt(receiptIdValue);
    if (!receipt) {
      return {
        ...metadata,
        status: 'rejected',
        reason: 'receipt_not_found',
        nextActions: ['verify_receipt_id', 'contact_operator']
      };
    }
    return {
      ...metadata,
      status: receipt.status,
      receipt,
      nextActions: receipt.nextActions
    };
  }
}

function reminderForBooking(booking: Booking): ReminderJob {
  return {
    reminderId: receiptId('reminder', booking.bookingId),
    receiptId: receiptId('reminder_receipt', booking.bookingId),
    bookingId: booking.bookingId,
    policyVersion: LINK_POLICY.version,
    runAt: Temporal.Instant.from(booking.slot.start).subtract({ hours: 1 }).toString(),
    status: 'pending',
    scheduler: booking.scheduler,
    slot: booking.slot,
    meetUrl: booking.provider.meetUrl
  };
}

function transitionFingerprint(input: {
  bookingId: string;
  targetSlot?: AvailableSlot;
  receipt: TransitionReceipt;
}): string {
  const target = input.targetSlot
    ? `${input.targetSlot.start}/${input.targetSlot.end}`
    : 'none';
  return `${input.receipt.status}:${input.bookingId}:${target}`;
}

function candidateSlots(
  from: Temporal.Instant,
  to: Temporal.Instant,
  overrides: AvailabilityOverride[] = [],
  durationMinutes: MeetingDurationMinutes = LINK_POLICY.durationMinutes
): AvailableSlot[] {
  const slots = new Map<string, AvailableSlot>();
  let date = from.toZonedDateTimeISO(LINK_POLICY.timezone).toPlainDate();
  const lastDate = to.toZonedDateTimeISO(LINK_POLICY.timezone).toPlainDate();

  while (Temporal.PlainDate.compare(date, lastDate) <= 0) {
    if (LINK_POLICY.availableDays.has(date.dayOfWeek as 2 | 4)) {
      addWindowSlots(slots, date, {
        opensAt: Temporal.PlainTime.from({ hour: LINK_POLICY.opensAtHour }),
        closesAt: Temporal.PlainTime.from({ hour: LINK_POLICY.closesAtHour }),
        timezone: LINK_POLICY.timezone
      }, from, to, durationMinutes);
    }
    date = date.add({ days: 1 });
  }

  for (const override of overrides) {
    const overrideDate = Temporal.PlainDate.from(override.date);
    addWindowSlots(slots, overrideDate, {
      opensAt: Temporal.PlainTime.from(override.opensAt),
      closesAt: Temporal.PlainTime.from(override.closesAt),
      timezone: override.timezone
    }, from, to, durationMinutes);
  }

  return Array.from(slots.values()).sort((left, right) => left.start.localeCompare(right.start));
}

function addWindowSlots(
  slots: Map<string, AvailableSlot>,
  date: Temporal.PlainDate,
  window: { opensAt: Temporal.PlainTime; closesAt: Temporal.PlainTime; timezone: string },
  from: Temporal.Instant,
  to: Temporal.Instant,
  durationMinutes: MeetingDurationMinutes
) {
  let start = date.toZonedDateTime({ timeZone: window.timezone, plainTime: window.opensAt });
  const close = date.toZonedDateTime({ timeZone: window.timezone, plainTime: window.closesAt });
  while (Temporal.ZonedDateTime.compare(start.add({ minutes: durationMinutes }), close) <= 0) {
    const end = start.add({ minutes: durationMinutes });
    const startInstant = start.toInstant();
    const endInstant = end.toInstant();
    if (
      Temporal.Instant.compare(startInstant, from) >= 0 &&
      Temporal.Instant.compare(endInstant, to) <= 0
    ) {
      const slot = { start: startInstant.toString(), end: endInstant.toString() };
      slots.set(`${slot.start}/${slot.end}`, slot);
    }
    start = start.add({ minutes: LINK_POLICY.incrementMinutes });
  }
}

function validateAvailabilityOverride(
  input: UpsertAvailabilityOverrideInput,
  occurredAt: string
): string | null {
  if (!/^[a-z0-9][a-z0-9_-]{2,99}$/i.test(input.overrideId.trim())) return 'override_id_invalid';
  if (!input.reason.trim() || input.reason.trim().length > 200) return 'override_reason_invalid';
  try {
    const date = Temporal.PlainDate.from(input.date);
    const opensAt = Temporal.PlainTime.from(input.opensAt);
    const closesAt = Temporal.PlainTime.from(input.closesAt);
    if (
      opensAt.minute % LINK_POLICY.incrementMinutes !== 0 ||
      closesAt.minute % LINK_POLICY.incrementMinutes !== 0 ||
      opensAt.second !== 0 ||
      closesAt.second !== 0
    ) return 'override_increment_invalid';
    const open = date.toZonedDateTime({ timeZone: input.timezone, plainTime: opensAt });
    const close = date.toZonedDateTime({ timeZone: input.timezone, plainTime: closesAt });
    if (Temporal.ZonedDateTime.compare(open.add({ minutes: LINK_POLICY.durationMinutes }), close) > 0) {
      return 'override_window_too_short';
    }
    if (Temporal.Instant.compare(close.toInstant(), Temporal.Instant.from(occurredAt)) <= 0) {
      return 'override_in_past';
    }
    return null;
  } catch {
    return 'override_window_invalid';
  }
}

function overlaps(left: AvailableSlot, right: BusyInterval): boolean {
  const leftStart = Temporal.Instant.from(left.start);
  const leftEnd = Temporal.Instant.from(left.end);
  const rightStart = Temporal.Instant.from(right.start);
  const rightEnd = Temporal.Instant.from(right.end);
  return (
    Temporal.Instant.compare(leftStart, rightEnd) < 0 &&
    Temporal.Instant.compare(leftEnd, rightStart) > 0
  );
}

function availabilityReceiptId(input: AvailabilityInput): string {
  return receiptId(
    'availability',
    `${LINK_POLICY.version}:${LINK_POLICY.slug}:${input.from}:${input.to}:${input.timezone}:${input.durationMinutes ?? LINK_POLICY.durationMinutes}`
  );
}

function meetingDuration(value: number | undefined): MeetingDurationMinutes {
  const duration = value ?? LINK_POLICY.durationMinutes;
  if (!LINK_POLICY.durationOptionsMinutes.some((option) => option === duration)) {
    throw new Error('durationMinutes must be 30 or 60.');
  }
  return duration as MeetingDurationMinutes;
}

function slotDurationMinutes(slot: AvailableSlot): number {
  const start = Temporal.Instant.from(slot.start);
  const end = Temporal.Instant.from(slot.end);
  return start.until(end, { largestUnit: 'minute' }).minutes;
}

function receiptId(prefix: string, material: string): string {
  let hash = 2166136261;
  for (const character of material) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `${prefix}_${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function parseProposal(payload: string | null): ProposalPayload | null {
  if (!payload) return null;
  try {
    const value = JSON.parse(payload) as Partial<ProposalPayload>;
    if (
      typeof value.proposalId !== 'string' ||
      typeof value.link !== 'string' ||
      typeof value.expiresAt !== 'string' ||
      typeof value.policyVersion !== 'string' ||
      typeof value.slot?.start !== 'string' ||
      typeof value.slot.end !== 'string' ||
      typeof value.scheduler?.name !== 'string' ||
      typeof value.scheduler.email !== 'string'
    ) return null;
    const context = normalizeBookingContext(value.context);
    const proposal: ProposalPayload = {
      proposalId: value.proposalId,
      link: value.link,
      slot: value.slot as AvailableSlot,
      scheduler: value.scheduler as SchedulerIdentity,
      expiresAt: value.expiresAt,
      policyVersion: value.policyVersion,
      ...(context ? { context } : {})
    };
    return proposal;
  } catch {
    return null;
  }
}

export function normalizeBookingContext(
  input: Partial<Record<keyof BookingContext, unknown>> | undefined
): BookingContext | undefined {
  if (!input || typeof input !== 'object') return undefined;
  const context: BookingContext = {};
  const token = (value: unknown, max = 90) =>
    typeof value === 'string'
      ? value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, max)
      : '';
  const copyToken = (key: keyof BookingContext, max?: number) => {
    const value = token(input[key], max);
    if (value) Object.assign(context, { [key]: value });
  };
  copyToken('source', 64);
  copyToken('intent');
  copyToken('lane', 64);
  copyToken('warmup', 64);
  copyToken('readiness', 64);
  copyToken('atlasSessionId', 100);
  if (Number.isInteger(input.score) && Number(input.score) >= 0 && Number(input.score) <= 100) {
    context.score = Number(input.score);
  }
  if (Number.isInteger(input.agentMessages) && Number(input.agentMessages) >= 0 && Number(input.agentMessages) <= 200) {
    context.agentMessages = Number(input.agentMessages);
  }
  if (typeof input.warmupNotes === 'string') {
    const notes = input.warmupNotes.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, 2000);
    if (notes) context.warmupNotes = notes;
  }
  return Object.keys(context).length ? context : undefined;
}

function providerFailureReason(error: unknown): string {
  if (error instanceof Error && /^provider_[a-z0-9_]+$/.test(error.message)) {
    return error.message;
  }
  return 'provider_event_unavailable';
}
