import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

type Viewport = {
  name: string;
  width: number;
  height: number;
};

type CliOptions = {
  url: string;
  outDir: string;
  runId: string;
  policySnapshotId: string;
  sandboxProvider: SandboxJob['sandbox_provider'];
  maxPages: number;
  maxNetworkRequests: number;
  timeoutMs: number;
  viewports: Viewport[];
  allowedHosts: string[];
};

type SandboxJob = {
  schema_version: 'published_site_sandbox_job.v0.1';
  lane_id: 'published_site_validation';
  run_id: string;
  created_at: string;
  source_url: string;
  policy_snapshot_id: string;
  sandbox_provider: 'dify_e2b' | 'direct_e2b';
  controls: {
    timeout_ms: number;
    max_pages: number;
    max_network_requests: number;
    allowed_hosts: string[];
    block_private_networks: true;
    block_file_urls: true;
    allow_public_subresources: true;
    user_agent: string;
    viewports: Viewport[];
  };
  artifacts: {
    output_file: string;
    screenshot_dir: string;
    network_log_file: string;
    html_snapshot_file: string;
  };
  output_contract: {
    may_emit: string[];
    must_not_emit: string[];
    failure_is_escalation: true;
  };
};

const DEFAULT_VIEWPORTS: Viewport[] = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 },
];

const DEFAULT_OUT_DIR = '/tmp/webflow-template-review-published-site-sandbox';
const DEFAULT_USER_AGENT = 'CREATE SOMETHING Template Review Sandbox/0.1';

function parseArgs(argv: string[]): CliOptions {
  const options: Partial<CliOptions> = {
    outDir: DEFAULT_OUT_DIR,
    runId: `published-site-sandbox-${randomUUID()}`,
    policySnapshotId: 'template-review-policy.draft',
    sandboxProvider: 'dify_e2b',
    maxPages: 5,
    maxNetworkRequests: 250,
    timeoutMs: 30_000,
    viewports: DEFAULT_VIEWPORTS,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === '--') continue;
    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
    if (arg === '--url' && next) {
      options.url = normalizePublicHttpsUrl(next);
      i += 1;
      continue;
    }
    if (arg === '--out' && next) {
      options.outDir = next;
      i += 1;
      continue;
    }
    if (arg === '--run-id' && next) {
      options.runId = next;
      i += 1;
      continue;
    }
    if (arg === '--policy-snapshot-id' && next) {
      options.policySnapshotId = next;
      i += 1;
      continue;
    }
    if (arg === '--sandbox-provider' && next) {
      if (next !== 'dify_e2b' && next !== 'direct_e2b') {
        throw new Error('--sandbox-provider must be dify_e2b or direct_e2b.');
      }
      options.sandboxProvider = next;
      i += 1;
      continue;
    }
    if (arg === '--max-pages' && next) {
      options.maxPages = boundedInt(next, 1, 25, '--max-pages');
      i += 1;
      continue;
    }
    if (arg === '--max-network-requests' && next) {
      options.maxNetworkRequests = boundedInt(next, 25, 1000, '--max-network-requests');
      i += 1;
      continue;
    }
    if (arg === '--timeout-ms' && next) {
      options.timeoutMs = boundedInt(next, 5_000, 120_000, '--timeout-ms');
      i += 1;
      continue;
    }
    if (arg === '--viewports' && next) {
      options.viewports = parseViewports(next);
      i += 1;
      continue;
    }
    if (arg === '--allowed-hosts' && next) {
      options.allowedHosts = next
        .split(',')
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean);
      i += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!options.url) throw new Error('Missing required --url <published-url>.');
  if (!options.viewports?.length) throw new Error('At least one viewport is required.');

  const sourceHost = new URL(options.url).hostname.toLowerCase();
  return {
    url: options.url,
    outDir: options.outDir ?? DEFAULT_OUT_DIR,
    runId: options.runId ?? `published-site-sandbox-${randomUUID()}`,
    policySnapshotId: options.policySnapshotId ?? 'template-review-policy.draft',
    sandboxProvider: options.sandboxProvider ?? 'dify_e2b',
    maxPages: options.maxPages ?? 5,
    maxNetworkRequests: options.maxNetworkRequests ?? 250,
    timeoutMs: options.timeoutMs ?? 30_000,
    viewports: options.viewports,
    allowedHosts: options.allowedHosts?.length ? options.allowedHosts : [sourceHost],
  };
}

function printHelp() {
  console.log(`Usage:
  pnpm --filter @create-something/webflow-template-review-mcp published-site:sandbox:prepare -- [options]

Options:
  --url <published-url>             Public https URL to inspect. Required.
  --out <dir>                       Output directory. Default: ${DEFAULT_OUT_DIR}
  --run-id <id>                     Stable run ID. Default: generated UUID.
  --policy-snapshot-id <id>         Policy snapshot label. Default: template-review-policy.draft
  --sandbox-provider <provider>     dify_e2b or direct_e2b. Default: dify_e2b
  --max-pages <n>                   Same-origin pages to inspect. Default: 5, max: 25
  --max-network-requests <n>        Browser request cap. Default: 250
  --timeout-ms <n>                  Per-page timeout. Default: 30000
  --viewports <items>               Comma list like desktop:1440x900,mobile:390x844
  --allowed-hosts <hosts>           Comma list of allowed hostnames. Default: source hostname.
  --help                            Show this help.

Behavior:
  Writes an E2B/Dify-ready Python runner and a normalized sandbox job contract.
  The generated runner emits evidence only: page metadata, network summary,
  rendered layout signals when Playwright is available, screenshots, and errors.
  It does not write Airtable, D1, reviewer feedback, approvals, or rejections.
`);
}

function boundedInt(value: string, min: number, max: number, flag: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new Error(`${flag} must be an integer between ${min} and ${max}.`);
  }
  return parsed;
}

function parseViewports(value: string): Viewport[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item, index) => {
      const [rawName, rawSize] = item.includes(':') ? item.split(':', 2) : [`viewport_${index + 1}`, item];
      const match = rawSize?.match(/^(\d+)x(\d+)$/i);
      if (!match) throw new Error(`Invalid viewport "${item}". Use name:1440x900 or 1440x900.`);
      const width = Number.parseInt(match[1] ?? '', 10);
      const height = Number.parseInt(match[2] ?? '', 10);
      if (width < 240 || height < 240 || width > 3840 || height > 3840) {
        throw new Error(`Viewport "${item}" is outside the allowed 240-3840 pixel range.`);
      }
      return {
        name: sanitizeName(rawName || `viewport_${index + 1}`),
        width,
        height,
      };
    });
}

function sanitizeName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64) || 'viewport';
}

function normalizePublicHttpsUrl(value: string): string {
  const parsed = new URL(value.trim());
  if (parsed.protocol !== 'https:') throw new Error('Sandbox published-site runs require a public https URL.');
  const hostname = parsed.hostname.toLowerCase();
  if (isPrivateHostname(hostname)) {
    throw new Error('Sandbox published-site runs only accept public https URLs.');
  }
  parsed.hash = '';
  return parsed.toString();
}

function isPrivateHostname(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '::1' ||
    hostname.endsWith('.local') ||
    /^127\./.test(hostname) ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
  );
}

function buildJob(options: CliOptions): SandboxJob {
  return {
    schema_version: 'published_site_sandbox_job.v0.1',
    lane_id: 'published_site_validation',
    run_id: options.runId,
    created_at: new Date().toISOString(),
    source_url: options.url,
    policy_snapshot_id: options.policySnapshotId,
    sandbox_provider: options.sandboxProvider,
    controls: {
      timeout_ms: options.timeoutMs,
      max_pages: options.maxPages,
      max_network_requests: options.maxNetworkRequests,
      allowed_hosts: options.allowedHosts,
      block_private_networks: true,
      block_file_urls: true,
      allow_public_subresources: true,
      user_agent: DEFAULT_USER_AGENT,
      viewports: options.viewports,
    },
    artifacts: {
      output_file: '/tmp/webflow-template-review-sandbox/published-site-sandbox-output.json',
      screenshot_dir: '/tmp/webflow-template-review-sandbox/screenshots',
      network_log_file: '/tmp/webflow-template-review-sandbox/network-log.json',
      html_snapshot_file: '/tmp/webflow-template-review-sandbox/html-snapshot.html',
    },
    output_contract: {
      may_emit: [
        'page_metadata',
        'network_summary',
        'rendered_layout_signal',
        'screenshot_artifact_path',
        'static_html_signal',
        'timeout_or_error_state',
      ],
      must_not_emit: [
        'final_approval',
        'final_rejection',
        'creator_facing_feedback',
        'airtable_write',
        'd1_write',
        'raw_secret',
      ],
      failure_is_escalation: true,
    },
  };
}

function buildPythonRunner(job: SandboxJob): string {
  const jobJson = JSON.stringify(job, null, 2);
  return `#!/usr/bin/env python3
import asyncio
import html.parser
import json
import os
import re
import socket
import sys
import time
import traceback
import urllib.parse
import urllib.request

JOB = json.loads(r'''${jobJson}''')
WORK_DIR = '/tmp/webflow-template-review-sandbox'
os.environ.setdefault('PLAYWRIGHT_BROWSERS_PATH', '/tmp/ms-playwright')


class LinkParser(html.parser.HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
        self.images = []
        self.headings = []
        self.title_chunks = []
        self.in_title = False
        self.meta = {}

    def handle_starttag(self, tag, attrs):
        attrs_map = {name.lower(): value or '' for name, value in attrs}
        tag = tag.lower()
        if tag == 'title':
            self.in_title = True
        if tag == 'a' and attrs_map.get('href'):
            self.links.append(attrs_map.get('href'))
        if tag == 'img':
            self.images.append(attrs_map)
        if tag in {'h1', 'h2', 'h3', 'h4', 'h5', 'h6'}:
            self.headings.append(tag)
        if tag == 'meta':
            key = attrs_map.get('name') or attrs_map.get('property')
            content = attrs_map.get('content')
            if key and content:
                self.meta[key.lower()] = content

    def handle_endtag(self, tag):
        if tag.lower() == 'title':
            self.in_title = False

    def handle_data(self, data):
        if self.in_title:
            self.title_chunks.append(data)


def is_private_hostname(hostname):
    if not hostname:
        return True
    hostname = hostname.lower()
    if hostname in {'localhost', '::1'} or hostname.endswith('.local'):
        return True
    try:
        addresses = {item[4][0] for item in socket.getaddrinfo(hostname, None)}
    except Exception:
        addresses = set()
    candidates = addresses or {hostname}
    for candidate in candidates:
        if (
            candidate.startswith('127.') or
            candidate.startswith('10.') or
            candidate.startswith('192.168.') or
            re.match(r'^172\\.(1[6-9]|2\\d|3[0-1])\\.', candidate)
        ):
            return True
    return False


def assert_allowed_url(url):
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme != 'https':
        raise ValueError('Only https URLs are allowed in sandbox validation.')
    if is_private_hostname(parsed.hostname):
        raise ValueError('Private, local, or loopback hosts are blocked.')
    allowed_hosts = set(JOB['controls']['allowed_hosts'])
    if parsed.hostname.lower() not in allowed_hosts:
        raise ValueError('Host is outside allowed_hosts: ' + parsed.hostname)


def absolute_url(href, base_url):
    if not href or href.startswith(('mailto:', 'tel:', 'javascript:', '#')):
        return None
    try:
        joined = urllib.parse.urljoin(base_url, href)
        parsed = urllib.parse.urlparse(joined)
        if parsed.scheme != 'https':
            return None
        if parsed.hostname.lower() not in set(JOB['controls']['allowed_hosts']):
            return None
        return urllib.parse.urlunparse((parsed.scheme, parsed.netloc, parsed.path or '/', parsed.params, parsed.query, ''))
    except Exception:
        return None


def fetch_html(url):
    assert_allowed_url(url)
    request = urllib.request.Request(url, headers={'User-Agent': JOB['controls']['user_agent']})
    with urllib.request.urlopen(request, timeout=JOB['controls']['timeout_ms'] / 1000) as response:
        content_type = response.headers.get('content-type', '')
        body = response.read(2_000_000)
    text = body.decode('utf-8', errors='replace')
    return text, content_type


def parse_html(url, html_text):
    parser = LinkParser()
    parser.feed(html_text)
    title = ' '.join(chunk.strip() for chunk in parser.title_chunks if chunk.strip())
    links = []
    seen = set()
    for href in parser.links:
        resolved = absolute_url(href, url)
        if resolved and resolved not in seen:
            links.append(resolved)
            seen.add(resolved)
    return {
        'url': url,
        'title': title,
        'meta_description': parser.meta.get('description'),
        'open_graph_title': parser.meta.get('og:title'),
        'html_bytes': len(html_text.encode('utf-8', errors='ignore')),
        'link_count': len(parser.links),
        'same_origin_links': links,
        'image_count': len(parser.images),
        'missing_alt_count': sum(1 for img in parser.images if not img.get('alt', '').strip()),
        'heading_counts': {level: parser.headings.count(level) for level in ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']},
    }


async def try_render_with_playwright(pages):
    try:
        from playwright.async_api import async_playwright
    except Exception as error:
        return {
            'status': 'skipped',
            'reason': 'playwright_unavailable',
            'message': str(error),
            'pages': [],
            'network_log': [],
        }

    network_log = []
    rendered_pages = []
    max_requests = JOB['controls']['max_network_requests']
    request_count = 0
    os.makedirs(JOB['artifacts']['screenshot_dir'], exist_ok=True)

    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(args=['--disable-dev-shm-usage', '--no-sandbox'])
        try:
            for page_url in pages:
                page_entry = {'url': page_url, 'viewports': []}
                for viewport in JOB['controls']['viewports']:
                    context = await browser.new_context(
                        viewport={'width': viewport['width'], 'height': viewport['height']},
                        user_agent=JOB['controls']['user_agent'],
                        ignore_https_errors=True,
                    )
                    page = await context.new_page()
                    console_errors = []

                    page.on('console', lambda msg: console_errors.append(msg.text) if msg.type == 'error' else None)

                    async def route_handler(route):
                        nonlocal request_count
                        request = route.request
                        parsed = urllib.parse.urlparse(request.url)
                        request_count += 1
                        if request_count > max_requests:
                            network_log.append({'url': request.url, 'method': request.method, 'blocked': 'max_requests'})
                            await route.abort()
                            return
                        if parsed.scheme not in {'http', 'https'} or is_private_hostname(parsed.hostname):
                            network_log.append({'url': request.url, 'method': request.method, 'blocked': 'private_or_non_http'})
                            await route.abort()
                            return
                        if request.is_navigation_request() and parsed.hostname.lower() not in set(JOB['controls']['allowed_hosts']):
                            network_log.append({'url': request.url, 'method': request.method, 'blocked': 'navigation_host_not_allowed'})
                            await route.abort()
                            return
                        network_log.append({'url': request.url, 'method': request.method, 'resource_type': request.resource_type})
                        await route.continue_()

                    await page.route('**/*', route_handler)
                    start = time.time()
                    viewport_result = {
                        'name': viewport['name'],
                        'width': viewport['width'],
                        'height': viewport['height'],
                        'status': 'ok',
                    }
                    try:
                        await page.goto(page_url, wait_until='domcontentloaded', timeout=JOB['controls']['timeout_ms'])
                        try:
                            await page.wait_for_load_state('networkidle', timeout=5000)
                        except Exception:
                            pass
                        metrics = await page.evaluate("""() => {
                          const doc = document.documentElement;
                          const body = document.body;
                          const rects = Array.from(document.querySelectorAll('body *')).slice(0, 3000).map((el) => {
                            const rect = el.getBoundingClientRect();
                            return { right: rect.right, left: rect.left, width: rect.width, height: rect.height };
                          });
                          const overflowing = rects.filter((rect) => rect.right > window.innerWidth + 1 || rect.left < -1).length;
                          const clippedText = Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6,p,a,button')).slice(0, 1000)
                            .filter((el) => el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1).length;
                          return {
                            title: document.title,
                            current_url: location.href,
                            viewport_width: window.innerWidth,
                            viewport_height: window.innerHeight,
                            document_width: Math.max(doc.scrollWidth, body ? body.scrollWidth : 0),
                            document_height: Math.max(doc.scrollHeight, body ? body.scrollHeight : 0),
                            horizontal_overflow: Math.max(doc.scrollWidth, body ? body.scrollWidth : 0) > window.innerWidth + 1,
                            overflowing_element_count: overflowing,
                            clipped_text_candidate_count: clippedText,
                            h1_count: document.querySelectorAll('h1').length,
                            image_count: document.querySelectorAll('img').length,
                            missing_alt_count: Array.from(document.querySelectorAll('img')).filter((img) => !img.getAttribute('alt')).length,
                            link_count: document.querySelectorAll('a').length,
                            form_count: document.querySelectorAll('form').length,
                          };
                        }""")
                        screenshot_path = os.path.join(
                            JOB['artifacts']['screenshot_dir'],
                            page_url.replace('https://', '').replace('/', '_').replace('?', '_')[:90] + '_' + viewport['name'] + '.png',
                        )
                        await page.screenshot(path=screenshot_path, full_page=True)
                        viewport_result.update({
                            'metrics': metrics,
                            'screenshot_path': screenshot_path,
                            'console_error_count': len(console_errors),
                            'console_error_samples': console_errors[:10],
                            'latency_ms': int((time.time() - start) * 1000),
                        })
                    except Exception as error:
                        viewport_result.update({
                            'status': 'failed',
                            'error': str(error),
                            'latency_ms': int((time.time() - start) * 1000),
                        })
                    finally:
                        await context.close()
                    page_entry['viewports'].append(viewport_result)
                rendered_pages.append(page_entry)
        finally:
            await browser.close()

    return {
        'status': 'ok',
        'pages': rendered_pages,
        'network_log': network_log[:max_requests],
    }


async def main():
    os.makedirs(WORK_DIR, exist_ok=True)
    source_url = JOB['source_url']
    result = {
        'schema_version': 'published_site_sandbox_output.v0.1',
        'run_id': JOB['run_id'],
        'lane_id': JOB['lane_id'],
        'source_url': source_url,
        'policy_snapshot_id': JOB['policy_snapshot_id'],
        'status': 'ok',
        'evidence_quality': 'Sandbox evidence for published-site review triage. Not a final approval or rejection.',
        'sandbox_metadata': {
            'provider': JOB['sandbox_provider'],
            'controls': JOB['controls'],
            'python_version': sys.version,
            'work_dir': WORK_DIR,
        },
        'static_pages': [],
        'rendered': {},
        'errors': [],
        'caveats': [
            'This runner emits evidence only.',
            'Failures and unavailable rendering should escalate to human or validator review.',
            'No Airtable, D1, reviewer feedback, approval, or rejection writes are performed.',
        ],
    }

    try:
        root_html, content_type = fetch_html(source_url)
        with open(JOB['artifacts']['html_snapshot_file'], 'w', encoding='utf-8') as handle:
            handle.write(root_html)
        root = parse_html(source_url, root_html)
        root['content_type'] = content_type
        pages = [source_url] + [url for url in root['same_origin_links'] if url != source_url]
        pages = pages[:JOB['controls']['max_pages']]
        result['discovered_pages'] = pages
        result['static_pages'].append(root)
        for page_url in pages[1:]:
            try:
                html_text, page_content_type = fetch_html(page_url)
                page_static = parse_html(page_url, html_text)
                page_static['content_type'] = page_content_type
                result['static_pages'].append(page_static)
            except Exception as error:
                result['errors'].append({'stage': 'static_fetch', 'url': page_url, 'error': str(error)})

        rendered = await try_render_with_playwright(pages)
        result['rendered'] = {key: value for key, value in rendered.items() if key != 'network_log'}
        with open(JOB['artifacts']['network_log_file'], 'w', encoding='utf-8') as handle:
            json.dump(rendered.get('network_log', []), handle, indent=2)
        result['network_summary'] = {
            'request_count': len(rendered.get('network_log', [])),
            'network_log_file': JOB['artifacts']['network_log_file'],
        }
        if rendered.get('status') != 'ok':
            result['status'] = 'partial'
            result['errors'].append({'stage': 'render', 'error': rendered.get('message') or rendered.get('reason')})
    except Exception as error:
        result['status'] = 'failed'
        result['errors'].append({'stage': 'run', 'error': str(error), 'traceback': traceback.format_exc(limit=5)})

    with open(JOB['artifacts']['output_file'], 'w', encoding='utf-8') as handle:
        json.dump(result, handle, indent=2)
    print(json.dumps({
        'run_id': result['run_id'],
        'status': result['status'],
        'output_file': JOB['artifacts']['output_file'],
        'network_log_file': JOB['artifacts']['network_log_file'],
        'screenshot_dir': JOB['artifacts']['screenshot_dir'],
        'render_status': result.get('rendered', {}).get('status'),
        'error_count': len(result.get('errors', [])),
    }, indent=2))


def run_main():
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        asyncio.run(main())
        return

    if loop.is_running():
        try:
            import nest_asyncio
            nest_asyncio.apply()
        except Exception as error:
            raise RuntimeError('A running event loop is active and nest_asyncio is unavailable.') from error

    loop.run_until_complete(main())


if __name__ == '__main__':
    run_main()
`;
}

function buildReadme(job: SandboxJob): string {
  return `# Published Site Sandbox Run

Run ID: \`${job.run_id}\`

This bundle is intended for the Dify E2B tool path. It emits evidence only and must be treated as supplemental published-site validation.

## Dify E2B Usage

1. Use E2B \`run_code\` with language \`python\`.
2. Paste the contents of \`published-site-sandbox-e2b-run.py\`.
3. Use timeout \`120\` for the first smoke run.
4. Download \`${job.artifacts.output_file}\`.
5. Download screenshots from \`${job.artifacts.screenshot_dir}\` when rendering succeeds.

If Playwright is unavailable in the sandbox, the runner still emits static HTML evidence and marks rendering as skipped. That is a partial result and should escalate rather than approve or reject.

If the E2B image supports package installation, \`published-site-sandbox-e2b-bootstrap-command.txt\` contains an optional browser bootstrap command.

## Contract

- Source URL: \`${job.source_url}\`
- Allowed hosts: \`${job.controls.allowed_hosts.join(', ')}\`
- Max pages: \`${job.controls.max_pages}\`
- Max network requests: \`${job.controls.max_network_requests}\`
- Viewports: \`${job.controls.viewports.map((viewport) => `${viewport.name}:${viewport.width}x${viewport.height}`).join(', ')}\`

The runner must not receive Airtable PATs, OpenAI keys, reviewer credentials, D1 write tokens, or Webflow credentials.
`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const job = buildJob(options);
  await mkdir(options.outDir, { recursive: true });
  await writeFile(path.join(options.outDir, 'published-site-sandbox-job.json'), `${JSON.stringify(job, null, 2)}\n`);
  await writeFile(path.join(options.outDir, 'published-site-sandbox-e2b-run.py'), buildPythonRunner(job));
  await writeFile(path.join(options.outDir, 'published-site-sandbox-e2b-command.txt'), 'python published-site-sandbox-e2b-run.py\n');
  await writeFile(
    path.join(options.outDir, 'published-site-sandbox-e2b-bootstrap-command.txt'),
    'python -m pip install -q playwright && PLAYWRIGHT_BROWSERS_PATH=/tmp/ms-playwright python -m playwright install --with-deps chromium && python published-site-sandbox-e2b-run.py\n',
  );
  await writeFile(path.join(options.outDir, 'README.md'), buildReadme(job));
  await writeFile(
    path.join(options.outDir, 'published-site-sandbox-summary.json'),
    `${JSON.stringify(
      {
        ok: true,
        run_id: job.run_id,
        out_dir: options.outDir,
        files: [
          'published-site-sandbox-job.json',
          'published-site-sandbox-e2b-run.py',
          'published-site-sandbox-e2b-command.txt',
          'published-site-sandbox-e2b-bootstrap-command.txt',
          'published-site-sandbox-summary.json',
          'README.md',
        ],
      },
      null,
      2,
    )}\n`,
  );
  console.log(
    JSON.stringify(
      {
        ok: true,
        run_id: job.run_id,
        out_dir: options.outDir,
        e2b_code_file: path.join(options.outDir, 'published-site-sandbox-e2b-run.py'),
        job_file: path.join(options.outDir, 'published-site-sandbox-job.json'),
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
