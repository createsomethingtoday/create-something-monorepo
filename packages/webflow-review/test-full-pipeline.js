#!/usr/bin/env node

/**
 * Full Pipeline Test - Fetches real Webflow preview page and runs checks
 *
 * Usage:
 *   node test-full-pipeline.js
 *   node test-full-pipeline.js <custom-url>
 */

const DEFAULT_URL = 'https://preview.webflow.com/preview/new-clann?preview=a8cf79ecaf5ea08516e9e9e702e1d54c';

// ===================================================================
// SEO Checker (adapted from workers/seo-checker/src/index.ts)
// ===================================================================

function checkSEO(html, url) {
  const findings = [];

  // Check title tag
  const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
  const title = titleMatch?.[1]?.trim() || '';

  if (!title) {
    findings.push({
      checkType: 'seo',
      severity: 'critical',
      message: 'Missing <title> tag',
      pageUrl: url,
      evidence: { reason: 'No title tag found in HTML' },
      autoFixable: true,
    });
  } else if (title.length > 70) {
    findings.push({
      checkType: 'seo',
      severity: 'warning',
      message: `Title too long (${title.length} chars, maximum 70)`,
      pageUrl: url,
      evidence: { title, length: title.length },
      autoFixable: true,
    });
  } else if (title.length < 10) {
    findings.push({
      checkType: 'seo',
      severity: 'warning',
      message: `Title too short (${title.length} chars, minimum 10)`,
      pageUrl: url,
      evidence: { title, length: title.length },
      autoFixable: true,
    });
  }

  // Check meta description
  const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i);
  const metaDesc = metaDescMatch?.[1]?.trim() || '';

  if (!metaDesc) {
    findings.push({
      checkType: 'seo',
      severity: 'critical',
      message: 'Missing meta description',
      pageUrl: url,
      evidence: { reason: 'No meta description tag found' },
      autoFixable: true,
    });
  } else if (metaDesc.length > 160) {
    findings.push({
      checkType: 'seo',
      severity: 'warning',
      message: `Meta description too long (${metaDesc.length} chars, maximum 160)`,
      pageUrl: url,
      evidence: { description: metaDesc, length: metaDesc.length },
      autoFixable: true,
    });
  }

  // Check H1 headings
  const h1Matches = html.match(/<h1[^>]*>(.*?)<\/h1>/gi) || [];
  if (h1Matches.length === 0) {
    findings.push({
      checkType: 'seo',
      severity: 'warning',
      message: 'No H1 heading found',
      pageUrl: url,
      evidence: { reason: 'H1 headings help structure content' },
    });
  } else if (h1Matches.length > 1) {
    findings.push({
      checkType: 'seo',
      severity: 'info',
      message: `Multiple H1 headings found (${h1Matches.length})`,
      pageUrl: url,
      evidence: { count: h1Matches.length, reason: 'Best practice is one H1 per page' },
    });
  }

  // Check images without alt text
  const imgMatches = html.matchAll(/<img[^>]*>/gi);
  const imagesWithoutAlt = [];

  for (const match of imgMatches) {
    const imgTag = match[0];
    const hasAlt = /alt=["'][^"']*["']/.test(imgTag);
    const srcMatch = imgTag.match(/src=["']([^"']*)["']/);

    if (!hasAlt && srcMatch) {
      imagesWithoutAlt.push({ src: srcMatch[1] });
    }
  }

  if (imagesWithoutAlt.length > 0) {
    findings.push({
      checkType: 'seo',
      severity: 'warning',
      message: `${imagesWithoutAlt.length} image(s) missing alt text`,
      pageUrl: url,
      evidence: {
        count: imagesWithoutAlt.length,
        examples: imagesWithoutAlt.slice(0, 3),
        reason: 'Alt text is important for accessibility and SEO'
      },
      autoFixable: false,
    });
  }

  // Check Open Graph image
  const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["'][^>]*>/i);
  if (!ogImageMatch) {
    findings.push({
      checkType: 'seo',
      severity: 'warning',
      message: 'Missing Open Graph image (og:image)',
      pageUrl: url,
      evidence: { reason: 'Social media previews will not show an image' },
    });
  }

  // Check structured data
  const structuredDataMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/gis) || [];
  if (structuredDataMatches.length === 0) {
    findings.push({
      checkType: 'seo',
      severity: 'info',
      message: 'No structured data (Schema.org) found',
      pageUrl: url,
      evidence: { reason: 'Structured data helps search engines understand content' },
    });
  }

  return findings;
}

// ===================================================================
// Link Validator (adapted from workers/link-validator/src/index.ts)
// ===================================================================

function validateLinks(html, url) {
  const findings = [];

  // Find all links
  const linkMatches = html.matchAll(/<a\s+([^>]*)>/gi);
  const missingUrls = [];
  const javascriptUrls = [];
  const relativeLinks = [];

  for (const match of linkMatches) {
    const attrs = match[1];
    const hrefMatch = attrs.match(/href=["']([^"']*)["']/i);
    const href = hrefMatch?.[1] || null;

    // Extract link text
    const fullMatch = match[0];
    const closingTagIndex = html.indexOf('</a>', match.index);
    const linkText = closingTagIndex > -1
      ? html.substring(match.index + fullMatch.length, closingTagIndex).trim().substring(0, 50)
      : 'Unknown';

    // Extract selector (simplified)
    const classMatch = attrs.match(/class=["']([^"']*)["']/i);
    const idMatch = attrs.match(/id=["']([^"']*)["']/i);
    const selector = idMatch ? `#${idMatch[1]}` : (classMatch ? `.${classMatch[1].split(' ')[0]}` : 'a');

    // Check for missing URLs
    if (!href || href === '#' || href === '') {
      missingUrls.push({ text: linkText, selector });
      continue;
    }

    // Check for javascript: protocol
    if (href.startsWith('javascript:')) {
      javascriptUrls.push({ text: linkText, selector, href });
      continue;
    }

    // Check for relative links
    if (!href.startsWith('http://') && !href.startsWith('https://') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
      relativeLinks.push({ text: linkText, selector, href });
    }
  }

  // Report findings
  if (missingUrls.length > 0) {
    findings.push({
      checkType: 'links',
      severity: 'critical',
      message: `${missingUrls.length} link(s) missing URL`,
      pageUrl: url,
      evidence: {
        count: missingUrls.length,
        examples: missingUrls.slice(0, 5),
      },
      autoFixable: false,
    });
  }

  if (javascriptUrls.length > 0) {
    findings.push({
      checkType: 'links',
      severity: 'warning',
      message: `${javascriptUrls.length} link(s) use javascript: protocol`,
      pageUrl: url,
      evidence: {
        count: javascriptUrls.length,
        examples: javascriptUrls.slice(0, 3),
        reason: 'Consider using event handlers instead',
      },
    });
  }

  if (relativeLinks.length > 0) {
    findings.push({
      checkType: 'links',
      severity: 'info',
      message: `${relativeLinks.length} relative link(s) found`,
      pageUrl: url,
      evidence: {
        count: relativeLinks.length,
        examples: relativeLinks.slice(0, 3),
        reason: 'Relative links work on published site but may not work in preview',
      },
    });
  }

  return findings;
}

// ===================================================================
// Score Calculator
// ===================================================================

const SEVERITY_WEIGHTS = {
  critical: 10,
  warning: 5,
  info: 1,
};

function calculateScore(findings) {
  let penalties = 0;
  for (const finding of findings) {
    penalties += SEVERITY_WEIGHTS[finding.severity];
  }
  const score = Math.max(0, Math.min(100, 100 - penalties));
  return Math.round(score);
}

// ===================================================================
// Console Display Functions
// ===================================================================

function displayHeader() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║         Webflow Template Review - Full Pipeline Test         ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
}

function displayScore(score, findings) {
  const critical = findings.filter(f => f.severity === 'critical').length;
  const warning = findings.filter(f => f.severity === 'warning').length;
  const info = findings.filter(f => f.severity === 'info').length;

  let scoreColor = '\x1b[31m'; // Red
  let quality = 'Poor';

  if (score >= 90) {
    scoreColor = '\x1b[32m'; // Green
    quality = 'Excellent';
  } else if (score >= 75) {
    scoreColor = '\x1b[34m'; // Blue
    quality = 'Good';
  } else if (score >= 60) {
    scoreColor = '\x1b[33m'; // Yellow
    quality = 'Needs Work';
  }

  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log(`│ ${scoreColor}Score: ${score}/100 (${quality})\x1b[0m`);
  console.log('├─────────────────────────────────────────────────────────────┤');
  console.log(`│ 🔴 Critical: ${critical.toString().padEnd(3)} 🟡 Warning: ${warning.toString().padEnd(3)} 🔵 Info: ${info.toString().padEnd(3)}      │`);
  console.log('└─────────────────────────────────────────────────────────────┘\n');
}

function displayFindings(findings) {
  const grouped = {
    critical: findings.filter(f => f.severity === 'critical'),
    warning: findings.filter(f => f.severity === 'warning'),
    info: findings.filter(f => f.severity === 'info'),
  };

  for (const [severity, items] of Object.entries(grouped)) {
    if (items.length === 0) continue;

    const icon = severity === 'critical' ? '🔴' : severity === 'warning' ? '🟡' : '🔵';
    const color = severity === 'critical' ? '\x1b[31m' : severity === 'warning' ? '\x1b[33m' : '\x1b[34m';

    console.log(`${color}${icon} ${severity.toUpperCase()} (${items.length})\x1b[0m`);
    console.log('─'.repeat(60));

    for (const finding of items) {
      console.log(`\n  [${finding.checkType.toUpperCase()}] ${finding.message}`);

      if (finding.elementSelector) {
        console.log(`  📍 Selector: ${finding.elementSelector}`);
      }

      if (finding.evidence) {
        const evidence = finding.evidence;
        if (evidence.count !== undefined) {
          console.log(`  📊 Count: ${evidence.count}`);
        }
        if (evidence.examples && evidence.examples.length > 0) {
          console.log(`  📝 Examples:`);
          for (const example of evidence.examples.slice(0, 3)) {
            if (typeof example === 'string') {
              console.log(`     • ${example}`);
            } else if (example.text) {
              console.log(`     • ${example.text} (${example.selector || 'no selector'})`);
            } else if (example.src) {
              console.log(`     • ${example.src}`);
            }
          }
        }
        if (evidence.reason) {
          console.log(`  💡 ${evidence.reason}`);
        }
      }

      if (finding.autoFixable) {
        console.log(`  ✅ Auto-fixable`);
      }
    }

    console.log('');
  }
}

function displayAgentQueries(findings) {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║              Agent Natural Language Query Examples            ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  // Query 1: Links missing URLs
  const missingUrlsFinding = findings.find(f => f.message.includes('missing URL'));
  console.log('Q: "Are there any links missing URLs?"');
  if (missingUrlsFinding) {
    console.log(`A: Yes, ${missingUrlsFinding.evidence.count} links are missing URLs.`);
    if (missingUrlsFinding.evidence.examples) {
      const examples = missingUrlsFinding.evidence.examples.map(e => e.text).join(', ');
      console.log(`   Examples: ${examples}`);
    }
  } else {
    console.log('A: No links with missing URLs found.');
  }

  // Query 2: SEO issues
  const seoFindings = findings.filter(f => f.checkType === 'seo');
  console.log('\nQ: "What SEO issues were found?"');
  console.log(`A: Found ${seoFindings.length} SEO issues:`);
  seoFindings.forEach(f => console.log(`   • ${f.message}`));

  // Query 3: Auto-fixable
  const autoFixable = findings.filter(f => f.autoFixable);
  console.log('\nQ: "Which issues can be auto-fixed?"');
  if (autoFixable.length > 0) {
    console.log(`A: ${autoFixable.length} issues can be auto-fixed:`);
    autoFixable.forEach(f => console.log(`   • ${f.message}`));
  } else {
    console.log('A: No issues can be automatically fixed.');
  }

  console.log('');
}

// ===================================================================
// Main Pipeline
// ===================================================================

async function runPipeline(url) {
  const startTime = Date.now();

  displayHeader();

  console.log(`📡 Fetching: ${url}\n`);

  try {
    // Fetch the page
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const fetchTime = Date.now() - startTime;

    console.log(`✅ Fetched successfully (${fetchTime}ms, ${Math.round(html.length / 1024)}KB)\n`);

    // Run checks
    console.log('🔍 Running checks...\n');

    const seoFindings = checkSEO(html, url);
    const linkFindings = validateLinks(html, url);

    const allFindings = [...seoFindings, ...linkFindings];
    const score = calculateScore(allFindings);
    const duration = Date.now() - startTime;

    // Display results
    displayScore(score, allFindings);
    displayFindings(allFindings);
    displayAgentQueries(allFindings);

    // Summary
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                          Summary                              ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');
    console.log(`  Total Duration: ${duration}ms (${(duration / 1000).toFixed(1)}s)`);
    console.log(`  Total Findings: ${allFindings.length}`);
    console.log(`  Overall Score:  ${score}/100\n`);

    // Return data for programmatic use
    return {
      findings: allFindings,
      score,
      duration,
      url,
      success: true,
    };

  } catch (error) {
    console.error('\n❌ Pipeline Error:\n');
    console.error(`  ${error.message}\n`);

    if (error.cause) {
      console.error('  Caused by:', error.cause);
    }

    return {
      success: false,
      error: error.message,
      url,
    };
  }
}

// ===================================================================
// CLI Entry Point
// ===================================================================

if (require.main === module) {
  const url = process.argv[2] || DEFAULT_URL;

  runPipeline(url)
    .then(result => {
      if (!result.success) {
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { runPipeline, checkSEO, validateLinks, calculateScore };
