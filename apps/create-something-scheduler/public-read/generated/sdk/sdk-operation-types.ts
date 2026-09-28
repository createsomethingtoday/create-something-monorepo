import type { CloudflareApi } from './index.js';

/** Request types keyed by the OpenAPI operationId used to generate them. */
export interface SdkOperationRequestMap {
  "listAvailability": CloudflareApi.ListAvailabilityRequest;
}

/** Query-only projections of generated SDK request types. */
export interface SdkOperationQueryMap {
  "listAvailability": Pick<CloudflareApi.ListAvailabilityRequest, Extract<"from" | "to" | "timezone" | "durationMinutes", keyof CloudflareApi.ListAvailabilityRequest>>;
}

export type SdkOperationId = keyof SdkOperationRequestMap;
export type SdkQueryOperationId = keyof SdkOperationQueryMap;

export type SdkRequest<OperationId extends SdkOperationId> =
  SdkOperationRequestMap[OperationId];

export type SdkQuery<OperationId extends SdkQueryOperationId> =
  SdkOperationQueryMap[OperationId];

