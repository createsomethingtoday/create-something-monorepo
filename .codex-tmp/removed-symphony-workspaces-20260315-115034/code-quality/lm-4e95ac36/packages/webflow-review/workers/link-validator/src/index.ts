// Link Validator Worker - Checks for broken links and missing URLs

import type { Finding, Env } from '../../../shared/types';
import { LINK_CHECKS } from '../../../shared/constants';

export async function validateLinks(url: string, env: Env): Promise<Finding[]> {
  const findings: Finding[] = [];

  try {
    // Fetch the page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; WebflowReviewBot/1.0)',
      },
    });

    if (!response.ok) {
      return [{
        checkType: 'links',
        severity: 'critical',
        message: `Failed to fetch page: ${response.status} ${response.statusText}`,
        pageUrl: url,
      }];
    }

    const html = await response.text();

    // Find all links (simplified regex - in production use htmlparser2)
    const linkMatches = html.matchAll(/<a\s+([^>]*)>/gi);
    const links: Array<{ href: string | null; text: string; selector: string; fullTag: string }> = [];

    for (const match of linkMatches) {
      const attrs = match[1];
      const hrefMatch = attrs.match(/href=["']([^"']*)["']/i);
      const href = hrefMatch?.[1] || null;

      // Extract link text (simplified)
      const fullTag = match[0];
      const textMatch = html.slice(match.index!).match(/<a[^>]*>(.*?)<\/a>/i);
      const text = textMatch?.[1]?.replace(/<[^>]*>/g, '').trim() || '';

      // Generate selector (simplified)
      const classMatch = attrs.match(/class=["']([^"']*)["']/i);
      const idMatch = attrs.match(/id=["']([^"']*)["']/i);

      let selector = 'a';
      if (idMatch) {
        selector = `#${idMatch[1]}`;
      } else if (classMatch) {
        const classes = classMatch[1].split(/\s+/);
        selector = `.${classes[0]}`;
      }

      links.push({ href, text, selector, fullTag });
    }

    // Check for links missing URLs
    const linksWithoutHref = links.filter(link => !link.href || link.href === '#' || link.href === '');

    if (linksWithoutHref.length > 0) {
      findings.push({
        checkType: 'links',
        severity: 'critical',
        message: `${linksWithoutHref.length} link(s) missing URL`,
        pageUrl: url,
        evidence: {
          count: linksWithoutHref.length,
          examples: linksWithoutHref.slice(0, 5).map(l => ({
            text: l.text,
            selector: l.selector,
          })),
        },
        autoFixable: false,
      });
    }

    // Check for JavaScript links
    const jsLinks = links.filter(link => link.href?.startsWith('javascript:'));
    if (jsLinks.length > 0) {
      findings.push({
        checkType: 'links',
        severity: 'warning',
        message: `${jsLinks.length} link(s) use javascript: protocol`,
        pageUrl: url,
        evidence: {
          count: jsLinks.length,
          reason: 'Consider using event handlers instead',
        },
      });
    }

    // Validate external links (sample up to 10 to avoid timeouts)
    const externalLinks = links.filter(link => {
      if (!link.href) return false;
      if (link.href.startsWith('#')) return false;
      if (link.href.startsWith('mailto:')) return false;
      if (link.href.startsWith('tel:')) return false;
      if (link.href.startsWith('javascript:')) return false;

      try {
        const linkUrl = new URL(link.href, url);
        const baseUrl = new URL(url);
        return linkUrl.hostname !== baseUrl.hostname;
      } catch {
        return false;
      }
    });

    const linksToCheck = externalLinks.slice(0, 10);

    for (const link of linksToCheck) {
      if (!link.href) continue;

      try {
        const absoluteUrl = new URL(link.href, url).href;

        // HEAD request to check if link is accessible
        const checkResponse = await fetch(absoluteUrl, {
          method: 'HEAD',
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; WebflowReviewBot/1.0)',
          },
          signal: AbortSignal.timeout(LINK_CHECKS.timeout),
        });

        if (checkResponse.status === 404) {
          findings.push({
            checkType: 'links',
            severity: 'critical',
            message: `Broken link (404): ${absoluteUrl}`,
            pageUrl: url,
            elementSelector: link.selector,
            evidence: {
              href: absoluteUrl,
              text: link.text,
              status: 404,
            },
          });
        } else if (checkResponse.status >= 500) {
          findings.push({
            checkType: 'links',
            severity: 'warning',
            message: `Server error (${checkResponse.status}): ${absoluteUrl}`,
            pageUrl: url,
            elementSelector: link.selector,
            evidence: {
              href: absoluteUrl,
              text: link.text,
              status: checkResponse.status,
            },
          });
        } else if (checkResponse.status >= 300 && checkResponse.status < 400) {
          // Redirect - informational only
          findings.push({
            checkType: 'links',
            severity: 'info',
            message: `Link redirects (${checkResponse.status}): ${absoluteUrl}`,
            pageUrl: url,
            elementSelector: link.selector,
            evidence: {
              href: absoluteUrl,
              status: checkResponse.status,
              location: checkResponse.headers.get('Location'),
            },
          });
        }
      } catch (error) {
        // Timeout or network error
        if (error instanceof Error && error.name === 'TimeoutError') {
          findings.push({
            checkType: 'links',
            severity: 'warning',
            message: `Link check timeout: ${link.href}`,
            pageUrl: url,
            elementSelector: link.selector,
            evidence: {
              href: link.href,
              reason: 'Request took longer than 5 seconds',
            },
          });
        } else {
          findings.push({
            checkType: 'links',
            severity: 'warning',
            message: `Failed to check link: ${link.href}`,
            pageUrl: url,
            elementSelector: link.selector,
            evidence: {
              href: link.href,
              error: error instanceof Error ? error.message : String(error),
            },
          });
        }
      }
    }

    // Check for relative links
    const relativeLinks = links.filter(link => {
      if (!link.href) return false;
      return link.href.startsWith('/') || (!link.href.startsWith('http') && !link.href.startsWith('#'));
    });

    if (relativeLinks.length > 0) {
      findings.push({
        checkType: 'links',
        severity: 'info',
        message: `${relativeLinks.length} relative link(s) found`,
        pageUrl: url,
        evidence: {
          count: relativeLinks.length,
          reason: 'Relative links work on published site but may not work in preview',
        },
      });
    }

  } catch (error) {
    findings.push({
      checkType: 'links',
      severity: 'critical',
      message: `Link validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      pageUrl: url,
      evidence: { error: String(error) },
    });
  }

  return findings;
}
