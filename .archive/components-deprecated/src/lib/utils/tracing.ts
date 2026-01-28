/**
 * Distributed Tracing Utilities
 *
 * Lightweight tracing infrastructure for cross-property request tracking.
 * Zero-dependency implementation compatible with Cloudflare Workers.
 *
 * Design: Follows W3C Trace Context specification for header propagation.
 * Can be enhanced with OpenTelemetry SDK when needed.
 */

// ============================================
// Types
// ============================================

/**
 * Trace context following W3C Trace Context spec
 * @see https://www.w3.org/TR/trace-context/
 */
export interface TraceContext {
	/** 32-character hex trace ID */
	traceId: string;
	/** 16-character hex span ID */
	spanId: string;
	/** Parent span ID (if any) */
	parentSpanId?: string;
	/** Trace flags (sampled, etc.) */
	flags: number;
}

/**
 * Span represents a unit of work
 */
export interface Span {
	name: string;
	context: TraceContext;
	startTime: number;
	endTime?: number;
	status: 'ok' | 'error' | 'unset';
	attributes: Record<string, string | number | boolean>;
	events: SpanEvent[];
}

/**
 * Span event (log within a span)
 */
export interface SpanEvent {
	name: string;
	timestamp: number;
	attributes?: Record<string, string | number | boolean>;
}

// ============================================
// ID Generation
// ============================================

/**
 * Generate a random hex string of specified length
 */
function randomHex(length: number): string {
	const bytes = new Uint8Array(length / 2);
	crypto.getRandomValues(bytes);
	return Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

/**
 * Generate a new trace ID (32 hex characters)
 */
export function generateTraceId(): string {
	return randomHex(32);
}

/**
 * Generate a new span ID (16 hex characters)
 */
export function generateSpanId(): string {
	return randomHex(16);
}

// ============================================
// W3C Trace Context Parsing
// ============================================

/**
 * Parse W3C traceparent header
 * Format: {version}-{trace-id}-{parent-id}-{trace-flags}
 *
 * @example
 * parseTraceparent('00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01')
 */
export function parseTraceparent(header: string | null): TraceContext | null {
	if (!header) return null;

	const parts = header.split('-');
	if (parts.length !== 4) return null;

	const [version, traceId, parentId, flags] = parts;

	// Only support version 00
	if (version !== '00') return null;

	// Validate format
	if (traceId.length !== 32 || parentId.length !== 16) return null;

	// All zeros is invalid
	if (/^0+$/.test(traceId) || /^0+$/.test(parentId)) return null;

	return {
		traceId,
		spanId: generateSpanId(), // New span for this service
		parentSpanId: parentId,
		flags: parseInt(flags, 16)
	};
}

/**
 * Format trace context as W3C traceparent header
 */
export function formatTraceparent(context: TraceContext): string {
	const flags = context.flags.toString(16).padStart(2, '0');
	return `00-${context.traceId}-${context.spanId}-${flags}`;
}

// ============================================
// Span Management
// ============================================

/**
 * Create a new trace context
 * Use when starting a new trace (no incoming traceparent header)
 */
export function createTraceContext(): TraceContext {
	return {
		traceId: generateTraceId(),
		spanId: generateSpanId(),
		flags: 1 // Sampled by default
	};
}

/**
 * Create a child trace context (new span in same trace)
 */
export function createChildContext(parent: TraceContext): TraceContext {
	return {
		traceId: parent.traceId,
		spanId: generateSpanId(),
		parentSpanId: parent.spanId,
		flags: parent.flags
	};
}

/**
 * Create a new span
 */
export function createSpan(name: string, context?: TraceContext): Span {
	return {
		name,
		context: context || createTraceContext(),
		startTime: Date.now(),
		status: 'unset',
		attributes: {},
		events: []
	};
}

/**
 * End a span
 */
export function endSpan(span: Span, status: 'ok' | 'error' = 'ok'): Span {
	return {
		...span,
		endTime: Date.now(),
		status
	};
}

/**
 * Add attribute to span
 */
export function setSpanAttribute(
	span: Span,
	key: string,
	value: string | number | boolean
): Span {
	return {
		...span,
		attributes: { ...span.attributes, [key]: value }
	};
}

/**
 * Add event to span
 */
export function addSpanEvent(
	span: Span,
	name: string,
	attributes?: Record<string, string | number | boolean>
): Span {
	return {
		...span,
		events: [...span.events, { name, timestamp: Date.now(), attributes }]
	};
}

// ============================================
// Request Tracing
// ============================================

/**
 * Extract trace context from incoming request
 */
export function extractTraceContext(request: Request): TraceContext {
	const traceparent = request.headers.get('traceparent');
	return parseTraceparent(traceparent) || createTraceContext();
}

/**
 * Inject trace context into outgoing request headers
 */
export function injectTraceContext(
	headers: Headers,
	context: TraceContext
): Headers {
	headers.set('traceparent', formatTraceparent(context));
	return headers;
}

// ============================================
// Span Export (for logging/observability)
// ============================================

/**
 * Format span for JSON logging
 * Compatible with structured logging and log aggregation services
 */
export function formatSpanForLogging(span: Span): Record<string, unknown> {
	const duration = span.endTime ? span.endTime - span.startTime : undefined;

	return {
		trace_id: span.context.traceId,
		span_id: span.context.spanId,
		parent_span_id: span.context.parentSpanId,
		name: span.name,
		status: span.status,
		start_time: new Date(span.startTime).toISOString(),
		end_time: span.endTime ? new Date(span.endTime).toISOString() : undefined,
		duration_ms: duration,
		attributes: span.attributes,
		events: span.events.map((e) => ({
			name: e.name,
			timestamp: new Date(e.timestamp).toISOString(),
			attributes: e.attributes
		}))
	};
}

// ============================================
// Higher-Level Tracing API
// ============================================

/**
 * Trace a function execution
 *
 * @example
 * const result = await trace('fetchUser', async (span) => {
 *   span = setSpanAttribute(span, 'user.id', userId);
 *   const user = await db.getUser(userId);
 *   return { span, result: user };
 * });
 */
export async function trace<T>(
	name: string,
	fn: (span: Span) => Promise<{ span: Span; result: T }>,
	parentContext?: TraceContext
): Promise<{ span: Span; result: T }> {
	const context = parentContext ? createChildContext(parentContext) : createTraceContext();
	let span = createSpan(name, context);

	try {
		const { span: updatedSpan, result } = await fn(span);
		span = endSpan(updatedSpan, 'ok');
		return { span, result };
	} catch (error) {
		span = addSpanEvent(span, 'exception', {
			'exception.type': error instanceof Error ? error.name : 'Error',
			'exception.message': error instanceof Error ? error.message : String(error)
		});
		span = endSpan(span, 'error');
		throw error;
	}
}

/**
 * Create a tracer for a service/property
 *
 * @example
 * const tracer = createTracer('agency');
 *
 * export const POST = async ({ request }) => {
 *   return tracer.traceRequest(request, 'handleCheckout', async (span, ctx) => {
 *     // ... your handler code
 *     return json({ success: true });
 *   });
 * };
 */
export function createTracer(serviceName: string) {
	return {
		/**
		 * Trace an incoming HTTP request
		 */
		async traceRequest<T>(
			request: Request,
			operationName: string,
			handler: (span: Span, context: TraceContext) => Promise<T>
		): Promise<T> {
			const context = extractTraceContext(request);
			let span = createSpan(`${serviceName}.${operationName}`, context);

			// Add standard HTTP attributes
			span = setSpanAttribute(span, 'http.method', request.method);
			span = setSpanAttribute(span, 'http.url', request.url);
			span = setSpanAttribute(span, 'service.name', serviceName);

			try {
				const result = await handler(span, context);
				span = endSpan(span, 'ok');

				// Log completed span
				console.info(JSON.stringify({
					level: 'info',
					message: 'Request completed',
					...formatSpanForLogging(span)
				}));

				return result;
			} catch (error) {
				span = addSpanEvent(span, 'exception', {
					'exception.type': error instanceof Error ? error.name : 'Error',
					'exception.message': error instanceof Error ? error.message : String(error)
				});
				span = endSpan(span, 'error');

				// Log failed span
				console.error(JSON.stringify({
					level: 'error',
					message: 'Request failed',
					...formatSpanForLogging(span)
				}));

				throw error;
			}
		},

		/**
		 * Create child span for downstream calls
		 */
		createChildSpan(name: string, parentContext: TraceContext): Span {
			const context = createChildContext(parentContext);
			return createSpan(`${serviceName}.${name}`, context);
		}
	};
}
