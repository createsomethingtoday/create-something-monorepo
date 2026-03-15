// SEO Checker Worker - Validates SEO best practices

import type { Finding, Env } from '../../../shared/types';
import { SEO_CHECKS } from '../../../shared/constants';

export async function checkSEO(url: string, env: Env): Promise<Finding[]> {
  const findings: Finding[] = [];

  try {
    // Use Browser Rendering API to get full DOM
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; WebflowReviewBot/1.0)',
      },
    });

    if (!response.ok) {
      return [{
        checkType: 'seo',
        severity: 'critical',
        message: `Failed to fetch page: ${response.status} ${response.statusText}`,
        pageUrl: url,
      }];
    }

    const html = await response.text();

    // Parse HTML (simplified - in production use htmlparser2 or similar)
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
    const title = titleMatch?.[1]?.trim() || '';

    // Check title tag
    if (!title) {
      findings.push({
        checkType: 'seo',
        severity: 'critical',
        message: 'Missing <title> tag',
        pageUrl: url,
        evidence: { reason: 'No title tag found in HTML' },
      });
    } else if (title.length < SEO_CHECKS.title.minLength) {
      findings.push({
        checkType: 'seo',
        severity: 'critical',
        message: `Title too short (${title.length} chars, minimum ${SEO_CHECKS.title.minLength})`,
        pageUrl: url,
        evidence: { title, length: title.length },
        autoFixable: true,
      });
    } else if (title.length > SEO_CHECKS.title.maxLength) {
      findings.push({
        checkType: 'seo',
        severity: 'warning',
        message: `Title too long (${title.length} chars, maximum ${SEO_CHECKS.title.maxLength})`,
        pageUrl: url,
        evidence: { title, length: title.length },
        autoFixable: true,
      });
    }

    // Check meta description
    const metaDescMatch = html.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/i);
    const metaDesc = metaDescMatch?.[1]?.trim() || '';

    if (!metaDesc) {
      findings.push({
        checkType: 'seo',
        severity: 'warning',
        message: 'Missing meta description',
        pageUrl: url,
        autoFixable: true,
      });
    } else if (metaDesc.length < SEO_CHECKS.metaDescription.minLength) {
      findings.push({
        checkType: 'seo',
        severity: 'warning',
        message: `Meta description too short (${metaDesc.length} chars, minimum ${SEO_CHECKS.metaDescription.minLength})`,
        pageUrl: url,
        evidence: { description: metaDesc, length: metaDesc.length },
        autoFixable: true,
      });
    } else if (metaDesc.length > SEO_CHECKS.metaDescription.maxLength) {
      findings.push({
        checkType: 'seo',
        severity: 'info',
        message: `Meta description too long (${metaDesc.length} chars, maximum ${SEO_CHECKS.metaDescription.maxLength})`,
        pageUrl: url,
        evidence: { description: metaDesc, length: metaDesc.length },
      });
    }

    // Check H1 tags
    const h1Matches = html.match(/<h1[^>]*>.*?<\/h1>/gi) || [];
    if (h1Matches.length === 0) {
      findings.push({
        checkType: 'seo',
        severity: 'warning',
        message: 'Missing H1 heading',
        pageUrl: url,
        evidence: { reason: 'No <h1> tag found on page' },
      });
    } else if (h1Matches.length > 1) {
      findings.push({
        checkType: 'seo',
        severity: 'info',
        message: `Multiple H1 tags found (${h1Matches.length})`,
        pageUrl: url,
        evidence: { count: h1Matches.length },
      });
    }

    // Check for images without alt text
    const imgMatches = html.match(/<img[^>]*>/gi) || [];
    const imgsWithoutAlt = imgMatches.filter(img => !img.includes('alt='));

    if (imgsWithoutAlt.length > 0) {
      findings.push({
        checkType: 'seo',
        severity: 'warning',
        message: `${imgsWithoutAlt.length} image(s) missing alt text`,
        pageUrl: url,
        evidence: { count: imgsWithoutAlt.length },
        autoFixable: false,
      });
    }

    // Check Open Graph tags
    const ogTitle = html.match(/<meta\s+property=["']og:title["']\s+content=["'](.*?)["']/i);
    const ogDesc = html.match(/<meta\s+property=["']og:description["']\s+content=["'](.*?)["']/i);
    const ogImage = html.match(/<meta\s+property=["']og:image["']\s+content=["'](.*?)["']/i);

    if (!ogTitle) {
      findings.push({
        checkType: 'seo',
        severity: 'info',
        message: 'Missing Open Graph title (og:title)',
        pageUrl: url,
      });
    }

    if (!ogDesc) {
      findings.push({
        checkType: 'seo',
        severity: 'info',
        message: 'Missing Open Graph description (og:description)',
        pageUrl: url,
      });
    }

    if (!ogImage) {
      findings.push({
        checkType: 'seo',
        severity: 'warning',
        message: 'Missing Open Graph image (og:image)',
        pageUrl: url,
        evidence: { reason: 'Social media previews will not show an image' },
      });
    }

    // Check for structured data
    const schemaMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>.*?<\/script>/gis);

    if (!schemaMatches || schemaMatches.length === 0) {
      findings.push({
        checkType: 'seo',
        severity: 'info',
        message: 'No structured data (Schema.org) found',
        pageUrl: url,
        evidence: { reason: 'Structured data helps search engines understand content' },
      });
    }

    // Check canonical URL
    const canonicalMatch = html.match(/<link\s+rel=["']canonical["']\s+href=["'](.*?)["']/i);
    if (!canonicalMatch) {
      findings.push({
        checkType: 'seo',
        severity: 'info',
        message: 'Missing canonical URL',
        pageUrl: url,
      });
    }

  } catch (error) {
    findings.push({
      checkType: 'seo',
      severity: 'critical',
      message: `SEO check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      pageUrl: url,
      evidence: { error: String(error) },
    });
  }

  return findings;
}
