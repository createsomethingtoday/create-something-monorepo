import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { deflateSync } from 'node:zlib';

type CliOptions = {
  outDir: string;
  model: string;
  imageDetail: 'low' | 'high' | 'auto';
  timeoutMs: number;
  failOnNotReady: boolean;
};

type ReadinessStatus = 'ready' | 'not_ready';

type FailureKind =
  | 'missing_key'
  | 'insufficient_quota'
  | 'authentication'
  | 'rate_limited'
  | 'model_unavailable'
  | 'unsupported_image_input'
  | 'timeout'
  | 'api_error'
  | 'invalid_response';

type ReadinessSummary = {
  schema_version: 'openai_multimodal_readiness.v0.1';
  generated_at: string;
  provider: 'openai';
  model: string;
  status: ReadinessStatus;
  ok: boolean;
  image_input_attached: boolean;
  image_detail: CliOptions['imageDetail'];
  http_status?: number;
  response_id?: string;
  output_text?: string;
  failure_kind?: FailureKind;
  error_excerpt?: string;
  out_dir: string;
  files: {
    summary: string;
  };
  notes: string[];
};

type OpenAiResponse = Record<string, unknown>;

const DEFAULT_OUT_DIR = '/tmp/webflow-template-review-openai-multimodal-readiness';
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function parseArgs(argv: string[]): CliOptions {
  const options: Partial<CliOptions> = {
    outDir: DEFAULT_OUT_DIR,
    model: process.env.OPENAI_MODEL?.trim() || 'gpt-5.5',
    imageDetail: 'low',
    timeoutMs: 30_000,
    failOnNotReady: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--') continue;
    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
    if (arg === '--out' && next) {
      options.outDir = next;
      index += 1;
      continue;
    }
    if (arg === '--model' && next) {
      options.model = next;
      index += 1;
      continue;
    }
    if (arg === '--image-detail' && next) {
      if (next !== 'low' && next !== 'high' && next !== 'auto') throw new Error('--image-detail must be low, high, or auto.');
      options.imageDetail = next;
      index += 1;
      continue;
    }
    if (arg === '--timeout-ms' && next) {
      options.timeoutMs = boundedInt(next, 5_000, 120_000, '--timeout-ms');
      index += 1;
      continue;
    }
    if (arg === '--fail-on-not-ready') {
      options.failOnNotReady = true;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return {
    outDir: options.outDir ?? DEFAULT_OUT_DIR,
    model: options.model ?? 'gpt-5.5',
    imageDetail: options.imageDetail ?? 'low',
    timeoutMs: options.timeoutMs ?? 30_000,
    failOnNotReady: options.failOnNotReady ?? false,
  };
}

function printHelp() {
  console.log(`Usage:
  pnpm --filter @create-something/webflow-template-review-mcp openai:multimodal:preflight -- [options]

Options:
  --out <dir>                Output directory. Default: ${DEFAULT_OUT_DIR}
  --model <model>            OpenAI model. Default: OPENAI_MODEL or gpt-5.5
  --image-detail <level>     low, high, or auto. Default: low
  --timeout-ms <n>           API timeout. Default: 30000
  --fail-on-not-ready        Exit non-zero when the provider is not ready.
  --help                     Show this help.

Environment:
  OPENAI_API_KEY             Required.

Behavior:
  Sends one tiny Responses API request with text plus a generated PNG image data URL.
  This checks provider, key, quota, model, and image-input readiness before
  running larger template-review evals. It never sends Airtable, template,
  reviewer, D1, R2, Dify, or Webflow credentials.
`);
}

function boundedInt(value: string, min: number, max: number, flag: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new Error(`${flag} must be an integer between ${min} and ${max}.`);
  }
  return parsed;
}

function extractResponseText(data: OpenAiResponse): string | undefined {
  if (typeof data.output_text === 'string') return data.output_text.trim() || undefined;
  const output = data.output;
  if (!Array.isArray(output)) return undefined;
  const texts: string[] = [];
  for (const item of output) {
    if (!item || typeof item !== 'object') continue;
    const content = (item as Record<string, unknown>).content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (!part || typeof part !== 'object') continue;
      const text = (part as Record<string, unknown>).text;
      if (typeof text === 'string') texts.push(text);
    }
  }
  return texts.join('\n').trim() || undefined;
}

function classifyFailure(status: number | undefined, body: string, error: unknown): FailureKind {
  const text = `${body} ${error instanceof Error ? error.message : String(error)}`.toLowerCase();
  if (text.includes('abort')) return 'timeout';
  if (status === 401 || status === 403 || text.includes('invalid api key')) return 'authentication';
  if (status === 429 && text.includes('insufficient_quota')) return 'insufficient_quota';
  if (status === 429) return 'rate_limited';
  if (status === 404 || text.includes('model') || text.includes('does not exist')) return 'model_unavailable';
  if (text.includes('image') && (text.includes('unsupported') || text.includes('input_image'))) return 'unsupported_image_input';
  if (status) return 'api_error';
  return 'invalid_response';
}

function redactedExcerpt(text: string, maxLength = 700): string | undefined {
  const trimmed = text.replace(/\s+/g, ' ').trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, maxLength);
}

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const typeBuffer = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, checksum]);
}

function readinessPngDataUrl(): string {
  const width = 64;
  const height = 64;
  const bytesPerPixel = 3;
  const scanlineLength = 1 + width * bytesPerPixel;
  const raw = Buffer.alloc(scanlineLength * height);

  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * scanlineLength;
    raw[rowOffset] = 0;
    for (let x = 0; x < width; x += 1) {
      const offset = rowOffset + 1 + x * bytesPerPixel;
      const checker = (Math.floor(x / 8) + Math.floor(y / 8)) % 2 === 0;
      raw[offset] = checker ? 32 : 210;
      raw[offset + 1] = checker ? 120 : 230;
      raw[offset + 2] = checker ? 210 : 245;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const png = Buffer.concat([
    PNG_SIGNATURE,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
  return `data:image/png;base64,${png.toString('base64')}`;
}

async function writeSummary(options: CliOptions, summary: Omit<ReadinessSummary, 'files' | 'out_dir'>): Promise<ReadinessSummary> {
  await mkdir(options.outDir, { recursive: true });
  const filePath = path.join(options.outDir, 'openai-multimodal-readiness-summary.json');
  const complete: ReadinessSummary = {
    ...summary,
    out_dir: options.outDir,
    files: {
      summary: filePath,
    },
  };
  await writeFile(filePath, `${JSON.stringify(complete, null, 2)}\n`);
  return complete;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!process.env.OPENAI_API_KEY?.trim()) {
    const summary = await writeSummary(options, {
      schema_version: 'openai_multimodal_readiness.v0.1',
      generated_at: new Date().toISOString(),
      provider: 'openai',
      model: options.model,
      status: 'not_ready',
      ok: false,
      image_input_attached: false,
      image_detail: options.imageDetail,
      failure_kind: 'missing_key',
      error_excerpt: 'OPENAI_API_KEY is not set.',
      notes: ['No provider call was made.'],
    });
    console.log(JSON.stringify(summary, null, 2));
    if (options.failOnNotReady) process.exitCode = 2;
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: options.model,
        input: [
          {
            role: 'user',
            content: [
              { type: 'input_text', text: 'Return exactly: image-input-ready' },
              {
                type: 'input_image',
                image_url: readinessPngDataUrl(),
                detail: options.imageDetail,
              },
            ],
          },
        ],
        max_output_tokens: 128,
        store: false,
      }),
    });
    const rawText = await response.text();
    let parsed: OpenAiResponse | undefined;
    try {
      parsed = rawText ? (JSON.parse(rawText) as OpenAiResponse) : undefined;
    } catch {
      parsed = undefined;
    }

    if (!response.ok || !parsed) {
      const summary = await writeSummary(options, {
        schema_version: 'openai_multimodal_readiness.v0.1',
        generated_at: new Date().toISOString(),
        provider: 'openai',
        model: options.model,
        status: 'not_ready',
        ok: false,
        image_input_attached: true,
        image_detail: options.imageDetail,
        http_status: response.status,
        failure_kind: classifyFailure(response.status, rawText, new Error(response.statusText)),
        error_excerpt: redactedExcerpt(rawText),
        notes: ['Provider call failed; do not run full multimodal reviewer evals until this passes.'],
      });
      console.log(JSON.stringify(summary, null, 2));
      if (options.failOnNotReady) process.exitCode = 2;
      return;
    }

    const outputText = extractResponseText(parsed);
    const responseId = typeof parsed.id === 'string' ? parsed.id : undefined;
    const summary = await writeSummary(options, {
      schema_version: 'openai_multimodal_readiness.v0.1',
      generated_at: new Date().toISOString(),
      provider: 'openai',
      model: options.model,
      status: outputText ? 'ready' : 'not_ready',
      ok: Boolean(outputText),
      image_input_attached: true,
      image_detail: options.imageDetail,
      http_status: response.status,
      response_id: responseId,
      output_text: outputText,
      failure_kind: outputText ? undefined : 'invalid_response',
      error_excerpt: outputText ? undefined : 'Response succeeded but did not include output text.',
      notes: [
        outputText
          ? 'Provider accepted a text plus image input request.'
          : 'Provider response did not include output text; do not run full evals yet.',
      ],
    });
    console.log(JSON.stringify(summary, null, 2));
    if (options.failOnNotReady && !summary.ok) process.exitCode = 2;
  } catch (error) {
    const summary = await writeSummary(options, {
      schema_version: 'openai_multimodal_readiness.v0.1',
      generated_at: new Date().toISOString(),
      provider: 'openai',
      model: options.model,
      status: 'not_ready',
      ok: false,
      image_input_attached: true,
      image_detail: options.imageDetail,
      failure_kind: classifyFailure(undefined, '', error),
      error_excerpt: error instanceof Error ? redactedExcerpt(error.message) : redactedExcerpt(String(error)),
      notes: ['Provider call threw before a usable response was returned.'],
    });
    console.log(JSON.stringify(summary, null, 2));
    if (options.failOnNotReady) process.exitCode = 2;
  } finally {
    clearTimeout(timeout);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
