export type PublishedSiteSandboxViewport = {
  name: string;
  width: number;
  height: number;
};

export type PublishedSiteSandboxProvider = 'dify_e2b' | 'direct_e2b';

export type PublishedSiteSandboxJob = {
  schema_version: 'published_site_sandbox_job.v0.1';
  lane_id: 'published_site_validation';
  run_id: string;
  created_at: string;
  source_url: string;
  policy_snapshot_id: string;
  sandbox_provider: PublishedSiteSandboxProvider;
  controls: {
    timeout_ms: number;
    max_pages: number;
    max_network_requests: number;
    allowed_hosts: string[];
    block_private_networks: true;
    block_file_urls: true;
    allow_public_subresources: true;
    user_agent: string;
    viewports: PublishedSiteSandboxViewport[];
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

export type PublishedSiteSandboxBundleInput = {
  published_url: string;
  run_id?: string;
  policy_snapshot_id?: string;
  sandbox_provider?: PublishedSiteSandboxProvider;
  max_pages?: number;
  max_network_requests?: number;
  timeout_ms?: number;
  viewports?: PublishedSiteSandboxViewport[];
  allowed_hosts?: string[];
};

export type PublishedSiteSandboxBundle = {
  schema_version: 'published_site_sandbox_bundle.v0.1';
  job: PublishedSiteSandboxJob;
  e2b_run_code: string;
  e2b_command: string;
  e2b_bootstrap_command: string;
  usage: {
    tool: 'e2b.run_code';
    language: 'python';
    timeout_seconds: number;
    expected_output_file: string;
    expected_network_log_file: string;
    expected_screenshot_dir: string;
  };
  safety_boundary: string[];
};

export const DEFAULT_SANDBOX_VIEWPORTS: PublishedSiteSandboxViewport[] = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 },
];

const DEFAULT_USER_AGENT = 'CREATE SOMETHING Template Review Sandbox/0.1';
const DEFAULT_POLICY_SNAPSHOT_ID = 'template-review-policy.draft';
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_PAGES = 5;
const DEFAULT_MAX_NETWORK_REQUESTS = 250;

function boundedInt(value: number | undefined, fallback: number, min: number, max: number, label: string): number {
  const resolved = value ?? fallback;
  if (!Number.isInteger(resolved) || resolved < min || resolved > max) {
    throw new Error(`${label} must be an integer between ${min} and ${max}.`);
  }
  return resolved;
}

function sanitizeName(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 64) || 'viewport'
  );
}

function normalizeViewport(viewport: PublishedSiteSandboxViewport, index: number): PublishedSiteSandboxViewport {
  const width = boundedInt(viewport.width, viewport.width, 240, 3840, `viewports[${index}].width`);
  const height = boundedInt(viewport.height, viewport.height, 240, 3840, `viewports[${index}].height`);
  return {
    name: sanitizeName(viewport.name || `viewport_${index + 1}`),
    width,
    height,
  };
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

function normalizePublicHttpsUrl(value: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(value.trim());
  } catch {
    throw new Error('published_url must be a valid public https URL.');
  }
  if (parsed.protocol !== 'https:') throw new Error('published_url must use https.');
  const hostname = parsed.hostname.toLowerCase();
  if (isPrivateHostname(hostname)) throw new Error('published_url must not use private, local, or loopback hosts.');
  parsed.hash = '';
  return parsed;
}

function normalizeAllowedHosts(sourceHost: string, allowedHosts: string[] | undefined): string[] {
  const hosts = (allowedHosts?.length ? allowedHosts : [sourceHost])
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
  const uniqueHosts = Array.from(new Set(hosts));
  if (!uniqueHosts.includes(sourceHost)) {
    uniqueHosts.unshift(sourceHost);
  }
  for (const host of uniqueHosts) {
    if (isPrivateHostname(host)) throw new Error(`allowed_hosts contains a private, local, or loopback host: ${host}`);
  }
  return uniqueHosts;
}

function runId(): string {
  const generated = globalThis.crypto?.randomUUID?.();
  if (generated) return `published-site-sandbox-${generated}`;
  return `published-site-sandbox-${Date.now().toString(36)}`;
}

function buildJob(input: PublishedSiteSandboxBundleInput): PublishedSiteSandboxJob {
  const parsedUrl = normalizePublicHttpsUrl(input.published_url);
  const sourceHost = parsedUrl.hostname.toLowerCase();
  const viewports = (input.viewports?.length ? input.viewports : DEFAULT_SANDBOX_VIEWPORTS).map(normalizeViewport);

  return {
    schema_version: 'published_site_sandbox_job.v0.1',
    lane_id: 'published_site_validation',
    run_id: input.run_id?.trim() || runId(),
    created_at: new Date().toISOString(),
    source_url: parsedUrl.toString(),
    policy_snapshot_id: input.policy_snapshot_id?.trim() || DEFAULT_POLICY_SNAPSHOT_ID,
    sandbox_provider: input.sandbox_provider ?? 'dify_e2b',
    controls: {
      timeout_ms: boundedInt(input.timeout_ms, DEFAULT_TIMEOUT_MS, 5_000, 120_000, 'timeout_ms'),
      max_pages: boundedInt(input.max_pages, DEFAULT_MAX_PAGES, 1, 25, 'max_pages'),
      max_network_requests: boundedInt(input.max_network_requests, DEFAULT_MAX_NETWORK_REQUESTS, 25, 1000, 'max_network_requests'),
      allowed_hosts: normalizeAllowedHosts(sourceHost, input.allowed_hosts),
      block_private_networks: true,
      block_file_urls: true,
      allow_public_subresources: true,
      user_agent: DEFAULT_USER_AGENT,
      viewports,
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
        'quality_rating',
        'creator_facing_feedback',
        'airtable_write',
        'd1_write',
        'raw_secret',
      ],
      failure_is_escalation: true,
    },
  };
}

function buildPythonRunner(job: PublishedSiteSandboxJob): string {
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


class EvidenceParser(html.parser.HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
        self.images = []
        self.headings = []
        self.forms = 0
        self.buttons = []
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
        if tag == 'form':
            self.forms += 1
        if tag == 'button':
            self.buttons.append(attrs_map.get('aria-label') or attrs_map.get('title') or '')
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
    return any(
        candidate.startswith('127.') or
        candidate.startswith('10.') or
        candidate.startswith('192.168.') or
        re.match(r'^172\\.(1[6-9]|2\\d|3[0-1])\\.', candidate)
        for candidate in candidates
    )


def assert_allowed_url(url):
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme != 'https':
        raise ValueError('Only https URLs are allowed.')
    if is_private_hostname(parsed.hostname):
        raise ValueError('Private, local, or loopback hosts are blocked.')
    if parsed.hostname.lower() not in set(JOB['controls']['allowed_hosts']):
        raise ValueError('Navigation host is outside allowed_hosts: ' + parsed.hostname)


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
        status = response.status
        body = response.read(2_000_000)
    text = body.decode('utf-8', errors='replace')
    return text, content_type, status


def parse_html(url, html_text, content_type, status):
    parser = EvidenceParser()
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
        'status': status,
        'title': title,
        'meta_description': parser.meta.get('description'),
        'open_graph_title': parser.meta.get('og:title'),
        'html_bytes': len(html_text.encode('utf-8', errors='ignore')),
        'link_count': len(parser.links),
        'same_origin_links': links,
        'image_count': len(parser.images),
        'missing_alt_count': sum(1 for img in parser.images if not img.get('alt', '').strip()),
        'heading_counts': {level: parser.headings.count(level) for level in ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']},
        'form_count': parser.forms,
        'button_count': len(parser.buttons),
        'content_type': content_type,
    }


async def try_render_with_playwright(pages):
    try:
        from playwright.async_api import async_playwright
    except Exception as error:
        return {'status': 'skipped', 'reason': 'playwright_unavailable', 'message': str(error), 'pages': [], 'network_log': []}

    network_log = []
    rendered_pages = []
    request_count = 0
    max_requests = JOB['controls']['max_network_requests']
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
                    viewport_result = {'name': viewport['name'], 'width': viewport['width'], 'height': viewport['height'], 'status': 'ok'}
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
                          const clippedText = Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6,p,a,button,label')).slice(0, 1000)
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
                        viewport_result.update({'status': 'failed', 'error': str(error), 'latency_ms': int((time.time() - start) * 1000)})
                    finally:
                        await context.close()
                    page_entry['viewports'].append(viewport_result)
                rendered_pages.append(page_entry)
        finally:
            await browser.close()
    return {'status': 'ok', 'pages': rendered_pages, 'network_log': network_log[:max_requests]}


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
        'sandbox_metadata': {'provider': JOB['sandbox_provider'], 'controls': JOB['controls'], 'python_version': sys.version, 'work_dir': WORK_DIR},
        'static_pages': [],
        'rendered': {},
        'errors': [],
        'caveats': [
            'This runner emits evidence only.',
            'Failures and unavailable rendering should escalate to human or validator review.',
            'No review decision, rating, reviewer feedback, or external write is performed.',
        ],
    }
    try:
        root_html, content_type, status = fetch_html(source_url)
        with open(JOB['artifacts']['html_snapshot_file'], 'w', encoding='utf-8') as handle:
            handle.write(root_html)
        root = parse_html(source_url, root_html, content_type, status)
        pages = [source_url] + [url for url in root['same_origin_links'] if url != source_url]
        pages = pages[:JOB['controls']['max_pages']]
        result['discovered_pages'] = pages
        result['static_pages'].append(root)
        for page_url in pages[1:]:
            try:
                html_text, page_content_type, page_status = fetch_html(page_url)
                result['static_pages'].append(parse_html(page_url, html_text, page_content_type, page_status))
            except Exception as error:
                result['errors'].append({'stage': 'static_fetch', 'url': page_url, 'error': str(error)})
        rendered = await try_render_with_playwright(pages)
        result['rendered'] = {key: value for key, value in rendered.items() if key != 'network_log'}
        with open(JOB['artifacts']['network_log_file'], 'w', encoding='utf-8') as handle:
            json.dump(rendered.get('network_log', []), handle, indent=2)
        result['network_summary'] = {'request_count': len(rendered.get('network_log', [])), 'network_log_file': JOB['artifacts']['network_log_file']}
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

export function buildPublishedSiteSandboxBundle(input: PublishedSiteSandboxBundleInput): PublishedSiteSandboxBundle {
  const job = buildJob(input);
  return {
    schema_version: 'published_site_sandbox_bundle.v0.1',
    job,
    e2b_run_code: buildPythonRunner(job),
    e2b_command: 'python published-site-sandbox-e2b-run.py',
    e2b_bootstrap_command:
      'python -m pip install -q playwright && PLAYWRIGHT_BROWSERS_PATH=/tmp/ms-playwright python -m playwright install --with-deps chromium && python published-site-sandbox-e2b-run.py',
    usage: {
      tool: 'e2b.run_code',
      language: 'python',
      timeout_seconds: 120,
      expected_output_file: job.artifacts.output_file,
      expected_network_log_file: job.artifacts.network_log_file,
      expected_screenshot_dir: job.artifacts.screenshot_dir,
    },
    safety_boundary: [
      'Evidence-only published-site sandbox lane.',
      'Do not provide secrets, reviewer credentials, Airtable tokens, D1 credentials, OpenAI keys, or Webflow credentials to the runner.',
      'Runner output is supplemental evidence and must not be treated as approval, rejection, quality rating, or creator-facing feedback.',
      'Failures, partial rendering, and setup errors are escalation signals, not rejection evidence.',
    ],
  };
}
