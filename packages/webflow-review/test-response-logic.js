#!/usr/bin/env node

/**
 * Test Response Logic - Simulates API response without deployment
 * Shows what the agent/console will receive
 */

// Simulated findings from checkers
const seoFindings = [
  {
    checkType: 'seo',
    severity: 'critical',
    message: 'Missing meta description',
    pageUrl: 'https://preview.webflow.com/preview/new-clann',
    evidence: { reason: 'No meta description tag found in HTML' },
    autoFixable: true,
  },
  {
    checkType: 'seo',
    severity: 'warning',
    message: 'Title too long (78 chars, maximum 70)',
    pageUrl: 'https://preview.webflow.com/preview/new-clann',
    evidence: {
      title: 'New Clann - Premium Webflow Template for Modern Businesses and Startups',
      length: 78
    },
    autoFixable: true,
  },
  {
    checkType: 'seo',
    severity: 'warning',
    message: 'Missing Open Graph image (og:image)',
    pageUrl: 'https://preview.webflow.com/preview/new-clann',
    evidence: { reason: 'Social media previews will not show an image' },
  },
  {
    checkType: 'seo',
    severity: 'info',
    message: 'No structured data (Schema.org) found',
    pageUrl: 'https://preview.webflow.com/preview/new-clann',
    evidence: { reason: 'Structured data helps search engines understand content' },
  },
];

const linkFindings = [
  {
    checkType: 'links',
    severity: 'critical',
    message: '3 link(s) missing URL',
    pageUrl: 'https://preview.webflow.com/preview/new-clann',
    evidence: {
      count: 3,
      examples: [
        { text: 'Services', selector: '.nav-link' },
        { text: 'About Us', selector: '.nav-link' },
        { text: 'Contact', selector: '.footer-link' },
      ],
    },
    autoFixable: false,
  },
  {
    checkType: 'links',
    severity: 'warning',
    message: '2 link(s) use javascript: protocol',
    pageUrl: 'https://preview.webflow.com/preview/new-clann',
    evidence: {
      count: 2,
      reason: 'Consider using event handlers instead',
    },
  },
  {
    checkType: 'links',
    severity: 'info',
    message: '15 relative link(s) found',
    pageUrl: 'https://preview.webflow.com/preview/new-clann',
    evidence: {
      count: 15,
      reason: 'Relative links work on published site but may not work in preview',
    },
  },
];

// Combine all findings
const allFindings = [...seoFindings, ...linkFindings];

// Calculate score (same logic as orchestrator)
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

// Build response
const response = {
  findings: allFindings,
  score: calculateScore(allFindings),
  duration: 2341, // milliseconds
};

// Display results
console.log('\n=== Simulated API Response ===\n');
console.log('Request:');
console.log('POST /api/review/page');
console.log('Body: { "url": "https://preview.webflow.com/preview/new-clann?preview=..." }\n');

console.log('Response:');
console.log(JSON.stringify(response, null, 2));

console.log('\n=== Summary ===\n');

const critical = allFindings.filter(f => f.severity === 'critical').length;
const warning = allFindings.filter(f => f.severity === 'warning').length;
const info = allFindings.filter(f => f.severity === 'info').length;

console.log(`Score: ${response.score}/100`);
console.log(`Duration: ${response.duration}ms (${(response.duration / 1000).toFixed(1)}s)`);
console.log(`\nFindings:`);
console.log(`  🔴 Critical: ${critical}`);
console.log(`  🟡 Warning: ${warning}`);
console.log(`  🔵 Info: ${info}`);
console.log(`  📊 Total: ${allFindings.length}`);

console.log('\n=== Breakdown by Check Type ===\n');

const byType = allFindings.reduce((acc, f) => {
  acc[f.checkType] = (acc[f.checkType] || 0) + 1;
  return acc;
}, {});

Object.entries(byType).forEach(([type, count]) => {
  console.log(`  ${type.toUpperCase()}: ${count} findings`);
});

console.log('\n=== Agent Parsing Example ===\n');

// Show how an agent would parse this
console.log('// Agent receives JSON response');
console.log('const response = await fetch("/api/review/page", { ... })');
console.log('const data = await response.json();');
console.log('');
console.log('// Extract key information');
console.log(`console.log("Score:", data.score); // ${response.score}`);
console.log(`console.log("Total findings:", data.findings.length); // ${allFindings.length}`);
console.log('');
console.log('// Filter by severity');
console.log('const critical = data.findings.filter(f => f.severity === "critical");');
console.log(`console.log("Critical issues:", critical.length); // ${critical}`);
console.log('');
console.log('// Check if specific issues exist');
console.log('const missingUrls = data.findings.find(f => f.message.includes("missing URL"));');
console.log(`console.log("Has missing URLs?", !!missingUrls); // ${!!allFindings.find(f => f.message.includes('missing URL'))}`);

console.log('\n=== Natural Language Query Examples ===\n');

// Simulate how AI agent would answer questions
const queries = [
  {
    question: 'Are there any links missing URLs?',
    answer: () => {
      const finding = allFindings.find(f => f.message.includes('missing URL'));
      if (finding) {
        return `Yes, ${finding.evidence.count} links are missing URLs. Examples: ${finding.evidence.examples.map(e => e.text).join(', ')}`;
      }
      return 'No links with missing URLs found.';
    },
  },
  {
    question: 'What SEO issues were found?',
    answer: () => {
      const seo = allFindings.filter(f => f.checkType === 'seo');
      return `Found ${seo.length} SEO issues: ${seo.map(f => f.message).join('; ')}`;
    },
  },
  {
    question: 'What is the overall score?',
    answer: () => {
      const score = response.score;
      let quality = 'Poor';
      if (score >= 90) quality = 'Excellent';
      else if (score >= 75) quality = 'Good';
      else if (score >= 60) quality = 'Needs Work';

      return `The page scored ${score}/100 (${quality}). Main issues: ${critical} critical, ${warning} warnings.`;
    },
  },
  {
    question: 'Which issues can be auto-fixed?',
    answer: () => {
      const autoFixable = allFindings.filter(f => f.autoFixable);
      if (autoFixable.length === 0) return 'No issues can be automatically fixed.';
      return `${autoFixable.length} issues can be auto-fixed: ${autoFixable.map(f => f.message).join('; ')}`;
    },
  },
];

queries.forEach(({ question, answer }) => {
  console.log(`Q: "${question}"`);
  console.log(`A: ${answer()}`);
  console.log('');
});

console.log('=== Test Complete ===\n');
console.log('This simulates what the API will return.');
console.log('To test with real data, run: ./test-local.sh\n');
