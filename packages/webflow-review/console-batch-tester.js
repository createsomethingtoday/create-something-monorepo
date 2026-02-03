/**
 * Webflow Review - Batch Page Tester
 *
 * Discovers and tests all pages accessible from navigation.
 * Copy/paste into console on any Webflow page.
 *
 * Usage:
 *   1. Open Webflow preview page (any page)
 *   2. Paste this script in console
 *   3. Run: await WebflowBatchReview.discoverAndTestAll()
 */

(function() {
  'use strict';

  const WebflowBatchReview = {
    version: '1.0.0',

    // ===================================================================
    // Page Discovery - Extract all page URLs from navigation
    // ===================================================================

    discoverPages() {
      console.log('🔍 Discovering pages from navigation...\n');

      const baseUrl = new URL(window.location.href);
      const pages = new Set();

      // Add current page
      pages.add(window.location.href);

      // Find all navigation links
      const navSelectors = [
        'nav a[href]',
        '.nav a[href]',
        '.navigation a[href]',
        '.menu a[href]',
        'header a[href]',
        '.navbar a[href]',
        '[role="navigation"] a[href]',
      ];

      const foundLinks = [];

      navSelectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(link => {
          const href = link.getAttribute('href');

          // Skip external, mailto, tel, hash links
          if (!href || href.startsWith('mailto:') || href.startsWith('tel:') ||
              href.startsWith('http') || href === '#') {
            return;
          }

          // Convert relative to absolute
          const absoluteUrl = new URL(href, baseUrl).href;

          // Only add if same domain
          if (new URL(absoluteUrl).origin === baseUrl.origin) {
            pages.add(absoluteUrl);
            foundLinks.push({
              text: link.textContent.trim(),
              href: href,
              url: absoluteUrl,
            });
          }
        });
      });

      console.log(`Found ${pages.size} unique pages:\n`);
      Array.from(pages).forEach((url, i) => {
        console.log(`  ${i + 1}. ${url}`);
      });

      return Array.from(pages);
    },

    // ===================================================================
    // Manual Page List Input
    // ===================================================================

    setPageList(urls) {
      this.pageList = urls;
      console.log(`✅ Set ${urls.length} pages for testing`);
      return this.pageList;
    },

    // ===================================================================
    // Test Single Page
    // ===================================================================

    async testPage(url) {
      try {
        // Navigate to page (only works if same origin)
        if (url !== window.location.href) {
          console.log(`⚠️  Cannot test different URL from console (same-origin policy)`);
          console.log(`   To test: ${url}`);
          console.log(`   1. Navigate to that URL`);
          console.log(`   2. Run: WebflowBatchReview.testCurrentPage()\n`);
          return null;
        }

        return this.testCurrentPage();
      } catch (error) {
        console.error(`❌ Error testing ${url}:`, error.message);
        return { url, error: error.message, success: false };
      }
    },

    // ===================================================================
    // Test Current Page
    // ===================================================================

    testCurrentPage() {
      const url = window.location.href;
      const findings = [];

      // SEO Check
      findings.push(...this.checkSEO());

      // Link Check
      findings.push(...this.validateLinks());

      const score = this._calculateScore(findings);

      return {
        url,
        score,
        findings,
        timestamp: new Date().toISOString(),
        success: true,
      };
    },

    // ===================================================================
    // Batch Test All Discovered Pages
    // ===================================================================

    async discoverAndTestAll() {
      console.log('🚀 Starting batch page discovery and testing...\n');

      const pages = this.discoverPages();

      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log('📋 Manual Testing Instructions:\n');
      console.log('To test all pages, you need to:');
      console.log('  1. Copy the URLs above');
      console.log('  2. For each URL:');
      console.log('     a. Navigate to the URL');
      console.log('     b. Open console (Cmd+Option+J)');
      console.log('     c. Run: WebflowBatchReview.testCurrentPage()');
      console.log('     d. Copy the results\n');
      console.log('Or use the automated Node.js script (see below)\n');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      // Test current page
      const result = this.testCurrentPage();
      this._displayResult(result);

      // Return page list for external testing
      return {
        discoveredPages: pages,
        currentPageResult: result,
        instructions: 'See console for manual testing instructions',
      };
    },

    // ===================================================================
    // Export Page List for Node.js Testing
    // ===================================================================

    exportForNodeTesting() {
      const pages = this.discoverPages();
      const output = `// Copy this into test-batch-pages.js\n\nconst pages = ${JSON.stringify(pages, null, 2)};\n\nmodule.exports = pages;`;

      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📋 Copy this to use with Node.js batch tester:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log(output);
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      return pages;
    },

    // ===================================================================
    // SEO Checker (from original script)
    // ===================================================================

    checkSEO() {
      const findings = [];
      const url = window.location.href;

      // Check title tag
      const title = document.title || '';
      if (!title) {
        findings.push({
          checkType: 'seo',
          severity: 'critical',
          message: 'Missing <title> tag',
          pageUrl: url,
        });
      } else if (title.length > 70) {
        findings.push({
          checkType: 'seo',
          severity: 'warning',
          message: `Title too long (${title.length} chars, maximum 70)`,
          pageUrl: url,
        });
      } else if (title.length < 10) {
        findings.push({
          checkType: 'seo',
          severity: 'warning',
          message: `Title too short (${title.length} chars, minimum 10)`,
          pageUrl: url,
        });
      }

      // Check meta description
      const metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc?.getAttribute('content')) {
        findings.push({
          checkType: 'seo',
          severity: 'critical',
          message: 'Missing meta description',
          pageUrl: url,
        });
      }

      // Check H1
      const h1Elements = document.querySelectorAll('h1');
      const visibleH1s = Array.from(h1Elements).filter(el => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });

      if (visibleH1s.length === 0) {
        findings.push({
          checkType: 'seo',
          severity: 'warning',
          message: 'No visible H1 heading found',
          pageUrl: url,
        });
      } else if (visibleH1s.length > 1) {
        findings.push({
          checkType: 'seo',
          severity: 'info',
          message: `Multiple H1 headings found (${visibleH1s.length})`,
          pageUrl: url,
        });
      }

      return findings;
    },

    // ===================================================================
    // Link Validator (from original script)
    // ===================================================================

    validateLinks() {
      const findings = [];
      const url = window.location.href;

      const links = document.querySelectorAll('a[href]');
      const missingUrls = [];

      links.forEach(link => {
        const href = link.getAttribute('href');
        if (!href || href === '#' || href === '') {
          missingUrls.push({
            text: link.textContent.trim().substring(0, 30),
            selector: this._getSelector(link),
          });
        }
      });

      if (missingUrls.length > 0) {
        findings.push({
          checkType: 'links',
          severity: 'critical',
          message: `${missingUrls.length} link(s) missing URL`,
          pageUrl: url,
          evidence: {
            count: missingUrls.length,
            examples: missingUrls.slice(0, 3),
          },
        });
      }

      return findings;
    },

    // ===================================================================
    // Helpers
    // ===================================================================

    _getSelector(element) {
      if (element.id) return `#${element.id}`;
      if (element.className && typeof element.className === 'string') {
        const classes = element.className.split(' ').filter(c => c);
        if (classes.length > 0) return `.${classes[0]}`;
      }
      return element.tagName.toLowerCase();
    },

    _calculateScore(findings) {
      const weights = { critical: 10, warning: 5, info: 1 };
      let penalties = 0;
      findings.forEach(f => {
        penalties += weights[f.severity] || 0;
      });
      return Math.max(0, Math.min(100, 100 - penalties));
    },

    _displayResult(result) {
      const critical = result.findings.filter(f => f.severity === 'critical').length;
      const warning = result.findings.filter(f => f.severity === 'warning').length;
      const info = result.findings.filter(f => f.severity === 'info').length;

      console.log(`\n📊 Page: ${result.url}`);
      console.log(`   Score: ${result.score}/100`);
      console.log(`   🔴 ${critical} Critical | 🟡 ${warning} Warning | 🔵 ${info} Info`);

      if (result.findings.length > 0) {
        console.log(`\n   Issues:`);
        result.findings.forEach(f => {
          const icon = f.severity === 'critical' ? '🔴' : f.severity === 'warning' ? '🟡' : '🔵';
          console.log(`   ${icon} ${f.message}`);
        });
      }

      console.log('');
    }
  };

  // Make globally available
  window.WebflowBatchReview = WebflowBatchReview;

  console.log('✅ Webflow Batch Review loaded!');
  console.log('\nUsage:');
  console.log('  await WebflowBatchReview.discoverAndTestAll()  - Discover pages and test current');
  console.log('  WebflowBatchReview.testCurrentPage()           - Test current page only');
  console.log('  WebflowBatchReview.exportForNodeTesting()      - Export URLs for batch testing');
  console.log('');

})();
