#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

function parseArgs(argv) {
  const options = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      continue;
    }
    const key = arg.slice(2);
    const value = argv[i + 1];
    if (!value || value.startsWith('--')) {
      options[key] = 'true';
      continue;
    }
    options[key] = value;
    i += 1;
  }
  return options;
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function toSafeTimestamp(isoString) {
  return isoString.replace(/[:.]/g, '-').replace('T', '_');
}

function quantile(sorted, q) {
  if (sorted.length === 0) {
    return null;
  }
  const index = Math.max(0, Math.min(sorted.length - 1, Math.ceil(q * sorted.length) - 1));
  return sorted[index];
}

function summarize(samples) {
  const times = samples.map((sample) => sample.time_seconds).sort((a, b) => a - b);
  const count = samples.length;
  const successes = samples.filter((sample) => sample.status_code === 200).length;
  const failures = count - successes;
  const timeouts = samples.filter((sample) => sample.timeout === true).length;
  const avg = count > 0 ? times.reduce((total, value) => total + value, 0) / count : 0;

  return {
    count,
    successes,
    failures,
    timeouts,
    success_rate: count > 0 ? successes / count : 0,
    min: times[0] ?? null,
    p50: quantile(times, 0.5),
    p90: quantile(times, 0.9),
    p95: quantile(times, 0.95),
    p99: quantile(times, 0.99),
    avg,
    max: times[times.length - 1] ?? null,
  };
}

async function hit(baseUrl, pathname, timeoutMs) {
  const startMs = Date.now();
  try {
    const response = await fetch(`${baseUrl}${pathname}`, {
      signal: AbortSignal.timeout(timeoutMs),
    });
    await response.arrayBuffer();
    const elapsed = Number(((Date.now() - startMs) / 1000).toFixed(3));
    return {
      status_code: response.status,
      time_seconds: elapsed,
      timeout: false,
    };
  } catch (error) {
    const errorMessage = String(error);
    return {
      status_code: 0,
      time_seconds: Number((timeoutMs / 1000).toFixed(3)),
      timeout: errorMessage.includes('TimeoutError'),
      error: errorMessage,
    };
  }
}

async function runSeries({ name, baseUrl, pathname, samples, timeoutMs, concurrency }) {
  const sampleRows = new Array(samples);
  let cursor = 0;

  const workerCount = Math.min(samples, Math.max(1, concurrency));
  const workers = Array.from({ length: workerCount }, async () => {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= samples) {
        return;
      }
      sampleRows[index] = await hit(baseUrl, pathname, timeoutMs);
    }
  });

  await Promise.all(workers);

  return {
    name,
    pathname,
    summary: summarize(sampleRows),
    samples: sampleRows,
  };
}

function buildComparison(fastSummary, fullSummary) {
  const deltaP50 =
    fastSummary.p50 != null && fullSummary.p50 != null ? fullSummary.p50 - fastSummary.p50 : null;
  const deltaP95 =
    fastSummary.p95 != null && fullSummary.p95 != null ? fullSummary.p95 - fastSummary.p95 : null;

  const p50Ratio =
    fastSummary.p50 && fullSummary.p50 ? Number((fullSummary.p50 / fastSummary.p50).toFixed(3)) : null;
  const p95Ratio =
    fastSummary.p95 && fullSummary.p95 ? Number((fullSummary.p95 / fastSummary.p95).toFixed(3)) : null;

  return {
    delta_p50_seconds: deltaP50 != null ? Number(deltaP50.toFixed(3)) : null,
    delta_p95_seconds: deltaP95 != null ? Number(deltaP95.toFixed(3)) : null,
    p50_ratio_full_over_fast: p50Ratio,
    p95_ratio_full_over_fast: p95Ratio,
  };
}

function formatSeconds(value) {
  if (value == null) {
    return 'n/a';
  }
  return `${value.toFixed(3)}s`;
}

function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function buildMarkdownReport({
  generatedAt,
  target,
  config,
  fastPath,
  fullPath,
  fastSummary,
  fullSummary,
  comparison,
}) {
  return `# Health Benchmark Summary

- Generated: ${generatedAt}
- Target: ${target}
- Samples per path: ${config.sample_count_per_path}
- Timeout per request: ${config.timeout_ms_per_request}ms
- Concurrency: ${config.concurrency}

| Path | Success | Timeouts | p50 | p95 | Avg |
| --- | ---: | ---: | ---: | ---: | ---: |
| \`${fastPath}\` | ${fastSummary.successes}/${fastSummary.count} (${formatPercent(fastSummary.success_rate)}) | ${fastSummary.timeouts} | ${formatSeconds(fastSummary.p50)} | ${formatSeconds(fastSummary.p95)} | ${formatSeconds(fastSummary.avg)} |
| \`${fullPath}\` | ${fullSummary.successes}/${fullSummary.count} (${formatPercent(fullSummary.success_rate)}) | ${fullSummary.timeouts} | ${formatSeconds(fullSummary.p50)} | ${formatSeconds(fullSummary.p95)} | ${formatSeconds(fullSummary.avg)} |

## Comparison

- Delta p50: ${formatSeconds(comparison.delta_p50_seconds)}
- Delta p95: ${formatSeconds(comparison.delta_p95_seconds)}
- Ratio p50 (full/fast): ${comparison.p50_ratio_full_over_fast ?? 'n/a'}
- Ratio p95 (full/fast): ${comparison.p95_ratio_full_over_fast ?? 'n/a'}
`;
}

async function main() {
  const argv = parseArgs(process.argv.slice(2));
  const baseUrl = argv.target ?? 'https://cs-mcp-hub-remote.createsomething.workers.dev';
  const fastPath = argv['fast-path'] ?? '/health';
  const fullPath = argv['full-path'] ?? '/health?full=1';
  const samples = parsePositiveInt(argv.samples, 50);
  const timeoutMs = parsePositiveInt(argv['timeout-ms'], 6000);
  const concurrency = parsePositiveInt(argv.concurrency, 1);
  const outDir = argv['out-dir'] ?? path.resolve(process.cwd(), 'reports');

  const generatedAt = new Date().toISOString();
  const outBase = path.join(outDir, `health-benchmark-${toSafeTimestamp(generatedAt)}`);
  const outFile = `${outBase}.json`;
  const outMdFile = `${outBase}.md`;

  fs.mkdirSync(outDir, { recursive: true });

  await hit(baseUrl, fastPath, timeoutMs);
  await hit(baseUrl, fullPath, timeoutMs);

  const fastSeries = await runSeries({
    name: 'health_fast',
    baseUrl,
    pathname: fastPath,
    samples,
    timeoutMs,
    concurrency,
  });
  const fullSeries = await runSeries({
    name: 'health_full',
    baseUrl,
    pathname: fullPath,
    samples,
    timeoutMs,
    concurrency,
  });

  const report = {
    generated_at: generatedAt,
    target: baseUrl,
    config: {
      sample_count_per_path: samples,
      timeout_ms_per_request: timeoutMs,
      concurrency,
      fast_path: fastPath,
      full_path: fullPath,
    },
    series: {
      health_fast: fastSeries,
      health_full: fullSeries,
    },
    comparison: buildComparison(fastSeries.summary, fullSeries.summary),
  };

  fs.writeFileSync(outFile, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(
    outMdFile,
    `${buildMarkdownReport({
      generatedAt,
      target: baseUrl,
      config: report.config,
      fastPath,
      fullPath,
      fastSummary: fastSeries.summary,
      fullSummary: fullSeries.summary,
      comparison: report.comparison,
    })}\n`,
    'utf8',
  );

  console.log(
    JSON.stringify(
      {
        out_file: outFile,
        out_markdown_file: outMdFile,
        paths: {
          fast: fastPath,
          full: fullPath,
        },
        fast_summary: fastSeries.summary,
        full_summary: fullSeries.summary,
        comparison: report.comparison,
      },
      null,
      2,
    ),
  );
}

await main();
