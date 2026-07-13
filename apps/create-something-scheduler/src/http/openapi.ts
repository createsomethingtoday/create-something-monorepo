export const schedulerOpenApi = {
  openapi: '3.1.0',
  info: {
    title: 'CREATE SOMETHING Scheduler API',
    version: '1.0.0',
    description: 'Versioned API for the createsomething/together scheduling lifecycle.'
  },
  servers: [{ url: '/' }],
  paths: {
    '/api/v1/links/createsomething/together': {
      get: operation('getLink', 'Read the active link policy', 'Public link configuration.', 'Link')
    },
    '/api/v1/availability': {
      get: {
        ...operation('listAvailability', 'List safe availability', 'Fails closed when Calendar is uncertain.', 'Availability'),
        parameters: [
          ...['from', 'to', 'timezone'].map((name) => ({
            name,
            in: 'query',
            required: true,
            schema: { type: 'string' }
          })),
          {
            name: 'durationMinutes',
            in: 'query',
            required: false,
            schema: { type: 'integer', enum: [30, 60], default: 30 }
          }
        ]
      }
    },
    '/api/v1/bookings/prepare': {
      post: writeOperation('prepareBooking', 'Prepare a booking without mutation', 'PrepareBookingInput', 'PrepareBookingResult', [])
    },
    '/api/v1/bookings': {
      post: writeOperation('commitBooking', 'Commit a signed proposal', 'CommitBookingInput', 'BookingResult', [{ operatorBearer: [] }, { browserProof: [] }])
    },
    '/api/v1/bookings/{bookingId}': {
      get: scopedOperation('getBooking', 'Read one booking', 'BookingResult')
    },
    '/api/v1/bookings/{bookingId}/reschedule': {
      post: scopedWriteOperation('rescheduleBooking', 'Reschedule the same booking', 'RescheduleBookingInput')
    },
    '/api/v1/bookings/{bookingId}/cancel': {
      post: scopedWriteOperation('cancelBooking', 'Cancel the booking', 'CancelBookingInput')
    },
    '/api/v1/rooms': {
      post: writeOperation('createRoom', 'Create or safely replay a first-party meeting room', 'CreateRoomInput', 'RoomResult', [{ operatorBearer: [] }])
    },
    '/api/v1/rooms/{roomId}': {
      get: {
        ...operation('getRoom', 'Read one first-party meeting room', 'Operator-scoped room state without provider credentials.', 'RoomResult'),
        security: [{ operatorBearer: [] }],
        parameters: pathParameters('roomId')
      }
    },
    '/api/v1/rooms/{roomId}/credentials': {
      post: {
        ...writeOperation('issueRoomJoinCredential', 'Exchange a signed room capability for a fresh no-store provider token', 'JoinCredentialInput', 'JoinCredentialResult', []),
        parameters: pathParameters('roomId')
      }
    },
    '/api/v1/rooms/{roomId}/end': {
      post: {
        ...writeOperation('endRoom', 'Terminally end a first-party meeting room', 'EndRoomInput', 'RoomResult', [{ operatorBearer: [] }, {}]),
        parameters: pathParameters('roomId')
      }
    },
    '/api/v1/receipts/{receiptId}': {
      get: {
        ...operation('getReceipt', 'Read one lifecycle receipt', 'Operator-scoped receipt evidence.', 'ReceiptResult'),
        security: [{ operatorBearer: [] }],
        parameters: pathParameters('receiptId')
      }
    },
    '/api/v1/operator/status': {
      get: {
        ...operation('getOperatorStatus', 'Read scheduler runtime readiness', 'Operator-scoped configuration and provider readiness without secret values.', 'RuntimeStatus'),
        security: [{ operatorBearer: [] }]
      }
    },
    '/api/v1/operator/calendars/discover': {
      post: {
        ...operation('discoverOperatorCalendars', 'Retry Calendar discovery', 'Operator-scoped recovery using the stored OAuth credential.', 'CalendarDiscovery'),
        security: [{ operatorBearer: [] }]
      }
    },
    '/api/v1/operator/availability-overrides': {
      get: {
        ...operation('listAvailabilityOverrides', 'List date-specific availability overrides', 'Operator-scoped bounded exceptions layered onto recurring availability.', 'AvailabilityOverrideList'),
        security: [{ operatorBearer: [] }]
      },
      post: writeOperation('upsertAvailabilityOverride', 'Create or replace a bounded availability override', 'UpsertAvailabilityOverrideInput', 'AvailabilityOverrideMutation', [{ operatorBearer: [] }])
    },
    '/api/v1/operator/availability-overrides/{overrideId}': {
      delete: {
        ...writeOperation('deleteAvailabilityOverride', 'Delete a bounded availability override', 'ExplicitIntentInput', 'AvailabilityOverrideDelete', [{ operatorBearer: [] }]),
        parameters: pathParameters('overrideId')
      }
    }
  },
  components: {
    securitySchemes: {
      operatorBearer: { type: 'http', scheme: 'bearer' },
      bookingAction: { type: 'apiKey', in: 'header', name: 'X-Booking-Action-Token' },
      browserProof: { type: 'apiKey', in: 'header', name: 'X-Browser-Proof' }
    },
    schemas: {
      Slot: object({ start: { type: 'string', format: 'date-time' }, end: { type: 'string', format: 'date-time' } }, ['start', 'end']),
      Scheduler: object({ name: { type: 'string' }, email: { type: 'string', format: 'email' } }, ['name', 'email']),
      BookingContext: object({
        source: { type: 'string' },
        intent: { type: 'string' },
        lane: { type: 'string' },
        warmup: { type: 'string' },
        readiness: { type: 'string' },
        score: { type: 'integer', minimum: 0, maximum: 100 },
        atlasSessionId: { type: 'string' },
        agentMessages: { type: 'integer', minimum: 0, maximum: 200 },
        warmupNotes: { type: 'string', maxLength: 2000 }
      }, []),
      PrepareBookingInput: object({ slot: ref('Slot'), scheduler: ref('Scheduler'), context: ref('BookingContext') }, ['slot', 'scheduler']),
      CommitBookingInput: object({ proposalToken: { type: 'string' }, idempotencyKey: { type: 'string' }, explicitIntent: { const: true } }, ['proposalToken', 'idempotencyKey', 'explicitIntent']),
      RescheduleBookingInput: object({ newSlot: ref('Slot'), idempotencyKey: { type: 'string' }, explicitIntent: { const: true } }, ['newSlot', 'idempotencyKey', 'explicitIntent']),
      CancelBookingInput: object({ idempotencyKey: { type: 'string' }, explicitIntent: { const: true } }, ['idempotencyKey', 'explicitIntent']),
      CreateRoomInput: object({
        bookingId: { type: 'string' },
        title: { type: 'string', minLength: 1, maxLength: 200 },
        idempotencyKey: { type: 'string', minLength: 1, maxLength: 200 },
        explicitIntent: { const: true }
      }, ['title', 'idempotencyKey', 'explicitIntent']),
      JoinCredentialInput: object({
        capability: { type: 'string', minLength: 1, maxLength: 4096 },
        displayName: { type: 'string', minLength: 1, maxLength: 80 }
      }, ['capability', 'displayName']),
      EndRoomInput: object({
        idempotencyKey: { type: 'string', minLength: 1, maxLength: 200 },
        explicitIntent: { const: true },
        capability: { type: 'string', minLength: 1, maxLength: 4096, writeOnly: true }
      }, ['idempotencyKey', 'explicitIntent']),
      ExplicitIntentInput: object({ explicitIntent: { const: true } }, ['explicitIntent']),
      AvailabilityOverride: object({
        overrideId: { type: 'string' },
        date: { type: 'string', format: 'date' },
        opensAt: { type: 'string', pattern: '^\\d{2}:\\d{2}$' },
        closesAt: { type: 'string', pattern: '^\\d{2}:\\d{2}$' },
        timezone: { type: 'string' },
        reason: { type: 'string' },
        createdAt: { type: 'string', format: 'date-time' }
      }, ['overrideId', 'date', 'opensAt', 'closesAt', 'timezone', 'reason', 'createdAt']),
      UpsertAvailabilityOverrideInput: object({
        overrideId: { type: 'string' },
        date: { type: 'string', format: 'date' },
        opensAt: { type: 'string', pattern: '^\\d{2}:\\d{2}$' },
        closesAt: { type: 'string', pattern: '^\\d{2}:\\d{2}$' },
        timezone: { type: 'string' },
        reason: { type: 'string' },
        explicitIntent: { const: true }
      }, ['overrideId', 'date', 'opensAt', 'closesAt', 'timezone', 'reason', 'explicitIntent']),
      AvailabilityOverrideList: lifecycleObject({
        status: { const: 'available' },
        overrides: { type: 'array', items: ref('AvailabilityOverride') }
      }, ['status', 'overrides']),
      AvailabilityOverrideMutation: lifecycleObject({
        status: { type: 'string', enum: ['applied', 'operator_required', 'rejected'] },
        override: ref('AvailabilityOverride'),
        reason: { type: 'string' }
      }, ['status']),
      AvailabilityOverrideDelete: lifecycleObject({
        status: { type: 'string', enum: ['deleted', 'operator_required', 'rejected'] },
        overrideId: { type: 'string' },
        reason: { type: 'string' }
      }, ['status']),
      Link: object({
        durationMinutes: { type: 'integer', const: 30 },
        durationOptionsMinutes: { type: 'array', items: { type: 'integer', enum: [30, 60] } }
      }, ['durationMinutes', 'durationOptionsMinutes']),
      Availability: lifecycleObject({
        status: { type: 'string', enum: ['available', 'retryable'] },
        durationMinutes: { type: 'integer', enum: [30, 60] },
        timezone: { type: 'string' },
        reason: { type: 'string' },
        slots: { type: 'array', items: ref('Slot') }
      }, ['status', 'durationMinutes', 'slots']),
      PrepareBookingResult: lifecycleSchema(),
      BookingResult: lifecycleSchema(),
      RoomParticipant: object({
        providerParticipantId: { type: 'string' },
        joinedAt: { type: 'string', format: 'date-time' }
      }, ['providerParticipantId', 'joinedAt']),
      Room: object({
        roomId: { type: 'string' },
        bookingId: { type: 'string' },
        title: { type: 'string' },
        status: { type: 'string', enum: ['ready', 'active', 'ended'] },
        providerMeetingId: { type: 'string' },
        joinUrl: { type: 'string', format: 'uri' },
        createdAt: { type: 'string', format: 'date-time' },
        endedAt: { type: 'string', format: 'date-time' },
        participants: object({ host: ref('RoomParticipant'), guest: ref('RoomParticipant') }, [])
      }, ['roomId', 'title', 'status', 'providerMeetingId', 'joinUrl', 'createdAt', 'participants']),
      RoomResult: lifecycleObject({
        status: { type: 'string', enum: ['ready', 'active', 'ended', 'rejected', 'retryable', 'operator_required'] },
        room: ref('Room'),
        replayed: { type: 'boolean' },
        reason: { type: 'string' },
        invites: object({
          hostUrl: { type: 'string', format: 'uri' },
          guestUrl: { type: 'string', format: 'uri' },
          expiresAt: { type: 'string', format: 'date-time' }
        }, ['hostUrl', 'guestUrl', 'expiresAt'])
      }, ['status']),
      JoinCredentialResult: lifecycleObject({
        status: { type: 'string', enum: ['ready', 'rejected', 'retryable'] },
        role: { type: 'string', enum: ['host', 'guest'] },
        providerMeetingId: { type: 'string' },
        providerParticipantId: { type: 'string' },
        providerToken: { type: 'string', writeOnly: true },
        nextCapability: { type: 'string', writeOnly: true },
        cacheControl: { const: 'no-store' },
        reason: { type: 'string' }
      }, ['status']),
      ReceiptResult: lifecycleSchema(),
      RuntimeStatus: object({
        ready: { type: 'boolean' },
        oauthConnected: { type: 'boolean' },
        calendarDiscovered: { type: 'boolean' },
        selectedCalendarCount: { type: 'integer', minimum: 0 },
        eventCalendarId: { type: ['string', 'null'] },
        configuration: { type: 'object', additionalProperties: { type: 'boolean' } }
      }, ['ready', 'oauthConnected', 'calendarDiscovered', 'selectedCalendarCount', 'configuration']),
      CalendarDiscovery: object({
        status: { const: 'available' },
        selectedCalendarIds: { type: 'array', items: { type: 'string' } },
        eventCalendarId: { type: 'string' }
      }, ['status', 'selectedCalendarIds', 'eventCalendarId']),
      Error: object({ code: { type: 'string' }, message: { type: 'string' } }, ['code', 'message'])
    }
  }
} as const;

function operation(operationId: string, summary: string, description: string, schema: string) {
  return {
    operationId,
    summary,
    description,
    responses: responses(schema)
  };
}

function writeOperation(operationId: string, summary: string, input: string, output: string, security: unknown[]) {
  return {
    ...operation(operationId, summary, summary, output),
    security,
    requestBody: requestBody(input)
  };
}

function scopedOperation(operationId: string, summary: string, output: string) {
  return {
    ...operation(operationId, summary, summary, output),
    security: [{ operatorBearer: [] }, { bookingAction: [] }],
    parameters: pathParameters('bookingId')
  };
}

function scopedWriteOperation(operationId: string, summary: string, input: string) {
  return {
    ...scopedOperation(operationId, summary, 'BookingResult'),
    requestBody: requestBody(input)
  };
}

function pathParameters(name: string) {
  return [{ name, in: 'path', required: true, schema: { type: 'string' } }];
}

function requestBody(schema: string) {
  return {
    required: true,
    content: { 'application/json': { schema: ref(schema) } }
  };
}

function responses(schema: string) {
  return {
    '200': { description: 'Structured lifecycle result.', content: { 'application/json': { schema: ref(schema) } } },
    '4XX': { description: 'Rejected or authorization-required result.', content: { 'application/json': { schema: ref('Error') } } },
    '503': { description: 'Provider or runtime uncertainty; no success may be inferred.', content: { 'application/json': { schema: ref('Error') } } }
  };
}

function lifecycleSchema() {
  return lifecycleObject({ status: { type: 'string' } }, ['status']);
}

function lifecycleObject(properties: Record<string, unknown>, required: string[]) {
  return object({
    receiptId: { type: 'string' },
    policyVersion: { type: 'string' },
    occurredAt: { type: 'string', format: 'date-time' },
    nextActions: { type: 'array', items: { type: 'string' } },
    ...properties
  }, [...required, 'receiptId', 'policyVersion', 'occurredAt', 'nextActions']);
}

function object(properties: Record<string, unknown>, required: string[]) {
  return { type: 'object', properties, required, additionalProperties: true };
}

function ref(name: string) {
  return { $ref: `#/components/schemas/${name}` };
}
