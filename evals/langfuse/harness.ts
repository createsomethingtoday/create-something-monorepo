import { Langfuse } from 'langfuse';

export type Score = {
  name: string;
  score: number | boolean | null;
  metadata?: Record<string, unknown>;
};

type EvalCase<TInput> = {
  input: TInput;
  expected?: unknown;
  metadata?: Record<string, unknown>;
};

type EvalScoreArgs<TInput, TOutput> = {
  input: TInput;
  output: TOutput;
  expected?: unknown;
  metadata?: Record<string, unknown>;
};

type EvalOptions<TInput, TOutput> = {
  experimentName: string;
  data: Array<EvalCase<TInput>> | (() => Array<EvalCase<TInput>> | Promise<Array<EvalCase<TInput>>>);
  task: (input: TInput, hooks?: unknown) => Promise<TOutput> | TOutput;
  scores?: Array<(args: EvalScoreArgs<TInput, TOutput>) => Score | Promise<Score>>;
  metadata?: Record<string, unknown>;
};

type EvalRunResult = {
  projectName: string;
  experimentName: string;
  total: number;
  failed: number;
  skipped: number;
  emittedToLangfuse: boolean;
};

const activeRuns: Array<Promise<EvalRunResult>> = [];

function optionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : undefined;
}

function endpointBaseUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    return new URL(value).origin;
  } catch {
    return undefined;
  }
}

function langfuseHost(): string {
  return (
    optionalEnv('LANGFUSE_BASE_URL') ??
    optionalEnv('LANGFUSE_HOST') ??
    endpointBaseUrl(optionalEnv('LANGFUSE_MCP_ENDPOINT')) ??
    'https://us.cloud.langfuse.com'
  );
}

function createLangfuseClient(): Langfuse | null {
  const publicKey = optionalEnv('LANGFUSE_PUBLIC_KEY');
  const secretKey = optionalEnv('LANGFUSE_SECRET_KEY');

  if (!publicKey || !secretKey) {
    return null;
  }

  return new Langfuse({
    publicKey,
    secretKey,
    baseUrl: langfuseHost(),
    flushAt: 1,
    flushInterval: 250,
  });
}

function numericScore(value: number | boolean | null): number | null {
  if (value === null) return null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  return Number.isFinite(value) ? value : null;
}

function scoreFailed(score: Score): boolean {
  const value = numericScore(score.score);
  return value !== null && value <= 0;
}

function scoreSkipped(score: Score): boolean {
  return numericScore(score.score) === null;
}

async function runEval<TInput, TOutput>(
  projectName: string,
  options: EvalOptions<TInput, TOutput>,
): Promise<EvalRunResult> {
  const client = createLangfuseClient();
  const data = typeof options.data === 'function' ? await options.data() : options.data;
  const runName = `${options.experimentName}-${new Date().toISOString()}`;
  let failed = 0;
  let skipped = 0;

  for (const [index, item] of data.entries()) {
    const trace = client?.trace({
      name: `${projectName}:${options.experimentName}`,
      sessionId: runName,
      input: item.input,
      metadata: {
        projectName,
        experimentName: options.experimentName,
        evalCaseIndex: index,
        evalCaseMetadata: item.metadata,
        ...options.metadata,
      },
      tags: ['eval', 'langfuse', projectName, options.experimentName],
    });

    try {
      const output = await options.task(item.input);
      trace?.update({ output });

      const scores: Score[] = [];
      for (const scorer of options.scores ?? []) {
        const score = await scorer({
          input: item.input,
          output,
          expected: item.expected,
          metadata: item.metadata,
        });
        scores.push(score);

        const value = numericScore(score.score);
        if (value === null) {
          skipped += 1;
          continue;
        }

        trace?.score({
          name: score.name,
          value,
          comment: score.metadata ? JSON.stringify(score.metadata) : undefined,
          dataType: typeof score.score === 'boolean' ? 'BOOLEAN' : 'NUMERIC',
        });
      }

      const caseFailed = scores.some(scoreFailed);
      if (caseFailed) failed += 1;

      console.log(
        JSON.stringify({
          eval: options.experimentName,
          case: index + 1,
          ok: !caseFailed,
          scores,
        }),
      );
    } catch (error) {
      failed += 1;
      const errorMessage = error instanceof Error ? error.message : String(error);
      trace?.update({
        output: { error: errorMessage },
        metadata: {
          projectName,
          experimentName: options.experimentName,
          evalCaseIndex: index,
          error: true,
        },
      });
      trace?.score({
        name: 'eval_exception',
        value: 0,
        comment: errorMessage,
        dataType: 'NUMERIC',
      });
      console.error(
        JSON.stringify({
          eval: options.experimentName,
          case: index + 1,
          ok: false,
          error: errorMessage,
        }),
      );
    }
  }

  await client?.shutdownAsync();

  return {
    projectName,
    experimentName: options.experimentName,
    total: data.length,
    failed,
    skipped,
    emittedToLangfuse: Boolean(client),
  };
}

export function Eval<TInput, TOutput>(
  projectName: string,
  options: EvalOptions<TInput, TOutput>,
): void {
  const run = runEval(projectName, options)
    .then((summary) => {
      console.log(JSON.stringify({ langfuseEvalSummary: summary }, null, 2));
      if (summary.failed > 0) {
        process.exitCode = 1;
      }
      return summary;
    })
    .catch((error) => {
      process.exitCode = 1;
      console.error(error instanceof Error ? error.stack ?? error.message : String(error));
      return {
        projectName,
        experimentName: options.experimentName,
        total: 0,
        failed: 1,
        skipped: 0,
        emittedToLangfuse: false,
      };
    });
  activeRuns.push(run);
}

export async function waitForLangfuseEvals(): Promise<EvalRunResult[]> {
  return Promise.all(activeRuns);
}
