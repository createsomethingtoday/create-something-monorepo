#!/usr/bin/env node

import { writeFile } from 'node:fs/promises';

const ROUTES = {
  'posts-discover-by-url': {
    datasetId: 'gd_lk5ns7kz21pck8jpis',
    query: {
      notify: 'false',
      include_errors: 'true',
      type: 'discover_new',
      discover_by: 'url',
    },
    defaultInput: {
      url: 'https://www.instagram.com/zoobarcelona/',
      num_of_posts: 10,
      post_type: 'Post',
    },
  },
  'posts-collect-by-url': {
    datasetId: 'gd_lk5ns7kz21pck8jpis',
    query: {
      notify: 'false',
      include_errors: 'true',
    },
    defaultInput: {
      url: 'https://www.instagram.com/p/Cuf4s0MNqNr',
    },
  },
  'profiles-discover-by-user-name': {
    datasetId: 'gd_l1vikfch901nx3by4',
    query: {
      notify: 'false',
      include_errors: 'true',
      type: 'discover_new',
      discover_by: 'user_name',
    },
    defaultInput: {
      user_name: 'zoobarcelona',
    },
  },
};

function usage() {
  console.log(`Usage:
  BRIGHT_DATA_API_TOKEN=... node scripts/bright-data-instagram-smoke.mjs [options]

Options:
  --mode <mode>          posts-discover-by-url | posts-collect-by-url | profiles-discover-by-user-name
  --url <url>            Instagram profile URL or post URL. Repeatable.
  --username <name>      Instagram username for profiles-discover-by-user-name.
  --limit <number>       num_of_posts for posts-discover-by-url. Default: 10.
  --post-type <value>    Post, Reel, or provider-supported blank value. Default: Post.
  --start-date <value>   Optional Bright Data date value.
  --end-date <value>     Optional Bright Data date value.
  --output <path>        Write full raw JSON response to a local file.
  --dry-run              Print the redacted request summary without calling Bright Data.
  --help                 Show this help.
`);
}

function parseArgs(argv) {
  const options = {
    mode: 'posts-discover-by-url',
    urls: [],
    username: null,
    limit: 10,
    postType: 'Post',
    startDate: null,
    endDate: null,
    output: null,
    dryRun: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--') {
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      usage();
      process.exit(0);
    }
    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }
    if (arg === '--mode' && next) {
      options.mode = next;
      index += 1;
      continue;
    }
    if (arg === '--url' && next) {
      options.urls.push(next);
      index += 1;
      continue;
    }
    if (arg === '--username' && next) {
      options.username = next;
      index += 1;
      continue;
    }
    if (arg === '--limit' && next) {
      options.limit = Number(next);
      index += 1;
      continue;
    }
    if (arg === '--post-type' && next) {
      options.postType = next;
      index += 1;
      continue;
    }
    if (arg === '--start-date' && next) {
      options.startDate = next;
      index += 1;
      continue;
    }
    if (arg === '--end-date' && next) {
      options.endDate = next;
      index += 1;
      continue;
    }
    if (arg === '--output' && next) {
      options.output = next;
      index += 1;
      continue;
    }
    throw new Error(`Unknown or incomplete argument: ${arg}`);
  }

  return options;
}

function buildRequest(options) {
  const route = ROUTES[options.mode];
  if (!route) {
    throw new Error(`Unsupported mode: ${options.mode}`);
  }
  if (!Number.isInteger(options.limit) || options.limit < 1) {
    throw new Error(`--limit must be a positive integer. Received: ${options.limit}`);
  }

  const input = [];
  if (options.mode === 'profiles-discover-by-user-name') {
    const names = options.username ? [options.username] : [route.defaultInput.user_name];
    for (const userName of names) {
      input.push({ user_name: userName });
    }
  } else if (options.mode === 'posts-discover-by-url') {
    const urls = options.urls.length > 0 ? options.urls : [route.defaultInput.url];
    for (const url of urls) {
      const item = {
        url,
        num_of_posts: options.limit,
        post_type: options.postType,
      };
      if (options.startDate) {
        item.start_date = options.startDate;
      }
      if (options.endDate) {
        item.end_date = options.endDate;
      }
      input.push(item);
    }
  } else {
    const urls = options.urls.length > 0 ? options.urls : [route.defaultInput.url];
    for (const url of urls) {
      input.push({ url });
    }
  }

  const query = new URLSearchParams({
    dataset_id: route.datasetId,
    ...route.query,
  });
  const url = `https://api.brightdata.com/datasets/v3/scrape?${query.toString()}`;
  return {
    route,
    url,
    body: { input },
  };
}

function summarizeJson(value) {
  const summary = {
    responseKind: Array.isArray(value) ? 'array' : typeof value,
    recordCount: null,
    snapshotId: null,
    topLevelKeys: [],
    firstRecordKeys: [],
    firstRecordLocator: null,
  };

  if (Array.isArray(value)) {
    summary.recordCount = value.length;
    const first = value.find((item) => item && typeof item === 'object');
    if (first) {
      summary.firstRecordKeys = Object.keys(first).slice(0, 30);
      summary.firstRecordLocator = pickLocator(first);
    }
    return summary;
  }

  if (!value || typeof value !== 'object') {
    return summary;
  }

  summary.topLevelKeys = Object.keys(value).slice(0, 30);
  summary.snapshotId =
    value.snapshot_id ??
    value.snapshotId ??
    value.id ??
    value.response_id ??
    value.responseId ??
    null;

  const arrayValue =
    Array.isArray(value.data) ? value.data :
    Array.isArray(value.results) ? value.results :
    Array.isArray(value.records) ? value.records :
    Array.isArray(value.items) ? value.items :
    null;

  if (arrayValue) {
    summary.recordCount = arrayValue.length;
    const first = arrayValue.find((item) => item && typeof item === 'object');
    if (first) {
      summary.firstRecordKeys = Object.keys(first).slice(0, 30);
      summary.firstRecordLocator = pickLocator(first);
    }
  } else if (isBrightDataRecord(value)) {
    summary.recordCount = 1;
    summary.firstRecordKeys = Object.keys(value).slice(0, 30);
    summary.firstRecordLocator = pickLocator(value);
  }

  return summary;
}

function isBrightDataRecord(value) {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return Boolean(
    value.url ||
    value.post_id ||
    value.pk ||
    value.shortcode ||
    value.content_id ||
    value.date_posted ||
    value.description ||
    value.error
  );
}

function pickLocator(record) {
  const keys = [
    'url',
    'post_url',
    'permalink',
    'shortcode',
    'id',
    'user_name',
    'username',
    'profile_url',
  ];
  const locator = {};
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null && String(record[key]).length > 0) {
      locator[key] = record[key];
    }
  }
  return Object.keys(locator).length > 0 ? locator : null;
}

function printSummary(summary) {
  console.log(JSON.stringify(summary, null, 2));
}

const options = parseArgs(process.argv.slice(2));
const token = process.env.BRIGHT_DATA_API_TOKEN || process.env.API_TOKEN;
const request = buildRequest(options);

const requestSummary = {
  mode: options.mode,
  datasetId: request.route.datasetId,
  endpoint: request.url.replace(/dataset_id=[^&]+/, `dataset_id=${request.route.datasetId}`),
  inputCount: request.body.input.length,
  firstInput: request.body.input[0],
};

if (options.dryRun) {
  printSummary({ dryRun: true, request: requestSummary });
  process.exit(0);
}

if (!token) {
  console.error('Missing BRIGHT_DATA_API_TOKEN. Set it in the environment or run through Infisical before executing this smoke.');
  printSummary({ request: requestSummary });
  process.exit(2);
}

const startedAt = Date.now();
const response = await fetch(request.url, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(request.body),
});

const text = await response.text();
const elapsedMs = Date.now() - startedAt;
let parsed = null;
let parseError = null;
try {
  parsed = text ? JSON.parse(text) : null;
} catch (error) {
  try {
    parsed = text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch {
    parseError = error instanceof Error ? error.message : String(error);
  }
}

if (options.output) {
  await writeFile(options.output, text, 'utf8');
}

const result = {
  ok: response.ok,
  httpStatus: response.status,
  elapsedMs,
  contentType: response.headers.get('content-type'),
  mode: options.mode,
  datasetId: request.route.datasetId,
  inputCount: request.body.input.length,
  outputPath: options.output,
  responseSummary: parsed ? summarizeJson(parsed) : null,
  parseError,
  bodyPreview: parsed ? null : text.slice(0, 500),
};

printSummary(result);

if (!response.ok) {
  process.exit(1);
}
