import { describe, expect, it } from 'vitest';
import { schedulerOpenApi } from './openapi.js';

describe('scheduler OpenAPI contract', () => {
  it('documents every v1 lifecycle route and scoped writes', () => {
    expect(schedulerOpenApi.openapi).toBe('3.1.0');
    expect(Object.keys(schedulerOpenApi.paths)).toEqual([
      '/api/v1/links/createsomething/together',
      '/api/v1/availability',
      '/api/v1/bookings/prepare',
      '/api/v1/bookings',
      '/api/v1/bookings/{bookingId}',
      '/api/v1/bookings/{bookingId}/reschedule',
      '/api/v1/bookings/{bookingId}/cancel',
      '/api/v1/rooms',
      '/api/v1/rooms/{roomId}',
      '/api/v1/rooms/{roomId}/credentials',
      '/api/v1/rooms/{roomId}/end',
      '/api/v1/receipts/{receiptId}',
      '/api/v1/operator/status',
      '/api/v1/operator/calendars/discover',
      '/api/v1/operator/availability-overrides',
      '/api/v1/operator/availability-overrides/{overrideId}'
    ]);
    expect(schedulerOpenApi.paths['/api/v1/bookings'].post.security).toEqual([
      { operatorBearer: [] },
      { browserProof: [] }
    ]);
    expect(schedulerOpenApi.paths['/api/v1/bookings/{bookingId}/cancel'].post.security)
      .toContainEqual({ bookingAction: [] });
    expect(schedulerOpenApi.paths['/api/v1/availability'].get.parameters).toContainEqual({
      name: 'durationMinutes',
      in: 'query',
      required: false,
      schema: { type: 'integer', enum: [30, 60], default: 30 }
    });
    expect(schedulerOpenApi.paths['/api/v1/operator/availability-overrides'].post.security)
      .toEqual([{ operatorBearer: [] }]);
    expect(schedulerOpenApi.paths['/api/v1/rooms'].post.security)
      .toEqual([{ operatorBearer: [] }]);
    expect(schedulerOpenApi.paths['/api/v1/rooms/{roomId}/credentials'].post.security)
      .toEqual([]);
    expect(schedulerOpenApi.paths['/api/v1/rooms/{roomId}/end'].post.security)
      .toEqual([{ operatorBearer: [] }, {}]);
    expect(schedulerOpenApi.components.schemas.JoinCredentialResult.properties.cacheControl)
      .toEqual({ const: 'no-store' });
  });
});
