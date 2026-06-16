function argValue(name) {
  const prefix = `${name}=`;
  const match = process.argv.slice(2).find((entry) => entry.startsWith(prefix));
  return match ? match.slice(prefix.length) : null;
}

function extractFirst(html, pattern) {
  return html.match(pattern)?.[1]?.trim() ?? null;
}

function attrValue(tag, name) {
  return tag.match(new RegExp(`${name}=["']([^"']*)["']`, 'i'))?.[1]?.trim() ?? null;
}

function extractMeta(html, name) {
  const tags = Array.from(html.matchAll(/<meta\b[^>]*>/gi)).map((match) => match[0]);
  const tag = tags.find((entry) => attrValue(entry, 'name') === name || attrValue(entry, 'property') === name);
  return tag ? attrValue(tag, 'content') : null;
}

function extractCanonical(html) {
  const tags = Array.from(html.matchAll(/<link\b[^>]*>/gi)).map((match) => match[0]);
  const tag = tags.find((entry) => attrValue(entry, 'rel') === 'canonical');
  return tag ? attrValue(tag, 'href') : null;
}

function countMatches(html, pattern) {
  return Array.from(html.matchAll(pattern)).length;
}

function uniqueTemplateLinks(html) {
  const links = Array.from(html.matchAll(/href=["']([^"']*\/templates\/html\/[^"']+)["']/g)).map((match) => match[1]);
  return new Set(links).size;
}

function summarize(url, html) {
  return {
    url,
    status: 200,
    title: extractFirst(html, /<title[^>]*>([\s\S]*?)<\/title>/i),
    description: extractMeta(html, 'description'),
    canonical: extractCanonical(html),
    robots: extractMeta(html, 'robots'),
    h1: extractFirst(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i)?.replace(/<[^>]+>/g, '').replace(/\s+/g, ' '),
    templateDetailLinks: uniqueTemplateLinks(html),
    jsonLdScripts: countMatches(html, /type=["']application\/ld\+json["']/g),
  };
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: {
      Accept: 'text/html',
      'User-Agent': 'create-something-category-cloud-parity/1.0',
    },
  });

  const html = await response.text();
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}: ${html.slice(0, 240)}`);
  }

  return html;
}

function compare(cms, cloud) {
  const findings = [];
  for (const key of ['title', 'description', 'canonical', 'h1']) {
    if (cms[key] !== cloud[key]) {
      findings.push(`${key} differs`);
    }
  }

  if (cloud.templateDetailLinks < 24) {
    findings.push(`cloud page exposes only ${cloud.templateDetailLinks} template detail links`);
  }

  if (cloud.jsonLdScripts < 1) {
    findings.push('cloud page is missing JSON-LD');
  }

  return findings;
}

const cmsUrl = argValue('cms') || process.env.CMS_URL;
const cloudUrl = argValue('cloud') || process.env.CLOUD_URL;

if (!cmsUrl || !cloudUrl) {
  console.error('Usage: pnpm seo:parity -- cms=https://webflow.com/templates/category/... cloud=https://preview/...');
  process.exit(2);
}

const [cmsHtml, cloudHtml] = await Promise.all([fetchHtml(cmsUrl), fetchHtml(cloudUrl)]);
const cms = summarize(cmsUrl, cmsHtml);
const cloud = summarize(cloudUrl, cloudHtml);
const findings = compare(cms, cloud);

console.log(JSON.stringify({ cms, cloud, findings }, null, 2));

if (findings.length > 0) {
  process.exit(1);
}
