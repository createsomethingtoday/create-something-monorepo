import { Temporal } from '@js-temporal/polyfill';
import type {
  BusyInterval,
  CalendarAvailability,
  CalendarPort,
  Clock
} from '../application/booking-service.js';

export type BusyProjection = {
  source: 'webflow-google-calendar';
  rangeStart: string;
  rangeEnd: string;
  observedAt: string;
  expiresAt: string;
  intervals: BusyInterval[];
};

export type BusyProjectionStore = {
  read(): Promise<BusyProjection | null>;
};

export class ProjectedConflictCalendarPort implements CalendarPort {
  constructor(
    private readonly config: {
      primary: CalendarPort;
      projection: BusyProjectionStore;
      clock: Clock;
    }
  ) {}

  async listBusyIntervals(input: {
    from: string;
    to: string;
  }): Promise<CalendarAvailability> {
    let projection: BusyProjection | null;
    try {
      projection = await this.config.projection.read();
    } catch {
      return { status: 'unavailable', reason: 'webflow_projection_unavailable' };
    }
    if (!projection) {
      return { status: 'unavailable', reason: 'webflow_projection_missing' };
    }

    const now = Temporal.Instant.from(this.config.clock.now());
    if (Temporal.Instant.compare(Temporal.Instant.from(projection.expiresAt), now) <= 0) {
      return { status: 'unavailable', reason: 'webflow_projection_stale' };
    }
    if (
      Temporal.Instant.compare(
        Temporal.Instant.from(input.from),
        Temporal.Instant.from(projection.rangeStart)
      ) < 0 ||
      Temporal.Instant.compare(
        Temporal.Instant.from(input.to),
        Temporal.Instant.from(projection.rangeEnd)
      ) > 0
    ) {
      return { status: 'unavailable', reason: 'webflow_projection_range_unavailable' };
    }

    const primary = await this.config.primary.listBusyIntervals(input);
    if (primary.status === 'unavailable') return primary;

    return {
      status: 'available',
      intervals: [...primary.intervals, ...projection.intervals]
        .sort((left, right) => left.start.localeCompare(right.start))
    };
  }

  createEvent(input: Parameters<CalendarPort['createEvent']>[0]) {
    return this.config.primary.createEvent(input);
  }

  updateEvent(input: Parameters<NonNullable<CalendarPort['updateEvent']>>[0]) {
    const update = this.config.primary.updateEvent;
    if (!update) throw new Error('provider_event_update_unavailable');
    return update.call(this.config.primary, input);
  }

  cancelEvent(input: Parameters<NonNullable<CalendarPort['cancelEvent']>>[0]) {
    const cancel = this.config.primary.cancelEvent;
    if (!cancel) throw new Error('provider_event_cancel_unavailable');
    return cancel.call(this.config.primary, input);
  }
}
