import { describe, expect, it, vi } from 'vitest';
import type { CalendarPort } from '../application/booking-service.js';
import { ProjectedConflictCalendarPort } from './projected-calendar.js';

describe('ProjectedConflictCalendarPort', () => {
  it('combines direct Google conflicts with a fresh Webflow busy projection', async () => {
    const primary: CalendarPort = {
      listBusyIntervals: vi.fn(async () => ({
        status: 'available' as const,
        intervals: [{
          start: '2037-07-14T16:00:00Z',
          end: '2037-07-14T16:30:00Z'
        }]
      })),
      createEvent: vi.fn()
    };
    const calendar = new ProjectedConflictCalendarPort({
      primary,
      clock: { now: () => '2037-07-14T15:05:00Z' },
      projection: {
        read: async () => ({
          source: 'webflow-google-calendar',
          rangeStart: '2037-07-14T00:00:00Z',
          rangeEnd: '2037-08-20T00:00:00Z',
          observedAt: '2037-07-14T15:00:00Z',
          expiresAt: '2037-07-14T15:30:00Z',
          intervals: [{
            start: '2037-07-14T18:00:00Z',
            end: '2037-07-14T18:30:00Z'
          }]
        })
      }
    });

    await expect(calendar.listBusyIntervals({
      from: '2037-07-14T00:00:00Z',
      to: '2037-07-15T00:00:00Z'
    })).resolves.toEqual({
      status: 'available',
      intervals: [
        { start: '2037-07-14T16:00:00Z', end: '2037-07-14T16:30:00Z' },
        { start: '2037-07-14T18:00:00Z', end: '2037-07-14T18:30:00Z' }
      ]
    });
  });

  it('fails closed without querying Google when the Webflow projection is stale', async () => {
    const listBusyIntervals = vi.fn(async () => ({
      status: 'available' as const,
      intervals: []
    }));
    const calendar = new ProjectedConflictCalendarPort({
      primary: { listBusyIntervals, createEvent: vi.fn() },
      clock: { now: () => '2037-07-14T15:31:00Z' },
      projection: {
        read: async () => ({
          source: 'webflow-google-calendar',
          rangeStart: '2037-07-14T00:00:00Z',
          rangeEnd: '2037-08-20T00:00:00Z',
          observedAt: '2037-07-14T15:00:00Z',
          expiresAt: '2037-07-14T15:30:00Z',
          intervals: []
        })
      }
    });

    await expect(calendar.listBusyIntervals({
      from: '2037-07-14T00:00:00Z',
      to: '2037-07-15T00:00:00Z'
    })).resolves.toEqual({
      status: 'unavailable',
      reason: 'webflow_projection_stale'
    });
    expect(listBusyIntervals).not.toHaveBeenCalled();
  });

  it('fails closed when the requested window exceeds projection coverage', async () => {
    const listBusyIntervals = vi.fn(async () => ({
      status: 'available' as const,
      intervals: []
    }));
    const calendar = new ProjectedConflictCalendarPort({
      primary: { listBusyIntervals, createEvent: vi.fn() },
      clock: { now: () => '2037-07-14T15:05:00Z' },
      projection: {
        read: async () => ({
          source: 'webflow-google-calendar',
          rangeStart: '2037-07-14T00:00:00Z',
          rangeEnd: '2037-07-15T00:00:00Z',
          observedAt: '2037-07-14T15:00:00Z',
          expiresAt: '2037-07-14T15:30:00Z',
          intervals: []
        })
      }
    });

    await expect(calendar.listBusyIntervals({
      from: '2037-07-14T00:00:00Z',
      to: '2037-07-16T00:00:00Z'
    })).resolves.toEqual({
      status: 'unavailable',
      reason: 'webflow_projection_range_unavailable'
    });
    expect(listBusyIntervals).not.toHaveBeenCalled();
  });
});
