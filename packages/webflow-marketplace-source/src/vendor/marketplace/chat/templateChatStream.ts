// ── Agent stream transport ───────────────────────────────────────────────────
// Framing, stall detection, and failure classification for the agent's SSE
// response. Kept free of React and DOM globals so every branch is testable.

/** A stream that produces nothing for this long is treated as stalled. */
export const STREAM_STALL_MS = 30_000;

/**
 * Headers must arrive within this window once the session token is in hand.
 * Armed after minting so a human completing a visible challenge is never the
 * thing that times out.
 */
export const AGENT_REQUEST_TIMEOUT_MS = 25_000;

/**
 * Refuse to buffer an unbounded frame. A malformed upstream that never emits a
 * dispatch boundary would otherwise grow this string until the tab dies.
 */
export const MAX_SSE_BUFFER_CHARS = 1_000_000;

export interface SseParseResult {
  /** Data payloads of every complete event, in arrival order. */
  events: string[];
  /** Bytes after the last dispatch boundary, to be prepended to the next chunk. */
  rest: string;
}

/**
 * Splits an SSE buffer into event payloads.
 *
 * The previous implementation only recognised `\n\n` boundaries and only read
 * lines starting with `data: ` (with the space). Both are narrower than the
 * spec: a proxy that normalises newlines produces `\r\n\r\n`, and `data:{...}`
 * without the optional space is valid. Either produced silent event loss.
 *
 * Pass `final` when the reader is done so a last frame that never received its
 * terminating blank line is still dispatched.
 */
export function parseSseFrames(buffer: string, final = false): SseParseResult {
  const events: string[] = [];
  let rest = buffer;

  for (;;) {
    const boundary = findDispatchBoundary(rest);
    if (!boundary) break;
    const frame = rest.slice(0, boundary.index);
    rest = rest.slice(boundary.index + boundary.length);
    const data = readFrameData(frame);
    if (data !== null) events.push(data);
  }

  if (final && rest.trim()) {
    const data = readFrameData(rest);
    if (data !== null) events.push(data);
    rest = '';
  }

  return { events, rest };
}

function findDispatchBoundary(buffer: string): { index: number; length: number } | null {
  let best: { index: number; length: number } | null = null;
  // `\r\n\r\n` must be probed before the shorter forms so a CRLF stream is not
  // split in the middle of its own boundary.
  for (const separator of ['\r\n\r\n', '\n\n', '\r\r']) {
    const index = buffer.indexOf(separator);
    if (index < 0) continue;
    if (!best || index < best.index || (index === best.index && separator.length > best.length)) {
      best = { index, length: separator.length };
    }
  }
  return best;
}

/** Returns the concatenated `data` field of one frame, or null when it has none. */
function readFrameData(frame: string): string | null {
  const lines = frame.split(/\r\n|\n|\r/);
  const data: string[] = [];

  for (const line of lines) {
    // A leading colon marks a comment — the shape used for keep-alive pings.
    if (line.startsWith(':')) continue;
    const separator = line.indexOf(':');
    const field = separator < 0 ? line : line.slice(0, separator);
    if (field !== 'data') continue;
    const raw = separator < 0 ? '' : line.slice(separator + 1);
    data.push(raw.startsWith(' ') ? raw.slice(1) : raw);
  }

  if (data.length === 0) return null;
  // The spec joins multi-line data with newlines; JSON tolerates them.
  const payload = data.join('\n');
  return payload.trim() ? payload : null;
}

export type AgentFailureCode =
  | 'unauthorized'
  | 'rate_limited'
  | 'timeout'
  | 'upstream'
  | 'unavailable'
  | 'stalled'
  | 'offline'
  | 'session'
  | 'network';

export interface AgentFailure {
  code: AgentFailureCode;
  /** Copy shown in the conversation. Reader-facing, no status codes. */
  message: string;
  /** Whether offering "Try again" is honest for this class of failure. */
  retryable: boolean;
  /** Seconds the caller should wait, when the response said so. */
  retryAfterSeconds: number | null;
}

const FAILURE_COPY: Record<AgentFailureCode, string> = {
  unauthorized: 'Sorry — I could not verify this session. Try again to start a fresh one.',
  rate_limited: 'Sorry — the template finder is busy right now. Give it a moment and try again.',
  timeout: 'Sorry — the search took too long to answer. Try again.',
  upstream: 'Sorry — the template service had a problem. Try again in a moment.',
  unavailable: 'Sorry — I could not reach the template service.',
  stalled: 'Sorry — the search stopped responding partway through. Try again.',
  offline: 'Sorry — this device looks offline. Reconnect and try again.',
  session: 'Sorry — the bot check could not be completed. Try again.',
  network: 'Sorry — I hit a connection problem.',
};

/** Maps an HTTP status on the chat response to reader-facing copy. */
export function classifyAgentResponseFailure(status: number, retryAfterHeader?: string | null): AgentFailure {
  const code: AgentFailureCode =
    status === 401 || status === 403
      ? 'unauthorized'
      : status === 429
        ? 'rate_limited'
        : status === 408 || status === 504
          ? 'timeout'
          : status >= 500
            ? 'upstream'
            : 'unavailable';

  return {
    code,
    message: FAILURE_COPY[code],
    // A 4xx that is neither auth nor throttling will fail the same way again;
    // offering "Try again" there would be a lie.
    retryable: code !== 'unavailable',
    retryAfterSeconds: parseRetryAfter(retryAfterHeader),
  };
}

/** Maps a thrown error during the turn to reader-facing copy. */
export function classifyAgentStreamFailure(
  error: unknown,
  context: { stalled?: boolean; timedOut?: boolean; online?: boolean } = {},
): AgentFailure {
  const code: AgentFailureCode = context.timedOut
    ? 'timeout'
    : context.stalled
      ? 'stalled'
      : context.online === false
        ? 'offline'
        : isSessionError(error)
          ? 'session'
          : 'network';

  return { code, message: FAILURE_COPY[code], retryable: true, retryAfterSeconds: null };
}

/**
 * Session minting failures (Turnstile unavailable, challenge declined, session
 * endpoint refusal) used to reach telemetry as generic connection errors, which
 * made bot-check breakage indistinguishable from a flaky network.
 */
export function isSessionError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return /bot check|secure session|session unavailable/i.test(error.message);
}

function parseRetryAfter(header?: string | null): number | null {
  if (!header) return null;
  const seconds = Number.parseInt(header.trim(), 10);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds, 600);
  const date = Date.parse(header);
  if (!Number.isFinite(date)) return null;
  return Math.max(0, Math.min(600, Math.round((date - Date.now()) / 1000)));
}

export interface StreamWatchdog {
  /** Restart the countdown — call on every frame received. */
  touch(): void;
  stop(): void;
}

export type WatchdogScheduler = (callback: () => void, delay: number) => number;
export type WatchdogCanceller = (handle: number) => void;

/**
 * Fires `onStall` when no frame arrives for `timeoutMs`. The Worker sends no
 * keep-alives, so without this a stalled upstream leaves the composer spinning
 * with no way out but the Stop button.
 */
export function createStreamWatchdog(
  onStall: () => void,
  timeoutMs: number = STREAM_STALL_MS,
  schedule: WatchdogScheduler = (callback, delay) => Number(setTimeout(callback, delay)),
  cancel: WatchdogCanceller = (handle) => clearTimeout(handle),
): StreamWatchdog {
  let handle: number | null = null;
  let stopped = false;

  const arm = () => {
    if (stopped) return;
    handle = schedule(() => {
      handle = null;
      if (!stopped) onStall();
    }, timeoutMs);
  };

  const clear = () => {
    if (handle !== null) cancel(handle);
    handle = null;
  };

  arm();

  return {
    touch() {
      if (stopped) return;
      clear();
      arm();
    },
    stop() {
      stopped = true;
      clear();
    },
  };
}
