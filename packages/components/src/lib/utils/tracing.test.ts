/**
 * Distributed Tracing Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	generateTraceId,
	generateSpanId,
	parseTraceparent,
	formatTraceparent,
	createTraceContext,
	createChildContext,
	createSpan,
	endSpan,
	setSpanAttribute,
	addSpanEvent,
	extractTraceContext,
	injectTraceContext,
	formatSpanForLogging,
	trace,
	createTracer
} from './tracing';

describe('ID Generation', () => {
	it('generates 32-character trace ID', () => {
		const traceId = generateTraceId();
		expect(traceId).toHaveLength(32);
		expect(traceId).toMatch(/^[0-9a-f]+$/);
	});

	it('generates 16-character span ID', () => {
		const spanId = generateSpanId();
		expect(spanId).toHaveLength(16);
		expect(spanId).toMatch(/^[0-9a-f]+$/);
	});

	it('generates unique IDs', () => {
		const ids = new Set<string>();
		for (let i = 0; i < 100; i++) {
			ids.add(generateTraceId());
		}
		expect(ids.size).toBe(100);
	});
});

describe('W3C Trace Context', () => {
	describe('parseTraceparent', () => {
		it('parses valid traceparent header', () => {
			const context = parseTraceparent(
				'00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01'
			);

			expect(context).not.toBeNull();
			expect(context?.traceId).toBe('0af7651916cd43dd8448eb211c80319c');
			expect(context?.parentSpanId).toBe('b7ad6b7169203331');
			expect(context?.flags).toBe(1);
			// New span ID should be generated
			expect(context?.spanId).toHaveLength(16);
		});

		it('returns null for null header', () => {
			expect(parseTraceparent(null)).toBeNull();
		});

		it('returns null for invalid format', () => {
			expect(parseTraceparent('invalid')).toBeNull();
			expect(parseTraceparent('00-abc-def-01')).toBeNull();
		});

		it('returns null for unsupported version', () => {
			expect(
				parseTraceparent('01-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01')
			).toBeNull();
		});

		it('returns null for all-zero trace ID', () => {
			expect(
				parseTraceparent('00-00000000000000000000000000000000-b7ad6b7169203331-01')
			).toBeNull();
		});

		it('returns null for all-zero span ID', () => {
			expect(
				parseTraceparent('00-0af7651916cd43dd8448eb211c80319c-0000000000000000-01')
			).toBeNull();
		});
	});

	describe('formatTraceparent', () => {
		it('formats trace context as W3C header', () => {
			const context = {
				traceId: '0af7651916cd43dd8448eb211c80319c',
				spanId: 'b7ad6b7169203331',
				flags: 1
			};

			const header = formatTraceparent(context);
			expect(header).toBe('00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01');
		});

		it('pads flags to 2 characters', () => {
			const context = {
				traceId: '0af7651916cd43dd8448eb211c80319c',
				spanId: 'b7ad6b7169203331',
				flags: 0
			};

			const header = formatTraceparent(context);
			expect(header).toMatch(/-00$/);
		});
	});
});

describe('Span Management', () => {
	describe('createTraceContext', () => {
		it('creates context with valid IDs', () => {
			const context = createTraceContext();

			expect(context.traceId).toHaveLength(32);
			expect(context.spanId).toHaveLength(16);
			expect(context.parentSpanId).toBeUndefined();
			expect(context.flags).toBe(1);
		});
	});

	describe('createChildContext', () => {
		it('creates child with same trace ID', () => {
			const parent = createTraceContext();
			const child = createChildContext(parent);

			expect(child.traceId).toBe(parent.traceId);
			expect(child.spanId).not.toBe(parent.spanId);
			expect(child.parentSpanId).toBe(parent.spanId);
			expect(child.flags).toBe(parent.flags);
		});
	});

	describe('createSpan', () => {
		it('creates span with name and context', () => {
			const context = createTraceContext();
			const span = createSpan('test-operation', context);

			expect(span.name).toBe('test-operation');
			expect(span.context).toBe(context);
			expect(span.startTime).toBeGreaterThan(0);
			expect(span.endTime).toBeUndefined();
			expect(span.status).toBe('unset');
			expect(span.attributes).toEqual({});
			expect(span.events).toEqual([]);
		});

		it('creates new context if none provided', () => {
			const span = createSpan('test-operation');

			expect(span.context.traceId).toHaveLength(32);
			expect(span.context.spanId).toHaveLength(16);
		});
	});

	describe('endSpan', () => {
		it('sets end time and status', () => {
			const span = createSpan('test');
			const ended = endSpan(span, 'ok');

			expect(ended.endTime).toBeGreaterThan(0);
			expect(ended.status).toBe('ok');
		});

		it('defaults to ok status', () => {
			const span = createSpan('test');
			const ended = endSpan(span);

			expect(ended.status).toBe('ok');
		});
	});

	describe('setSpanAttribute', () => {
		it('adds attribute to span', () => {
			const span = createSpan('test');
			const updated = setSpanAttribute(span, 'user.id', '123');

			expect(updated.attributes['user.id']).toBe('123');
		});

		it('preserves existing attributes', () => {
			let span = createSpan('test');
			span = setSpanAttribute(span, 'a', 1);
			span = setSpanAttribute(span, 'b', 2);

			expect(span.attributes).toEqual({ a: 1, b: 2 });
		});
	});

	describe('addSpanEvent', () => {
		it('adds event with timestamp', () => {
			const span = createSpan('test');
			const updated = addSpanEvent(span, 'cache.hit', { key: 'user:123' });

			expect(updated.events).toHaveLength(1);
			expect(updated.events[0].name).toBe('cache.hit');
			expect(updated.events[0].timestamp).toBeGreaterThan(0);
			expect(updated.events[0].attributes).toEqual({ key: 'user:123' });
		});
	});
});

describe('Request Tracing', () => {
	describe('extractTraceContext', () => {
		it('extracts context from traceparent header', () => {
			const request = new Request('https://example.com', {
				headers: {
					traceparent: '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01'
				}
			});

			const context = extractTraceContext(request);
			expect(context.traceId).toBe('0af7651916cd43dd8448eb211c80319c');
			expect(context.parentSpanId).toBe('b7ad6b7169203331');
		});

		it('creates new context if no header', () => {
			const request = new Request('https://example.com');
			const context = extractTraceContext(request);

			expect(context.traceId).toHaveLength(32);
			expect(context.parentSpanId).toBeUndefined();
		});
	});

	describe('injectTraceContext', () => {
		it('sets traceparent header', () => {
			const headers = new Headers();
			const context = {
				traceId: '0af7651916cd43dd8448eb211c80319c',
				spanId: 'b7ad6b7169203331',
				flags: 1
			};

			injectTraceContext(headers, context);

			expect(headers.get('traceparent')).toBe(
				'00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01'
			);
		});
	});
});

describe('formatSpanForLogging', () => {
	it('formats span as structured log entry', () => {
		let span = createSpan('test-operation');
		span = setSpanAttribute(span, 'http.method', 'GET');
		span = addSpanEvent(span, 'db.query');
		span = endSpan(span, 'ok');

		const log = formatSpanForLogging(span);

		expect(log.trace_id).toBe(span.context.traceId);
		expect(log.span_id).toBe(span.context.spanId);
		expect(log.name).toBe('test-operation');
		expect(log.status).toBe('ok');
		expect(log.duration_ms).toBeGreaterThanOrEqual(0);
		expect(log.attributes).toEqual({ 'http.method': 'GET' });
		expect((log.events as unknown[]).length).toBe(1);
	});
});

describe('trace helper', () => {
	it('traces successful function', async () => {
		const { span, result } = await trace('test', async (s) => {
			s = setSpanAttribute(s, 'test', true);
			return { span: s, result: 42 };
		});

		expect(result).toBe(42);
		expect(span.status).toBe('ok');
		expect(span.endTime).toBeDefined();
		expect(span.attributes.test).toBe(true);
	});

	it('traces failed function', async () => {
		await expect(
			trace('test', async () => {
				throw new Error('Test error');
			})
		).rejects.toThrow('Test error');
	});

	it('uses parent context when provided', async () => {
		const parentContext = createTraceContext();

		const { span } = await trace(
			'child',
			async (s) => ({ span: s, result: null }),
			parentContext
		);

		expect(span.context.traceId).toBe(parentContext.traceId);
		expect(span.context.parentSpanId).toBe(parentContext.spanId);
	});
});

describe('createTracer', () => {
	let consoleSpy: { info: ReturnType<typeof vi.spyOn>; error: ReturnType<typeof vi.spyOn> };

	beforeEach(() => {
		consoleSpy = {
			info: vi.spyOn(console, 'info').mockImplementation(() => {}),
			error: vi.spyOn(console, 'error').mockImplementation(() => {})
		};
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('traces request with standard attributes', async () => {
		const tracer = createTracer('agency');
		const request = new Request('https://example.com/api/test', {
			method: 'POST'
		});

		const result = await tracer.traceRequest(request, 'handleTest', async () => {
			return { success: true };
		});

		expect(result).toEqual({ success: true });
		expect(consoleSpy.info).toHaveBeenCalledTimes(1);

		const logEntry = JSON.parse(consoleSpy.info.mock.calls[0][0]);
		expect(logEntry.attributes['http.method']).toBe('POST');
		expect(logEntry.attributes['service.name']).toBe('agency');
	});

	it('logs error on failure', async () => {
		const tracer = createTracer('agency');
		const request = new Request('https://example.com/api/test');

		await expect(
			tracer.traceRequest(request, 'handleTest', async () => {
				throw new Error('Handler error');
			})
		).rejects.toThrow('Handler error');

		expect(consoleSpy.error).toHaveBeenCalledTimes(1);

		const logEntry = JSON.parse(consoleSpy.error.mock.calls[0][0]);
		expect(logEntry.status).toBe('error');
	});
});
