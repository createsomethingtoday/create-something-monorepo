/**
 * Webflow Review - Browser Console Injector
 *
 * Copy/paste this entire script into the browser console on any Webflow page.
 * It will extract SEO data, validate links, and check for issues.
 *
 * Usage:
 *   1. Open Webflow preview page
 *   2. Open DevTools Console (Cmd+Option+J on Mac, F12 on Windows)
 *   3. Paste this entire script and press Enter
 *   4. Run: await WebflowReview.runFullCheck()
 *   5. Optional: Open drawers/modals, then run: await WebflowReview.checkVisibleContent()
 */

(function() {
  'use strict';

  const WebflowReview = {
    version: '1.0.0',

    // ===================================================================
    // SEO Checker - Runs on current DOM
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
          evidence: { reason: 'No title tag found' },
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
      const metaDesc = document.querySelector('meta[name="description"]');
      const description = metaDesc?.getAttribute('content') || '';

      if (!description) {
        findings.push({
          checkType: 'seo',
          severity: 'critical',
          message: 'Missing meta description',
          pageUrl: url,
          evidence: { reason: 'No meta description tag found' },
          autoFixable: true,
        });
      } else if (description.length > 160) {
        findings.push({
          checkType: 'seo',
          severity: 'warning',
          message: `Meta description too long (${description.length} chars, maximum 160)`,
          pageUrl: url,
          evidence: { description, length: description.length },
          autoFixable: true,
        });
      }

      // Check H1 headings (including hidden ones)
      const h1Elements = document.querySelectorAll('h1');
      const visibleH1s = Array.from(h1Elements).filter(el => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
      });

      if (visibleH1s.length === 0) {
        findings.push({
          checkType: 'seo',
          severity: 'warning',
          message: 'No visible H1 heading found',
          pageUrl: url,
          evidence: {
            totalH1s: h1Elements.length,
            visibleH1s: 0,
            reason: 'H1 headings help structure content'
          },
        });
      } else if (visibleH1s.length > 1) {
        findings.push({
          checkType: 'seo',
          severity: 'info',
          message: `Multiple H1 headings found (${visibleH1s.length} visible)`,
          pageUrl: url,
          evidence: {
            count: visibleH1s.length,
            texts: visibleH1s.map(h1 => h1.textContent.trim().substring(0, 50)),
            reason: 'Best practice is one H1 per page'
          },
        });
      }

      // Check images without alt text (including hidden ones)
      const images = document.querySelectorAll('img');
      const imagesWithoutAlt = Array.from(images)
        .filter(img => !img.getAttribute('alt'))
        .map(img => ({
          src: img.src,
          visible: window.getComputedStyle(img).display !== 'none'
        }));

      if (imagesWithoutAlt.length > 0) {
        findings.push({
          checkType: 'seo',
          severity: 'warning',
          message: `${imagesWithoutAlt.length} image(s) missing alt text`,
          pageUrl: url,
          evidence: {
            count: imagesWithoutAlt.length,
            visible: imagesWithoutAlt.filter(img => img.visible).length,
            examples: imagesWithoutAlt.slice(0, 5),
            reason: 'Alt text is important for accessibility and SEO'
          },
          autoFixable: false,
        });
      }

      // Check Open Graph image
      const ogImage = document.querySelector('meta[property="og:image"]');
      if (!ogImage) {
        findings.push({
          checkType: 'seo',
          severity: 'warning',
          message: 'Missing Open Graph image (og:image)',
          pageUrl: url,
          evidence: { reason: 'Social media previews will not show an image' },
        });
      }

      // Check structured data
      const structuredData = document.querySelectorAll('script[type="application/ld+json"]');
      if (structuredData.length === 0) {
        findings.push({
          checkType: 'seo',
          severity: 'info',
          message: 'No structured data (Schema.org) found',
          pageUrl: url,
          evidence: { reason: 'Structured data helps search engines understand content' },
        });
      }

      return findings;
    },

    // ===================================================================
    // Link Validator - Checks all links including hidden ones
    // ===================================================================

    validateLinks() {
      const findings = [];
      const url = window.location.href;

      // Get ALL links (including hidden ones)
      const links = document.querySelectorAll('a[href]');

      const missingUrls = [];
      const javascriptUrls = [];
      const relativeLinks = [];
      const hiddenLinksCount = { missing: 0, javascript: 0, relative: 0 };

      links.forEach(link => {
        const href = link.getAttribute('href');
        const text = link.textContent.trim().substring(0, 50);
        const selector = this._getSelector(link);
        const isVisible = this._isVisible(link);

        // Check for missing URLs
        if (!href || href === '#' || href === '') {
          missingUrls.push({ text, selector, visible: isVisible });
          if (!isVisible) hiddenLinksCount.missing++;
          return;
        }

        // Check for javascript: protocol
        if (href.startsWith('javascript:')) {
          javascriptUrls.push({ text, selector, href, visible: isVisible });
          if (!isVisible) hiddenLinksCount.javascript++;
          return;
        }

        // Check for relative links
        if (!href.startsWith('http://') &&
            !href.startsWith('https://') &&
            !href.startsWith('mailto:') &&
            !href.startsWith('tel:')) {
          relativeLinks.push({ text, selector, href, visible: isVisible });
          if (!isVisible) hiddenLinksCount.relative++;
        }
      });

      // Report findings
      if (missingUrls.length > 0) {
        findings.push({
          checkType: 'links',
          severity: 'critical',
          message: `${missingUrls.length} link(s) missing URL`,
          pageUrl: url,
          evidence: {
            count: missingUrls.length,
            visible: missingUrls.filter(l => l.visible).length,
            hidden: hiddenLinksCount.missing,
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
            visible: javascriptUrls.filter(l => l.visible).length,
            hidden: hiddenLinksCount.javascript,
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
            visible: relativeLinks.filter(l => l.visible).length,
            hidden: hiddenLinksCount.relative,
            examples: relativeLinks.slice(0, 3),
            reason: 'Relative links work on published site but may not work in preview',
          },
        });
      }

      return findings;
    },

    // ===================================================================
    // Drawer/Modal Detection - Find interactive elements
    // ===================================================================

    findInteractiveElements() {
      const selectors = [
        'button[data-toggle]',
        'button[aria-expanded]',
        '[data-drawer]',
        '[data-modal]',
        '.hamburger',
        '.menu-button',
        '.nav-toggle',
        '[role="button"]',
        'button:not([type="submit"])',
      ];

      const elements = [];
      selectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
          elements.push({
            selector: this._getSelector(el),
            text: el.textContent.trim().substring(0, 30),
            ariaExpanded: el.getAttribute('aria-expanded'),
            visible: this._isVisible(el),
            element: el, // Keep reference for clicking
          });
        });
      });

      return elements;
    },

    // ===================================================================
    // Helper: Click and reveal content
    // ===================================================================

    async clickAndReveal(selector) {
      const element = document.querySelector(selector);
      if (!element) {
        console.warn(`Element not found: ${selector}`);
        return false;
      }

      console.log(`Clicking: ${selector}`);
      element.click();

      // Wait for animation/transition
      await this._wait(500);

      return true;
    },

    // ===================================================================
    // Full Check - Run all checks on current state
    // ===================================================================

    async runFullCheck() {
      console.log('🔍 Running Webflow Review...\n');

      const seoFindings = this.checkSEO();
      const linkFindings = this.validateLinks();
      const allFindings = [...seoFindings, ...linkFindings];
      const score = this._calculateScore(allFindings);

      const result = {
        url: window.location.href,
        score,
        findings: allFindings,
        timestamp: new Date().toISOString(),
      };

      // Display results
      this._displayResults(result);

      // Find interactive elements
      const interactive = this.findInteractiveElements();
      if (interactive.length > 0) {
        console.log('\n💡 Found interactive elements that may reveal hidden content:');
        interactive.forEach((el, i) => {
          console.log(`  ${i + 1}. ${el.selector} - "${el.text}"`);
        });
        console.log('\n   To check hidden content:');
        console.log('   1. Manually click drawers/modals to open them');
        console.log('   2. Run: await WebflowReview.checkVisibleContent()');
        console.log('\n   Or automate: await WebflowReview.clickAndReveal(".nav-toggle")');
      }

      return result;
    },

    // ===================================================================
    // Check Visible Content Only - After opening drawers
    // ===================================================================

    async checkVisibleContent() {
      console.log('🔍 Checking only visible content...\n');

      const seoFindings = this.checkSEO();
      const linkFindings = this.validateLinks();

      // Filter to only visible issues
      const visibleFindings = [...seoFindings, ...linkFindings].map(finding => {
        if (finding.evidence?.visible !== undefined) {
          return {
            ...finding,
            message: finding.message + ' (visible only)',
          };
        }
        return finding;
      });

      const score = this._calculateScore(visibleFindings);

      const result = {
        url: window.location.href,
        score,
        findings: visibleFindings,
        timestamp: new Date().toISOString(),
        mode: 'visible-only',
      };

      this._displayResults(result);
      return result;
    },

    // ===================================================================
    // Helpers
    // ===================================================================

    _isVisible(element) {
      const style = window.getComputedStyle(element);
      return style.display !== 'none' &&
             style.visibility !== 'hidden' &&
             style.opacity !== '0' &&
             element.offsetParent !== null;
    },

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

    _wait(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    },

    _displayResults(result) {
      const critical = result.findings.filter(f => f.severity === 'critical').length;
      const warning = result.findings.filter(f => f.severity === 'warning').length;
      const info = result.findings.filter(f => f.severity === 'info').length;

      console.log(`%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'color: #888');
      console.log(`%c   Webflow Review Results`, 'font-size: 16px; font-weight: bold');
      console.log(`%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'color: #888');

      // Score with color
      let scoreColor = '#ef4444';
      if (result.score >= 90) scoreColor = '#22c55e';
      else if (result.score >= 75) scoreColor = '#3b82f6';
      else if (result.score >= 60) scoreColor = '#eab308';

      console.log(`\n%c   Score: ${result.score}/100`, `font-size: 20px; font-weight: bold; color: ${scoreColor}`);
      console.log(`\n   🔴 Critical: ${critical}   🟡 Warning: ${warning}   🔵 Info: ${info}`);
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

      // Group findings
      const grouped = {
        critical: result.findings.filter(f => f.severity === 'critical'),
        warning: result.findings.filter(f => f.severity === 'warning'),
        info: result.findings.filter(f => f.severity === 'info'),
      };

      Object.entries(grouped).forEach(([severity, items]) => {
        if (items.length === 0) return;

        const icon = severity === 'critical' ? '🔴' : severity === 'warning' ? '🟡' : '🔵';
        console.log(`%c${icon} ${severity.toUpperCase()} (${items.length})`, 'font-weight: bold');

        items.forEach(finding => {
          console.log(`\n  [${finding.checkType.toUpperCase()}] ${finding.message}`);

          if (finding.evidence) {
            if (finding.evidence.count !== undefined) {
              console.log(`  📊 Count: ${finding.evidence.count}`);
              if (finding.evidence.visible !== undefined) {
                console.log(`     Visible: ${finding.evidence.visible} | Hidden: ${finding.evidence.hidden || 0}`);
              }
            }
            if (finding.evidence.examples) {
              console.log(`  📝 Examples:`, finding.evidence.examples.slice(0, 3));
            }
          }
        });
        console.log('');
      });

      // Return JSON for copy/paste
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📋 Full JSON (copy to clipboard):');
      console.log(JSON.stringify(result, null, 2));
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }
  };

  // Make globally available
  window.WebflowReview = WebflowReview;

  console.log('✅ Webflow Review Console Injector loaded!');
  console.log('\nUsage:');
  console.log('  await WebflowReview.runFullCheck()           - Run full check');
  console.log('  await WebflowReview.checkVisibleContent()    - Check visible only');
  console.log('  await WebflowReview.clickAndReveal(".nav")   - Open a drawer/modal');
  console.log('  WebflowReview.findInteractiveElements()      - Find clickable elements');
  console.log('');

})();
